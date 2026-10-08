import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const TUTTE = [
  'DATABASE_URL', 'DATABASE_DATABASE_URL', 'POSTGRES_URL', 'DATABASE_POSTGRES_URL',
  'DATABASE_URL_UNPOOLED', 'DATABASE_DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING', 'DATABASE_POSTGRES_URL_NON_POOLING'
];

const { resolveConnectionString } = await import('../lib/db.ts');

beforeEach(() => { for (const v of TUTTE) delete process.env[v]; });

describe('nome della variabile del database', () => {
  test('senza nessuna variabile non trova nulla', () => {
    assert.equal(resolveConnectionString(), null);
  });

  test('riconosce il nome classico', () => {
    process.env.DATABASE_URL = 'postgresql://a/b';
    assert.deepEqual(resolveConnectionString(), ['DATABASE_URL', 'postgresql://a/b']);
  });

  test("riconosce il nome con prefisso prodotto dall'integrazione Vercel", () => {
    process.env.DATABASE_DATABASE_URL = 'postgresql://con/prefisso';
    assert.deepEqual(resolveConnectionString(), ['DATABASE_DATABASE_URL', 'postgresql://con/prefisso']);
  });

  test('riconosce le varianti POSTGRES_', () => {
    process.env.POSTGRES_URL = 'postgresql://p/q';
    assert.deepEqual(resolveConnectionString(), ['POSTGRES_URL', 'postgresql://p/q']);
    delete process.env.POSTGRES_URL;
    process.env.DATABASE_POSTGRES_URL = 'postgresql://r/s';
    assert.equal(resolveConnectionString()[0], 'DATABASE_POSTGRES_URL');
  });

  test('se ci sono entrambe preferisce quella con pool di connessioni', () => {
    process.env.DATABASE_URL_UNPOOLED = 'postgresql://senza-pool';
    process.env.DATABASE_DATABASE_URL = 'postgresql://con-pool';
    assert.equal(resolveConnectionString()[0], 'DATABASE_DATABASE_URL');
  });

  test('una variabile vuota o di soli spazi vale come assente', () => {
    process.env.DATABASE_URL = '   ';
    process.env.POSTGRES_URL = 'postgresql://buona';
    assert.equal(resolveConnectionString()[0], 'POSTGRES_URL');
  });

  test('toglie gli spazi ai lati (capita incollando)', () => {
    process.env.DATABASE_URL = '  postgresql://a/b\n';
    assert.equal(resolveConnectionString()[1], 'postgresql://a/b');
  });
});
