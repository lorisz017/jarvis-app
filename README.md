# J.A.R.V.I.S. — Mobile

> *Just A Rather Very Intelligent System* — a voice assistant for Android that actually does things on your phone.

**[English](#english) · [Italiano](#italiano)**

---

<a name="english"></a>

# English

## What this is

J.A.R.V.I.S. is a personal voice assistant for Android, inspired by Tony Stark's AI in Iron Man. You open it and talk — it listens and answers in its own voice, while you speak. But more importantly, it *acts*: it sets real alarms in your clock app, creates real calendar events, calls people from your address book, starts navigation, and opens your apps.

It can also **see**. Point the camera at something and ask about it, or attach a photo and keep asking — the picture stays in the conversation, so the follow-up questions still find it there.

It speaks and understands **Italian**, and it runs entirely on free API tiers.

## Why it exists

Phone assistants tend to fall into two camps: the ones built into the system, which are closed and can't be changed, and the chat apps, which talk beautifully but can't touch anything on your device. This project is an attempt at the middle ground — something that holds a real conversation *and* has hands.

It started as a fork of an existing open-source assistant and grew from there — and by version 3 the heart of it is a continuous spoken conversation rather than the command loop it began as: translated to Italian, rebuilt around free providers, given a heads-up-display interface, and taught twenty-one actions that do real work on the phone.

## How it works

### The conversation

What the app opens into is a continuous conversation. One model listens to your voice and answers in its own, while you speak — no recording, no transcription, no synthetic voice reading out a text written by someone else. You can interrupt it mid-sentence and it stops, the way a person would; the app measures what comes in through the microphone rather than waiting for the server to notice.

It runs on **Gemini's Live API**, over a connection held open for as long as the conversation lasts, with every action available inside it. Asking for four things at once — two alarms, a timer and a call — takes one breath, because the model plans them together instead of one round trip at a time.

Down the same connection goes **what the camera sees**: a frame a second, beside the audio, so "what is this?" needs no explanation of what *this* refers to. And a picture from your library can be attached to what you type — that one enters as a real turn, so it stays in the thread and later questions still find it.

Say goodbye — "go to sleep", "see you later", "goodnight" — and it answers, finishes the sentence, and puts the phone back on its home screen.

### The command mode, behind a switch

The older way is still here, one setting away. It records, transcribes with **Whisper** (via Groq), reasons with **Gemini** (Groq behind it), and reads the answer aloud with a neural voice from **Microsoft Edge's read-aloud service**, stepping down to Deepgram Aura-2 and then to the phone's own voice, so it never falls silent.

It is slower and flatter — a transcript loses the tone and the pauses that the live model hears — but it is the only road that does not go through Gemini. The Live model is a preview; the day it stops answering, this is the difference between a slower app and a dead one.

One number explains a lot of this project's history: Groq's free tier allows 8000 tokens a minute, and a single request here spends about three thousand of them. A chain of actions exhausts that in two rounds, after which the model simply stops answering — and the actions that never happened only looked forgotten.

### Outside the app

You do not have to be in the app at all: with the floating bubble on, leaving it puts a circle over whatever is on screen. A tap opens the continuous conversation right there, a long press brings the app back, and dragging it onto the tab at the bottom removes it. The ring turns green while it listens and amber while it thinks, because from out there the colour is all you have to go on.

With the bubble off, leaving the app closes the conversation instead: a microphone that stays open behind other apps is not a feature.

## Features

A continuous spoken conversation · **seeing through the camera**, a frame a second, while you talk · **attaching a picture** and going on asking about it · typing, when speaking is not an option · a memory of who you are, written by you and added to by it · a floating bubble that stays over other apps · a spoken goodbye that closes the app · interrupting it mid-sentence · several actions from one request · weather · native alarms and timers · calendar events · reminders (create, list, cancel) · phone calls and WhatsApp messages by contact name · navigation · launching ~20 common apps · camera, Telegram, YouTube · web search · GitHub repository management · an opening briefing with the time, weather and your day's appointments, spoken in its own voice · battery monitor · a settings panel listing every command.

Twenty-one actions in all. The interface is a heads-up display that moves like something physical: panels frost the background and rise into place, the mode lever stretches in the direction it travels, buttons press like surfaces — and every bit of that glass exists only while something moves, because at rest is when a screen has to be read.

Web search goes through **DuckDuckGo**, which needs no key and has no quota: it returns page excerpts, and the reply is written by the chat model already in use. Gemini's Google search sits behind it — better prose, but grounding is not in the free tier and answers "quota exceeded" — and Groq Compound behind that.

A live status list of what works, and what does not, is kept in [`STATO_FUNZIONI.md`](./STATO_FUNZIONI.md).

### Tested on

The project is in its early stages and has so far been tested on a single
device: a **Xiaomi 17 running Android 17**. Everything marked as working is
confirmed there and nowhere else yet.

This matters more than it might seem. The device actions — alarms, timers,
opening other apps — work by handing an intent to whatever app on the phone
handles it, and both the manufacturer's customisations and which apps are
installed change the outcome. On a different phone the clock app may interpret
the same request differently, an app may not answer the URL scheme this project
expects, or a permission may be requested at another moment. So if something
misbehaves elsewhere, it is likely a difference in the device rather than a
fault in the code. Reports from other devices are welcome.

## Setting it up

You don't need a development environment on your computer — everything can be done from a browser. It takes about twenty minutes.

### 1. Get the code

Fork this repository to your own GitHub account.

### 2. Get the API keys

| Key | Where | Cost | Needed for |
|---|---|---|---|
| Gemini | [aistudio.google.com](https://aistudio.google.com) | Free | **Required** — the conversation itself, the reasoning, and seeing through the camera. Without it the app has no main road |
| Groq | [console.groq.com](https://console.groq.com) | Free | **Required** — transcription, and the reasoning fallback for command mode. 8000 tokens a minute, which one request here half spends |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Free, no card | Optional — the fallback voice for command mode only; the conversation speaks for itself. Signing up grants credit worth millions of characters that does not expire |
| GitHub token | GitHub → Settings → Developer settings → Personal access tokens, `repo` scope | Free | Optional — only for the repository commands |

The camera and the picture attachment need no key of their own: they travel down the Gemini connection that is already open.

### 3. Create the Expo project

Sign up at [expo.dev](https://expo.dev) and create a project. Then, in **Project settings → Environment variables**, add your keys as **Plain text**, for all environments:

```
EXPO_PUBLIC_GEMINI_API_KEY      (the conversation, the reasoning, the camera)
EXPO_PUBLIC_GROQ_API_KEY        (transcription, fallback reasoning)
EXPO_PUBLIC_DEEPGRAM_API_KEY    (fallback voice, optional)
EXPO_PUBLIC_GITHUB_TOKEN_KEY    (optional)
```

The `EXPO_PUBLIC_` prefix is required — without it, Expo won't expose the variable to the app.

### 4. Point the app at your project

In `app.config.js`, replace:

- `extra.eas.projectId` with the project ID shown on your Expo dashboard
- `slug` with your project's slug
- `android.package` with your own identifier, e.g. `com.yourname.jarvis`

### 5. Build it

On expo.dev: **Builds → Build from GitHub**, then:

- Platform: **Android**
- Git ref: **main**
- Build profile: **preview**
- Base directory: **leave empty** — putting anything here breaks the build

The `preview` profile is already set up to produce an installable `.apk` rather than a Play Store bundle. When it's done, download it to your phone and install it. Android will warn you about installing from an unknown source; that's expected for an app you built yourself.

#### Building without Expo

Expo's free tier allows 15 Android builds a month, which goes quickly. This repository also ships `.github/workflows/build-apk.yml`, which builds the same APK on GitHub Actions — free and unmetered on public repositories. Run it from the **Actions** tab; the APK appears as an artifact on the run's page. It needs the same keys, added under **Settings → Secrets and variables → Actions**.

Two caveats. It signs with the project's `debug.keystore`, a different key from the one Expo uses, so the first time you switch you have to uninstall the existing app. And artifacts of a public repository are downloadable by anyone, while the keys are compiled into the APK — so if you use a GitHub token, run the workflow from a private repository instead, where 2000 free monthly minutes still allow roughly a hundred builds.

### 6. First run

The app will ask for microphone, camera, notification, calendar and contacts permissions. Grant the ones you want to use — anything you deny simply disables the matching feature. The camera is only asked for the first time you open the eye.

Then say *"my city is Bologna"*, or set it in the settings panel, so the opening briefing gives you the right weather.

## Notes for developers

**This repository contains committed `android/` and `ios/` folders.** That makes it a bare workflow project, so **EAS skips the prebuild step**. The practical consequence, which costs a day if you discover it the hard way:

- Native settings in `app.config.js` (permissions, themes) are **ignored**. Any new Android permission must be added directly to `android/app/src/main/AndroidManifest.xml`.
- The version that ends up in the APK is `versionName` in `android/app/build.gradle`, not `version` in `app.config.js`.

Two more things worth knowing:

- React Native's `Linking.sendIntent` sends every number as a `Double`, so Android intents that read integers (`SET_ALARM`, `SET_TIMER`) silently get their defaults. Use `expo-intent-launcher` instead — it converts them to `Int`.
- On Groq, HTTP 413 "Request Entity Too Large" is a **tokens-per-minute rate limit**, not a payload size problem. Sending less history won't help if the model itself is consuming the budget.
- A foreground service is granted the `microphone` type **only if the app is in the foreground when the service starts**. Starting it as the app is being left — the obvious moment for an overlay — is the one moment Android refuses, and the exception escapes `onCreate` and takes the app down with it.
- An app in the background cannot start another app's screen. Setting an alarm opens the clock, and from then on every further action in the same chain is dropped in silence. Holding `SYSTEM_ALERT_WINDOW` is the documented exemption: bring yourself back to the front first, and wait until you actually are.
- Give every network call a deadline. Inside the app a stalled request merely looks slow; from a floating bubble there is no screen at all, and it is indistinguishable from a dead app.
- Leave recording mode before playing audio back. While the session is held for the microphone, Android can play to nowhere.
- The voice comes from Edge's read-aloud service, which needs no key and has no quota. It is **not an official API**: there is no documented endpoint, and the service is meant to be used from the browser. It works and many projects rely on it, but it can stop working overnight — which is why Deepgram stays underneath, and why nothing here should be built on the assumption that it will keep answering.
- Tool calling gets its own temperature. At the default the model re-plans the same sentence differently each time, and which action survives a chain becomes a draw.
- A system prompt built at module scope is frozen before anything asynchronous has loaded. Here it embedded the user's saved memory, which is read from disk after the first render, so the constant carried an empty memory for the life of the process while the settings screen showed it correctly. Build the prompt where it is used, not where the module is imported.
- A write that fails silently is worse than one that throws. A memory kept in RAM after its save failed works perfectly until the app is closed, and then the loss looks like a model that forgets rather than a disk that refused.
- Live video rides the same socket as live audio: `realtimeInput.video` beside `realtimeInput.audio`, `image/jpeg`, one frame a second, which is the rate Google recommends. A phone's photo is enormous next to what a model needs — ask the device which picture sizes it can produce and take the smallest above 640 pixels, below which it stops reading signs — and take one shot at a time, or a slow phone queues frames describing a past nobody asked about.
- An attached picture is not a frame: sent as a `clientContent` turn with `inlineData`, it stays in the conversation's thread, so follow-up questions still find it.
- A scrollable box inside another scrollable box does not scroll at all on Android without `nestedScrollEnabled` — the outer one takes the gesture.
- Copying on a single tap makes text impossible to select: every attempt to grab a word copies the whole thing. Copy on the double tap.
- `adjustResize` shrinks the window for the keyboard but does not move what you were looking at. A text field at the bottom of a scrolling page has to be brought into view yourself, after a short delay so the keyboard has taken its space first.
- A component that wraps something already laid out must not take its style: `position: absolute`, `flex: 1` and margins are all relative to the parent, and moving them one node down positions the child against a box of zero size — visible where expected, and untouchable, because Android does not deliver touches outside a parent's bounds.
- The launcher icons are generated by `strumenti/icona.py`, which writes the PNGs by hand through `zlib` — edges computed rather than supersampled, so a 48-pixel icon is as clean as a 432-pixel one. An adaptive icon's safe area is the middle circle, a third of the side: outside it every phone crops differently, and fine detail has to drop out below a certain size or it turns to dirt.
- Echo cancellation works by subtraction, not by magic: it removes from the microphone the signal the phone is sending to the speaker, so it has to know which signal that is. Recording from `VOICE_COMMUNICATION` is only half of it — the playback must belong to the same communication session (`USAGE_VOICE_COMMUNICATION`, and the phone in `MODE_IN_COMMUNICATION`), or on a phone that follows the specification the assistant's own voice comes back in untouched and a local barge-in detector cuts it off at every sentence. Some phones cancel everything that leaves the device and hide the mistake; the ones that don't make it look like a bug in the app. Switching to the communication line brings two consequences of its own: audio would go to the earpiece, and the volume is the in-call one, not the media one.
- A barge-in threshold measured on one phone is a number about that phone. How much of its own voice a device hears back depends on where the speaker and the microphone sit and on how well it filters — so the threshold has to be measured at run time (the first tenths of a second of each answer are only its own voice: that level *is* the echo) rather than written as a constant.
- Interrupting a streamed voice means dropping the rest of the turn, not just flushing the speaker. The server keeps sending the audio it had already produced, and playing it is the voice restarting by itself a moment after being silenced.
- One native audio track, one session. Two live sessions opened by accident write to the same track: two voices at once, each silencing the other mid-word. Guard it where the audio is, not in the UI — opening a session is a chain of awaits, and the on-screen state still says "off" while it runs.

## Credits

- **[Azizbek Anvarjonov](https://github.com/az11k-dev)** — [az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app), the initial skeleton this project grew out of
- **[lorisz017](https://github.com/lorisz017)** — everything since: the interface, the actions on the phone, the voice, and essentially all of what the app does today

And a special thank you to **[FatihMakes](https://github.com/FatihMakes)** for [Mark-LIII](https://github.com/FatihMakes/Mark-LIII). That desktop assistant is where the idea for this one came from, and its interface is why this app looks the way it does.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.

Mark-LIII, mentioned above, is licensed CC BY-NC, which does not mix with MIT. Nothing was copied from it: the debt is one of inspiration only.

---

<a name="italiano"></a>

# Italiano

## Che cos'è

J.A.R.V.I.S. è un assistente vocale personale per Android, ispirato all'intelligenza artificiale di Tony Stark in Iron Man. Si apre e si parla: lui ascolta e risponde con la propria voce, mentre si parla. Ma soprattutto *agisce*: mette sveglie vere nell'app Orologio, crea eventi veri nel calendario, chiama le persone in rubrica, avvia la navigazione e apre le app.

E **vede**. Si inquadra qualcosa con la fotocamera e gli si chiede cos'è, oppure si allega una foto e si continua a fargli domande — l'immagine resta nella conversazione, quindi le domande successive la ritrovano.

Parla e capisce **italiano**, e funziona interamente con quote gratuite.

## Perché esiste

Gli assistenti sul telefono tendono a dividersi in due categorie: quelli di sistema, chiusi e non modificabili, e le app di chat, che conversano benissimo ma non possono toccare nulla del dispositivo. Questo progetto prova a stare nel mezzo — qualcosa che sostiene una conversazione vera *e* ha le mani.

È nato come fork di un assistente open source già esistente ed è cresciuto da lì — e alla versione 3 il suo cuore è una conversazione continua a voce, non più il giro a comandi da cui era partito: tradotto in italiano, ricostruito su provider gratuiti, dotato di un'interfaccia in stile HUD e istruito con ventuno azioni che fanno cose concrete sul telefono.

## Come funziona

### La conversazione

Quello con cui l'app si apre è una conversazione continua. Un solo modello ascolta la voce e risponde con la propria, mentre si parla — niente registrazione, niente trascrizione, nessuna voce sintetica che legge un testo scritto da qualcun altro. Lo si può interrompere a metà frase e si ferma, come farebbe una persona: l'app misura quanto entra dal microfono invece di aspettare che se ne accorga il server.

Passa dall'**API Live di Gemini**, su una connessione che resta aperta per tutta la conversazione, con tutte le azioni disponibili lì dentro. Chiedergli quattro cose insieme — due sveglie, un timer e una chiamata — dura un respiro, perché il modello le pianifica insieme invece che un giro per volta.

Dalla stessa connessione passa **quello che vede la fotocamera**: un fotogramma al secondo, accanto alla voce, così "questo cos'è?" non ha bisogno di spiegare a cosa si riferisca *questo*. E a quello che si scrive si può agganciare un'immagine dalla galleria — quella entra come turno vero, quindi resta nel filo del discorso e le domande dopo la ritrovano.

Ci si congeda — "vai a dormire", "ci sentiamo dopo", "buonanotte" — e lui risponde, finisce la frase, e riporta il telefono alla schermata iniziale.

### La modalità a comandi, dietro un interruttore

Il modo più vecchio è ancora qui, a un'impostazione di distanza. Registra, trascrive con **Whisper** (tramite Groq), ragiona con **Gemini** (Groq dietro come riserva) e legge la risposta con una voce neurale del **servizio di lettura ad alta voce di Microsoft Edge**, scendendo su Deepgram Aura-2 e poi sulla voce di sistema del telefono, così non resta mai muto.

È più lenta e più piatta — una trascrizione perde il tono e le pause che il modello dal vivo sente — ma è l'unica strada che non passa da Gemini. Il modello Live è in anteprima: il giorno che smette di rispondere, quella è la differenza fra un'app più lenta e un'app morta.

Un numero solo spiega buona parte della storia di questo progetto: il piano gratuito di Groq concede 8000 token al minuto, e una sola richiesta di questa app ne consuma circa tremila. Una catena di azioni li esaurisce in due giri, e da lì in poi il modello smette semplicemente di rispondere — le azioni mai eseguite sembravano dimenticate, ma non erano mai state chieste.

### Fuori dall'app

E non serve nemmeno essere dentro l'app: con la bolla flottante accesa, uscendo resta un cerchio sopra qualunque cosa ci sia sullo schermo. Un tocco apre lì la conversazione continua, una pressione lunga riapre l'app, e trascinandola sulla linguetta in basso si toglie. L'anello diventa verde mentre ascolta e ambra mentre pensa, perché da lì fuori il colore è l'unica cosa su cui regolarsi.

Con la bolla spenta, invece, uscire chiude la conversazione: un microfono che resta aperto dietro le altre app non è una funzione.

## Funzioni

Conversazione continua a voce · **vede dalla fotocamera**, un fotogramma al secondo, mentre si parla · **si allega un'immagine** e si continua a farci domande · scrittura, per quando parlare non si può · memoria di chi si è, scritta a mano e ampliata da lui · bolla flottante che resta sopra le altre app · un congedo a voce che chiude l'app · lo si interrompe a metà frase · più azioni con una sola richiesta · meteo · sveglie e timer nativi · eventi in calendario · promemoria (crea, elenca, annulla) · chiamate e messaggi WhatsApp per nome del contatto · navigazione · apertura di una ventina di app · fotocamera, Telegram, YouTube · ricerca sul web · gestione repository GitHub · riepilogo all'apertura con ora, meteo e impegni del giorno, detto con la sua voce · monitor della batteria · pannello impostazioni con l'elenco di tutti i comandi.

Ventuno azioni in tutto. L'interfaccia è un quadro strumenti che si muove come una cosa fisica: i pannelli velano il fondo e salgono al loro posto, la leva delle modalità si stira nel verso in cui va, i tasti si premono come superfici — e tutto quel vetro vive **solo durante il movimento**, perché è da ferma che una schermata si legge.

La ricerca sul web passa da **DuckDuckGo**, che non chiede chiavi e non ha quote: restituisce brani di pagine, e la risposta la scrive il modello di chat già in uso. Dietro c'è la ricerca Google di Gemini — scriverebbe meglio, ma non rientra nel piano gratuito e risponde che la quota è esaurita — e più indietro ancora Groq Compound.

L'elenco aggiornato di cosa funziona, e cosa no, è in [`STATO_FUNZIONI.md`](./STATO_FUNZIONI.md).

### Su cosa è stato provato

Il progetto è nelle sue prime fasi ed è stato finora provato su **un solo
dispositivo: uno Xiaomi 17 con Android 17**. Tutto ciò che risulta funzionante
è confermato lì e, per ora, da nessun'altra parte.

Non è un dettaglio da poco. Le azioni sul dispositivo — sveglie, timer,
apertura di altre app — funzionano passando una richiesta all'app del telefono
che se ne occupa, e il risultato cambia sia con le personalizzazioni del
produttore sia con le app installate. Su un altro telefono l'app Orologio
potrebbe interpretare diversamente la stessa richiesta, un'applicazione
potrebbe non rispondere allo schema di collegamento previsto qui, o un permesso
potrebbe essere chiesto in un altro momento. Quindi, se altrove qualcosa non
funziona, è probabile che dipenda dal dispositivo più che da un difetto del
codice. Segnalazioni da altri telefoni sono benvenute.

## Come metterlo in funzione

Non serve un ambiente di sviluppo sul computer: si può fare tutto da browser. Ci vogliono una ventina di minuti.

### 1. Prendere il codice

Per iniziare bisogna fare un fork di questo repository sul proprio account GitHub.

### 2. Procurarsi le chiavi API

| Chiave | Dove | Costo | Serve per |
|---|---|---|---|
| Gemini | [aistudio.google.com](https://aistudio.google.com) | Gratis | **Obbligatoria** — la conversazione stessa, il ragionamento e la vista dalla fotocamera. Senza, l'app resta senza la sua strada principale |
| Groq | [console.groq.com](https://console.groq.com) | Gratis | **Obbligatoria** — trascrizione, e ragionamento di riserva per la modalità a comandi. 8000 token al minuto, di cui una sola richiesta ne spende quasi metà |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Gratis, senza carta | Facoltativa — la voce di riserva della sola modalità a comandi; la conversazione parla da sé. All'iscrizione si riceve un credito che vale milioni di caratteri e non scade |
| Token GitHub | GitHub → Settings → Developer settings → Personal access tokens, ambito `repo` | Gratis | Facoltativo — solo per i comandi sui repository |

La fotocamera e l'allegato non chiedono nessuna chiave in più: passano dalla connessione con Gemini che è già aperta.

### 3. Creare il progetto su Expo

Bisogna registrarsi su [expo.dev](https://expo.dev) e creare un progetto. Poi, in **Project settings → Environment variables**, vanno aggiunte le chiavi come **Plain text**, per tutti gli ambienti:

```
EXPO_PUBLIC_GEMINI_API_KEY      (la conversazione, il ragionamento, la fotocamera)
EXPO_PUBLIC_GROQ_API_KEY        (trascrizione, ragionamento di riserva)
EXPO_PUBLIC_DEEPGRAM_API_KEY    (voce di riserva, facoltativa)
EXPO_PUBLIC_GITHUB_TOKEN_KEY    (facoltativo)
```

Il prefisso `EXPO_PUBLIC_` è obbligatorio: senza, Expo non passa la variabile all'app.

### 4. Puntare l'app al proprio progetto

In `app.config.js` vanno sostituiti:

- `extra.eas.projectId` con l'ID progetto mostrato sulla dashboard di Expo
- `slug` con lo slug del proprio progetto
- `android.package` con un identificatore proprio, ad esempio `com.nomeutente.jarvis`

### 5. Compilare

Su expo.dev: **Builds → Build from GitHub**, quindi:

- Platform: **Android**
- Git ref: **main**
- Build profile: **preview**
- Base directory: **lasciare vuoto** — scriverci qualcosa fa fallire la build

Il profilo `preview` è già configurato per produrre un `.apk` installabile invece di un pacchetto per il Play Store. A build finita si scarica sul telefono e si installa. Android avviserà che l'origine è sconosciuta: è normale per un'app compilata da sé.

#### Compilare senza Expo

Il piano gratuito di Expo consente 15 build Android al mese, che finiscono in fretta. Nel repository c'è anche `.github/workflows/build-apk.yml`, che produce lo stesso APK tramite GitHub Actions — gratis e senza limiti sui repository pubblici. Si avvia dalla scheda **Actions** e l'APK compare come artifact nella pagina della build. Servono le stesse chiavi, da inserire in **Settings → Secrets and variables → Actions**.

Due avvertenze. La firma usa la `debug.keystore` del progetto, che è una chiave diversa da quella di Expo: la prima volta che si passa da una all'altra bisogna disinstallare l'app esistente. E gli artifact di un repository pubblico sono scaricabili da chiunque, mentre le chiavi vengono compilate dentro l'APK — quindi chi usa un token GitHub conviene che esegua il workflow da un repository privato, dove i 2.000 minuti gratuiti mensili bastano comunque per un centinaio di build.

### 6. Primo avvio

L'app chiederà i permessi per microfono, fotocamera, notifiche, calendario e rubrica. Vanno concessi quelli che interessano: quelli negati disattivano semplicemente la funzione corrispondente. Quello della fotocamera viene chiesto solo la prima volta che si apre la vista.

Poi basta dire *"la mia città è Bologna"*, oppure impostarla dal pannello impostazioni, così il riepilogo di apertura dà il meteo giusto.

## Note per chi mette mano al codice

**Questo repository contiene le cartelle `android/` e `ios/` già committate.** Questo lo rende un progetto "bare", quindi **EAS salta la fase di prebuild**. La conseguenza pratica, che costa una giornata se la si scopre sbattendoci la testa:

- Le impostazioni native in `app.config.js` (permessi, temi) vengono **ignorate**. Ogni nuovo permesso Android va aggiunto direttamente in `android/app/src/main/AndroidManifest.xml`.
- La versione che finisce nell'APK è `versionName` in `android/app/build.gradle`, non `version` in `app.config.js`.

Altre due cose che vale la pena sapere:

- `Linking.sendIntent` di React Native manda ogni numero come `Double`, quindi gli intent Android che leggono interi (`SET_ALARM`, `SET_TIMER`) si ritrovano con i valori di default senza dare errore. Conviene usare `expo-intent-launcher`, che li converte in `Int`.
- Su Groq, l'errore HTTP 413 "Request Entity Too Large" è un **limite di token al minuto**, non un problema di dimensione della richiesta. Mandare meno cronologia non aiuta se è il modello stesso a consumare il budget.
- Il tipo `microphone` viene concesso a un servizio in primo piano **solo se l'app è in primo piano nel momento in cui il servizio parte**. Farlo partire mentre si esce dall'app — il momento ovvio per una bolla — è l'unico che Android rifiuta, e l'eccezione esce da `onCreate` portandosi giù l'applicazione.
- Un'app in secondo piano non può aprire la schermata di un'altra app. Impostare una sveglia apre l'orologio, e da lì in poi ogni azione successiva della stessa catena viene scartata in silenzio. Il permesso `SYSTEM_ALERT_WINDOW` è l'eccezione prevista: prima si torna davanti, e si aspetta di esserci davvero.
- Ogni richiesta di rete vuole un limite di tempo. Dentro l'app una richiesta bloccata sembra solo lenta; da una bolla flottante non c'è nessuno schermo, ed è indistinguibile da un'app morta.
- Prima di riprodurre audio si esce dalla modalità registrazione: finché la sessione è impegnata dal microfono, Android può riprodurre nel vuoto.
- La voce arriva dal servizio di lettura ad alta voce di Edge, che non chiede chiavi e non ha quote. **Non è una API ufficiale**: non esiste un indirizzo documentato, e il servizio è pensato per essere usato dal browser. Funziona e ci si appoggiano in molti, ma può smettere da un giorno all'altro — per questo Deepgram resta sotto, e per questo niente qui va costruito dando per scontato che continui a rispondere.
- Le richieste che comportano azioni vogliono una temperatura propria. Con il valore predefinito il modello ripianifica ogni volta la stessa frase in modo diverso, e quale azione sopravviva a una catena diventa un sorteggio.
- Un prompt di sistema costruito a livello di modulo è già fissato prima che qualunque cosa asincrona sia stata caricata. Qui incorporava la memoria dell'utente, che si legge da disco dopo il primo disegno della schermata: la costante si portava dietro una memoria vuota per tutta la vita del processo, mentre le impostazioni la mostravano correttamente. Il prompt va costruito dove si usa, non dove si importa il modulo.
- Una scrittura che fallisce in silenzio è peggio di una che dà errore. Un ricordo tenuto in memoria dopo un salvataggio fallito funziona benissimo fino alla chiusura dell'app, e poi la perdita sembra un modello che dimentica invece di un disco che si è rifiutato.
- Il video della conversazione passa dalla stessa connessione dell'audio: `realtimeInput.video` accanto a `realtimeInput.audio`, `image/jpeg`, un fotogramma al secondo, che è il ritmo consigliato da Google. Una foto del telefono è enorme rispetto a quello che serve a un modello — si chiede al dispositivo quali misure sa fare e si prende la più piccola sopra i 640 pixel, sotto cui smette di leggere le scritte — e si scatta una volta per volta, altrimenti un telefono lento accoda fotogrammi che descrivono un passato che nessuno ha chiesto.
- Un'immagine allegata non è un fotogramma: mandata come turno `clientContent` con `inlineData`, resta nel filo della conversazione, quindi le domande successive la ritrovano.
- Un riquadro scorrevole dentro un altro riquadro scorrevole non scorre affatto, su Android, senza `nestedScrollEnabled`: il gesto se lo prende quello esterno.
- Copiare al tocco singolo rende il testo impossibile da selezionare: ogni tentativo di prendere una parola copia tutto. Si copia al doppio tocco.
- `adjustResize` accorcia la finestra per fare posto alla tastiera, ma non sposta quello che si stava guardando. Un campo di testo in fondo a una pagina scorrevole va portato in vista da soli, con un ritardo breve perché la tastiera abbia già preso il suo spazio.
- Un componente che avvolge qualcosa di già disposto non deve prendergli lo stile: `position: absolute`, `flex: 1` e i margini valgono rispetto al genitore, e spostarli di un nodo più in basso posiziona il figlio rispetto a un riquadro di dimensione zero — visibile dove ci si aspetta, e intoccabile, perché Android non consegna i tocchi fuori dai confini del genitore.
- Le icone sono generate da `strumenti/icona.py`, che scrive i PNG a mano con `zlib`: i bordi si calcolano invece di campionarli, così un'icona da 48 pixel è pulita quanto una da 432. L'area sicura di un'icona adattiva è il cerchio centrale, un terzo del lato: fuori di lì ogni telefono taglia in modo diverso, e sotto una certa misura i dettagli fini vanno tolti o diventano sporcizia.
- La cancellazione dell'eco lavora per sottrazione, non per magia: toglie dal microfono il segnale che il telefono sta mandando all'altoparlante, quindi deve sapere quale è quel segnale. Registrare da `VOICE_COMMUNICATION` è solo metà del lavoro — anche la riproduzione deve appartenere alla stessa sessione di comunicazione (`USAGE_VOICE_COMMUNICATION`, e il telefono in `MODE_IN_COMMUNICATION`), se no su un telefono fedele alla specifica la propria voce rientra intera e l'interruzione locale la taglia a ogni frase. Alcuni telefoni cancellano tutto quello che esce dal dispositivo e nascondono l'errore; quelli che non lo fanno lo fanno sembrare un difetto dell'app. Passare alla linea di comunicazione porta con sé due conseguenze: l'audio andrebbe all'auricolare, e il volume è quello delle chiamate, non quello della musica.
- Una soglia di interruzione misurata su un telefono è un numero che parla di quel telefono. Quanto della propria voce un dispositivo si sente rientrare dipende da dove stanno altoparlante e microfono e da quanto filtra — quindi la soglia va misurata mentre l'app gira (i primi decimi di secondo di ogni risposta sono solo la sua voce: quel livello **è** l'eco) invece di essere scritta come costante.
- Interrompere una voce a flusso vuol dire buttare il resto del turno, non solo svuotare l'altoparlante. Il server continua a mandare l'audio che aveva già prodotto, e suonarlo è la voce che riparte da sola un istante dopo essere stata zittita.
- Una traccia audio nativa, una sessione. Due sessioni aperte per sbaglio scrivono nella stessa traccia: due voci insieme, ognuna che zittisce l'altra a metà parola. La difesa va dove sta l'audio, non nell'interfaccia — aprire una sessione è una catena di attese, e per tutta quella catena lo stato a schermo dice ancora "spenta".

## Crediti

- **[Azizbek Anvarjonov](https://github.com/az11k-dev)** — [az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app), lo scheletro iniziale da cui è nato questo progetto
- **[lorisz017](https://github.com/lorisz017)** — tutto il resto: l'interfaccia, le azioni sul telefono, la voce e in pratica tutto quello che l'app fa oggi

E un ringraziamento speciale a **[FatihMakes](https://github.com/FatihMakes)** per [Mark-LIII](https://github.com/FatihMakes/Mark-LIII). È da quell'assistente desktop che è nata l'idea di questo, ed è per via della sua interfaccia che quest'app ha l'aspetto che ha.

## Licenza

MIT — vedere [LICENSE](./LICENSE). Copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.

Mark-LIII, citato sopra, è sotto licenza CC BY-NC, che non si combina con MIT. Da lì non è stato copiato nulla: il debito è soltanto di ispirazione.
