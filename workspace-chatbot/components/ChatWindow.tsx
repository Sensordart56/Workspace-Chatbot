'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation } from '@/types';
import RetrievalDebugPanel, { type RetrievalDebugData } from './RetrievalDebugPanel';

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  retrieval?: RetrievalDebugData;
}

/**
 * The chat surface: message history, composer, inline citations, and the
 * retrieval-debug panel under every answer. Reports activity to refresh
 * the sidebar document list.
 */
export default function ChatWindow({
  workspaceId,
  onActivity,
}: {
  workspaceId: string;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load workspace-scoped history on mount. The dashboard keys this component by
  // workspace id, so switching workspaces remounts it with fresh state — no need
  // to clear messages synchronously here.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat/history?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => {
        if (cancelled) return;
        const loaded: UIMessage[] = (d.messages ?? []).map(
          (m: { role: 'user' | 'assistant'; content: string; citations: Citation[] | null }) => ({
            role: m.role,
            content: m.content,
            citations: m.citations ?? undefined,
          })
        );
        setMessages(loaded);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setInput('');
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          retrieval: data.retrieval,
        },
      ]);
      onActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
      // The user's message is already persisted server-side; let them retry.
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/50">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !sending && (
          <p className="py-8 text-center text-sm text-gray-500">
            Ask a question about this workspace&apos;s documents.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>

            {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.citations.map((c) => (
                  <span
                    key={c.n}
                    className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400"
                    title={`${c.filename} · chunk ${c.chunk_index}`}
                  >
                    [{c.n}] {c.filename} · chunk {c.chunk_index}
                  </span>
                ))}
              </div>
            )}

            {m.role === 'assistant' && m.retrieval && (
              <RetrievalDebugPanel data={m.retrieval} />
            )}
          </div>
        ))}

        {sending && (
          <div className="text-left">
            <div className="inline-block rounded-2xl bg-gray-800 px-4 py-2 text-sm text-gray-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2 text-xs text-red-400">{error}</div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-800 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={sending}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
