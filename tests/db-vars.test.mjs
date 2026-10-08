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

/* ------------------------------------------------------------ token Blob -- */

const VARS_BLOB = ['BLOB_READ_WRITE_TOKEN', 'BLOB_BLOB_READ_WRITE_TOKEN', 'VERCEL_BLOB_READ_WRITE_TOKEN'];
const { resolveBlobToken, blobToken } = await import('../lib/blob.ts');

describe('nome della variabile del token Blob', () => {
  beforeEach(() => { for (const v of VARS_BLOB) delete process.env[v]; });

  test('senza variabili non trova nulla', () => {
    assert.equal(resolveBlobToken(), null);
    assert.equal(blobToken(), undefined);
  });

  test('riconosce il nome standard', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_abc';
    assert.deepEqual(resolveBlobToken(), ['BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_abc']);
    assert.equal(blobToken(), 'vercel_blob_rw_abc');
  });

  test('riconosce il nome con prefisso doppio', () => {
    process.env.BLOB_BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_xyz';
    assert.equal(resolveBlobToken()[0], 'BLOB_BLOB_READ_WRITE_TOKEN');
  });

  test('il nome standard ha la precedenza', () => {
    process.env.BLOB_BLOB_READ_WRITE_TOKEN = 'secondo';
    process.env.BLOB_READ_WRITE_TOKEN = 'primo';
    assert.equal(blobToken(), 'primo');
  });
});
