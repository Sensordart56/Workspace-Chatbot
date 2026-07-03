import { z } from 'zod';
import type { FunctionDeclaration } from '@google/genai';
import { getSupabaseAdmin } from './supabase';

/**
 * Tool definitions, validation, and execution (ARCHITECTURE.md §4, §5, §7).
 *
 * Safety contract:
 * - The model proposes a call; we validate arguments against a Zod schema before
 *   executing anything. Unknown tool names and malformed args never execute.
 * - workspace_id is injected by the server from the verified context — never
 *   taken from the model (AGENTS.md rule 12).
 * - send_channel_summary output is sanitized before posting (rule 13).
 * - Every attempt is logged to tool_calls with success/error status.
 */

// ---------------------------------------------------------------------------
// Argument schemas
// ---------------------------------------------------------------------------
const saveTaskSchema = z.object({
  title: z.string().min(1, 'title is required').max(500, 'title too long'),
});

const sendSummarySchema = z.object({
  summary: z.string().min(1, 'summary is required').max(2000, 'summary too long'),
});

// ---------------------------------------------------------------------------
// Declarations sent to Gemini (the allow-list is derived from these)
// ---------------------------------------------------------------------------
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'save_task',
    description: "Save a task to the active workspace's task list.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task description' },
      },
      required: ['title'],
    },
  },
  {
    name: 'send_channel_summary',
    description: "Post a short summary to the team's Discord channel.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '1-3 sentence summary to post' },
      },
      required: ['summary'],
    },
  },
];

export interface ToolContext {
  workspaceId: string;
  workspaceName: string;
}

export interface ToolResult {
  name: string;
  status: 'success' | 'error';
  result: Record<string, unknown>;
}

const DISCORD_TIMEOUT_MS = 10_000;
const DISCORD_MAX_LEN = 500;

/**
 * Validate and execute a model-requested tool call, logging the outcome.
 * Never throws — an unknown tool or invalid args return an error result that is
 * fed back to the model so it can recover (ARCHITECTURE.md §5).
 */
export async function executeTool(
  name: string,
  rawArgs: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'save_task': {
        const parsed = saveTaskSchema.safeParse(rawArgs);
        if (!parsed.success) {
          return await fail(name, rawArgs, ctx, parsed.error.issues[0].message);
        }
        const result = await runSaveTask(ctx.workspaceId, parsed.data.title);
        return await succeed(name, rawArgs, ctx, result);
      }
      case 'send_channel_summary': {
        const parsed = sendSummarySchema.safeParse(rawArgs);
        if (!parsed.success) {
          return await fail(name, rawArgs, ctx, parsed.error.issues[0].message);
        }
        const result = await runSendSummary(ctx.workspaceName, parsed.data.summary);
        return await succeed(name, rawArgs, ctx, result);
      }
      default:
        // Unknown tool name — do not execute anything.
        return await fail(name, rawArgs, ctx, `Unknown tool "${name}"`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return await fail(name, rawArgs, ctx, message);
  }
}

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------
async function runSaveTask(
  workspaceId: string,
  title: string
): Promise<Record<string, unknown>> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('tasks')
    .insert({ workspace_id: workspaceId, title })
    .select('id, title, created_at')
    .single();
  if (error) throw error;
  return { saved: true, task: data };
}

async function runSendSummary(
  workspaceName: string,
  summary: string
): Promise<Record<string, unknown>> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('Discord webhook is not configured');

  const content = sanitizeForDiscord(summary, workspaceName);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
    // Log only the sanitized content, never the webhook URL (rule 14).
    return { posted: true, content };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strip Discord mentions, cap length, and prefix with the workspace name so
 * prompt-injected document text can't trigger platform side effects (rule 13).
 */
export function sanitizeForDiscord(summary: string, workspaceName: string): string {
  const stripped = summary
    .replace(/@everyone/gi, '[everyone]')
    .replace(/@here/gi, '[here]')
    .replace(/<@!?\d+>/g, '[user]') // user mentions
    .replace(/<@&\d+>/g, '[role]'); // role mentions

  const prefix = `[${workspaceName}] `;
  const budget = DISCORD_MAX_LEN - prefix.length;
  const body = stripped.length > budget ? stripped.slice(0, budget - 1) + '…' : stripped;
  return prefix + body;
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------
async function logToolCall(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
  status: 'success' | 'error',
  result: Record<string, unknown>
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('tool_calls').insert({
    workspace_id: ctx.workspaceId,
    tool_name: name,
    arguments: args,
    result,
    status,
  });
}

async function succeed(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  result: Record<string, unknown>
): Promise<ToolResult> {
  await logToolCall(ctx, name, args, 'success', result);
  return { name, status: 'success', result };
}

async function fail(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  error: string
): Promise<ToolResult> {
  const result = { error };
  await logToolCall(ctx, name, args, 'error', result);
  return { name, status: 'error', result };
}
