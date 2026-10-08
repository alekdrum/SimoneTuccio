import { timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { hashPassword } from './crypto';
import { SCHEMA, DEFAULT_SETTINGS, DEFAULT_SOCIALS } from './schema';

export type InstallReport = {
  tabelle: number;
  impostazioni: number;
  social: number;
  admin: string | null;
};

/** Confronto a tempo costante fra due stringhe di lunghezza qualsiasi. */
export function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Crea le tabelle, inserisce i contenuti iniziali e l'utente admin.
 * Si può rilanciare quante volte si vuole: le tabelle usano IF NOT EXISTS,
 * le impostazioni e i social non sovrascrivono quelli già presenti, e
 * l'admin viene aggiornato (utile se dimentichi la password).
 */
export async function install(adminUsername?: string, adminPassword?: string): Promise<InstallReport> {
  for (const statement of SCHEMA) {
    await sql.query(statement);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO NOTHING`;
  }

  for (const [platform, label, url, position] of DEFAULT_SOCIALS) {
    const exists = await sql`SELECT 1 FROM socials WHERE platform = ${platform}` as unknown[];
    if (!exists.length) {
      await sql`INSERT INTO socials (platform, label, url, position)
                VALUES (${platform}, ${label}, ${url}, ${position})`;
    }
  }

  let admin: string | null = null;
  if (adminUsername && adminPassword) {
    const hash = await hashPassword(adminPassword);
    await sql`
      INSERT INTO admin_users (username, password_hash) VALUES (${adminUsername}, ${hash})
      ON CONFLICT (username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, failed_attempts = 0, locked_until = NULL
    `;
    admin = adminUsername;
  }

  return {
    tabelle: SCHEMA.length,
    impostazioni: Object.keys(DEFAULT_SETTINGS).length,
    social: DEFAULT_SOCIALS.length,
    admin
  };
}
