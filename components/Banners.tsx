/** Bottoncini 88×31, il formato esatto dei banner da sito web anni '90. */
export function BannerStrip() {
  return (
    <div className="banner-strip">
      <span className="banner88 b-cyan"><b>★ SIMONE ★</b><span>TUCCIO .IT</span></span>
      <span className="banner88 b-purple"><b>BEST VIEWED</b><span>IN 800×600</span></span>
      <span className="banner88 b-green"><b>NO FRAMES!</b><span>100% HAND CODED</span></span>
      <span className="banner88 b-amber blink"><b>NEW!</b><span>AGGIORNATO</span></span>
      <span className="banner88 b-cyan"><b>HAI VISTO</b><span>LA TV?</span></span>
      <span className="banner88 b-purple"><b>MEMBRO DEL</b><span>WEBRING ×××</span></span>
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
