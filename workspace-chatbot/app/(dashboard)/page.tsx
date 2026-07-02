'use client';

import { useWorkspace } from '@/components/providers/WorkspaceProvider';

/**
 * Dashboard home page — Phase 1 placeholder.
 * Shows the active workspace name and a "coming soon" message.
 * Will be expanded in Phase 5 with DocumentList, ChatWindow, ToolCallLog.
 */
export default function DashboardPage() {
  const { activeWorkspace, workspaces, loading } = useWorkspace();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h2 className="mb-2 text-xl font-semibold text-white">
          Welcome to Doc Assistant
        </h2>
        <p className="mb-6 text-gray-400">
          Create your first workspace using the <strong>+ New</strong> button
          in the top bar to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">
          {activeWorkspace?.name ?? 'Select a workspace'}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Workspace ID: {activeWorkspace?.id ?? '—'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
        <p className="text-gray-400">
          Phase 1 complete — upload, chat, and tools coming in the next phases.
        </p>
      </div>
    </div>
  );
}
