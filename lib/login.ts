import { sql } from './db';
import { verifyPassword, DUMMY_HASH } from './crypto';

/* ------------------------------------------------------------------ login */

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; username: string }
  | { ok: false; reason: 'credenziali' | 'bloccato'; retryAfterMinutes?: number };

/**
 * Verifica le credenziali applicando un blocco temporaneo dopo troppi
 * tentativi falliti, così la password non è attaccabile per tentativi.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  const rows = await sql`
    SELECT username, password_hash, failed_attempts, locked_until
    FROM admin_users WHERE username = ${username}
  ` as Array<{ username: string; password_hash: string; failed_attempts: number; locked_until: string | null }>;

  const user = rows[0];

  // Nessun utente: calcoliamo comunque un hash, così il tempo di risposta
  // non rivela se lo username esiste.
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false, reason: 'credenziali' };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return { ok: false, reason: 'bloccato', retryAfterMinutes: minutes };
  }

  if (await verifyPassword(password, user.password_hash)) {
    await sql`
      UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = now()
      WHERE username = ${username}
    `;
    return { ok: true, username: user.username };
  }

  const attempts = user.failed_attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await sql`
      UPDATE admin_users
      SET failed_attempts = 0, locked_until = now() + ${`${LOCK_MINUTES} minutes`}::interval
      WHERE username = ${username}
    `;
    return { ok: false, reason: 'bloccato', retryAfterMinutes: LOCK_MINUTES };
  }

  await sql`UPDATE admin_users SET failed_attempts = ${attempts} WHERE username = ${username}`;
  return { ok: false, reason: 'credenziali' };
}
