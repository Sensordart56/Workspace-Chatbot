-- Multi-Workspace Document Assistant — Full Schema
-- Run this in the Supabase SQL Editor after enabling the pgvector extension.
--
-- Prerequisites:
--   1. Enable pgvector: Database → Extensions → search "vector" → Enable
--   2. Paste this entire file into the SQL Editor and run it.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  filename text not null,
  content_hash text not null,
  uploaded_at timestamptz not null default now(),
  unique (workspace_id, content_hash)
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index if not exists chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index if not exists chunks_workspace_idx on chunks (workspace_id);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null,
  result jsonb,
  status text not null check (status in ('success','error')),
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row-Level Security (defense-in-depth)
-- ============================================================================
-- RLS policies restrict access to rows owned by the authenticated user.
-- Application code still filters explicitly, but RLS is a safety net.
-- Note: service-role queries bypass RLS, so vector search still needs
-- WHERE workspace_id = $x as the primary isolation mechanism.

-- Workspaces: users can only CRUD their own workspaces
alter table workspaces enable row level security;

create policy "Users can view their own workspaces"
  on workspaces for select
  using (owner_id = auth.uid());

create policy "Users can create their own workspaces"
  on workspaces for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own workspaces"
  on workspaces for update
  using (owner_id = auth.uid());

create policy "Users can delete their own workspaces"
  on workspaces for delete
  using (owner_id = auth.uid());

-- Documents: scoped to workspaces the user owns
alter table documents enable row level security;

create policy "workspace_isolation" on documents
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Chunks: scoped to workspaces the user owns
alter table chunks enable row level security;

create policy "workspace_isolation" on chunks
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Chat messages: scoped to workspaces the user owns
alter table chat_messages enable row level security;

create policy "workspace_isolation" on chat_messages
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Tool calls: scoped to workspaces the user owns
alter table tool_calls enable row level security;

create policy "workspace_isolation" on tool_calls
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Tasks: scoped to workspaces the user owns
alter table tasks enable row level security;

create policy "workspace_isolation" on tasks
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
