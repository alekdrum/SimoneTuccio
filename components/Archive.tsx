import type { ArchiveItem } from '@/lib/types';

const KIND_LABEL: Record<string, string> = {
  audio: 'MP3', image: 'IMG', document: 'DOC', video: 'VID', other: 'FILE'
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function Archive({ items, intro }: { items: ArchiveItem[]; intro?: string }) {
  if (!items.length) {
    return <div className="empty-state">ARCHIVIO ANCORA VUOTO ×</div>;
  }
  return (
    <>
      {intro && <p className="archive-intro">{intro}</p>}
      <ul className="archive-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map(item => (
          <li className="archive-item" key={item.id}>
            <span className="archive-icon" aria-hidden="true">{KIND_LABEL[item.kind] ?? 'FILE'}</span>
            <div className="archive-meta">
              <div className="archive-title">{item.title}</div>
              <div className="archive-sub">
                {[item.filename, formatSize(item.size_bytes)].filter(Boolean).join(' · ')}
              </div>
              {item.description && <div className="archive-sub">{item.description}</div>}
            </div>
            {/* Passa da /api/download per contare gli scaricamenti prima di servire il file */}
            <a className="archive-dl" href={`/api/download/${item.id}`}
               aria-label={`Scarica ${item.title}`}>↓ SCARICA</a>
          </li>
        ))}
      </ul>
    </>
  );
}
