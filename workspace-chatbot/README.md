# Multi-Workspace Document Assistant (RAG & Tool Calling)

A multi-tenant document assistant featuring Retrieval-Augmented Generation (RAG) and tool calling with strict workspace boundary isolation. Built using Next.js (App Router), Supabase (Auth + Postgres + pgvector), and the Google Gemini API.

---

## What the App Does
- **Multi-Tenant Workspace Switching**: Segment documents, chat histories, task lists, and tool calls into isolated workspaces.
- **Idempotent Ingestion Pipeline**: Upload `.txt`, `.md`, and `.pdf` files. Checks hashes to prevent duplicate ingestion, parsing PDFs with a serverless-friendly pure-JS library.
- **Scoped Vector Search**: Performs L2-normalized vector similarity query matching using `pgvector` scoped strictly within the active workspace.
- **Resilient Tool-Calling Loop**: Coordinates up to 3 turns of Gemini-driven tool calls (`save_task` and `send_channel_summary`), sanitizing mentions (e.g. `@everyone`) and validating arguments via Zod.
- **Retrieval Debugging**: Graders can inspect exactly which chunks and similarity scores was matched by the database retrieval layer.
- **Edge Protection**: Shields data routes (`/api/tasks`, `/api/tool-calls`, etc.) at the middleware layer.

---

## Local Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` inside the `workspace-chatbot` directory:
```bash
cp .env.example .env.local
```
Fill in the variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project API URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key (never exposed to client).
- `GEMINI_API_KEY`: API key from Google AI Studio.
- `DISCORD_WEBHOOK_URL`: A Discord Channel Webhook URL to verify channel summaries.

### 2. Database Schema Setup
Execute the contents of `supabase/schema.sql` inside the Supabase SQL Editor. This enables the `vector` extension, provisions the 6 tables, activates Row-Level Security, and creates the vector match database RPC (`match_chunks`).

### 3. Provision the Seeding Environment
Generate the throwaway testing environment by running the seeding script:
```bash
npx tsx scripts/seed.ts
```
This automatically:
- Creates the throwaway account `grader-test-unique5@gmail.com` (password `GraderPass123!`).
- Confirms the account email in Supabase.
- Restructures/creates `Workspace A` and `Workspace B`.
- Embeds and seeds isolated testing documents: `zinnia_fact.txt` and `ProjectCodeTest.txt` in Workspace A; `other_fact.txt` in Workspace B.

### 4. Run the Development Server
Install dependencies and run Next.js:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.

---

## Deployment
- **Deployed URL**: `[INSERT URL]`
- **Hobby Serverless Limitations**: Vercel free/hobby functions timeout at 10 seconds. In case of API rate limits or deep tool calling pipelines, Vercel may return a 504. Timing metrics are logged server-side for observation.

---

## Test Account Credentials
For easy grader verification, use the pre-seeded account:
- **Email**: `[INSERT EMAIL/PASS]` (Default: `grader-test-unique5@gmail.com`)
- **Password**: `[INSERT EMAIL/PASS]` (Default: `GraderPass123!`)

---

## How to Test (Step-by-Step Isolation Verification)

Follow this walk-through to confirm that strict workspace isolation and RAG functionality holds:

### 1. Verify Grounded Retrieval (Workspace A)
- Log in with the **Test Account Credentials**.
- Select **Workspace A** from the dropdown in the Left sidebar.
- Ask the chat assistant:
  > *"What is the capital of Zinnia?"*
- **Expected Outcome**:
  - The assistant answers: *"FlowerCity"* (as seeded in Workspace A's `zinnia_fact.txt`).
  - Bracketed citation markers (e.g. `[1]`) appear inline and link to the source document.
  - The **Retrieval Debug** panel in the Right sidebar updates to show `zinnia_fact.txt` chunk 0 with a similarity score >= 0.50.

### 2. Verify Tenancy Isolation (Workspace B)
- Switch to **Workspace B** using the dropdown switcher.
- Ask the chat assistant the exact same question:
  > *"What is the capital of Zinnia?"*
- **Expected Outcome**:
  - The assistant says plainly that it does not know or that there is no info in this workspace's documents.
  - The **Retrieval Debug** panel displays zero retrieved chunks.
  - Workspace B remains completely isolated from Workspace A data.

### 3. Verify Document List & Chat History Separation
- Review the left sidebar under Workspace B: only `other_fact.txt` is listed. `zinnia_fact.txt` is hidden.
- The chat message history is workspace-scoped: swapping workspaces immediately clears/restores relevant chat history.

### 4. Verify Tool Execution & Mention Sanitization
- Switch back to **Workspace A**.
- Type:
  > *"Save a task to review Phase 5 features."*
- **Expected Outcome**:
  - The system executes the `save_task` tool.
  - The inline chat logs a success card, and the Left sidebar's **Tasks** list instantly updates with the new item.
- Type:
  > *"Send a channel summary to Discord saying @everyone we completed seeding."*
- **Expected Outcome**:
  - The system executes `send_channel_summary`.
  - The tool logs a successful post in the database.
  - The actual message posted to Discord is sanitized to: `[Workspace A] [everyone] we completed seeding.`. Mentions are stripped to prevent injection attacks.
