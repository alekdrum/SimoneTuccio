/**
 * Password e firma delle sessioni. Nessun import da Next: così questo
 * modulo è verificabile con test automatici, fuori dal framework.
 */
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt) as (
  password: string | Buffer, salt: string | Buffer, keylen: number
) => Promise<Buffer>;

export const KEYLEN = 64;
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 ore

/* ------------------------------------------------------------------ password */

/** Deriva un hash scrypt con salt casuale. Formato: scrypt$<salt hex>$<hash hex> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Confronto a tempo costante: non rivela quanti caratteri erano giusti. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(parts[1], 'hex');
    expected = Buffer.from(parts[2], 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN || salt.length === 0) return false;

  const derived = await scrypt(password, salt, KEYLEN);
  return timingSafeEqual(derived, expected);
}

/** Hash fittizio usato quando l'utente non esiste, per non far capire
    dalla durata della risposta se lo username è giusto. */
export const DUMMY_HASH = `scrypt$${'00'.repeat(16)}$${'00'.repeat(KEYLEN)}`;

/* ------------------------------------------------------------------ sessione */

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

export function createSessionToken(username: string, secret: string, now = Date.now()): string {
  const payload = b64url(Buffer.from(JSON.stringify({
    sub: username,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  })));
  return `${payload}.${sign(payload, secret)}`;
}

/** Verifica firma e scadenza. Ritorna lo username, oppure null. */
export function readSessionToken(token: string | undefined, secret: string, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.exp !== 'number' || data.exp < Math.floor(now / 1000)) return null;
    return typeof data.sub === 'string' ? data.sub : null;
  } catch {
    return null;
  }
}
