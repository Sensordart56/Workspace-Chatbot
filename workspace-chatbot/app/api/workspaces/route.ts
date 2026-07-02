import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthedUser } from '@/lib/auth';
import { createServerComponentClient } from '@/lib/supabase';
import { errorResponse, ValidationError } from '@/lib/errors';

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

/**
 * GET /api/workspaces — List the current user's workspaces.
 */
export async function GET() {
  try {
    const user = await getAuthedUser();
    const supabase = await createServerComponentClient();

    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, owner_id, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return Response.json({ workspaces: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/workspaces — Create a new workspace for the current user.
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    const body = await request.json();

    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const supabase = await createServerComponentClient();

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: parsed.data.name, owner_id: user.id })
      .select('id, name, owner_id, created_at')
      .single();

    if (error) throw error;

    return Response.json({ workspace: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
