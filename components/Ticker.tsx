import Linkify, { contieneIndirizzo } from './Linkify';

/** Striscia di notizie scorrevole. Gli elementi sono duplicati perché
    l'animazione trasla del 50%: così il ciclo si chiude senza stacchi.
    Lo scorrimento si ferma al passaggio del mouse (vedi globals.css):
    senza quello un link in movimento sarebbe impossibile da cliccare. */
export default function Ticker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];

  // Con dei link dentro, su telefono la striscia diventa più alta: serve
  // per avere un'area toccabile decente. Senza link resta compatta.
  const conLink = items.some(contieneIndirizzo);

  return (
    <div className={`ticker-wrap${conLink ? ' has-links' : ''}`}>
      <div className="ticker-label">NEWS</div>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {doubled.map((text, i) => (
            <span key={i} aria-hidden={i >= items.length}><Linkify text={text} /></span>
          ))}
        </div>
      </div>
    </div>
  );
}
