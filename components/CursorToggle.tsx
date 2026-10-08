'use client';

import { useEffect, useState } from 'react';

/** Il cursore a stella è bello ma non va imposto: qui si accende e si spegne. */
export default function CursorToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(document.documentElement.dataset.starCursor === 'on');
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    if (next) document.documentElement.dataset.starCursor = 'on';
    else delete document.documentElement.dataset.starCursor;
    try { localStorage.setItem('st_star_cursor', next ? 'on' : 'off'); } catch { /* storage bloccato */ }
  };

  return (
    <button className="cursor-toggle" onClick={toggle} type="button">
      CURSORE ★ : {on ? 'ACCESO' : 'SPENTO'}
    </button>
  );
}
