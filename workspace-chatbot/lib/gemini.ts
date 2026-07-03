import {
  GoogleGenAI,
  type Content,
  type GenerateContentResponse,
  type FunctionDeclaration,
} from '@google/genai';

/**
 * Chat / tool-calling model wrapper (ARCHITECTURE.md §3, §9).
 *
 * Model string lives here and nowhere else, so a free-tier model change is a
 * one-line edit. `gemini-3.5-flash` supports function calling on the free tier.
 */

const CHAT_MODEL = 'gemini-3.1-flash-lite';
const REQUEST_TIMEOUT_MS = 25_000;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Required production environment variable "GEMINI_API_KEY" is missing.');
      }
      return new GoogleGenAI({ apiKey: 'placeholder-api-key' });
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timed out')), ms)
    ),
  ]);
}

export interface GenerateOptions {
  systemInstruction: string;
  contents: Content[];
  tools?: FunctionDeclaration[];
}

/**
 * Call Gemini once. Wrapped in a timeout and a single 429 retry, since free-tier
 * limits are easy to hit mid-demo (ARCHITECTURE.md §8). Returns the raw response
 * so callers can inspect both `.text` and `.functionCalls`.
 */
export async function generate({
  systemInstruction,
  contents,
  tools,
}: GenerateOptions): Promise<GenerateContentResponse> {
  const ai = getClient();

  const call = () =>
    withTimeout(
      ai.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: {
          systemInstruction,
          ...(tools && tools.length > 0
            ? { tools: [{ functionDeclarations: tools }] }
            : {}),
        },
      }),
      REQUEST_TIMEOUT_MS
    );

  try {
    return await call();
  } catch (err) {
    if (isRateLimit(err)) {
      await sleep(1500);
      return await call();
    }
    throw err;
  }
}

function isRateLimit(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, unknown>;
    const status = anyErr.status;
    const code = anyErr.code;
    if (
      status === 429 ||
      code === 429 ||
      status === '429' ||
      code === '429' ||
      status === 'TOO_MANY_REQUESTS' ||
      code === 'TOO_MANY_REQUESTS' ||
      status === 'RESOURCE_EXHAUSTED' ||
      code === 'RESOURCE_EXHAUSTED'
    ) {
      return true;
    }
    const msg = String(anyErr.message ?? '');
    return msg.includes('429') || /RESOURCE_EXHAUSTED|rate limit/i.test(msg);
  }
  return false;
}
