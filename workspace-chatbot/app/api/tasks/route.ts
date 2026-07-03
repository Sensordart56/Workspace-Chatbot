import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

/**
 * GET /api/tasks?workspaceId=... — tasks saved into the active workspace
 * (via the save_task tool), for the dashboard. Ownership verified first.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) throw new ValidationError('workspaceId is required');

    await getAuthedWorkspace(workspaceId, user.id);

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('tasks')
      .select('id, workspace_id, title, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Response.json({ tasks: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}
