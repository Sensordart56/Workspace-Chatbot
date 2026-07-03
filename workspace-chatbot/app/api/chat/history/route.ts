import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

/**
 * GET /api/chat/history?workspaceId=... — workspace-scoped chat history for the
 * dashboard. Ownership verified before reading (rule 11, rule 15).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ValidationError('workspaceId is required');

    // Hard constraint 4: verify ownership before any other logic.
    await getAuthedWorkspace(workspaceId, user.id);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('chat_messages')
      .select('id, workspace_id, role, content, citations, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return Response.json({ messages: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}
