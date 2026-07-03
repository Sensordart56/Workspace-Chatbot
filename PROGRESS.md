# PROGRESS.md — Current Build State

> Read this first at the start of every session — context does not persist between
> sessions. Update it at the end of every session, or before ending any task.

## Current Phase
Phase 4 (Tool Calling) complete, verified end-to-end against real Supabase database and Gemini API. Ready for Phase 5 (Dashboard remainder and UI scoping checks).

## Last Completed
- Scaffolded Next.js App Router project inside `workspace-chatbot` folder.
- Installed dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `zod`).
- Created TypeScript types for Workspaces (`types/index.ts`).
- Created custom HTTP error classes and response utilities (`lib/errors.ts`).
- Configured dynamic and safe Supabase browser, server, and service-role admin clients (`lib/supabase.ts`) with lazy-loaded admin client and runtime validation that fails fast in production.
- Configured auth helpers for session extraction and workspace ownership verification (`lib/auth.ts`) utilizing the new lazy-loaded admin client getter.
- Set up redirect and session refresh middleware (`middleware.ts`).
- Created login page, signup page, and shared auth layout (`app/(auth)`).
- Implemented workspace listing and creation API routes (`app/api/workspaces/route.ts`).
- Implemented workspace renaming and deletion API routes (`app/api/workspaces/[id]/route.ts`) with ownership verification.
- Developed stateful `WorkspaceProvider` (localStorage persistence) and `WorkspaceSwitcher` dropdown component.
- Implemented skeleton dashboard layout and workspace page.
- Created `supabase/schema.sql` defining full schema tables and Row-Level Security policies.
- Deleted conflicting root `app/page.tsx` to align App Router routing.
- Resolved Zod validation type issue (`parsed.error.errors` -> `parsed.error.issues`) and verified that the production build compiles successfully via `next build`.
- Fixed the Supabase URL format in `.env.local` by stripping the trailing `/rest/v1/` subpath.
- Created a `scripts/confirm-user.ts` helper script and successfully registered/confirmed the test user `grader-test-unique5@gmail.com` programmatically.
- Completed manual E2E verification of Phase 1 using the browser subagent:
  - Verified redirect from `/` to `/login` for unauthenticated visitors.
  - Verified signup/login/redirection flow using the user `grader-test-unique5@gmail.com`.
  - Verified Workspace A creation and dropdown switcher population.
  - Verified Workspace B creation and switching selection.
  - Verified active workspace persistence across page refreshes (localStorage).
  - Verified logout/signout redirects immediately back to `/login`.
- Created a `scripts/test-rls.ts` script to test API PATCH and DELETE endpoints against RLS constraints. Verified that:
  - Workspace renaming (RLS UPDATE policy) succeeds and returns the updated workspace row.
  - Workspace deletion (RLS DELETE policy) succeeds.
- Appended `match_chunks` RPC vector search function to `supabase/schema.sql`.
- Installed production dependencies `@google/genai` and `pdf-parse@1.1.1` (pure JS version with zero native binary compilation dependencies to ensure safe Vercel deployments), and added type definitions under `types/pdf-parse.d.ts`.
- Implemented hashing utility (`lib/hash.ts`), text chunker (`lib/chunking.ts`) with boundary paragraph/sentence splits, and L2-normalized sequential embeddings generation (`lib/embeddings.ts`) using `gemini-embedding-001` with exponential backoff.
- Created ingestion pipeline orchestrator (`lib/ingest.ts`) that extracts text, runs chunking/embeddings, inserts records, and performs rollback-style deletion of the document if database chunk insertions fail midway.
- Created `/api/upload` POST route (`app/api/upload/route.ts`) which enforces active workspace ownership via `getAuthedWorkspace` before executing document ingestion.
- Built a validation script `scripts/test-ingestion.ts` which automatically:
  - Dynamically queries the database for the active test workspace (no hardcoded test accounts).
  - Ingests a mock text document and verifies document/chunk records are saved.
  - Ingests the same document again and verifies duplicate check catches it (`duplicate: true`).
  - Simulates vector format failure (10 dimensions instead of 768) and verifies rollback deletes the document row cleanly.
  - Reads and parses the 1.5MB assignment specification PDF file using `pdf-parse@1.1.1`, producing 7 chunks with successful sequential embeddings generation and storage.
