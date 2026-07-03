import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

/**
 * GET /api/tool-calls?workspaceId=... — the tool-call log for the active
 * workspace (name, arguments, result, status). Ownership verified first.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ValidationError('workspaceId is required');

    await getAuthedWorkspace(workspaceId, user.id);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('tool_calls')
      .select('id, workspace_id, tool_name, arguments, result, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Response.json({ toolCalls: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}
