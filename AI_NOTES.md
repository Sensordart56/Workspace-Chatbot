AI Collaboration & Project Notes
1. AI Tools & Workflow
Tools Used: Antigravity (Agentic IDE), Claude Opus 4.8 / GPT 5.5 /(for architectural drafting and code review), and Gemini 3.5 Flash / 3.1 Flash Lite (for code implementation and the actual app inference).
Division of Labor: I treated the AI as a junior developer and myself as the Staff Engineer/Reviewer. I provided strict architectural boundaries (e.g., isolating database queries, enforcing Zod validation) and had the AI write the boilerplate and UI components. I personally managed the deployment architecture, debugging API SDK nuances, handling rate-limit backoffs, and auditing the code for security (like the Discord mention sanitizer) before every commit.

2. Key Architectural Decisions
Rather than letting the AI guess the architecture, I explicitly mandated the following decisions:

Vector Isolation at the DB Level: I decided to enforce the workspace_id filter strictly inside the Supabase match_chunks SQL function prior to any LIMIT or ORDER BY clauses. The AI initially suggested filtering chunks in the application layer after retrieval, which I rejected because it violates strict multi-tenant isolation.

Upgrading to Gemini 3.1 Flash Lite: During Phase 4 testing, my multi-step tool-calling loop exhausted the Gemini 3.5 Flash free tier (20 requests/day) almost instantly. I made the call to migrate the inference engine to gemini-3.1-flash-lite, which offered 500 RPD and native parallel function calling, allowing me to stay within the "no credit card" constraint while building a robust tool loop.

Lightweight UI Reactivity: For the dashboard layout, I decided to use a simple top-level refreshKey state lifted to page.tsx rather than introducing a heavy library like Zustand. When the chat window successfully executes a tool, it bumps the key, seamlessly triggering sibling panels (Task List, Tool Logs) to re-fetch their data without a page reload.

3. The Hardest Bug (and AI Blindspot)
The Bug: The 400 INVALID_ARGUMENT (Missing thought_signature) error during the Phase 4 tool loop.
What the AI got wrong: I used an Opus-generated reference implementation for my tool-calling loop. The AI wrote a loop that appended the model's function calls to the chat history by mapping over them and creating a new object: contents.push({ role: 'model', parts: calls.map(c => ({ functionCall: c })) }).
How I noticed and fixed it: When testing parallel tool calls (save_task and send_channel_summary), the app crashed with a 400 error. I realized that the AI's reference code was based on an older, stateless SDK pattern. Gemini 3.1 requires cryptographic thought_signature metadata to maintain its reasoning state across tool executions. The AI's .map() function was silently stripping this hidden metadata. I fixed it by overriding the AI's code to push the raw SDK object (response.candidates[0].content) directly back into the history array, perfectly preserving the signature and fixing the loop.

4. Future Improvements
If I had more time, I would prioritize:

Streaming Responses: The current architecture awaits the final text output to render. Implementing true token-by-token streaming alongside a multi-step tool loop would vastly improve perceived latency.

True Multi-Tenant Discord Webhooks: Currently, the Discord webhook is stored in a global .env variable. For a production SaaS, I would migrate this to a discord_webhook_url column in the workspaces table, allowing each tenant to configure their own integrations securely.

Hybrid Search: Combining pgvector similarity search with Postgres full-text search to improve retrieval accuracy for exact-match keyword queries (like specific project codes).