/** Striscia di notizie scorrevole. Gli elementi sono duplicati perché
    l'animazione trasla del 50%: così il ciclo si chiude senza stacchi. */
export default function Ticker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className="ticker-wrap">
      <div className="ticker-label">NEWS</div>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {doubled.map((text, i) => (
            <span key={i} aria-hidden={i >= items.length}>{text}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
