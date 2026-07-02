import { createServerComponentClient, getSupabaseAdmin } from './supabase';
import { UnauthorizedError, ForbiddenError } from './errors';

/**
 * Get the authenticated user from the current request.
 * Uses supabase.auth.getUser() (server-side validation, not just local JWT decode).
 * Throws UnauthorizedError (401) if not authenticated.
 */
export async function getAuthedUser(): Promise<{ id: string; email: string }> {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return { id: user.id, email: user.email ?? '' };
}

/**
 * Verify the authenticated user owns the given workspace.
 * Uses getSupabaseAdmin() (service-role) so RLS doesn't interfere with the check.
 *
 * Must be called at the top of every API route that accepts a workspaceId,
 * BEFORE any other logic. (AGENTS.md rule 11, ARCHITECTURE.md §1c)
 *
 * Throws ForbiddenError (403) if the user does not own the workspace.
 */
export async function getAuthedWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ id: string; name: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw new ForbiddenError('Not your workspace');
  }

  return data;
}
