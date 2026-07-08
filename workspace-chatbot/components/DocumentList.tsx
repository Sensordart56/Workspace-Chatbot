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
  onActivity,
}: {
  workspaceId: string;
  refreshKey: number;
  onActivity?: () => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [localTrigger, setLocalTrigger] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Track which (workspace, refresh, localTrigger) the current documents belong to
  const currentKey = `${workspaceId}:${refreshKey}:${localTrigger}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d) => {
        if (cancelled) return;
        setDocuments(d.documents ?? []);
        setLoadedKey(currentKey);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, refreshKey, localTrigger, currentKey]);

  async function handleDelete(docId: string, docName: string) {
    if (!window.confirm(`Are you sure you want to remove "${docName}"? This will permanently delete its text and vector search chunks.`)) {
      return;
    }

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      if (onActivity) {
        onActivity();
      } else {
        setLocalTrigger((t) => t + 1);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }

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
              className="flex items-center justify-between rounded-md bg-gray-800/50 px-2 py-1.5 text-sm text-gray-300"
              title={doc.filename}
            >
              <span className="truncate flex-1">📄 {doc.filename}</span>
              <button
                type="button"
                disabled={deletingId === doc.id}
                onClick={() => handleDelete(doc.id, doc.filename)}
                title="Remove document"
                className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-400 p-0.5 rounded transition-colors disabled:opacity-50"
              >
                {deletingId === doc.id ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-500 border-t-transparent" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
