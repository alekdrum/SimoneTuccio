import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword, verifyPassword, createSessionToken, readSessionToken,
  SESSION_TTL_SECONDS, DUMMY_HASH
} from '../lib/crypto.ts';

const SECRET = 'x'.repeat(48);

describe('password', () => {
  test('una password corretta viene riconosciuta', async () => {
    const hash = await hashPassword('password-lunga-e-sicura');
    assert.equal(await verifyPassword('password-lunga-e-sicura', hash), true);
  });

  test('una password sbagliata viene respinta', async () => {
    const hash = await hashPassword('password-lunga-e-sicura');
    assert.equal(await verifyPassword('password-lunga-e-sicurA', hash), false);
    assert.equal(await verifyPassword('', hash), false);
  });

  test('lo stesso testo produce hash diversi (il salt è casuale)', async () => {
    const a = await hashPassword('uguale');
    const b = await hashPassword('uguale');
    assert.notEqual(a, b);
    assert.equal(await verifyPassword('uguale', a), true);
    assert.equal(await verifyPassword('uguale', b), true);
  });

  test('un hash malformato viene respinto senza esplodere', async () => {
    for (const bad of ['', 'niente', 'scrypt$solo-due', 'bcrypt$aa$bb', 'scrypt$$', 'scrypt$zz$zz']) {
      assert.equal(await verifyPassword('x', bad), false, `avrebbe dovuto respingere: ${bad}`);
    }
  });

  test("l'hash fittizio non combacia con nulla", async () => {
    assert.equal(await verifyPassword('', DUMMY_HASH), false);
    assert.equal(await verifyPassword('password', DUMMY_HASH), false);
  });
});

describe('sessione', () => {
  test('un token valido restituisce lo username', () => {
    const token = createSessionToken('simone', SECRET);
    assert.equal(readSessionToken(token, SECRET), 'simone');
  });

  test('un token firmato con un altro segreto viene respinto', () => {
    const token = createSessionToken('simone', SECRET);
    assert.equal(readSessionToken(token, 'y'.repeat(48)), null);
  });

  test('manomettere il contenuto invalida la firma', () => {
    const token = createSessionToken('simone', SECRET);
    const [, signature] = token.split('.');
    const falso = Buffer.from(JSON.stringify({
      sub: 'intruso', exp: Math.floor(Date.now() / 1000) + 9999
    })).toString('base64url');
    assert.equal(readSessionToken(`${falso}.${signature}`, SECRET), null);
  });

  test('manomettere la firma viene respinto', () => {
    const [payload, signature] = createSessionToken('simone', SECRET).split('.');
    const alterata = signature.slice(0, -1) + (signature.at(-1) === 'a' ? 'b' : 'a');
    assert.equal(readSessionToken(`${payload}.${alterata}`, SECRET), null);
  });

  test('un token scaduto viene respinto', () => {
    const emesso = Date.now() - (SESSION_TTL_SECONDS + 60) * 1000;
    const token = createSessionToken('simone', SECRET, emesso);
    assert.equal(readSessionToken(token, SECRET), null);
    // ...ma era valido quando è stato emesso
    assert.equal(readSessionToken(token, SECRET, emesso + 1000), 'simone');
  });

  test('token malformati non fanno eccezione', () => {
    for (const bad of [undefined, '', 'senza-punto', '.', 'a.b', '....']) {
      assert.equal(readSessionToken(bad, SECRET), null);
    }
  });
});
