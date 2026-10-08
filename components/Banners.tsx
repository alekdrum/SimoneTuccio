/**
 * Blinkies: le targhette animate dei siti dei primi anni 2000, col bordo
 * tratteggiato che gira. Il testo arriva dal pannello (una frase per riga),
 * i colori si alternano da soli seguendo l'ordine delle righe.
 */
const STILI = ['bk-purple', 'bk-black', 'bk-white', 'bk-cyan', 'bk-grey', 'bk-green'] as const;

export function Blinkies({ frasi }: { frasi: string[] }) {
  if (!frasi.length) return null;
  return (
    <div className="blinkie-strip">
      {frasi.map((frase, i) => (
        <span className={`blinkie ${STILI[i % STILI.length]}`} key={`${frase}-${i}`}>
          {frase}
        </span>
      ))}
    </div>
  );
}

export function UnderConstruction({ text = 'SITO IN COSTRUZIONE PERENNE' }: { text?: string }) {
  return (
    <div className="construction">
      <span aria-hidden="true">🚧</span>
      <span>{text}</span>
      <span aria-hidden="true">🚧</span>
    </div>
  );
}
