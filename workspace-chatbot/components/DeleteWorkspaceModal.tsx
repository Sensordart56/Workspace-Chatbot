'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export default function DeleteWorkspaceModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
}: DeleteWorkspaceModalProps) {
  const { refreshWorkspaces } = useWorkspace();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete workspace');
      }

      await refreshWorkspaces();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Delete Workspace</h2>
          <p className="text-sm text-gray-400 mt-2">
            Are you sure you want to delete <strong className="text-white">{workspaceName}</strong>?
          </p>
          <div className="mt-3 rounded-lg bg-red-500/10 p-3.5 border border-red-500/20 text-xs text-red-400 leading-relaxed">
            ⚠️ <strong>Warning:</strong> This action is permanent. It will immediately delete all documents, chunks, chat history, tasks, and tool logs associated with this workspace. This action cannot be undone.
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? 'Deleting…' : 'Delete Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
