'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import RenameWorkspaceModal from './RenameWorkspaceModal';
import DeleteWorkspaceModal from './DeleteWorkspaceModal';

/**
 * Workspace switcher — dropdown + actions to create/rename/delete workspaces.
 */
export default function WorkspaceSwitcher() {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    loading,
  } = useWorkspace();

  const [showCreate, setShowCreate] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 justify-between">
        {workspaces.length > 0 ? (
          <select
            id="workspace-switcher"
            value={activeWorkspace?.id ?? ''}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

        {workspaces.length > 0 && activeWorkspace && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowRename(true)}
              title="Rename workspace"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-850 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              title="Delete workspace"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-850 hover:text-red-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="w-full rounded-lg border border-dashed border-gray-600 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500 hover:text-white transition-colors text-center"
      >
        + New Workspace
      </button>

      <CreateWorkspaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      
      {activeWorkspace && (
        <>
          <RenameWorkspaceModal
            isOpen={showRename}
            onClose={() => setShowRename(false)}
            workspaceId={activeWorkspace.id}
            currentName={activeWorkspace.name}
          />
          <DeleteWorkspaceModal
            isOpen={showDelete}
            onClose={() => setShowDelete(false)}
            workspaceId={activeWorkspace.id}
            workspaceName={activeWorkspace.name}
          />
        </>
      )}
    </div>
  );
}
