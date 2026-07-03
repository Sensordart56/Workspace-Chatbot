'use client';

import { useEffect, useState } from 'react';
import type { ToolCall } from '@/types';

/**
 * Dedicated tool-call log for the active workspace: every attempt with its
 * status (success/error), so failures are visible, not hidden.
 */
export default function ToolCallLog({
  workspaceId,
  refreshKey,
}: {
  workspaceId: string;
  refreshKey: number;
}) {
  const [calls, setCalls] = useState<ToolCall[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tool-calls?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { toolCalls: [] }))
      .then((d) => {
        if (!cancelled) setCalls(d.toolCalls ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, refreshKey]);

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Tool calls ({calls.length})
      </h3>
      {calls.length === 0 ? (
        <p className="text-xs text-gray-500">No tool calls yet.</p>
      ) : (
        <ul className="space-y-1">
          {calls.map((c) => (
            <li
              key={c.id}
              className="rounded-md bg-gray-850 px-2 py-1.5 text-xs text-gray-300"
            >
              <span className={c.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                {c.status === 'success' ? '✓' : '✗'}
              </span>{' '}
              <span className="font-mono">{c.tool_name}</span>
              {c.status === 'error' && c.result?.error ? (
                <span className="text-red-400"> — {String(c.result.error)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