- Created dummy PDF file at `test/data/05-versions-space.pdf` to bypass `pdf-parse` debug self-check file lookup.
- Verified that `npm run build` compiles 100% successfully with type checks passing cleanly.
- Implemented RAG retriever, context builder, and citation parser (`lib/rag.ts`) with similarity threshold filtering >= 0.50 to prune unrelated chunks and optimize token usage.
- Created Gemini model client wrapper (`lib/gemini.ts`) using `gemini-3.1-flash-lite` with route-safe 25-second timeouts and single 429 rate limit retries.
- Created chat message endpoint `/api/chat` (`app/api/chat/route.ts`) with active workspace tenancy validation, workspace-scoped chat history retrieval, user prompt database persistence, and assistant answer/citation storage.
- Created chat history loading endpoint `/api/chat/history` (`app/api/chat/history/route.ts`) and document listing endpoint `/api/documents` (`app/api/documents/route.ts`), enforcing workspace ownership checks.
- Created dashboard React UI components: `UploadForm.tsx` (idempotent skips), `DocumentList.tsx`, `ChatWindow.tsx` (inline citations, thinking states, no tool panels), and `RetrievalDebugPanel.tsx` (collapsible source details).
- Refactored dashboard shell `app/(dashboard)/page.tsx` to render sidebar list and main chat panel keyed by active workspace ID.
- Added duration timing checkpoints to chat POST API handler.
- Developed automated RAG integration tests script `scripts/test-rag.ts` validating:
  - Grounded Zinnia fact retrieval, citations mapping, and debug chunk payloads in Workspace A.
  - Grounded refusal and zero leakages in isolated Workspace B.
  - Workspace-scoped chat history and document listing isolation.
- Verified all TypeScript compilations and Next.js static page generation builds successfully.
- Created tools schema, declarations, and execution router (`lib/tools.ts`) implementing Zod schema validations, active workspace context injection, AbortController timeouts (10s), mention-injection sanitization, and structured failure mappings.
- Extended POST `/api/chat` endpoint to run a 3-step loop for tool declarations, execute multiple predicted tool calls, push functionCall/functionResponse Turns, and fallback to forced plain-text generation if Cap is exhausted. Returns toolCalls list in JSON.
- Created GET `/api/tasks` and GET `/api/tool-calls` routes enforcing user session workspace tenancy ownership.
- Developed dashboard panels `components/TaskList.tsx` and `components/ToolCallLog.tsx` wired into sidebar, and modified `components/ChatWindow.tsx` to render inline ToolCallCard outcomes.
- Built automated tools integration tests script `scripts/test-tools.ts` proving:
  - Valid `save_task` inserts tasks row and logs `success`.
  - Valid `send_channel_summary` posts safely (webhook integration).
  - Unknown tools/malformed arguments logged as `error` without throwing.
  - Document-level prompt-injection ignored as inert context with no tools run.
  - Sanitization neutralizes `@everyone`, `@here`, role, and user mentions.

## Current Phase
Phase 5 (Dashboard Composition & Polish) complete, verified compile success, layout composition, strict workspace isolation, cross-component state synchronization, and inline UI enhancements. Ready for deployment.

