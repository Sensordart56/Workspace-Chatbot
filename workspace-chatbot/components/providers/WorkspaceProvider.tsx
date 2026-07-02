'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Workspace } from '@/types';

interface WorkspaceContextValue {
  /** All workspaces owned by the current user */
  workspaces: Workspace[];
  /** The currently active workspace, or null if none exist yet */
  activeWorkspace: Workspace | null;
  /** Switch the active workspace — updates context + localStorage */
  setActiveWorkspace: (id: string) => void;
  /** Re-fetch the workspace list from the API */
  refreshWorkspaces: () => Promise<void>;
  /** True while the initial fetch is in progress */
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = 'activeWorkspaceId';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) return;
      const data = await res.json();
      const list: Workspace[] = data.workspaces ?? [];
      setWorkspaces(list);

      // Resolve active workspace:
      // 1. If localStorage has a valid ID, use it
      // 2. Otherwise default to the first workspace
      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedExists = list.some((ws) => ws.id === savedId);

      if (savedId && savedExists) {
        setActiveId(savedId);
      } else if (list.length > 0) {
        setActiveId(list[0].id);
        localStorage.setItem(STORAGE_KEY, list[0].id);
      } else {
        setActiveId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const setActiveWorkspace = useCallback(
    (id: string) => {
      setActiveId(id);
      localStorage.setItem(STORAGE_KEY, id);
    },
    []
  );

  const activeWorkspace = workspaces.find((ws) => ws.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook to access workspace context. Must be used inside WorkspaceProvider.
 */
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider');
  }
  return ctx;
}
