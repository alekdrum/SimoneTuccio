# simonetuccio.it

Sito ufficiale di Simone Tuccio — estetica MySpace / Y2K, pagina singola,
pubblicata con GitHub Pages sul dominio `www.simonetuccio.it`.

Tutto il sito è un unico file: `index.html` (HTML + CSS + JS, nessuna build,
nessuna dipendenza da installare). Le immagini stanno in `assets/`.

## Pubblicare un post nel diario

1. Apri **https://www.simonetuccio.it/#admin** — compare il pulsante `⚙ ADMIN`
   e si apre la finestra di login. Ai visitatori normali il pulsante non è visibile.
2. Inserisci la password, poi usa `+ NUOVO POST`.

## Configurazione Firestore richiesta

Il contatore visite e il diario usano Firestore. Nella
[console Firebase](https://console.firebase.google.com/) → *Firestore Database* →
*Regole*, servono queste regole. **Senza la sezione `simonetuccio_meta` il
contatore non riesce a incrementare e resta fermo.**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Contatore visite: chiunque può leggerlo e incrementarlo di 1,
    // ma nessuno può scriverci un valore arbitrario.
    match /simonetuccio_meta/visits {
      allow read: if true;
      allow create: if request.resource.data.count == 1;
      allow update: if request.resource.data.count == resource.data.count + 1
                    && request.resource.data.keys().hasOnly(['count', 'updatedAt']);
    }

    // Diario: lettura pubblica.
    match /simonetuccio_posts/{post} {
      allow read: if true;
      allow write: if true;   // <-- DA RESTRINGERE, vedi sotto
    }
  }
}
```

Per far ripartire il contatore da un numero diverso da zero, basta modificare a
mano il campo `count` del documento `simonetuccio_meta/visits` dalla console.

## Da sistemare (in ordine di importanza)

- [ ] **Sicurezza del diario.** Oggi `allow write: if true` significa che
      *chiunque* può creare o cancellare post scrivendo direttamente su Firestore,
      senza passare dal sito. La password nel browser non protegge nulla: qualsiasi
      controllo lato client è aggirabile. La soluzione è Firebase Authentication
      (anche solo email+password con un unico utente) e poi regole
      `allow write: if request.auth != null`.
- [ ] **Peso delle immagini.** `assets/mood.jpg` è 545 KB (1600×1280) e
      `assets/profile.jpg` è 161 KB (1066×1599), ma vengono mostrate in riquadri
      di ~280 px. Sono ~700 KB scaricati per niente, che su rete mobile si sentono.
      Ridimensionandole a ~600 px di lato ed esportandole in WebP si scende
      sotto i 100 KB in totale.
- [ ] **Immagine di anteprima dedicata.** I meta `og:image` puntano a
      `assets/profile.jpg`, che è verticale: nelle anteprime dei link viene
      ritagliata. Meglio un'immagine pensata apposta, 1200×630.
- [ ] **Contatti.** Manca un riferimento per booking / stampa: per un sito
      d'artista è la cosa che più ne determina la credibilità.
- [ ] **Altre piattaforme.** Ci sono solo Instagram e Spotify — mancano
      YouTube, Apple Music, TikTok.
