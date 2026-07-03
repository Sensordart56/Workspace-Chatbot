'use client';

import { useState } from 'react';

export interface RetrievalDebugData {
  workspace_id: string;
  chunks: Array<{
    document_id: string;
    filename: string;
    chunk_index: number;
    similarity: number;
    preview: string;
  }>;
}

/**
 * Retrieval-debug view (committed stretch goal). Shows exactly which workspace
 * and which chunks an answer drew from — the clean proof that isolation holds.
 * Collapsed by default; toggle to inspect.
 */
export default function RetrievalDebugPanel({ data }: { data: RetrievalDebugData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 rounded-lg border border-gray-800 bg-gray-950/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
      >
        <span>🔍 Retrieval debug — {data.chunks.length} chunk(s) from this workspace</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-gray-800 px-3 py-2">
          <p className="font-mono text-[11px] text-gray-500">
            workspace_id: {data.workspace_id}
          </p>
          {data.chunks.length === 0 ? (
            <p className="text-xs text-gray-500">
              No chunks retrieved — the answer should be an honest &quot;I don&apos;t know&quot;.
            </p>
          ) : (
            data.chunks.map((c, i) => (
              <div key={`${c.document_id}-${c.chunk_index}`} className="text-xs">
                <div className="text-gray-400">
                  <span className="text-blue-400">[{i + 1}]</span> {c.filename} · chunk{' '}
                  {c.chunk_index} · sim {c.similarity.toFixed(3)}
                </div>
                <div className="mt-0.5 text-gray-500">{c.preview}…</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
