'use client';

import { useRef, useState } from 'react';

/**
 * Upload a document into the active workspace. On success it reports back so the
 * dashboard can refresh the document list. Surfaces the idempotent no-op case
 * ("already uploaded") distinctly from a fresh ingest.
 */
export default function UploadForm({
  workspaceId,
  onUploaded,
}: {
  workspaceId: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const form = new FormData();
      form.append('workspaceId', workspaceId);
      form.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setStatus(
        data.duplicate
          ? `"${file.name}" is already in this workspace — skipped.`
          : `Ingested "${file.name}" into ${data.chunkCount} chunks.`
      );
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.pdf"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
        id="upload-input"
      />
      <label
        htmlFor="upload-input"
        className={`block cursor-pointer rounded-lg border border-dashed border-gray-600 px-4 py-3 text-center text-sm transition-colors ${
          busy ? 'text-gray-500' : 'text-gray-400 hover:border-gray-500 hover:text-white'
        }`}
      >
        {busy ? 'Uploading…' : '+ Upload .txt / .md / .pdf'}
      </label>
      {status && <p className="mt-2 text-xs text-green-400">{status}</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
