# PROGRESS.md — Current Build State

> Read this first at the start of every session — context does not persist between
> sessions. Update it at the end of every session, or before ending any task.

## Current Phase
Phase 2 (Ingestion Pipeline) complete, verified end-to-end on local development server against real Supabase database and Gemini API. Ready for Phase 3 (RAG & Chat).

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

## In Progress / Blocked
- None (Phase 2 fully complete).

## Deviations From PLAN.md / ARCHITECTURE.md
- **Project Folder Placement**: Next.js project was scaffolded under a subfolder `workspace-chatbot/` because Next.js prohibits spaces and capitalization in project folder naming (which the parent folder `Workspace Chatbot` has).
- **Pure-JS PDF Parser**: Standardized on pure-JS `pdf-parse@1.1.1` instead of `pdf-parse@2.x` to prevent native prebuild module compilation dependencies (`@napi-rs/canvas`) in serverless environments.

## Known Issues / Tech Debt
- None.

## Next Step
- Phase 3: RAG Retrieval and Chat API.
  - Implement dynamic query embedding and retrieve matching chunks using `match_chunks` RPC.
  - Implement RAG context construction with strict prompt-injection instructions.
  - Implement `/api/chat` route carrying multi-turn chat capabilities.

## Session Log

| Date | Session focus | Outcome |
|---|---|---|
| 2026-07-02 | Initial Phase 1 Scaffolding & Implementation | Scaffolding complete; auth, API routes, middleware, switcher UI implemented; build blocked on minor Zod compile error. |
| 2026-07-02 | Build Fixes & Verification | Replaced Zod `.errors` with `.issues`. Added build-time fallbacks for environment variables in `lib/supabase.ts`. Verified production build completes successfully. Phase 1 complete. |
| 2026-07-02 | Safe Supabase Refactor & Build | Refactored `lib/supabase.ts` and `lib/auth.ts` to lazily load the Supabase Admin client and throw explicit validation errors if env vars are missing in production. Verified that build continues to compile successfully. |
| 2026-07-02 | E2E Testing & Verification Setup | Connected to real Supabase project. Fixed `.env.local` Supabase URL suffix format issue. Programmatically created and confirmed test user `grader-test-unique5@gmail.com`. E2E browser test blocked by missing database tables (PGRST205). |
| 2026-07-02 | Database Migration & E2E Success | Database schema and RLS policies successfully applied. E2E browser manual validation passed (signup, login, workspace dropdown switcher, persistence, logout). Verified PATCH (rename) and DELETE routes via a custom RLS verification script. Production build completes successfully. Phase 1 complete. |
| 2026-07-03 | Phase 2 Ingestion Pipeline | Appended vector search RPC to schema; installed `@google/genai` and `pdf-parse@1.1.1`. Implemented text extraction, boundary-aware chunking, L2-normalized embeddings, upload API, and rollback deletion on chunk insert failure. E2E pipeline tests verified (including mock text, duplicate checks, rollback, and parsing the 1.5MB spec PDF file). Production build compiles clean. |
