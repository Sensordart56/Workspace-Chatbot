import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Content } from '@google/genai';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';
import { embedQuery } from '@/lib/embeddings';
import { retrieve, buildContext, extractCitations, SYSTEM_INSTRUCTION } from '@/lib/rag';
import { generate } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;

const HISTORY_LIMIT = 10;

const chatSchema = z.object({
  workspaceId: z.string().min(1),
  message: z.string().min(1, 'message is required').max(4000, 'message too long'),
});

/**
 * POST /api/chat — the RAG loop (ARCHITECTURE.md §3, §8).
 * Body: { workspaceId, message }
 */
export async function POST(request: NextRequest) {
  try {
    const tStart = Date.now();
    const user = await getAuthedUser();
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

    const { workspaceId, message } = parsed.data;
    
    // Hard constraint 4: verify ownership before any other logic.
    await getAuthedWorkspace(workspaceId, user.id);
    console.log(`[Timing] auth: ${Date.now() - tStart} ms`);

    const admin = getSupabaseAdmin();

    // Load prior history (workspace-scoped, rule 15) BEFORE saving the current
    // message, so the current turn isn't duplicated in the conversation.
    const tHistory = Date.now();
    const history = await loadHistory(workspaceId);
    console.log(`[Timing] history: ${Date.now() - tHistory} ms`);

    // Durability (§8): persist the user's message before the LLM call so a slow
    // or failed model call never loses it.
    await admin
      .from('chat_messages')
      .insert({ workspace_id: workspaceId, role: 'user', content: message });

    // Retrieval — isolation filter lives inside the vector query (rule 9).
    const tEmbed = Date.now();
    const queryEmbedding = await embedQuery(message);
    console.log(`[Timing] embedQuery: ${Date.now() - tEmbed} ms`);

    const tRetrieve = Date.now();
    const chunks = await retrieve(workspaceId, queryEmbedding);
    console.log(`[Timing] retrieve: ${Date.now() - tRetrieve} ms`);
    
    const context = buildContext(chunks);

    // Build the conversation: prior turns + the current question with CONTEXT.
    const contents: Content[] = [
      ...history,
      {
        role: 'user',
        parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION: ${message}` }],
      },
    ];

    // Call Gemini with RAG context and system prompt
    const tGenerate = Date.now();
    const response = await generate({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents,
    });
    console.log(`[Timing] generate: ${Date.now() - tGenerate} ms`);

    const answer = response.text ?? "I don't know based on this workspace's documents.";
    const citations = extractCitations(answer, chunks);

    // Persist the assistant's answer with citations.
    const tSave = Date.now();
    await admin.from('chat_messages').insert({
      workspace_id: workspaceId,
      role: 'assistant',
      content: answer,
      citations,
    });
    console.log(`[Timing] saveAnswer: ${Date.now() - tSave} ms`);

    return Response.json({
      answer,
      citations,
      // Retrieval-debug payload — proves which workspace + chunks the answer used.
      retrieval: {
        workspace_id: workspaceId,
        chunks: chunks.map((c) => ({
          document_id: c.document_id,
          filename: c.filename,
          chunk_index: c.chunk_index,
          similarity: c.similarity,
          preview: c.content.slice(0, 200),
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Load the last N messages for a workspace as Gemini Content turns, oldest first.
 * Assistant rows map to role 'model'. Always filtered by workspace_id (rule 15).
 */
async function loadHistory(workspaceId: string): Promise<Content[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('chat_messages')
    .select('role, content')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;

  const rows = (data ?? []).reverse() as Array<{ role: string; content: string }>;
  return rows.map((r) => ({
    role: r.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: r.content }],
  }));
}
