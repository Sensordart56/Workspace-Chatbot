import { NextRequest } from 'next/server';
import { getAuthedUser, getAuthedWorkspace } from '@/lib/auth';
import { errorResponse, ValidationError } from '@/lib/errors';
import { ingestDocument, ALLOWED_EXTENSIONS } from '@/lib/ingest';

// PDF parsing + embedding need the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload — ingest a document into the active workspace.
 * multipart/form-data: { workspaceId: string, file: File }
 *
 * Idempotent: re-uploading identical bytes into the same workspace is a no-op.
 * Verifies active workspace ownership first.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser();

    const form = await request.formData();
    const workspaceId = form.get('workspaceId');
    const file = form.get('file');

    if (typeof workspaceId !== 'string' || !workspaceId) {
      throw new ValidationError('workspaceId is required');
    }

    // Constraint 5: call getAuthedWorkspace() before any ingestion logic
    await getAuthedWorkspace(workspaceId, user.id);

    if (!(file instanceof File)) {
      throw new ValidationError('file is required');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationError(
        `Unsupported file type ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new ValidationError('File is empty');
    }
    if (bytes.byteLength > MAX_BYTES) {
      throw new ValidationError('File exceeds 5 MB limit');
    }

    const result = await ingestDocument({
      workspaceId,
      filename: file.name,
      bytes,
      ext,
    });

    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
