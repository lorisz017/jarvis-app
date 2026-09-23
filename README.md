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

Web search goes through **DuckDuckGo**, which needs no key and has no quota: it returns page excerpts, and the reply is written by the model already in the conversation. Gemini's own Google search sits behind it — better prose, but grounding is not in the free tier and answers "quota exceeded".

A live status list of what works, and what does not, is kept in [`STATO_FUNZIONI.md`](./STATO_FUNZIONI.md).

### Tested on

Most of what is marked as working here is confirmed on a **Xiaomi 17 running
Android 17**, the phone this is developed on. Recently an **OPPO and an older
handset**, both on earlier versions of Android, joined it — they are where the
key-less APK gets tried, which is the one anybody downloading a release
installs.

That addition is worth mentioning, because it taught this project its most
expensive lesson: **the serious defects all showed up there, not on the
development phone.** Not because those phones are worse, but because they are
slower, and a window of time too narrow to matter on a fast phone matters a
great deal on a slow one. The worst bug in the project's history — the
conversation opening twice over — was invisible on the fast phone and
reproducible on the other two.

There is a second reason a different phone behaves differently. The device
actions — alarms, timers, opening other apps — work by handing an intent to
whatever app on the phone handles it, and both the manufacturer's
customisations and which apps are installed change the outcome. So if
something misbehaves elsewhere, it may be a difference in the device rather
than a fault in the code. Reports from other devices are welcome — they are
how the bugs above were found.

## Setting it up

You do not need a development environment, or a computer at all: everything below is done from a browser, and only one key is required.

### 1. Get a Gemini key

