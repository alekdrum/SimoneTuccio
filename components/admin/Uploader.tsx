'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

export type Uploaded = {
  url: string; filename: string; size: number; contentType: string;
};

/**
 * Carica un file direttamente sullo storage, senza passare dal server:
 * è l'unico modo per superare il limite di 4,5 MB delle funzioni Vercel.
 */
export default function Uploader({
  accept, label, onUploaded, disabled
}: {
  accept: string; label: string;
  onUploaded: (file: Uploaded) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setBusy(true); setError(''); setProgress(0);
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/blob-upload',
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage))
      });
      await onUploaded({
        url: blob.url,
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Caricamento non riuscito.');
    } finally {
      setBusy(false); setProgress(0);
    }
  }

  return (
    <div>
      <label className="field" htmlFor={`up-${label}`}>{label}</label>
      <input
        id={`up-${label}`}
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={busy || disabled}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        style={{ fontSize: 13, padding: 8 }}
      />
      {busy && <p className="msg-ok">CARICAMENTO… {progress}%</p>}
      {error && <p className="msg-error">{error}</p>}
    </div>
  );
}
