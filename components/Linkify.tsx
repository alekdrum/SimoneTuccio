import { Fragment } from 'react';
import { spezzaIndirizzi } from '@/lib/url';

export { contieneIndirizzo } from '@/lib/url';

/** Rende cliccabili gli indirizzi scritti dentro un testo qualsiasi.
    Il riconoscimento sta in lib/url.ts, dove è coperto dai test. */
export default function Linkify({ text }: { text: string }) {
  return (
    <>
      {spezzaIndirizzi(text).map((pezzo, i) =>
        pezzo.tipo === 'link' ? (
          <Fragment key={i}>
            <a href={pezzo.href} target="_blank" rel="noopener noreferrer">{pezzo.testo}</a>
            {pezzo.coda}
          </Fragment>
        ) : (
          <Fragment key={i}>{pezzo.testo}</Fragment>
        )
      )}
    </>
  );
}
