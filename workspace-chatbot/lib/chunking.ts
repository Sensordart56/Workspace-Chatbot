/**
 * Text chunking for the ingestion pipeline (ARCHITECTURE.md §6).
 *
 * Splits document text into ~500-token chunks with ~50-token overlap. We don't
 * have a real tokenizer here, so we approximate tokens by characters at the
 * common ratio of ~4 chars/token: ~2000 chars/chunk, ~200 chars overlap.
 *
 * Chunks are cut on paragraph/sentence boundaries where possible so a single
 * fact isn't split across a boundary — the overlap is a second line of defense
 * against that. Pure and deterministic, so it's easy to unit-test.
 */

const CHARS_PER_CHUNK = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; //    ~50 tokens

/**
 * Split text into overlapping chunks. Returns non-empty, trimmed chunks in order.
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  if (normalized.length <= CHARS_PER_CHUNK) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + CHARS_PER_CHUNK, normalized.length);

    // If we're not at the very end, try to end on a natural boundary within the
    // last ~20% of the window (paragraph break > sentence end > whitespace).
    if (end < normalized.length) {
      const windowStart = start + Math.floor(CHARS_PER_CHUNK * 0.8);
      const boundary = findBoundary(normalized, windowStart, end);
      if (boundary > start) end = boundary;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    // Step forward, keeping OVERLAP_CHARS of the previous chunk.
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }

  return chunks;
}

/**
 * Find the best split point in [from, to): prefer a paragraph break, then a
 * sentence terminator, then any whitespace. Returns `to` if none found.
 */
function findBoundary(text: string, from: number, to: number): number {
  const slice = text.slice(from, to);

  const paragraph = slice.lastIndexOf('\n\n');
  if (paragraph !== -1) return from + paragraph + 2;

  const sentence = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (sentence !== -1) return from + sentence + 1;

  const space = slice.lastIndexOf(' ');
  if (space !== -1) return from + space + 1;

  return to;
}
