// Shared types. Field names are snake_case to match the database columns.

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  content_hash: string;
  uploaded_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
}

/** A citation extracted from an assistant answer, mapped back to its source chunk. */
export interface Citation {
  n: number; // the [N] marker number in the answer text
  document_id: string;
  filename: string;
  chunk_index: number;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface ToolCall {
  id: string;
  workspace_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: 'success' | 'error';
  created_at: string;
}

/** A chunk returned from the vector search, with its similarity score and source. */
export interface RetrievedChunk {
  id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

/** Retrieval-debug metadata returned with a chat answer to prove isolation. */
export interface RetrievalDebug {
  workspace_id: string;
  chunks: RetrievedChunk[];
}