One key, free, a minute of your time: [aistudio.google.com/apikey](https://aistudio.google.com/apikey). It is the only one the app cannot do without — it is the conversation itself, the reasoning, and the sight.

The other three are **optional**, and nothing asks for them until you want what they do:

| Key | Where | What it buys you |
|---|---|---|
| **Gemini** | [aistudio.google.com](https://aistudio.google.com/apikey) | **The app.** The conversation, the reasoning, seeing through the camera, the attached pictures |
| Groq | [console.groq.com](https://console.groq.com) | Only the command mode, which is off unless you turn it on: transcription and its fallback reasoning |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Only the fallback voice of that same command mode. The conversation speaks in its own voice and never reaches this |
| GitHub token | GitHub → Settings → Developer settings → Personal access tokens, `repo` scope | Only the three repository commands |

The camera and the picture attachment need no key of their own: they travel down the Gemini connection that is already open.

### 2. Download the APK

From the [**Releases**](../../releases) page. One file, nothing to compile, nothing to sign up for. A new one is published here at every version.

That APK contains **no keys at all**, which is exactly what makes it safe to hand out — and why it asks you for one the first time it opens.

### 3. Install and paste the key

Android will warn you about installing from an unknown source; that is expected for an app nobody has published to a store. On the first launch the app asks for one thing — the Gemini key — and then opens the conversation by itself.

The other three, if you ever want them, live in **Settings → Chiavi**. What you type there is kept on the phone and nowhere else.

### Building it yourself, if you want to

Neither of these is necessary — the release above is the normal way — but both exist.

To build the same key-less APK from source: **Actions** tab, **Build APK Android**, **Run workflow**, about ten minutes, and the APK appears as an artifact at the bottom of the run's page. (On a fork, Actions has to be enabled once under Settings → Actions.)

To have the keys compiled in instead, so the app never asks on any phone you install it on — so the app never asks, on any phone you install it on — use `strumenti/build-apk-privato.yml`. Put it in a **private** repository of your own as `.github/workflows/build-apk.yml`, add your keys under Settings → Secrets and variables → Actions with the names above, and run it. It does not copy the code: it fetches this repository on every build, so re-running it is how you update.

It must be private. The keys end up inside that APK, and a public repository's artifacts can be downloaded by anyone.

### First run

The app will ask for microphone, camera, notification, calendar and contacts permissions. Grant the ones you want to use — anything you deny simply disables the matching feature. The camera is only asked for the first time you open the eye.

Then say *"my city is Bologna"*, or set it in the settings panel, so the opening briefing gives you the right weather.

## Notes for developers

**This repository contains committed `android/` and `ios/` folders.** That makes it a bare workflow project, so **nothing ever runs the prebuild step** — not EAS, and not the Gradle build the Actions workflow uses. The practical consequence, which costs a day if you discover it the hard way:

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
- Keys are read at the moment of use, never at import: `chiaviService` looks first at what the user typed in the app and then at what was compiled in. A constant captured when a module loads would be fixed before anyone could type anything, and the key entered on the first run would never take effect.
- Live video rides the same socket as live audio: `realtimeInput.video` beside `realtimeInput.audio`, `image/jpeg`, one frame a second, which is the rate Google recommends. A phone's photo is enormous next to what a model needs — ask the device which picture sizes it can produce and take the smallest above 640 pixels, below which it stops reading signs — and take one shot at a time, or a slow phone queues frames describing a past nobody asked about.
- An attached picture is not a frame: sent as a `clientContent` turn with `inlineData`, it stays in the conversation's thread, so follow-up questions still find it.
- A lock made out of component state does not lock anything. Opening the live conversation goes through a function that waits — a permission, the speaker, a socket — and for all of that stretch the state on screen still says "off", so a guard reading it lets a second opening through. On a slow phone that window is wide enough for a second tap, or for another part of the app that opens it by itself, to start a second session: two microphones on one wire and two voices into one speaker, interleaved chunk by chunk. What that looks like from outside is a request heard twice and speech nobody can follow — which sends you hunting through the audio code for a week. Take the lock synchronously with a ref, have whatever owns the resource refuse to hold two, and ignore the callbacks of a superseded session: its close, arriving late, otherwise turns off the live one.
- The native microphone and the native speaker are one each for the whole app, so whoever stops them has to ask first whether they are still theirs. A superseded session releasing the speaker takes it out from under the live one, and from then on the chunks of voice arrive and are dropped in silence: transcript on screen, model answering, nothing to hear — and leaving the app and coming back "fixes" it, because that builds a new one. This applies to any shared native resource.
- A counter reading zero is not a diagnosis, it is an ambiguity: it can mean the thing never happened, or that the code never ran. Those are opposite conclusions. Every number worth showing needs the number beside it that tells the two apart. Two theories about this app's audio were each closed in ten seconds by a diagnostics line in the settings panel, after days of guessing — on a phone that is not in your hands, a reported number is the only evidence there is.
- Flushing an `AudioTrack` from one thread while another sits inside a blocking write is a race: the chunk already handed over comes out anyway, afterwards, which sounds like old words on top of new ones. Write in 40 ms slices that re-check whether they are still wanted, and flush and stop on the writing thread itself. For stop it is not even about sound: releasing a track while something is still writing into it is a way to drop the app.
- A scrollable box inside another scrollable box does not scroll at all on Android without `nestedScrollEnabled` — the outer one takes the gesture. Add it and you then scroll two things at once: the inner box moves and the page follows it. The page has to stop itself — `scrollEnabled` false the moment a finger lands on the box — and it only has to hold for the instant Android decides who owns the gesture. The release cannot wait for the final touch: once the inner box takes over, the app gets a cancel and then nothing at all, so a time-based safety is needed or the page stays frozen.
- Screen-dependent sizes belong in one place, and the rule that holds them together is that the phone in portrait keeps the numbers it always had. That layout is the confirmed one; what changes is only where nothing was ever designed — the tablet (shortest side ≥ 600dp, the same measure Android uses) and the phone in landscape, where the panels take a share of the height instead of all of it.
- Scale a composite widget with a transform rather than recomputing every piece of it. Ten styles carrying the same number, plus corners and a sweep arm, is exactly the kind of thing that breaks a screen when rebuilt at runtime. A transform does not change the space occupied, so give it back with a margin — negative when it shrinks.
- Rotation does not recreate the screen as long as the manifest lists `orientation|screenSize|screenLayout` among the changes the activity handles itself. That is what lets a live conversation survive turning the device: without it Android rebuilds the activity and the session dies mid-sentence.
- Copying on a single tap makes text impossible to select: every attempt to grab a word copies the whole thing. Copy on the double tap.
- `adjustResize` does nothing under an edge-to-edge theme: the window no longer shrinks, the keyboard opens *over* the app and a text field at the bottom simply disappears. The room has to be made by hand — listen to `keyboardDidShow`, add a bottom padding as tall as the keyboard, then scroll there. Keep a fallback estimate for when the event never arrives: an invisible text field is worse than a little too much space.
- A component that wraps something already laid out must not take its style: `position: absolute`, `flex: 1` and margins are all relative to the parent, and moving them one node down positions the child against a box of zero size — visible where expected, and untouchable, because Android does not deliver touches outside a parent's bounds.
- The launcher icons are generated by `strumenti/icona.py`, which writes the PNGs by hand through `zlib` — edges computed rather than supersampled, so a 48-pixel icon is as clean as a 432-pixel one. An adaptive icon's safe area is the middle circle, a third of the side: outside it every phone crops differently, and fine detail has to drop out below a certain size or it turns to dirt.

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

La ricerca sul web passa da **DuckDuckGo**, che non chiede chiavi e non ha quote: restituisce brani di pagine, e la risposta la scrive il modello già presente nella conversazione. Dietro c'è la ricerca Google di Gemini — scriverebbe meglio, ma non rientra nel piano gratuito e risponde che la quota è esaurita.

L'elenco aggiornato di cosa funziona, e cosa no, è in [`STATO_FUNZIONI.md`](./STATO_FUNZIONI.md).

### Su cosa è stato provato

Quasi tutto ciò che qui risulta funzionante è confermato su uno **Xiaomi 17 con
Android 17**, che è il telefono su cui si sviluppa. Da poco si sono aggiunti un
**OPPO e un telefono più vecchio**, con versioni di Android precedenti: sono
quelli su cui si prova l'APK senza chiavi, cioè quello che installa chi scarica
una release.

Vale la pena dirlo, perché è la lezione più costosa di questo progetto: **i
difetti seri sono usciti tutti là, non sul telefono di sviluppo.** Non perché
quei telefoni siano scadenti, ma perché sono più lenti, e una finestra
temporale troppo stretta per contare su un telefono veloce conta eccome su uno
lento. Il difetto peggiore mai trovato qui — la conversazione che si apriva due
volte — era invisibile sul telefono veloce e si riproduceva sugli altri due.

C'è poi un secondo motivo per cui un altro telefono si comporta diversamente.
Le azioni sul dispositivo — sveglie, timer, apertura di altre app — funzionano
passando una richiesta all'app del telefono che se ne occupa, e il risultato
cambia sia con le personalizzazioni del produttore sia con le app installate.
Quindi, se altrove qualcosa non funziona, può dipendere dal dispositivo più che
da un difetto del codice. Segnalazioni da altri telefoni sono benvenute: è così
che i difetti qui sopra sono stati trovati.

## Come metterlo in funzione

Non serve un ambiente di sviluppo, e nemmeno un computer: tutto quello che segue si fa dal browser, e la chiave necessaria è **una sola**.

### 1. Procurarsi la chiave Gemini

Una chiave, gratuita, un minuto: [aistudio.google.com/apikey](https://aistudio.google.com/apikey). È l'unica di cui l'app non può fare a meno — è la conversazione stessa, il ragionamento e la vista.

Le altre tre sono **facoltative**, e nessuno le chiede finché non si vuole quello che fanno:

| Chiave | Dove | Cosa dà in più |
|---|---|---|
| **Gemini** | [aistudio.google.com](https://aistudio.google.com/apikey) | **L'app.** La conversazione, il ragionamento, la vista dalla fotocamera, le immagini allegate |
| Groq | [console.groq.com](https://console.groq.com) | Solo la modalità a comandi, che è spenta finché non la si accende: trascrizione e ragionamento di riserva |
| Deepgram | [console.deepgram.com](https://console.deepgram.com) | Solo la voce di riserva di quella stessa modalità. In conversazione la voce è del modello e qui non ci arriva mai |
| Token GitHub | GitHub → Settings → Developer settings → Personal access tokens, ambito `repo` | Solo i tre comandi sui repository |

La fotocamera e l'allegato non chiedono nessuna chiave in più: passano dalla connessione con Gemini che è già aperta.

### 2. Scaricare l'APK

Dalla pagina [**Releases**](../../releases). Un file, niente da compilare, niente registrazioni. A ogni versione ne compare uno nuovo.

Quell'APK **non contiene nessuna chiave**, ed è esattamente ciò che lo rende distribuibile — ed è anche il motivo per cui una chiave la chiede al primo avvio.

### 3. Installare e incollare la chiave

Android avvisa che si sta installando da una sorgente sconosciuta: è normale per un'app che nessuno ha pubblicato su uno store. Al primo avvio l'app chiede una cosa sola — la chiave Gemini — e poi apre la conversazione da sé.

Le altre tre, se un giorno servissero, stanno in **Impostazioni → Chiavi**. Quello che si scrive lì resta sul telefono e da nessun'altra parte.

### Compilarselo da sé, volendo

Nessuna delle due cose è necessaria — la release qui sopra è la strada normale — ma esistono tutte e due.

Per compilare lo stesso APK senza chiavi partendo dal codice: scheda **Actions**, workflow **Build APK Android**, tasto **Run workflow**, una decina di minuti, e l'APK compare come artifact in fondo alla pagina. (Su un fork le Actions vanno abilitate una volta, in Settings → Actions.)

Per avere invece le chiavi già compilate dentro, così l'app non chiede niente su nessun telefono, si usa `strumenti/build-apk-privato.yml`. Va messo in un repository **privato** proprio, come `.github/workflows/build-apk.yml`, con le chiavi in Settings → Secrets and variables → Actions sotto i nomi qui sopra. Il codice non lo copia: scarica questo repository a ogni build, quindi rilanciarlo è il modo di aggiornarsi.

Privato è obbligatorio: le chiavi finiscono dentro quell'APK, e gli artifact di un repository pubblico se li scarica chiunque.

### Primo avvio

L'app chiederà i permessi per microfono, fotocamera, notifiche, calendario e rubrica. Vanno concessi quelli che interessano: quelli negati disattivano semplicemente la funzione corrispondente. Quello della fotocamera viene chiesto solo la prima volta che si apre la vista.

Poi basta dire *"la mia città è Bologna"*, o impostarla dal pannello, perché il riepilogo d'apertura dia il meteo giusto.

## Note per chi mette mano al codice

**Questo repository contiene le cartelle `android/` e `ios/` già committate.** Questo lo rende un progetto "bare", quindi **la fase di prebuild non la esegue nessuno** — né EAS, né la compilazione Gradle usata dal workflow. La conseguenza pratica, che costa una giornata se la si scopre sbattendoci la testa:

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
- Le chiavi si leggono al momento dell'uso, mai all'importazione: `chiaviService` guarda prima quella scritta nell'app e poi quella compilata dentro. Una costante presa al caricamento del modulo sarebbe fissata prima che chiunque possa scrivere qualcosa, e la chiave inserita al primo avvio non entrerebbe mai in vigore.
- Il video della conversazione passa dalla stessa connessione dell'audio: `realtimeInput.video` accanto a `realtimeInput.audio`, `image/jpeg`, un fotogramma al secondo, che è il ritmo consigliato da Google. Una foto del telefono è enorme rispetto a quello che serve a un modello — si chiede al dispositivo quali misure sa fare e si prende la più piccola sopra i 640 pixel, sotto cui smette di leggere le scritte — e si scatta una volta per volta, altrimenti un telefono lento accoda fotogrammi che descrivono un passato che nessuno ha chiesto.
- Un'immagine allegata non è un fotogramma: mandata come turno `clientContent` con `inlineData`, resta nel filo della conversazione, quindi le domande successive la ritrovano.
- Una serratura fatta con uno stato del componente non chiude niente. Aprire la conversazione passa per una funzione che aspetta — un permesso, l'altoparlante, la connessione — e in tutto quel tratto lo stato a schermo dice ancora "spenta", quindi un controllo che legge quello lascia passare una seconda apertura. Su un telefono lento quella finestra è abbastanza larga perché un secondo tocco, o un altro pezzo dell'app che la apre da sé, faccia partire una seconda sessione: due microfoni sullo stesso filo e due voci nello stesso altoparlante, mescolate pezzo per pezzo. Da fuori si vede la richiesta sentita due volte e un discorso incomprensibile — e si passa una settimana a cercare nel codice dell'audio. La serratura va presa subito con un riferimento, chi possiede la risorsa deve rifiutarsi di averne due, e le richiamate di una sessione superata vanno ignorate: la sua chiusura, arrivando dopo, spegne quella viva.
- Il microfono e l'altoparlante nativi sono uno solo per tutta l'app, quindi chi li spegne deve prima chiedersi se sono ancora suoi. Una sessione superata che rilascia l'altoparlante lo toglie di sotto a quella viva, e da lì in poi i pezzi di voce arrivano e vengono buttati in silenzio: testo a schermo, modello che risponde, niente da sentire — e uscire dall'app e rientrare «risolve», perché ne fa nascere uno nuovo. Vale per qualunque risorsa nativa condivisa.
- Un conteggio a zero non è una diagnosi, è un'ambiguità: può voler dire che il fenomeno non è successo, oppure che quel codice non è mai girato. Sono conclusioni opposte. Ogni numero che vale la pena mostrare vuole accanto il numero che distingue i due casi. Due teorie sull'audio di quest'app sono state chiuse in dieci secondi l'una da una riga di diagnosi nelle impostazioni, dopo giorni passati a indovinare: su un telefono che non si ha in mano, un numero riportato è l'unica prova che esiste.
- Svuotare una `AudioTrack` da un thread mentre un altro ci sta scrivendo è una corsa: il pezzo già consegnato esce lo stesso, dopo, e si sentono parole vecchie sopra le nuove. Si scrive a fette di 40 ms ricontrollando fra l'una e l'altra, e svuotamento e arresto si fanno sullo stesso thread che scrive. Per l'arresto non è nemmeno una questione di suono: rilasciare la traccia mentre qualcuno ci scrive dentro è un modo di far cadere l'app.
- Un riquadro scorrevole dentro un altro riquadro scorrevole non scorre affatto, su Android, senza `nestedScrollEnabled`: il gesto se lo prende quello esterno. Messo quello, però, si scorre in due: il riquadro interno si muove e la pagina sotto lo segue. La pagina va fermata da sé — `scrollEnabled` a falso appena il dito tocca il riquadro — e basta che regga l'istante in cui Android decide chi prende il gesto. Il rilascio non può dipendere dal tocco finale: quando il riquadro interno prende il gesto l'app riceve un annullamento e poi più niente, quindi serve anche una sicura a tempo, se no la pagina resta bloccata.
- Le misure che dipendono dallo schermo stanno in un posto solo, e la regola che le tiene insieme è che sul telefono in verticale restano quelle di sempre. Quella disposizione è la confermata; cambia solo dove non c'era niente di pensato — il tablet (lato corto ≥ 600, la stessa misura che usa Android) e il telefono in orizzontale, dove i riquadri prendono una quota dell'altezza invece di mangiarsela tutta.
- Un elemento composto si ingrandisce con una trasformazione, non rifacendo ogni sua parte. Dieci stili con lo stesso numero dentro, più gli angoli e il braccio rotante, sono esattamente il tipo di cosa che rompe una schermata se ricostruita a runtime. Una trasformazione non cambia lo spazio occupato, quindi glielo si restituisce con un margine — negativo quando rimpicciolisce.
- La rotazione non ricrea la schermata finché il manifest elenca `orientation|screenSize|screenLayout` fra i cambi che l'attività gestisce da sé. È quello che permette a una conversazione aperta di sopravvivere a un giro del dispositivo: senza, Android rifà l'attività e la sessione muore a metà frase.
- Copiare al tocco singolo rende il testo impossibile da selezionare: ogni tentativo di prendere una parola copia tutto. Si copia al doppio tocco.
- `adjustResize` non serve a niente sotto un tema a schermo intero: la finestra non si accorcia più, la tastiera si apre *sopra* l'applicazione e un campo di testo in fondo sparisce e basta. Lo spazio va fatto a mano — si ascolta `keyboardDidShow`, si aggiunge in fondo alla pagina un margine alto quanto la tastiera e ci si sposta. Serve anche una stima di riserva per quando l'evento non arriva: un campo di testo invisibile è peggio di un po' di spazio di troppo.
- Un componente che avvolge qualcosa di già disposto non deve prendergli lo stile: `position: absolute`, `flex: 1` e i margini valgono rispetto al genitore, e spostarli di un nodo più in basso posiziona il figlio rispetto a un riquadro di dimensione zero — visibile dove ci si aspetta, e intoccabile, perché Android non consegna i tocchi fuori dai confini del genitore.
- Le icone sono generate da `strumenti/icona.py`, che scrive i PNG a mano con `zlib`: i bordi si calcolano invece di campionarli, così un'icona da 48 pixel è pulita quanto una da 432. L'area sicura di un'icona adattiva è il cerchio centrale, un terzo del lato: fuori di lì ogni telefono taglia in modo diverso, e sotto una certa misura i dettagli fini vanno tolti o diventano sporcizia.

## Crediti

- **[Azizbek Anvarjonov](https://github.com/az11k-dev)** — [az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app), lo scheletro iniziale da cui è nato questo progetto
- **[lorisz017](https://github.com/lorisz017)** — tutto il resto: l'interfaccia, le azioni sul telefono, la voce e in pratica tutto quello che l'app fa oggi

E un ringraziamento speciale a **[FatihMakes](https://github.com/FatihMakes)** per [Mark-LIII](https://github.com/FatihMakes/Mark-LIII). È da quell'assistente desktop che è nata l'idea di questo, ed è per via della sua interfaccia che quest'app ha l'aspetto che ha.

## Licenza

MIT — vedere [LICENSE](./LICENSE). Copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.

Mark-LIII, citato sopra, è sotto licenza CC BY-NC, che non si combina con MIT. Da lì non è stato copiato nulla: il debito è soltanto di ispirazione.
