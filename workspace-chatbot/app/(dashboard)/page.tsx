'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import UploadForm from '@/components/UploadForm';
import DocumentList from '@/components/DocumentList';
import ChatWindow from '@/components/ChatWindow';
import TaskList from '@/components/TaskList';
import ToolCallLog from '@/components/ToolCallLog';

/**
 * Dashboard: documents + upload (left Sidebar), chat (right main window).
 * Everything is scoped to the active workspace from WorkspaceProvider;
 * switching workspaces re-scopes every panel. `refreshKey` bumps after an upload
 * or a chat turn so the read-only panels re-fetch.
 */
export default function DashboardPage() {
  const { activeWorkspace, workspaces, loading } = useWorkspace();
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

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
        <p className="text-gray-400">
          Create your first workspace using the <strong>+ New</strong> button in the
          top bar to get started.
        </p>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <p className="py-20 text-center text-gray-400">Select a workspace to begin.</p>
    );
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_260px]">
      {/* Left: documents + upload */}
      <aside className="space-y-4 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <UploadForm workspaceId={activeWorkspace.id} onUploaded={bump} />
        <DocumentList workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
      </aside>

      {/* Center: chat window */}
      <section className="min-h-0">
        <ChatWindow
          key={activeWorkspace.id}
          workspaceId={activeWorkspace.id}
          onActivity={bump}
        />
      </section>

      {/* Right: tasks + tool-call log */}
      <aside className="space-y-4 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <TaskList workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
        <ToolCallLog workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
      </aside>
    </div>
  );
}
