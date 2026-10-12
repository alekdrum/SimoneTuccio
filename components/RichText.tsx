import { Fragment } from 'react';
import Linkify from './Linkify';

/**
 * Formattazione minima per i testi scritti dal pannello: **grassetto**,
 * gli a capo e gli indirizzi, che diventano cliccabili. Niente HTML grezzo: React sfugge tutto da solo, quindi un
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
              : <Fragment key={j}><Linkify text={chunk} /></Fragment>
          )}
        </Fragment>
      ))}
    </>
  );
}
