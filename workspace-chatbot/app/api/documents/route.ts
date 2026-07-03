import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

/**
 * GET /api/documents?workspaceId=... — list documents in the active workspace,
 * for the dashboard's document panel. Ownership is verified before reading.
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
      .from('documents')
      .select('id, workspace_id, filename, content_hash, uploaded_at')
      .eq('workspace_id', workspaceId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;

    return Response.json({ documents: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}