## Last Completed
- Scaffolded Next.js App Router project inside `workspace-chatbot` folder.
- Installed dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `zod`).
- Created TypeScript types for Workspaces (`types/index.ts`).
- Created custom HTTP error classes and response utilities (`lib/errors.ts`).
- Configured dynamic and safe Supabase browser, server, and service-role admin clients (`lib/supabase.ts`) with lazy-loaded admin client and runtime validation that fails fast in production.
- Configured auth helpers for session extraction and workspace ownership verification (`lib/auth.ts`) utilizing the new lazy-loaded admin client getter.
- Set up redirect and session refresh middleware (`middleware.ts`).
- Created login page, signup page, and shared auth layout (`app/(auth)`).
- Implemented workspace listing and creation API routes (`app/api/workspaces/route.ts`).
- Implemented workspace renaming and deletion API routes (`app/api/workspaces/[id]/route.ts`) with ownership verification.
- Developed stateful `WorkspaceProvider` (localStorage persistence) and `WorkspaceSwitcher` dropdown component.
- Implemented skeleton dashboard layout and workspace page.
- Created `supabase/schema.sql` defining full schema tables and Row-Level Security policies.
- Deleted conflicting root `app/page.tsx` to align App Router routing.
- Resolved Zod validation type issue (`parsed.error.errors` -> `parsed.error.issues`) and verified that the production build compiles successfully via `next build`.
- Fixed the Supabase URL format in `.env.local` by stripping the trailing `/rest/v1/` subpath.
- Created a `scripts/confirm-user.ts` helper script and successfully registered/confirmed the test user `grader-test-unique5@gmail.com` programmatically.
- Completed manual E2E verification of Phase 1 using the browser subagent:
  - Verified redirect from `/` to `/login` for unauthenticated visitors.
  - Verified signup/login/redirection flow using the user `grader-test-unique5@gmail.com`.
  - Verified Workspace A creation and dropdown switcher population.
  - Verified Workspace B creation and switching selection.
  - Verified active workspace persistence across page refreshes (localStorage).
  - Verified logout/signout redirects immediately back to `/login`.
- Created a `scripts/test-rls.ts` script to test API PATCH and DELETE endpoints against RLS constraints. Verified that:
  - Workspace renaming (RLS UPDATE policy) succeeds and returns the updated workspace row.
  - Workspace deletion (RLS DELETE policy) succeeds.
- Appended `match_chunks` RPC vector search function to `supabase/schema.sql`.
- Installed production dependencies `@google/genai` and `pdf-parse@1.1.1` (pure JS version with zero native binary compilation dependencies to ensure safe Vercel deployments), and added type definitions under `types/pdf-parse.d.ts`.
- Implemented hashing utility (`lib/hash.ts`), text chunker (`lib/chunking.ts`) with boundary paragraph/sentence splits, and L2-normalized sequential embeddings generation (`lib/embeddings.ts`) using `gemini-embedding-001` with exponential backoff.
- Created ingestion pipeline orchestrator (`lib/ingest.ts`) that extracts text, runs chunking/embeddings, inserts records, and performs rollback-style deletion of the document if database chunk insertions fail midway.
- Created `/api/upload` POST route (`app/api/upload/route.ts`) which enforces active workspace ownership via `getAuthedWorkspace` before executing document ingestion.
- Built a validation script `scripts/test-ingestion.ts` which automatically:
  - Dynamically queries the database for the active test workspace (no hardcoded test accounts).
  - Ingests a mock text document and verifies document/chunk records are saved.
  - Ingests the same document again and verifies duplicate check catches it (`duplicate: true`).
  - Simulates vector format failure (10 dimensions instead of 768) and verifies rollback deletes the document row cleanly.
  - Reads and parses the 1.5MB assignment specification PDF file using `pdf-parse@1.1.1`, before executing document ingestion.
