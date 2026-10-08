'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { del } from '@vercel/blob';
import { blobToken } from '@/lib/blob';
import { login, setSessionCookie, clearSessionCookie, currentAdmin } from '@/lib/auth';
import {
  setSetting, createPost, updatePost, deletePost,
  upsertSocial, deleteSocial, createArchiveItem, updateArchiveItem,
  deleteArchiveItem, getArchiveItem
} from '@/lib/queries';

export type ActionState = { error?: string; ok?: string };

/** Ogni azione passa di qui: senza sessione valida non si tocca nulla. */
async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error('NON_AUTORIZZATO');
  return admin;
}

function refresh() {
  revalidatePath('/');
  revalidatePath('/admin');
}

/* ------------------------------------------------------------------- accesso */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !password) return { error: 'Inserisci nome utente e password.' };

  let result;
  try {
    result = await login(username, password);
  } catch (err) {
    console.error('[ST] login fallito:', err);
    return { error: 'Servizio non disponibile. Riprova fra poco.' };
  }

  if (!result.ok) {
    return result.reason === 'bloccato'
      ? { error: `Troppi tentativi falliti. Riprova fra ${result.retryAfterMinutes} minuti.` }
      : { error: 'Nome utente o password non corretti.' };
  }

  await setSessionCookie(result.username);
  redirect('/admin');
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/admin');
}

/* -------------------------------------------------------------- impostazioni */

const TEXT_SETTINGS = [
  'profile_name', 'profile_bio', 'status_heading', 'status_body',
  'ticker_items', 'spotify_artist_id', 'archive_intro', 'meta_description',
  'profile_image_url', 'mood_image_url'
] as const;

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    for (const key of TEXT_SETTINGS) {
      const value = formData.get(key);
      if (typeof value === 'string') await setSetting(key, value);
    }
    refresh();
    return { ok: 'Contenuti salvati.' };
  } catch (err) {
    console.error('[ST] salvataggio impostazioni fallito:', err);
    return { error: 'Salvataggio non riuscito.' };
  }
}

/** Chiamata dopo che il file è salito su Blob: registra il nuovo indirizzo. */
export async function setImageAction(key: 'profile_image_url' | 'mood_image_url', url: string): Promise<ActionState> {
  try {
    await requireAdmin();
    if (!/^https?:\/\//.test(url)) return { error: 'Indirizzo immagine non valido.' };
    await setSetting(key, url);
    refresh();
    return { ok: 'Immagine aggiornata.' };
  } catch (err) {
    console.error('[ST] cambio immagine fallito:', err);
    return { error: 'Aggiornamento non riuscito.' };
  }
}

/* ------------------------------------------------------------------ articoli */

export async function savePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = Number(formData.get('id'));
    const title = String(formData.get('title') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const published = formData.get('published') === 'on';
    if (!title || !content) return { error: 'Titolo e testo sono obbligatori.' };

    if (id) await updatePost(id, title, content, published);
    else await createPost(title, content, published);

    refresh();
    return { ok: id ? 'Articolo aggiornato.' : 'Articolo pubblicato.' };
  } catch (err) {
    console.error('[ST] salvataggio articolo fallito:', err);
    return { error: 'Salvataggio non riuscito.' };
  }
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (id) await deletePost(id);
  refresh();
}

/* -------------------------------------------------------------------- social */

export async function saveSocialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const url = String(formData.get('url') ?? '').trim();
    if (!/^https:\/\//.test(url)) return { error: 'Il link deve iniziare con https://' };

    await upsertSocial({
      id: Number(formData.get('id')) || undefined,
      platform: String(formData.get('platform') ?? 'other'),
      label: String(formData.get('label') ?? '').trim() || 'LINK',
      url,
      position: Number(formData.get('position')) || 0,
      visible: formData.get('visible') === 'on'
    });
    refresh();
    return { ok: 'Social salvato.' };
  } catch (err) {
    console.error('[ST] salvataggio social fallito:', err);
    return { error: 'Salvataggio non riuscito.' };
  }
}

export async function deleteSocialAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (id) await deleteSocial(id);
  refresh();
}

/* ------------------------------------------------------------------ archivio */

export async function addArchiveItemAction(item: {
  title: string; description: string; kind: string; url: string;
  filename: string; size_bytes: number; content_type: string;
}): Promise<ActionState> {
  try {
    await requireAdmin();
    if (!item.title.trim()) return { error: 'Serve un titolo.' };
    await createArchiveItem({
      title: item.title.trim(),
      description: item.description.trim() || null,
      kind: item.kind,
      url: item.url,
      filename: item.filename,
      size_bytes: item.size_bytes,
      content_type: item.content_type
    });
    refresh();
    return { ok: 'File aggiunto all\'archivio.' };
  } catch (err) {
    console.error('[ST] aggiunta archivio fallita:', err);
    return { error: 'Aggiunta non riuscita.' };
  }
}

export async function updateArchiveItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = Number(formData.get('id'));
    if (!id) return { error: 'Elemento non valido.' };
    await updateArchiveItem(
      id,
      String(formData.get('title') ?? '').trim(),
      String(formData.get('description') ?? '').trim() || null,
      formData.get('visible') === 'on',
      Number(formData.get('position')) || 0
    );
    refresh();
    return { ok: 'Elemento aggiornato.' };
  } catch (err) {
    console.error('[ST] aggiornamento archivio fallito:', err);
    return { error: 'Aggiornamento non riuscito.' };
  }
}

export async function deleteArchiveItemAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  // Prima il file dallo storage, poi la riga: se il file resta orfano
  // continua a occupare spazio e nessuno saprebbe più che esiste.
  const item = await getArchiveItem(id);
  if (item) {
    try { await del(item.url, { token: blobToken() }); }
    catch (err) { console.error('[ST] cancellazione file su Blob fallita:', err); }
  }
  await deleteArchiveItem(id);
  refresh();
}
