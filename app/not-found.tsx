import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, textAlign: 'center' }}>
      <div className="bio-genre">Segnale assente</div>
      <p className="mono" style={{ color: 'var(--text-dim)', letterSpacing: 1 }}>
        ERRORE 404 — QUESTA PAGINA NON ESISTE ×
      </p>
      <Link className="btn-primary" href="/"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        ↩ TORNA AL CANALE PRINCIPALE
      </Link>
    </div>
  );
}
