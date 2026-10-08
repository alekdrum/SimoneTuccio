'use client';

import { useState, type ReactNode } from 'react';

/**
 * Finestra in stile desktop anni '90. I bottoni funzionano davvero:
 * riducono ed espandono. Cliccare la barra del titolo riapre sempre,
 * così nessun contenuto resta chiuso per sbaglio.
 */
export default function Window({
  title, children, id, actions, defaultCollapsed = false
}: {
  title: string; children: ReactNode; id?: string;
  actions?: ReactNode; defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className={`window${collapsed ? ' collapsed' : ''}`} id={id}>
      <div
        className="window-title"
        onClick={() => setCollapsed(false)}
        role="presentation"
      >
        <span className="wt-label">{title}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {actions}
          <span className="window-btns">
            {/* Su telefono resta solo questo: un comando grande e chiaro
                invece di tre bersagli minuscoli. */}
            <button type="button" className="wb-toggle"
                    title={collapsed ? 'Apri' : 'Riduci'}
                    aria-label={`${collapsed ? 'Apri' : 'Riduci'} ${title}`}
                    aria-expanded={!collapsed}
                    onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}>
              {collapsed ? '+' : '─'}
            </button>
            <button type="button" className="wb-desktop" title="Espandi" aria-label={`Espandi ${title}`}
                    onClick={e => { e.stopPropagation(); setCollapsed(false); }}>=</button>
            <button type="button" className="wb-desktop" title="Chiudi" aria-label={`Chiudi ${title}`}
                    onClick={e => { e.stopPropagation(); setCollapsed(true); }}>×</button>
          </span>
        </span>
      </div>
      <div className="window-body">{children}</div>
    </section>
  );
}
