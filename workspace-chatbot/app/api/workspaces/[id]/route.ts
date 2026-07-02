import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { createServerComponentClient } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

const renameWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/workspaces/[id] — Rename a workspace.
 * Body: { name: string }
 * Ownership check: getAuthedWorkspace() called before any mutation.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthedUser();
    const { id } = await params;

    // AGENTS.md rule 11: verify ownership before any logic
    await getAuthedWorkspace(id, user.id);

    const body = await request.json();
    const parsed = renameWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const supabase = await createServerComponentClient();

    const { data, error } = await supabase
      .from('workspaces')
      .update({ name: parsed.data.name })
      .eq('id', id)
      .select('id, name, owner_id, created_at')
      .single();

    if (error) throw error;

    return Response.json({ workspace: data });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/workspaces/[id] — Delete a workspace (cascades to all child data).
 * Ownership check: getAuthedWorkspace() called before deletion.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthedUser();
    const { id } = await params;

    // AGENTS.md rule 11: verify ownership before any logic
    await getAuthedWorkspace(id, user.id);

    const supabase = await createServerComponentClient();

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
