'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import UploadForm from '@/components/UploadForm';
import DocumentList from '@/components/DocumentList';
import ChatWindow from '@/components/ChatWindow';
import TaskList from '@/components/TaskList';
import ToolCallLog from '@/components/ToolCallLog';
import RetrievalDebugPanel, { type RetrievalDebugData } from '@/components/RetrievalDebugPanel';

/**
 * Dashboard:
 * - Left Column: WorkspaceSwitcher, UploadForm, DocumentList, TaskList.
 * - Center Column: ChatWindow (flexes to fill vertical space).
 * - Right Column: RetrievalDebugPanel, ToolCallLog.
 * Everything is scoped to the active workspace.
 */
export default function DashboardPage() {
  const { activeWorkspace, workspaces, loading } = useWorkspace();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeRetrieval, setActiveRetrieval] = useState<RetrievalDebugData | null>(null);

  const bump = () => setRefreshKey((k) => k + 1);

  // Clear retrieval debug payload immediately upon switching workspaces
  useEffect(() => {
    setActiveRetrieval(null);
  }, [activeWorkspace?.id]);

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
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
      {/* Left Column: Switcher + Upload + Documents + Tasks */}
      <aside className="flex flex-col gap-4 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div className="flex flex-col gap-2 border-b border-gray-800 pb-4">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Active Workspace
          </label>
          <WorkspaceSwitcher />
        </div>
        <UploadForm workspaceId={activeWorkspace.id} onUploaded={bump} />
        <DocumentList workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
        <div className="border-t border-gray-800/60 pt-4">
          <TaskList workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
        </div>
      </aside>

      {/* Center Column: Chat Window */}
      <section className="min-h-0 flex flex-col">
        <ChatWindow
          key={activeWorkspace.id}
          workspaceId={activeWorkspace.id}
          onActivity={bump}
          onRetrieval={setActiveRetrieval}
        />
      </section>

      {/* Right Column: Retrieval Debug + Tool Call Log */}
      <aside className="flex flex-col gap-4 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Retrieval Debug
          </h3>
          {activeRetrieval ? (
            <RetrievalDebugPanel data={activeRetrieval} />
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-center text-xs text-gray-400">
              🔍 No query retrieval debug data loaded. Ask a question to inspect.
            </div>
          )}
        </div>
        <div className="border-t border-gray-800/60 pt-4">
          <ToolCallLog workspaceId={activeWorkspace.id} refreshKey={refreshKey} />
        </div>
      </aside>
    </div>
  );
}