- Created dummy PDF file at `test/data/05-versions-space.pdf` to bypass `pdf-parse` debug self-check file lookup.
- Verified that `npm run build` compiles 100% successfully with type checks passing cleanly.
- Implemented RAG retriever, context builder, and citation parser (`lib/rag.ts`) with similarity threshold filtering >= 0.50 to prune unrelated chunks and optimize token usage.
- Created Gemini model client wrapper (`lib/gemini.ts`) using `gemini-3.1-flash-lite` with route-safe 25-second timeouts and single 429 rate limit retries.
- Created chat message endpoint `/api/chat` (`app/api/chat/route.ts`) with active workspace tenancy validation, workspace-scoped chat history retrieval, user prompt database persistence, and assistant answer/citation storage.
- Created chat history loading endpoint `/api/chat/history` (`app/api/chat/history/route.ts`) and document listing endpoint `/api/documents` (`app/api/documents/route.ts`), enforcing workspace ownership checks.
- Created dashboard React UI components: `UploadForm.tsx` (idempotent skips), `DocumentList.tsx`, `ChatWindow.tsx` (inline citations, thinking states, no tool panels), and `RetrievalDebugPanel.tsx` (collapsible source details).
- Refactored dashboard shell `app/(dashboard)/page.tsx` to render sidebar list and main chat panel keyed by active workspace ID.
- Added duration timing checkpoints to chat POST API handler.
- Developed automated RAG integration tests script `scripts/test-rag.ts` validating:
  - Grounded Zinnia fact retrieval, citations mapping, and debug chunk payloads in Workspace A.
  - Grounded refusal and zero leakages in isolated Workspace B.
  - Workspace-scoped chat history and document listing isolation.
- Verified all TypeScript compilations and Next.js static page generation builds successfully.
- Created tools schema, declarations, and execution router (`lib/tools.ts`) implementing Zod schema validations, active workspace context injection, AbortController timeouts (10s), mention-injection sanitization, and structured failure mappings.
- Extended POST `/api/chat` endpoint to run a 3-step loop for tool declarations, execute multiple predicted tool calls, push functionCall/functionResponse Turns, and fallback to forced plain-text generation if Cap is exhausted. Returns toolCalls list in JSON.
- Created GET `/api/tasks` and GET `/api/tool-calls` routes enforcing user session workspace tenancy ownership.
- Developed dashboard panels `components/TaskList.tsx` and `components/ToolCallLog.tsx` wired into sidebar, and modified `components/ChatWindow.tsx` to render inline ToolCallCard outcomes.
- Built automated tools integration tests script `scripts/test-tools.ts` proving:
  - Valid `save_task` inserts tasks row and logs `success`.
  - Valid `send_channel_summary` posts safely (webhook integration).
  - Unknown tools/malformed arguments logged as `error` without throwing.
  - Document-level prompt-injection ignored as inert context with no tools run.
  - Sanitization neutralizes `@everyone`, `@here`, role, and user mentions.
- Re-structured dashboard grid layout into a clean 3-column CSS Grid (`lg:grid-cols-[280px_1fr_280px]`) containing the Left Sidebar (Switcher, Upload, Documents, Tasks), Center Panel (Chat Window), and Right Sidebar (Retrieval Debug, Tool Call logs).
- Removed the `WorkspaceSwitcher` component rendering from the top header in `app/(dashboard)/layout.tsx` to ensure it only renders in the Left sidebar of the dashboard page.
- Implemented strict workspace scoping (UI level) across all panels (`DocumentList`, `TaskList`, `ToolCallLog`, `ChatWindow`, `RetrievalDebugPanel`) using `loadedKey` loaded states to ensure all panels instantly show a loading/cleared view upon changing workspaces, preventing visual flashes or state leakages.
- Wired cross-component state synchronization by mapping `onActivity` bumps to trigger sibling panel re-fetches. Added `onRetrieval` callbacks from `ChatWindow` to dynamically load/clear the active query's debug sources inside the Right Sidebar panel.
- Enhanced scrolling behavior in `ChatWindow.tsx` using synchronous React ref assignments to scroll chat containers cleanly on load and message updates.

## In Progress / Blocked
- None (Phase 5 fully complete).

