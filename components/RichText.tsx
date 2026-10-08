import { Fragment } from 'react';

/**
 * Formattazione minima per i testi scritti dal pannello: **grassetto** e
 * gli a capo. Niente HTML grezzo: React sfugge tutto da solo, quindi un
 * testo malevolo nel database non può iniettare markup nella pagina.
 */
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4
              ? <strong key={j}>{chunk.slice(2, -2)}</strong>
              : <Fragment key={j}>{chunk}</Fragment>
          )}
        </Fragment>
      ))}
    </>
  );
}
