# simonetuccio.it

Sito ufficiale di Simone Tuccio. Estetica MySpace / Y2K / grunge, con un
pannello di amministrazione per gestire i contenuti senza toccare il codice.

**Next.js 15** (App Router) · **Neon** (Postgres) · **Vercel Blob** (file) · **Vercel** (hosting)

---

## Che cosa c'è

| Sezione | Dove | Note |
|---|---|---|
| Sito pubblico | `/` | Profilo, status, player Spotify, archivio, gioco, diario |
| Pannello | `/admin` | Nome utente + password. Non c'è nessun link dal sito: ci si arriva digitando l'indirizzo |
| Archivio | `/#archivio` | Download liberi per chiunque, senza registrazione |
| Gioco | `/#gioco` | Snake con classifica condivisa |

Dal pannello si cambiano: foto profilo e current mood, tutti i testi, le
notizie scorrevoli, i link social (ordine compreso), gli articoli del diario
e i file dell'archivio.

## Installazione

Due strade, stesso risultato: entrambe chiamano la stessa funzione
(`lib/install.ts`), quindi non possono divergere.

**Dal browser** — non serve installare nulla. Imposta `SETUP_TOKEN`,
`ADMIN_USERNAME` e `ADMIN_PASSWORD` fra le variabili d'ambiente, poi apri:

```
https://<il-sito>/api/setup?token=<SETUP_TOKEN>
```

Crea tabelle, contenuti iniziali e utente admin. **A installazione finita
rimuovi quelle tre variabili**: senza `SETUP_TOKEN` la rotta risponde 404
come se non esistesse.

**Da terminale** — se hai Node sul computer:

```bash
npm install
cp .env.example .env.local     # poi compila i valori
npm run db:setup
npm run dev
```

Entrambe si possono rilanciare: le tabelle usano `IF NOT EXISTS`, i
contenuti già presenti non vengono sovrascritti, e la password dell'admin
viene aggiornata (utile se la dimentichi).

## Variabili d'ambiente

