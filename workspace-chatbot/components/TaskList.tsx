'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@/types';

/**
 * Tasks saved into the active workspace via the save_task tool — the visible
 * side effect that proves a tool actually fired and was recorded.
 */
export default function TaskList({
  workspaceId,
  refreshKey,
}: {
  workspaceId: string;
  refreshKey: number;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const currentKey = `${workspaceId}:${refreshKey}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tasks?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d) => {
        if (cancelled) return;
        setTasks(d.tasks ?? []);
        setLoadedKey(`${workspaceId}:${refreshKey}`);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, refreshKey]);

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Tasks ({tasks.length})
      </h3>
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-gray-500">No tasks yet.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-md bg-gray-850 px-2 py-1.5 text-sm text-gray-300"
            >
              ☑ {t.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
