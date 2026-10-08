import { cookies } from 'next/headers';
import {
  hashPassword, verifyPassword, createSessionToken, readSessionToken, SESSION_TTL_SECONDS
} from './crypto';

export { hashPassword, verifyPassword };
export { login, type LoginResult } from './login';

const SESSION_COOKIE = 'st_session';

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET mancante o troppo corta (servono almeno 32 caratteri).');
  }
  return secret;
}

export async function setSessionCookie(username: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(username, sessionSecret()), {
    httpOnly: true,                                   // non leggibile da JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',                                  // blocca l'uso da altri siti
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Lo username dell'admin collegato, oppure null. Da usare in OGNI rotta admin. */
export async function currentAdmin(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSessionToken(token, sessionSecret());
}

