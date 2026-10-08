'use client';

import { useEffect, useState } from 'react';

/**
 * Contatore visite globale. Il totale arriva già renderizzato dal server,
 * quindi non c'è lo scatto da "0000000" al numero vero. L'incremento parte
 * una volta per sessione: un ricaricamento non gonfia il conteggio.
 */
export default function VisitCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let counted = false;
    try { counted = sessionStorage.getItem('st_counted') === '1'; } catch { /* storage bloccato */ }
    if (counted) return;
    try { sessionStorage.setItem('st_counted', '1'); } catch { /* storage bloccato */ }

    fetch('/api/visits', { method: 'POST' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.count === 'number') setCount(d.count); })
      .catch(() => { /* il contatore non deve mai rompere la pagina */ });
  }, []);

  return (
    <div className="visit-counter">
      <div id="visitLabel">VISITE:</div>
      <div className="counter-display" role="status" aria-live="polite" aria-labelledby="visitLabel">
        {String(count).padStart(7, '0')}
      </div>
    </div>
  );
}
