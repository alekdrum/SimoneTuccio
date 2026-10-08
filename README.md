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

## Avvio in locale

```bash
npm install
cp .env.example .env.local     # poi compila i valori
npm run db:setup               # crea le tabelle e l'utente admin
npm run dev
```

## Variabili d'ambiente

| Variabile | A cosa serve | Dove si prende |
|---|---|---|
| `DATABASE_URL` | Database Postgres | Neon → Connection string (usa la **pooled**) |
| `BLOB_READ_WRITE_TOKEN` | Caricamento file | Impostata da sola collegando uno Store Blob al progetto Vercel |
| `SESSION_SECRET` | Firma dei cookie di sessione | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Solo per `npm run db:setup` | Le scegli tu (password di almeno 12 caratteri) |

`NEON_FETCH_ENDPOINT` esiste solo per i test: in produzione va lasciata vuota.

## Test

```bash
npm test          # 32 test: crittografia e database
npm run test:e2e  # 34 test: applicazione vera guidata da un browser
npm run test:all  # tutto, build compresa
```

I test girano su un **Postgres vero** (PGlite, Postgres compilato in
WebAssembly) dietro un adattatore che parla il protocollo HTTP di Neon
(`tests/neon-pglite-shim.mjs`). Non c'è nessun finto database: le query
provate sono le stesse che girano in produzione. I test end-to-end avviano
l'applicazione compilata e la pilotano con Chromium.

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
3. Imposta `SESSION_SECRET` fra le variabili d'ambiente.
4. Esegui `npm run db:setup` una volta, in locale, puntando al database di
   produzione: crea le tabelle, i contenuti iniziali e l'utente admin.
5. Collega il dominio `www.simonetuccio.it` al progetto e aggiorna i DNS
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
