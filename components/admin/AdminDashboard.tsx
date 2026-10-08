'use client';

import { useActionState, useState } from 'react';
import Uploader, { type Uploaded } from './Uploader';
import {
  saveSettingsAction, savePostAction, deletePostAction,
  saveSocialAction, deleteSocialAction, setImageAction,
  addArchiveItemAction, updateArchiveItemAction, deleteArchiveItemAction,
  logoutAction, type ActionState
} from '@/app/admin/actions';
import type { Post, Social, ArchiveItem, Settings } from '@/lib/types';

type Tab = 'contenuti' | 'immagini' | 'articoli' | 'social' | 'archivio';

const TABS: Array<[Tab, string]> = [
  ['contenuti', 'TESTI'], ['immagini', 'IMMAGINI'], ['articoli', 'DIARIO'],
  ['social', 'SOCIAL'], ['archivio', 'ARCHIVIO']
];

const PLATFORMS = ['soundcloud', 'spotify', 'apple_music', 'instagram', 'tiktok', 'youtube', 'other'];

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="msg-error">✗ {state.error}</p>;
  if (state.ok) return <p className="msg-ok">✓ {state.ok}</p>;
  return null;
}

export default function AdminDashboard({
  admin, settings, posts, socials, archive
}: {
  admin: string; settings: Settings; posts: Post[]; socials: Social[]; archive: ArchiveItem[];
}) {
  const [tab, setTab] = useState<Tab>('contenuti');

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <span className="mono">⚙ PANNELLO — {admin}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <a className="btn-secondary admin-link" href="/" target="_blank" rel="noreferrer">VEDI IL SITO ↗</a>
          <form action={logoutAction}><button className="btn-secondary" type="submit">ESCI</button></form>
        </span>
      </header>

      <nav className="admin-tabs" aria-label="Sezioni del pannello">
        {TABS.map(([key, label]) => (
          <button key={key} type="button"
                  className={`admin-tab${tab === key ? ' active' : ''}`}
                  aria-current={tab === key}
                  onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      <div className="admin-panel">
        {tab === 'contenuti' && <ContentTab settings={settings} />}
        {tab === 'immagini'  && <ImagesTab settings={settings} />}
        {tab === 'articoli'  && <PostsTab posts={posts} />}
        {tab === 'social'    && <SocialsTab socials={socials} />}
        {tab === 'archivio'  && <ArchiveTab items={archive} />}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- TESTI --- */

function ContentTab({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, {});
  return (
    <form action={action}>
      <h2 className="admin-h2">Testi del sito</h2>

      <label className="field" htmlFor="profile_name">NOME IN EVIDENZA</label>
      <input id="profile_name" name="profile_name" defaultValue={settings.profile_name ?? ''} />

      <label className="field" htmlFor="profile_bio">BIO BREVE (sotto la foto)</label>
      <input id="profile_bio" name="profile_bio" defaultValue={settings.profile_bio ?? ''} />

      <label className="field" htmlFor="status_heading">TITOLONE DELLA SEZIONE STATUS</label>
      <input id="status_heading" name="status_heading" defaultValue={settings.status_heading ?? ''} />

      <label className="field" htmlFor="status_body">TESTO DELLO STATUS — **doppio asterisco** per il grassetto</label>
      <textarea id="status_body" name="status_body" rows={12} defaultValue={settings.status_body ?? ''} />

      <label className="field" htmlFor="ticker_items">NOTIZIE SCORREVOLI — una per riga</label>
      <textarea id="ticker_items" name="ticker_items" rows={4} defaultValue={settings.ticker_items ?? ''} />

      <label className="field" htmlFor="archive_intro">INTRODUZIONE DELL&apos;ARCHIVIO</label>
      <input id="archive_intro" name="archive_intro" defaultValue={settings.archive_intro ?? ''} />

      <label className="field" htmlFor="spotify_artist_id">ID ARTISTA SPOTIFY</label>
      <input id="spotify_artist_id" name="spotify_artist_id" defaultValue={settings.spotify_artist_id ?? ''} />

      <label className="field" htmlFor="meta_description">DESCRIZIONE PER GOOGLE E ANTEPRIME LINK</label>
      <textarea id="meta_description" name="meta_description" rows={3} defaultValue={settings.meta_description ?? ''} />

      {/* Gli indirizzi delle immagini si cambiano dalla scheda IMMAGINI,
          ma viaggiano nel form per non essere azzerati al salvataggio. */}
      <input type="hidden" name="profile_image_url" value={settings.profile_image_url ?? ''} readOnly />
      <input type="hidden" name="mood_image_url" value={settings.mood_image_url ?? ''} readOnly />

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? 'SALVO…' : 'SALVA I TESTI'}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/* -------------------------------------------------------------- IMMAGINI --- */

function ImagePicker({ label, settingKey, current }: {
  label: string; settingKey: 'profile_image_url' | 'mood_image_url'; current: string;
}) {
  const [url, setUrl] = useState(current);
  const [state, setState] = useState<ActionState>({});

  async function onUploaded(file: Uploaded) {
    const result = await setImageAction(settingKey, file.url);
    setState(result);
    if (result.ok) setUrl(file.url);
  }

  return (
    <div className="admin-card">
      <h3 className="admin-h3">{label}</h3>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Anteprima: ${label}`} className="admin-preview" />
      )}
      <Uploader accept="image/*" label="SCEGLI UNA NUOVA IMMAGINE" onUploaded={onUploaded} />
      <Feedback state={state} />
      <p className="admin-hint">Consiglio: almeno 800 px di lato. Le immagini molto pesanti rallentano il sito sul telefono.</p>
    </div>
  );
}

function ImagesTab({ settings }: { settings: Settings }) {
  return (
    <>
      <h2 className="admin-h2">Immagini</h2>
      <div className="admin-grid">
        <ImagePicker label="Foto profilo" settingKey="profile_image_url" current={settings.profile_image_url ?? ''} />
        <ImagePicker label="Current mood" settingKey="mood_image_url" current={settings.mood_image_url ?? ''} />
      </div>
    </>
  );
}

/* -------------------------------------------------------------- ARTICOLI --- */

function PostsTab({ posts }: { posts: Post[] }) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(savePostAction, {});

  return (
    <>
      <h2 className="admin-h2">{editing ? 'Modifica articolo' : 'Nuovo articolo'}</h2>
      <form action={action} key={editing?.id ?? 'nuovo'}>
        <input type="hidden" name="id" value={editing?.id ?? ''} readOnly />

        <label className="field" htmlFor="post-title">TITOLO</label>
        <input id="post-title" name="title" defaultValue={editing?.title ?? ''} required />

        <label className="field" htmlFor="post-content">TESTO — **doppio asterisco** per il grassetto</label>
        <textarea id="post-content" name="content" rows={10} defaultValue={editing?.content ?? ''} required />

        <label className="admin-check">
          <input type="checkbox" name="published" defaultChecked={editing?.published ?? true} />
          <span>Visibile sul sito</span>
        </label>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? 'SALVO…' : editing ? 'AGGIORNA' : 'PUBBLICA'}
          </button>
          {editing && (
            <button className="btn-secondary" type="button" onClick={() => setEditing(null)}>
              ANNULLA MODIFICA
            </button>
          )}
        </div>
        <Feedback state={state} />
      </form>

      <h2 className="admin-h2" style={{ marginTop: 28 }}>Articoli pubblicati ({posts.length})</h2>
      {posts.length === 0 && <p className="admin-hint">Ancora nessun articolo.</p>}
      {posts.map(post => (
        <div className="admin-row" key={post.id}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{post.title}</strong>
            {!post.published && <span className="admin-badge">BOZZA</span>}
            <div className="admin-hint">
              {new Date(post.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button className="btn-secondary" type="button" onClick={() => {
            setEditing(post);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>MODIFICA</button>
          <form action={deletePostAction} onSubmit={e => {
            if (!confirm(`Eliminare definitivamente «${post.title}»?`)) e.preventDefault();
          }}>
            <input type="hidden" name="id" value={post.id} readOnly />
            <button className="btn-danger" type="submit">ELIMINA</button>
          </form>
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- SOCIAL --- */

/**
 * Ogni riga ha il proprio stato: così l'esito del salvataggio compare
 * accanto alla riga che hai toccato. Prima il messaggio era uno solo in
 * fondo alla scheda, e dopo un salvataggio riuscito restava lì a dire "✓"
 * anche se il tentativo successivo non era partito.
 */
function SocialRow({ social }: { social?: Social }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSocialAction, {});
  const esistente = Boolean(social);

  return (
    <div style={{ marginBottom: 10 }}>
      <form className="admin-row admin-row-form" action={action} style={{ marginBottom: 0 }}>
        {esistente && <input type="hidden" name="id" value={social!.id} readOnly />}

        <select name="platform" defaultValue={social?.platform ?? 'other'} aria-label="Piattaforma">
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <input name="label" defaultValue={social?.label ?? ''} placeholder="ETICHETTA"
               aria-label="Etichetta" style={{ maxWidth: 140 }} />

        {/* Niente type="url": bloccava l'invio senza spiegazioni quando
            l'indirizzo era incollato senza "https://". Ci pensa il server. */}
        <input name="url" type="text" inputMode="url" autoComplete="url"
               defaultValue={social?.url ?? ''} placeholder="soundcloud.com/simonetuccio"
               aria-label="Indirizzo" required />

        <input name="position" type="number" defaultValue={social?.position ?? 99}
               aria-label="Posizione" style={{ maxWidth: 70 }} />

        <label className="admin-check" style={{ margin: 0 }}>
          <input type="checkbox" name="visible" defaultChecked={social?.visible ?? true} />
          <span>Visibile</span>
        </label>

        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? '…' : esistente ? 'SALVA' : 'AGGIUNGI'}
        </button>

        {esistente && (
          <button className="btn-danger" type="submit" formAction={deleteSocialAction}
                  onClick={e => { if (!confirm(`Eliminare ${social!.label}?`)) e.preventDefault(); }}>
            ×
          </button>
        )}
      </form>
      <Feedback state={state} />
    </div>
  );
}

function SocialsTab({ socials }: { socials: Social[] }) {
  return (
    <>
      <h2 className="admin-h2">Link social</h2>
      <p className="admin-hint">
        L&apos;indirizzo si può incollare come viene: &laquo;https://&raquo; lo mette il sito se manca.
        L&apos;ordine segue il numero «posizione»: più basso, più in alto.
      </p>

      {socials.map(social => <SocialRow key={social.id} social={social} />)}

      <h3 className="admin-h3" style={{ marginTop: 24 }}>Aggiungi un social</h3>
      <SocialRow />
    </>
  );
}

/* -------------------------------------------------------------- ARCHIVIO --- */

function kindFromMime(mime: string): string {
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'document';
  return 'other';
}

function ArchiveTab({ items }: { items: ArchiveItem[] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [editState, editAction, editPending] = useActionState<ActionState, FormData>(updateArchiveItemAction, {});

  async function onUploaded(file: Uploaded) {
    const result = await addArchiveItemAction({
      title: title || file.filename,
      description,
      kind: kindFromMime(file.contentType),
      url: file.url,
      filename: file.filename,
      size_bytes: file.size,
      content_type: file.contentType
    });
    setState(result);
    if (result.ok) { setTitle(''); setDescription(''); }
  }

  return (
    <>
      <h2 className="admin-h2">Aggiungi all&apos;archivio</h2>
      <label className="field" htmlFor="arch-title">TITOLO (se vuoto, usa il nome del file)</label>
      <input id="arch-title" value={title} onChange={e => setTitle(e.target.value)} />

      <label className="field" htmlFor="arch-desc">DESCRIZIONE (facoltativa)</label>
      <input id="arch-desc" value={description} onChange={e => setDescription(e.target.value)} />

      <Uploader accept="audio/*,image/*,video/*,.pdf,.zip" label="SCEGLI IL FILE DA CARICARE" onUploaded={onUploaded} />
      <Feedback state={state} />
      <p className="admin-hint">Massimo 100 MB per file. Il caricamento va dal browser allo storage, senza passare dal server.</p>

      <h2 className="admin-h2" style={{ marginTop: 28 }}>File in archivio ({items.length})</h2>
      {items.length === 0 && <p className="admin-hint">Archivio ancora vuoto.</p>}
      {items.map(item => (
        <form className="admin-row admin-row-form" action={editAction} key={item.id}>
          <input type="hidden" name="id" value={item.id} readOnly />
          <span className="admin-badge">{item.kind}</span>
          <input name="title" defaultValue={item.title} aria-label="Titolo" />
          <input name="description" defaultValue={item.description ?? ''} placeholder="descrizione" aria-label="Descrizione" />
          <input name="position" type="number" defaultValue={item.position} aria-label="Posizione" style={{ maxWidth: 70 }} />
          <label className="admin-check" style={{ margin: 0 }}>
            <input type="checkbox" name="visible" defaultChecked={item.visible} />
            <span>Visibile</span>
          </label>
          <span className="admin-hint" style={{ whiteSpace: 'nowrap' }}>↓ {item.downloads}</span>
          <button className="btn-primary" type="submit" disabled={editPending}>SALVA</button>
          <button className="btn-danger" type="submit" formAction={deleteArchiveItemAction}
                  onClick={e => { if (!confirm(`Eliminare «${item.title}»? Il file verrà cancellato anche dallo storage.`)) e.preventDefault(); }}>
            ×
          </button>
        </form>
      ))}
      <Feedback state={editState} />
    </>
  );
}