## Deviations From PLAN.md / ARCHITECTURE.md
- **Project Folder Placement**: Next.js project was scaffolded under a subfolder `workspace-chatbot/` because Next.js prohibits spaces and capitalization in project folder naming (which the parent folder `Workspace Chatbot` has).
- **Pure-JS PDF Parser**: Standardized on pure-JS `pdf-parse@1.1.1` instead of `pdf-parse@2.x` to prevent native prebuild module compilation dependencies (`@napi-rs/canvas`) in serverless environments.
- **RAG Similarity Filter**: Added similarity threshold filter >= 0.50 on retrieved vector chunks to discard low-quality, orthogonal chunks from large documents, preventing token bloating and Gemini API timeouts.
- **Local System Instruction Extension**: Due to a strict constraint on not modifying `lib/rag.ts` directly, we extended `SYSTEM_INSTRUCTION` locally inside the `/api/chat` route handler to give the agent permission to use tools for action requests.
- **ParametersJsonSchema Usage**: Configured `FunctionDeclaration` objects using the `parametersJsonSchema` property, which compiles cleanly and matches the types in our installed `@google/genai` (v2.10.0) SDK.

## Known Issues / Tech Debt
- None.

## Next Step
- Final production verification and deployment.

## Session Log

| Date | Session focus | Outcome |
|---|---|---|
| 2026-07-02 | Initial Phase 1 Scaffolding & Implementation | Scaffolding complete; auth, API routes, middleware, switcher UI implemented; build blocked on minor Zod compile error. |
| 2026-07-02 | Build Fixes & Verification | Replaced Zod `.errors` with `.issues`. Added build-time fallbacks for environment variables in `lib/supabase.ts`. Verified production build completes successfully. Phase 1 complete. |
| 2026-07-02 | Safe Supabase Refactor & Build | Refactored `lib/supabase.ts` and `lib/auth.ts` to lazily load the Supabase Admin client and throw explicit validation errors if env vars are missing in production. Verified that build continues to compile successfully. |
| 2026-07-02 | E2E Testing & Verification Setup | Connected to real Supabase project. Fixed `.env.local` Supabase URL suffix format issue. Programmatically created and confirmed test user `grader-test-unique5@gmail.com`. E2E browser test blocked by missing database tables (PGRST205). |
| 2026-07-02 | Database Migration & E2E Success | Database schema and RLS policies successfully applied. E2E browser manual validation passed (signup, login, workspace dropdown switcher, persistence, logout). Verified PATCH (rename) and DELETE routes via a custom RLS verification script. Production build completes successfully. Phase 1 complete. |
| 2026-07-03 | Phase 2 Ingestion Pipeline | Appended vector search RPC to schema; installed `@google/genai` and `pdf-parse@1.1.1`. Implemented text extraction, boundary-aware chunking, L2-normalized embeddings, upload API, and rollback deletion on chunk insert failure. E2E pipeline tests verified (including mock text, duplicate checks, rollback, and parsing the 1.5MB spec PDF file). Production build compiles clean. |
| 2026-07-03 | Phase 3 RAG & Chat | Implemented retrieval, context assembly, citation parsing, route timeout optimizations, and dashboard layout. Completed automated integration test-rag suites proving grounded retrieval, strict tenant isolation, separated history, and document lists. Production build compiles clean. |
| 2026-07-03 | Phase 4 Structured Tool Calling | Implemented Zod schemas, executeTool, webhook timeout controls, mention stripping, and 3-step loop. Added GET tasks/tool-calls API routes and UI sidebars. Integration tests verified correct tool routing, failure logs, and doc-level prompt injection prevention. Build compiles clean. |
| 2026-07-03 | Phase 5 Dashboard Composition & Polish | Restructured grid to 3-column split; moved WorkspaceSwitcher to left sidebar and created right sidebar with active retrieval debug and tool logs. Added loadedKey loaded checks to all sidebar components to prevent workspace leaks/flashing. Verified build succeeds. |
| 2026-07-03 | Pre-Deployment Audit Resolution | Resolved B1, B3, B4 blockers & M4, M2/M3 edge protection and rate limit flags. Wrote seed script, overhauled README, updated rate limit handlers/routes, protected edge routes in middleware, and verified that all RAG/tools integration tests pass. |
