# PLAN.md — Milestones & Build Order

See `AGENTS.md` for coding rules and `ARCHITECTURE.md` for the technical design this
plan implements.

## Folder Structure

```
/app
  /(auth)
    /login
    /signup
  /(dashboard)
    page.tsx              -- documents, chat, tool-call log, workspace switcher
  /api
    /workspaces/route.ts       -- POST create, GET list
    /workspaces/[id]/route.ts  -- switch/rename/delete
    /upload/route.ts           -- ingest a document into the active workspace
    /chat/route.ts              -- RAG + tool-calling loop
/components
  ChatWindow.tsx          -- inline tool-call cards + chat messages
  DocumentList.tsx
  ToolCallLog.tsx          -- dedicated dashboard tool-call log
  WorkspaceSwitcher.tsx    -- persistent in top nav, always visible
  UploadForm.tsx
  RetrievalDebugPanel.tsx   -- stretch goal
/lib
  supabase.ts               -- client + server Supabase clients
  gemini.ts                 -- chat/tool-calling model wrapper
  embeddings.ts              -- embedding calls
  chunking.ts                -- text splitting
  rag.ts                     -- retrieval + context building
  tools.ts                   -- tool schemas, validation, execution
  auth.ts                     -- session helpers
/supabase
  schema.sql                 -- from ARCHITECTURE.md §Data Model
/types
  index.ts
/scripts
  seed.ts                  -- creates test user, 2 workspaces, sample docs
.env.example
AGENTS.md
PLAN.md
ARCHITECTURE.md
README.md
AI_NOTES.md
```

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/workspaces` | Create a workspace |
| GET | `/api/workspaces` | List the current user's workspaces |
| POST | `/api/upload` | Upload + ingest a document into the active workspace |
| POST | `/api/chat` | Ask a question — runs retrieval + tool-calling loop, returns answer + citations |

Dashboard data (documents, chat history, tool-call log) is read directly by server
components querying Supabase — no separate `/api/dashboard` endpoint. This is the
idiomatic pattern for the App Router, not a REST-everywhere approach.

## Build Phases

| Phase | Goal | Key files/routes | DB changes | Manual test | Done when |
|---|---|---|---|---|---|
| 1 | Auth + workspace CRUD + switcher | `/api/workspaces`, `WorkspaceSwitcher.tsx`, `auth.ts` | `workspaces` | Create 2 workspaces, switch between them, refresh page | Login works; workspaces persist; switching updates active context everywhere |
| 2 | Ingestion pipeline | `/api/upload`, `chunking.ts`, `embeddings.ts` | `documents`, `chunks` | Upload same file twice | Chunks tagged with correct `workspace_id`; duplicate upload is a no-op, not a duplicate insert. PDF parsing works via `pdf-parse`. |
| 3 | Retrieval + RAG chat (no tools yet) | `/api/chat`, `rag.ts`, `gemini.ts` | `chat_messages` | Run the isolation test (ARCHITECTURE.md §3) by hand | Answers cite sources; isolation test passes; unanswerable questions get an honest "I don't know" |
| 4 | Tool-calling loop | `tools.ts`, extend `/api/chat` | `tool_calls`, `tasks` | Trigger a valid call, an unknown tool name, and malformed args | Both tools work; invalid calls are logged as errors and don't crash the app |
| 5 | Dashboard | `(dashboard)/page.tsx` + components | — | View docs/chat/tool-log per workspace, switch and confirm scoping | All four dashboard elements visible and correctly workspace-scoped |
| 6 | Stretch goals | see below, time-permitting | — | — | — |

## Stretch Goals (priority order)
1. Retrieval-debug view — **committed** — directly proves isolation to a grader; highest ROI
2. Everything below is only if time remains after core + retrieval-debug:
   - Streaming responses
   - Observability (token counts, latency, retrieval hit/miss, tool success/fail history)
   - Multi-step tool use (loop in ARCHITECTURE.md §5 already supports this)
   - Hybrid search / re-ranking
   - Opt-in cross-workspace document sharing

## Completion Checklist

- [ ] Login
- [ ] Workspace creation
- [ ] Workspace switching (switcher is in top nav, always visible)
- [ ] Upload (2+ documents)
- [ ] Duplicate upload detection (idempotent ingestion)
- [ ] Embeddings stored correctly, tagged with workspace
- [ ] Vector search scoped to active workspace only
- [ ] Citations included in answers (numbered [1] format, linked to source)
- [ ] Honest "I don't know" when unanswerable
- [ ] `save_task` tool works and is logged
- [ ] `send_channel_summary` tool works, logged, and output is sanitized
- [ ] Unknown tool name / malformed args handled without crashing
- [ ] Tool calls shown inline in chat + in dedicated ToolCallLog
- [ ] Dashboard: docs, chat history, tool log, switcher
- [ ] Retrieval-debug view (stretch — committed)
- [ ] Deployed to a public URL
- [ ] `.env.example` committed with no real secrets
- [ ] `README.md` written (includes: what it does, local setup, env vars, deployment, sample questions)
- [ ] `AI_NOTES.md` written
- [ ] `AGENTS.md`, `PLAN.md`, `ARCHITECTURE.md` included in the repo
- [ ] Seed script: 2 workspaces with sample docs + throwaway test account
- [ ] Sample questions in README (including the isolation test question)
- [ ] No secrets in logs — no logging of env vars, auth headers, or webhook URLs
- [ ] Concurrency noted as a known limitation in README or AI_NOTES

## Deployment Notes

- Push to GitHub with real commit history (not one giant commit).
- Import the repo into Vercel; set every variable from `.env.example` in Vercel's
  project settings — never commit real values.
- Confirm Supabase's connection pooling (`pgbouncer` mode) is used for the serverless
  connection string, since Vercel functions are short-lived.
- Run `next build` locally before deploying, to catch build-time errors early.
- Smoke test the live URL end-to-end before calling it done: log in, switch workspaces,
  upload, ask a question, watch a tool actually fire.
