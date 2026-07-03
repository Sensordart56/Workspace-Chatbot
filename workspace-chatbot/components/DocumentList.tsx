'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@/types';

/**
 * Lists the active workspace's documents. Re-fetches when the workspace changes
 * or when `refreshKey` bumps (e.g. after an upload).
 */
export default function DocumentList({
  workspaceId,
  refreshKey,
}: {
  workspaceId: string;
  refreshKey: number;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  // Track which (workspace, refresh) the current documents belong to, so we can
  // show a loading state without calling setState synchronously in the effect.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const currentKey = `${workspaceId}:${refreshKey}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d) => {
        if (cancelled) return;
        setDocuments(d.documents ?? []);
        setLoadedKey(`${workspaceId}:${refreshKey}`);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, refreshKey]);

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Documents ({documents.length})
      </h3>
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-gray-500">No documents yet. Upload one above.</p>
      ) : (
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="truncate rounded-md bg-gray-800/50 px-2 py-1.5 text-sm text-gray-300"
              title={doc.filename}
            >
              📄 {doc.filename}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
