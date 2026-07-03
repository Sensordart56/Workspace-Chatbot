import { createHash } from 'crypto';

/**
 * SHA-256 hex digest of raw file bytes — used as `content_hash` for idempotent
 * re-upload detection (ARCHITECTURE.md §6). The same file bytes always produce
 * the same hash, so `(workspace_id, content_hash)` uniquely identifies a document
 * within a workspace.
 */
export function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
