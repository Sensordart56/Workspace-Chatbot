'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

/**
 * Workspace switcher — dropdown + create new workspace form.
 * Lives in the top nav bar, always visible (PLAN.md requirement).
 */
export default function WorkspaceSwitcher() {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    refreshWorkspaces,
    loading,
  } = useWorkspace();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      const data = await res.json();
      await refreshWorkspaces();

      // Switch to the newly created workspace
      setActiveWorkspace(data.workspace.id);
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {workspaces.length > 0 ? (
        <select
          id="workspace-switcher"
          value={activeWorkspace?.id ?? ''}
          onChange={(e) => setActiveWorkspace(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-gray-400">No workspaces yet</span>
      )}

      {showCreate ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            autoFocus
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? '…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(''); setError(null); }}
            className="rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg border border-dashed border-gray-600 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
        >
          + New
        </button>
      )}
    </div>
  );
}
