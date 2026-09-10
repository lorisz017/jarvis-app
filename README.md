# J.A.R.V.I.S. — Mobile

> *Just A Rather Very Intelligent System* — a voice assistant for Android that actually does things on your phone.

**[English](#english) · [Italiano](#italiano)**

---

<a name="english"></a>

# English

## What this is

J.A.R.V.I.S. is a personal voice assistant for Android, inspired by Tony Stark's AI in Iron Man. You tap the radar, speak, and it answers — out loud and on screen. But more importantly, it *acts*: it sets real alarms in your clock app, creates real calendar events, calls people from your address book, starts navigation, and opens your apps.

It speaks and understands **Italian**, and it runs entirely on free API tiers.

## Why it exists

Phone assistants tend to fall into two camps: the ones built into the system, which are closed and can't be changed, and the chat apps, which talk beautifully but can't touch anything on your device. This project is an attempt at the middle ground — something that holds a real conversation *and* has hands.

It started as a fork of an existing open-source assistant and grew from there: translated to Italian, rebuilt around free providers, given a heads-up-display interface, and taught roughly thirty commands that do actual work on the phone.

## How it works

The flow of a single request:

1. **You speak** — the recording is sent to **Whisper** (via Groq) and transcribed.
2. **It thinks** — the text goes to a language model (**GPT-OSS 120B** via Groq), which is handed the list of actions the app can perform on the phone.
3. **It acts** — if the model asks for one or more of those actions, the app carries them out in order and reports back on all of them at once, so a single request can set an alarm, start a timer and place a call. Otherwise the answer is simply spoken.
4. **It speaks** — the reply is read aloud with a natural voice from **Deepgram Aura-2**, stepping down to Gemini and then to the phone's built-in voice if a provider is unavailable, so it never falls silent.

You can also type instead of speaking — same actions, same behaviour.

## Features

Voice and text input · spoken replies with a natural voice, selectable in the app · several actions from one request · weather · native alarms and timers · calendar events · reminders (create, list, cancel) · phone calls and WhatsApp messages by contact name · navigation · launching ~20 common apps · camera, Telegram, YouTube · GitHub repository management · an opening briefing with the time, weather and your day's appointments · persistent memory across restarts · battery monitor · a settings panel listing every command.

Web search is wired up through **Groq Compound** but does not currently work: the request comes back over a rate limit whatever is sent to it, and the assistant answers from the model's own knowledge instead, saying so.

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
| Groq | [console.groq.com](https://console.groq.com) | Free | **Required** — transcription and replies |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Free, no card | Recommended — the natural voice. Signing up grants credit worth millions of characters that does not expire |
| Gemini | [aistudio.google.com](https://aistudio.google.com) | Free | Optional — a second voice, used if Deepgram is unavailable. Its own quota runs out after roughly six replies in quick succession |
| GitHub token | GitHub → Settings → Developer settings → Personal access tokens, `repo` scope | Free | Optional — only for the repository commands |

### 3. Create the Expo project

Sign up at [expo.dev](https://expo.dev) and create a project. Then, in **Project settings → Environment variables**, add your keys as **Plain text**, for all environments:

```
EXPO_PUBLIC_GROQ_API_KEY
EXPO_PUBLIC_DEEPGRAM_API_KEY    (voice)
EXPO_PUBLIC_GEMINI_API_KEY      (optional)
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

The app will ask for microphone, notification, calendar and contacts permissions. Grant the ones you want to use — anything you deny simply disables the matching feature.

Then say *"my city is Bologna"*, or set it in the settings panel, so the opening briefing gives you the right weather.

## Notes for developers

**This repository contains committed `android/` and `ios/` folders.** That makes it a bare workflow project, so **EAS skips the prebuild step**. The practical consequence, which costs a day if you discover it the hard way:

- Native settings in `app.config.js` (permissions, themes) are **ignored**. Any new Android permission must be added directly to `android/app/src/main/AndroidManifest.xml`.
- The version that ends up in the APK is `versionName` in `android/app/build.gradle`, not `version` in `app.config.js`.

Two more things worth knowing:

- React Native's `Linking.sendIntent` sends every number as a `Double`, so Android intents that read integers (`SET_ALARM`, `SET_TIMER`) silently get their defaults. Use `expo-intent-launcher` instead — it converts them to `Int`.
- On Groq, HTTP 413 "Request Entity Too Large" is a **tokens-per-minute rate limit**, not a payload size problem. Sending less history won't help if the model itself is consuming the budget.

## Credits

- Original project by **[Azizbek Anvarjonov](https://github.com/az11k-dev)** — [az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app), the codebase this one is forked from
- This version, Italian adaptation, interface and additional features by **[lorisz017](https://github.com/lorisz017)**

Special thanks to **[FatihMakes](https://github.com/FatihMakes)** for [Mark-LIII](https://github.com/FatihMakes/Mark-LIII), the desktop assistant that gave this project its idea and the look of its interface. No code was taken from it — that project is licensed CC BY-NC, and this one is MIT — only inspiration.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.

---

<a name="italiano"></a>

# Italiano

## Che cos'è

J.A.R.V.I.S. è un assistente vocale personale per Android, ispirato all'intelligenza artificiale di Tony Stark in Iron Man. Si tocca il radar, si parla, e lui risponde — a voce e a schermo. Ma soprattutto *agisce*: mette sveglie vere nell'app Orologio, crea eventi veri nel calendario, chiama le persone in rubrica, avvia la navigazione e apre le app.

Parla e capisce **italiano**, e funziona interamente con quote gratuite.

## Perché esiste

Gli assistenti sul telefono tendono a dividersi in due categorie: quelli di sistema, chiusi e non modificabili, e le app di chat, che conversano benissimo ma non possono toccare nulla del dispositivo. Questo progetto prova a stare nel mezzo — qualcosa che sostiene una conversazione vera *e* ha le mani.

È nato come fork di un assistente open source già esistente ed è cresciuto da lì: tradotto in italiano, ricostruito su provider gratuiti, dotato di un'interfaccia in stile HUD e istruito con una trentina di comandi che fanno cose concrete sul telefono.

## Come funziona

Il percorso di una singola richiesta:

1. **Si parla** — la registrazione viene mandata a **Whisper** (tramite Groq) e trascritta.
2. **Ragiona** — il testo va a un modello linguistico (**GPT-OSS 120B** tramite Groq), a cui viene consegnato l'elenco delle azioni che l'app sa compiere sul telefono.
3. **Agisce** — se il modello ne richiede una o più, l'app le esegue in ordine e le conferma tutte insieme: una sola richiesta può quindi mettere una sveglia, avviare un timer e fare una chiamata. Altrimenti la risposta viene semplicemente letta.
4. **Risponde** — la risposta viene letta con una voce naturale di **Deepgram Aura-2**, scendendo su Gemini e poi sulla voce di sistema del telefono se un fornitore non è disponibile, così non resta mai muto.

Si può anche scrivere invece di parlare — stesse azioni, stesso comportamento.

## Funzioni

Comandi a voce e scritti · risposta parlata con voce naturale, selezionabile dall'app · più azioni con una sola richiesta · meteo · sveglie e timer nativi · eventi in calendario · promemoria (crea, elenca, annulla) · chiamate e messaggi WhatsApp per nome del contatto · navigazione · apertura di una ventina di app · fotocamera, Telegram, YouTube · gestione repository GitHub · riepilogo all'apertura con ora, meteo e impegni del giorno · memoria che sopravvive alla chiusura · monitor della batteria · pannello impostazioni con l'elenco di tutti i comandi.

La ricerca sul web è collegata a **Groq Compound** ma al momento non funziona: qualunque cosa le si mandi, la richiesta torna indietro per un limite superato, e l'assistente risponde con le conoscenze del modello dicendolo apertamente.

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
| Groq | [console.groq.com](https://console.groq.com) | Gratis | **Obbligatoria** — trascrizione e risposte |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Gratis, senza carta | Consigliata — la voce naturale. All'iscrizione si riceve un credito che vale milioni di caratteri e non scade |
| Gemini | [aistudio.google.com](https://aistudio.google.com) | Gratis | Facoltativa — seconda voce, usata se Deepgram non è disponibile. La sua quota si esaurisce dopo circa sei risposte ravvicinate |
| Token GitHub | GitHub → Settings → Developer settings → Personal access tokens, ambito `repo` | Gratis | Facoltativo — solo per i comandi sui repository |

### 3. Creare il progetto su Expo

Bisogna registrarsi su [expo.dev](https://expo.dev) e creare un progetto. Poi, in **Project settings → Environment variables**, vanno aggiunte le chiavi come **Plain text**, per tutti gli ambienti:

```
EXPO_PUBLIC_GROQ_API_KEY
EXPO_PUBLIC_DEEPGRAM_API_KEY    (voce)
EXPO_PUBLIC_GEMINI_API_KEY      (facoltativa)
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

L'app chiederà i permessi per microfono, notifiche, calendario e rubrica. Vanno concessi quelli che interessano: quelli negati disattivano semplicemente la funzione corrispondente.

Poi basta dire *"la mia città è Bologna"*, oppure impostarla dal pannello impostazioni, così il riepilogo di apertura dà il meteo giusto.

## Note per chi mette mano al codice

**Questo repository contiene le cartelle `android/` e `ios/` già committate.** Questo lo rende un progetto "bare", quindi **EAS salta la fase di prebuild**. La conseguenza pratica, che costa una giornata se la si scopre sbattendoci la testa:

- Le impostazioni native in `app.config.js` (permessi, temi) vengono **ignorate**. Ogni nuovo permesso Android va aggiunto direttamente in `android/app/src/main/AndroidManifest.xml`.
- La versione che finisce nell'APK è `versionName` in `android/app/build.gradle`, non `version` in `app.config.js`.

Altre due cose che vale la pena sapere:

- `Linking.sendIntent` di React Native manda ogni numero come `Double`, quindi gli intent Android che leggono interi (`SET_ALARM`, `SET_TIMER`) si ritrovano con i valori di default senza dare errore. Conviene usare `expo-intent-launcher`, che li converte in `Int`.
- Su Groq, l'errore HTTP 413 "Request Entity Too Large" è un **limite di token al minuto**, non un problema di dimensione della richiesta. Mandare meno cronologia non aiuta se è il modello stesso a consumare il budget.

## Crediti

- Progetto originale di **[Azizbek Anvarjonov](https://github.com/az11k-dev)** — [az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app), il codice da cui questo è nato come fork
- Questa versione, adattamento italiano, interfaccia e funzioni aggiuntive di **[lorisz017](https://github.com/lorisz017)**

Un ringraziamento particolare a **[FatihMakes](https://github.com/FatihMakes)** per [Mark-LIII](https://github.com/FatihMakes/Mark-LIII), l'assistente desktop che ha dato a questo progetto l'idea di partenza e l'aspetto della sua interfaccia. Da lì non è stata presa alcuna riga di codice — quel progetto è sotto licenza CC BY-NC, questo è MIT — soltanto ispirazione.

## Licenza

MIT — vedere [LICENSE](./LICENSE). Copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.
