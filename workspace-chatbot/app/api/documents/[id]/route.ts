import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { errorResponse, ValidationError, ForbiddenError } from '@/lib/errors';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * DELETE /api/documents/[id]?workspaceId=... — delete a document.
 * Cascades to associated chunks in the database.
 * Ownership check: getAuthedWorkspace() verified before deletion.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthedUser();
    const { id } = await params;

    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      throw new ValidationError('workspaceId is required');
    }

    // Rule 11: verify workspace ownership before any mutations
    await getAuthedWorkspace(workspaceId, user.id);

    const admin = getSupabaseAdmin();

    // Verify the document belongs to the verified workspace
    const { data: doc, error: docError } = await admin
      .from('documents')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      throw new ValidationError('Document not found');
    }

    if (doc.workspace_id !== workspaceId) {
      throw new ForbiddenError('Document does not belong to this workspace');
    }

    // Delete the document row (on delete cascade deletes related chunks)
    const { error: deleteError } = await admin
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