| Variabile | A cosa serve | Dove si prende |
|---|---|---|
| `DATABASE_URL` | Database Postgres | Neon → Connection string (usa la **pooled**) |
| | *Collegando Neon su Vercel il nome può essere diverso — vedi sotto* | |
| `BLOB_READ_WRITE_TOKEN` | Caricamento file | Impostata da sola collegando uno Store Blob al progetto Vercel |
| `SESSION_SECRET` | Firma dei cookie di sessione | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SETUP_TOKEN` | Abilita `/api/setup`. **Da togliere dopo l'installazione** | La scegli tu (almeno 16 caratteri) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Utente del pannello, letti solo in installazione | Le scegli tu (password di almeno 12 caratteri) |

**Il nome della variabile del database non è obbligato.** L'integrazione
Neon su Vercel a volte antepone un prefisso a tutte le variabili che crea,
e la stringa di connessione finisce per chiamarsi `DATABASE_DATABASE_URL`
invece di `DATABASE_URL`. Il codice prova questi nomi in ordine e usa il
primo valorizzato, così non serve rinominare nulla a mano:

`DATABASE_URL` → `DATABASE_DATABASE_URL` → `POSTGRES_URL` →
`DATABASE_POSTGRES_URL` → e poi le varianti senza pool di connessioni.

Lo stesso vale per il token di Blob: si cercano `BLOB_READ_WRITE_TOKEN`,
`BLOB_BLOB_READ_WRITE_TOKEN`, `VERCEL_BLOB_READ_WRITE_TOKEN`, e il valore
trovato viene passato esplicitamente alle chiamate.

**Lo Store Blob va creato con accesso `Public`.** Le foto e i file
dell'archivio sono fatti per essere visti e scaricati da chiunque: un
archivio privato vivrebbe su un host separato e richiederebbe un header di
autorizzazione a ogni richiesta, rompendo immagini e download.

Per sapere quali variabili ha trovato, con `SETUP_TOKEN` impostata:

```
https://<il-sito>/api/setup?token=<SETUP_TOKEN>&check=1
```

Non scrive nulla e riporta solo i **nomi** delle variabili trovate, mai il
loro contenuto.

`NEON_FETCH_ENDPOINT` esiste solo per i test: in produzione va lasciata vuota.

## Test

```bash
npm test          # 56 test: crittografia, indirizzi, database, installazione, variabili
npm run test:e2e  # 47 test: applicazione vera guidata da un browser
npm run test:all  # tutto, build compresa
```

I test girano su un **Postgres vero** (PGlite, Postgres compilato in
WebAssembly) dietro un adattatore che parla il protocollo HTTP di Neon
(`tests/neon-pglite-shim.mjs`). Non c'è nessun finto database: le query
provate sono le stesse che girano in produzione. I test end-to-end avviano
l'applicazione compilata, **la installano da zero chiamando `/api/setup`**
e poi la pilotano con Chromium — quindi la procedura di installazione
descritta qui sopra è verificata a ogni esecuzione.

## Scelte tecniche, e perché

**I file non passano dal server.** Le funzioni serverless di Vercel accettano
al massimo 4,5 MB per richiesta: un mp3 non ci starebbe. Il browser chiede a
`/api/admin/blob-upload` un permesso temporaneo (rilasciato solo se la
sessione admin è valida) e poi carica il file direttamente sullo storage.

**Il sito regge se il database cade.** `app/page.tsx` intercetta l'errore e
mostra contenuti di riserva invece di una pagina di errore: per un sito
vetrina è meglio incompleto che irraggiungibile.

**Il collegamento al database è pigro.** Avviene alla prima query, non
all'importazione: così la compilazione riesce anche prima che il database sia
collegato.

**Password e sessioni.** Le password sono salvate con scrypt e salt casuale,
mai in chiaro. Il confronto è a tempo costante. Dopo 5 tentativi falliti
l'utenza si blocca per 15 minuti. Il cookie di sessione è `httpOnly`
(invisibile a JavaScript), `secure` e `sameSite=lax`, firmato in HMAC-SHA256
e valido 8 ore. **Ogni** azione del pannello ricontrolla la sessione lato
server: non ci si fida mai del browser.

**Il contatore visite.** Incremento atomico in una sola query
(`UPDATE ... RETURNING`), una visita per sessione. Un test verifica che venti
incrementi in parallelo contino esattamente venti.

## Messa online

1. Collega il repository a un progetto Vercel.
2. Nel progetto, **Storage** → aggiungi **Neon** e uno **Store Blob**:
   Vercel imposta da sola `DATABASE_URL` e `BLOB_READ_WRITE_TOKEN`.
3. Imposta `SESSION_SECRET`, `SETUP_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
4. Controlla la configurazione con `…/api/setup?token=<SETUP_TOKEN>&check=1`,
   poi installa con `…/api/setup?token=<SETUP_TOKEN>` una volta sola.
5. Rimuovi `SETUP_TOKEN`, `ADMIN_USERNAME` e `ADMIN_PASSWORD`.
6. Collega il dominio `www.simonetuccio.it` al progetto e aggiorna i DNS
   presso il registrar seguendo le istruzioni di Vercel.

> **Attenzione all'ordine.** Finché i DNS puntano a GitHub Pages, il sito
> servito è quello vecchio sul ramo `main`. Nel momento in cui questo codice
> finisce su `main`, GitHub Pages non ha più una pagina da servire: il
> passaggio dei DNS va fatto **prima o insieme** alla fusione del ramo, non
> dopo.

## Resta da decidere

- [ ] I link social puntano alle pagine giuste solo per Instagram e Spotify.
      SoundCloud, Apple Music e TikTok vanno corretti dal pannello.
- [ ] Manca un contatto per booking e stampa.
- [ ] `public/assets/mood.jpg` pesa 545 KB e `profile.jpg` 161 KB: ora che
      le immagini si caricano dal pannello, conviene sostituirle con versioni
      più leggere (lato ~800 px).
- [ ] Immagine dedicata per le anteprime dei link, 1200×630.
