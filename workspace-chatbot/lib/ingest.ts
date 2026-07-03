import { getSupabaseAdmin } from '@/lib/supabase';
import { sha256Hex } from '@/lib/hash';
import { chunkText } from '@/lib/chunking';
import { embedDocument } from '@/lib/embeddings';
import { ValidationError } from '@/lib/errors';
import type { Document } from '@/types';

export const ALLOWED_EXTENSIONS = ['txt', 'md', 'pdf'];

export interface IngestResult {
  document: Document;
  duplicate: boolean;
  chunkCount: number;
}

export async function ingestDocument(params: {
  workspaceId: string;
  filename: string;
  bytes: Buffer;
  ext: string;
}): Promise<IngestResult> {
  const { workspaceId, filename, bytes, ext } = params;

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ValidationError(
      `Unsupported file type ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  const contentHash = sha256Hex(bytes);
  const admin = getSupabaseAdmin();

  // 1. Idempotency Check
  const { data: existing } = await admin
    .from('documents')
    .select('id, workspace_id, filename, content_hash, uploaded_at')
    .eq('workspace_id', workspaceId)
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existing) {
    return { document: existing as Document, duplicate: true, chunkCount: 0 };
  }

  // 2. Text Extraction
  const text = await extractText(bytes, ext);
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new ValidationError('No extractable text found in the document');
  }

  // 3. Document Insertion
  const { data: doc, error: docError } = await admin
    .from('documents')
    .insert({ workspace_id: workspaceId, filename, content_hash: contentHash })
    .select('id, workspace_id, filename, content_hash, uploaded_at')
    .single();
  if (docError) throw docError;

  // 4. Chunk Ingestion with Rollback deletion on failure (Constraint 4)
  try {
    const embeddings = await embedDocument(chunks);
    const rows = chunks.map((content, i) => ({
      workspace_id: workspaceId,
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: JSON.stringify(embeddings[i]), // pgvector bracketed-string format
    }));
    const { error: chunkError } = await admin.from('chunks').insert(rows);
    if (chunkError) throw chunkError;
  } catch (ingestError) {
    // Delete the document row to clean up and roll back from partial ingestion states
    await admin.from('documents').delete().eq('id', doc.id);
    throw ingestError;
  }

  return { document: doc as Document, duplicate: false, chunkCount: chunks.length };
}

/** Extract plain text from supported file types. */
export async function extractText(bytes: Buffer, ext: string): Promise<string> {
  if (ext === 'pdf') {
    const pdfParser = await import('pdf-parse');
    const parse = pdfParser.default || pdfParser;
    const data = await parse(bytes);
    return data.text ?? '';
  }
  return bytes.toString('utf-8');
}
