import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.simonetuccio.it'),
  title: 'Simone Tuccio – Hai visto la TV? | Sito ufficiale',
  description: 'Sito ufficiale di Simone Tuccio. «Hai visto la TV?» — i primi tre atti sono fuori: Inesorabilmente, Occhi, Amen.',
  alternates: { canonical: '/' },
  authors: [{ name: 'Simone Tuccio' }],
  openGraph: {
    type: 'profile',
    siteName: 'Simone Tuccio',
    locale: 'it_IT',
    url: '/',
    title: 'Simone Tuccio – Hai visto la TV?',
    description: 'I primi tre atti sono fuori: Inesorabilmente, Occhi, Amen. Il prossimo atto sta arrivando.',
    images: [{ url: '/assets/profile.jpg', alt: 'Simone Tuccio' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simone Tuccio – Hai visto la TV?',
    description: 'I primi tre atti sono fuori: Inesorabilmente, Occhi, Amen.',
    images: ['/assets/profile.jpg']
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>★</text></svg>"
  }
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1
};

/* Applica la preferenza sul cursore prima del primo disegno, così non
   si vede il cursore cambiare a pagina già carica. */
const cursorBoot = `
try {
  if (localStorage.getItem('st_star_cursor') !== 'off') document.documentElement.dataset.starCursor = 'on';
} catch (e) { document.documentElement.dataset.starCursor = 'on'; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head><script dangerouslySetInnerHTML={{ __html: cursorBoot }} /></head>
      <body>{children}</body>
    </html>
  );
}
