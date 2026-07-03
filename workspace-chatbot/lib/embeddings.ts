import { GoogleGenAI } from '@google/genai';

/**
 * Embedding wrapper over the Gemini API (ARCHITECTURE.md §6, §9).
 *
 * Model: `gemini-embedding-001` at 768 dimensions.
 *
 * IMPORTANT: at any output dimensionality other than 3072, gemini-embedding-001
 * returns vectors that are NOT unit-normalized (Matryoshka truncation). Cosine
 * similarity in pgvector assumes comparable magnitudes, so we L2-normalize every
 * vector before it is stored or used as a query. Skipping this silently degrades
 * retrieval quality.
 *
 * Task types are asymmetric per Google's RAG guidance: documents are embedded
 * with RETRIEVAL_DOCUMENT at ingest, the user's question with RETRIEVAL_QUERY.
 */

const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONS = 768;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Required production environment variable "GEMINI_API_KEY" is missing.');
      }
      // Return a dummy client in dev/build environments if API key is not present yet
      return new GoogleGenAI({ apiKey: 'placeholder-api-key' });
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** L2-normalize a vector so cosine similarity behaves correctly. */
export function l2normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Embed a single string, retrying with exponential backoff on rate limits.
 * `taskType` distinguishes document vs query embeddings.
 */
async function embedOne(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'): Promise<number[]> {
  const ai = getClient();
  const backoffs = [1000, 2000, 4000];

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { taskType, outputDimensionality: OUTPUT_DIMENSIONS },
      });
      const values = res.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error('Embedding API returned no values');
      }
      return l2normalize(values);
    } catch (err) {
      const status = extractStatus(err);
      if (status === 429 && attempt < backoffs.length) {
        await sleep(backoffs[attempt]);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Embed document chunks sequentially (free-tier friendly). Adds a small delay
 * between calls for larger documents to stay under rate limits.
 *
 * Constraint 6: sequential with backoff. Do not use Promise.all.
 */
export async function embedDocument(chunks: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    out.push(await embedOne(chunks[i], 'RETRIEVAL_DOCUMENT'));
    if (chunks.length > 10 && i < chunks.length - 1) {
      await sleep(200);
    }
  }
  return out;
}

/** Embed the user's question for retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  return embedOne(text, 'RETRIEVAL_QUERY');
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.status === 'number') return anyErr.status;
    if (typeof anyErr.code === 'number') return anyErr.code;
    const msg = String(anyErr.message ?? '');
    if (msg.includes('429') || /rate limit|RESOURCE_EXHAUSTED/i.test(msg)) {
      return 429;
    }
  }
  return undefined;
}
