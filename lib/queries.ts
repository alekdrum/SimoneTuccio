import { sql } from './db';
import type { Post, Social, ArchiveItem, Settings } from './types';

/* ------------------------------------------------------------- impostazioni */

export async function getSettings(): Promise<Settings> {
  const rows = await sql`SELECT key, value FROM settings` as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function setSetting(key: string, value: string) {
  await sql`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

/* ------------------------------------------------------------------ articoli */

export async function getPosts(includeUnpublished = false): Promise<Post[]> {
  return (includeUnpublished
    ? await sql`SELECT * FROM posts ORDER BY created_at DESC`
    : await sql`SELECT * FROM posts WHERE published = TRUE ORDER BY created_at DESC`) as Post[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const rows = await sql`SELECT * FROM posts WHERE slug = ${slug}` as Post[];
  return rows[0] ?? null;
}

/** Slug leggibile e unico: "Un pensiero" -> "un-pensiero", poi -2, -3... */
export async function makeSlug(title: string): Promise<string> {
  const base = title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // toglie gli accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'post';

  const taken = await sql`SELECT slug FROM posts WHERE slug = ${base} OR slug LIKE ${base + '-%'}` as Array<{ slug: string }>;
  if (!taken.some(r => r.slug === base)) return base;

  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.some(r => r.slug === candidate)) return candidate;
  }
}

export async function createPost(title: string, content: string, published: boolean): Promise<Post> {
  const slug = await makeSlug(title);
  const rows = await sql`
    INSERT INTO posts (slug, title, content, published)
    VALUES (${slug}, ${title}, ${content}, ${published}) RETURNING *
  ` as Post[];
  return rows[0];
}

export async function updatePost(id: number, title: string, content: string, published: boolean) {
  await sql`
    UPDATE posts SET title = ${title}, content = ${content},
                     published = ${published}, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deletePost(id: number) {
  await sql`DELETE FROM posts WHERE id = ${id}`;
}

/* -------------------------------------------------------------------- social */

export async function getSocials(includeHidden = false): Promise<Social[]> {
  return (includeHidden
    ? await sql`SELECT * FROM socials ORDER BY position, id`
    : await sql`SELECT * FROM socials WHERE visible = TRUE ORDER BY position, id`) as Social[];
}

export async function upsertSocial(s: Omit<Social, 'id'> & { id?: number }) {
  if (s.id) {
    await sql`
      UPDATE socials SET platform = ${s.platform}, label = ${s.label}, url = ${s.url},
                         position = ${s.position}, visible = ${s.visible}
      WHERE id = ${s.id}
    `;
  } else {
    await sql`
      INSERT INTO socials (platform, label, url, position, visible)
      VALUES (${s.platform}, ${s.label}, ${s.url}, ${s.position}, ${s.visible})
    `;
  }
}

export async function deleteSocial(id: number) {
  await sql`DELETE FROM socials WHERE id = ${id}`;
}

/* ------------------------------------------------------------------ archivio */

export async function getArchive(includeHidden = false): Promise<ArchiveItem[]> {
  return (includeHidden
    ? await sql`SELECT * FROM archive_items ORDER BY position, created_at DESC`
    : await sql`SELECT * FROM archive_items WHERE visible = TRUE ORDER BY position, created_at DESC`) as ArchiveItem[];
}

export async function getArchiveItem(id: number): Promise<ArchiveItem | null> {
  const rows = await sql`SELECT * FROM archive_items WHERE id = ${id}` as ArchiveItem[];
  return rows[0] ?? null;
}

export async function createArchiveItem(item: {
  title: string; description: string | null; kind: string; url: string;
  filename: string; size_bytes: number | null; content_type: string | null;
}) {
  await sql`
    INSERT INTO archive_items (title, description, kind, url, filename, size_bytes, content_type)
    VALUES (${item.title}, ${item.description}, ${item.kind}, ${item.url},
            ${item.filename}, ${item.size_bytes}, ${item.content_type})
  `;
}

export async function updateArchiveItem(id: number, title: string, description: string | null, visible: boolean, position: number) {
  await sql`
    UPDATE archive_items SET title = ${title}, description = ${description},
                             visible = ${visible}, position = ${position}
    WHERE id = ${id}
  `;
}

export async function deleteArchiveItem(id: number) {
  await sql`DELETE FROM archive_items WHERE id = ${id}`;
}

export async function countDownload(id: number) {
  await sql`UPDATE archive_items SET downloads = downloads + 1 WHERE id = ${id}`;
}

/* ------------------------------------------------------------------ contatore */

/** Incrementa e restituisce il totale, in una sola query atomica. */
export async function incrementVisits(): Promise<number> {
  const rows = await sql`
    UPDATE visits SET count = count + 1 WHERE id = 1 RETURNING count
  ` as Array<{ count: string | number }>;
  return Number(rows[0]?.count ?? 0);
}

export async function getVisits(): Promise<number> {
  const rows = await sql`SELECT count FROM visits WHERE id = 1` as Array<{ count: string | number }>;
  return Number(rows[0]?.count ?? 0);
}

/* --------------------------------------------------------------------- gioco */

export async function getTopScores(limit = 10) {
  return await sql`
    SELECT nickname, score, created_at FROM game_scores
    ORDER BY score DESC, created_at ASC LIMIT ${limit}
  ` as Array<{ nickname: string; score: number; created_at: string }>;
}

export async function addScore(nickname: string, score: number) {
  await sql`INSERT INTO game_scores (nickname, score) VALUES (${nickname}, ${score})`;
}
