import Image from 'next/image';
import Ticker from '@/components/Ticker';
import Window from '@/components/Window';
import SocialIcon from '@/components/SocialIcon';
import VisitCounter from '@/components/VisitCounter';
import CursorToggle from '@/components/CursorToggle';
import Snake from '@/components/Snake';
import Archive from '@/components/Archive';
import RichText from '@/components/RichText';
import { BannerStrip, UnderConstruction } from '@/components/Banners';
import { getSettings, getPosts, getSocials, getArchive, getVisits } from '@/lib/queries';
import type { Post, Social, ArchiveItem, Settings } from '@/lib/types';

// I contenuti cambiano dal pannello admin: la pagina si rigenera a ogni richiesta.
export const dynamic = 'force-dynamic';

const FALLBACK: Settings = {
  profile_name: 'SIMONE TUCCIO',
  profile_bio: '«Amen» è fuori ovunque. Hai visto la TV?',
  status_heading: 'Hai visto la TV?',
  status_body: 'Il sito sta tornando online.',
  ticker_items: '★ SIMONE TUCCIO ▲',
  profile_image_url: '/assets/profile.jpg',
  mood_image_url: '/assets/mood.jpg',
  spotify_artist_id: '7dqy9RM6fw0vzbMf4FZUzC',
  archive_intro: ''
};

/**
 * Se il database non risponde, il sito resta in piedi con i contenuti di
 * riserva invece di mostrare una pagina di errore. Per un sito vetrina è
 * la scelta giusta: meglio incompleto che irraggiungibile.
 */
async function loadPage() {
  try {
    const [settings, posts, socials, archive, visits] = await Promise.all([
      getSettings(), getPosts(), getSocials(), getArchive(), getVisits()
    ]);
    return { settings: { ...FALLBACK, ...settings }, posts, socials, archive, visits, offline: false };
  } catch (err) {
    console.error('[ST] database non raggiungibile, uso i contenuti di riserva:', err);
    return {
      settings: FALLBACK,
      posts: [] as Post[], socials: [] as Social[], archive: [] as ArchiveItem[],
      visits: 0, offline: true
    };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function Home() {
  const { settings, posts, socials, archive, visits, offline } = await loadPage();
  const tickerItems = (settings.ticker_items ?? '').split('\n').map(s => s.trim()).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: 'Simone Tuccio',
    url: 'https://www.simonetuccio.it/',
    image: 'https://www.simonetuccio.it/assets/profile.jpg',
    description: settings.meta_description ?? '',
    sameAs: socials.map(s => s.url)
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Ticker items={tickerItems} />

      <nav className="site-nav" aria-label="Navigazione principale">
        <div className="nav-logo"><span className="star">★</span> SIMONE TUCCIO <span className="star">★</span></div>
        <div className="nav-links">
          <a href="#musica">MUSICA</a>
          <a href="#archivio">ARCHIVIO</a>
          <a href="#gioco">GIOCO</a>
          <a href="#diario">DIARIO</a>
        </div>
      </nav>

      <div className="page-wrap">
        <aside className="sidebar">
          <Window title="★ PROFILO UTENTE ★">
            <div className="profile-img-wrap">
              <Image src={settings.profile_image_url} alt={`Ritratto di ${settings.profile_name}`}
                     width={600} height={600} priority
                     sizes="(min-width: 860px) 300px, 100vw" />
            </div>
            <h1 className="profile-name">{settings.profile_name} <span className="xxx">×××</span></h1>
            <p className="profile-bio">{settings.profile_bio}</p>
            <div className="section-label">CURRENT MOOD ▲</div>
            <div className="mood-img">
              <Image src={settings.mood_image_url} alt="Immagine dell'umore del momento"
                     width={600} height={338} sizes="(min-width: 860px) 300px, 100vw" />
            </div>
          </Window>

          <Window title="▲ CONNETTITI ▲">
            {socials.map(s => (
              <a key={s.id} className="social-link" href={s.url} target="_blank" rel="me noopener noreferrer">
                <SocialIcon platform={s.platform} />
                {s.label}
              </a>
            ))}
            <VisitCounter initial={visits} />
          </Window>

          <BannerStrip />
        </aside>

        <main className="main-col">
          <Window title="▲ STATUS ▲">
            <h2 className="bio-genre">{settings.status_heading}</h2>
            <div className="bio-divider" />
            <div className="bio-text"><RichText text={settings.status_body} /></div>
          </Window>

          <Window title="★ PLAYER SPOTIFY ★" id="musica">
            <iframe
              title="Player Spotify — discografia di Simone Tuccio"
              src={`https://open.spotify.com/embed/artist/${settings.spotify_artist_id}?utm_source=generator&theme=0`}
              width="100%" height={352} frameBorder={0} loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{ display: 'block', border: 0 }}
            />
          </Window>

          <Window title="▼ ARCHIVIO // DOWNLOAD ▼" id="archivio">
            <Archive items={archive} intro={settings.archive_intro} />
          </Window>

          <Window title="☢ SNAKE ☢ — IL GIOCO" id="gioco">
            <Snake />
          </Window>

          <Window title="★ DIARIO // BLOG ★" id="diario">
            {offline && <UnderConstruction text="DIARIO TEMPORANEAMENTE NON RAGGIUNGIBILE" />}
            {!offline && posts.length === 0 && <div className="empty-state">NESSUN POST NEL DIARIO ×</div>}
            {posts.map(post => (
              <article className="post-card" key={post.id}>
                <div className="post-header">
                  <time className="post-date" dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                </div>
                <h3 className="post-title">{post.title}</h3>
                <div className="post-content"><RichText text={post.content} /></div>
              </article>
            ))}
          </Window>
        </main>
      </div>

      <footer>
        <BannerStrip />
        <div className="footer-name"><span className="star">★</span> SIMONE TUCCIO <span className="star">★</span></div>
        <div className="footer-copy">© {new Date().getFullYear()} × SIMONE TUCCIO ×</div>
        <CursorToggle />
      </footer>
    </>
  );
}
