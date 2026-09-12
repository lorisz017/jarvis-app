# Stato delle funzioni — J.A.R.V.I.S. 2.0.0

Legenda:

- ✅ **Funziona** — provata sul telefono e confermata
- ⚠️ **Funziona con un limite** — utilizzabile, ma con un comportamento da conoscere
- ❌ **Non funziona** — provata e non funzionante
- ⏳ **Non testabile** — bloccata da qualcosa di esterno (chiave mancante)

Ultimo aggiornamento: dopo il collaudo della voce Deepgram e del tool calling.

> **Su cosa è stato provato.** Il progetto è nelle sue prime fasi e tutte le
> spunte qui sotto vengono da **un solo dispositivo: uno Xiaomi 17 con
> Android 17**. Le azioni di sistema (sveglie, timer, apertura app) passano una
> richiesta all'app del telefono che se ne occupa, quindi il risultato cambia
> con le personalizzazioni del produttore e con le app installate: su un altro
> telefono qualcosa può comportarsi diversamente, e in quel caso è probabile
> che dipenda dal dispositivo più che dal codice.

---

## Voce e testo

| Funzione | Come si usa | Stato |
|---|---|---|
| Comando vocale | Tocchi il radar e parli | ✅ |
| Comando scritto | Campo di testo in fondo | ✅ |
| Risposta parlata (voce Deepgram) | Automatica | ✅ non degrada più: il credito Deepgram regge l'uso quotidiano |
| Scelta della voce naturale | Impostazioni → Voce naturale | ✅ nove voci italiane, si cambia senza ricompilare |
| Volume pari fra le voci | Automatico | ✅ confermato: le voci più basse arrivano al livello delle altre |
| Bolla flottante sopra le altre app | Impostazioni → Bolla flottante | ⏳ compare, ma al primo collaudo mandava in crash l'app: il servizio partiva nel momento sbagliato. Corretta, da riconfermare |
| Ripiego su Gemini e voce di sistema | Automatico | ✅ entra solo se Deepgram non è disponibile |
| Scelta della voce di sistema | Pill "VOCE" | ✅ riguarda solo la voce di riserva del telefono |
| Spegnere la voce | Pulsante 🔊 in alto a destra | ✅ |
| Interrompere la voce mentre parla | 🔊, FERMA, o il microfono | ✅ |
| Riattivare la voce | Pulsante 🔊 | ✅ riprende dal messaggio successivo: un audio interrotto non è recuperabile a metà, andrebbe rigenerato |
| Registro attività scorrevole | Sotto il radar | ✅ |

## Azioni

| Funzione | Come si usa | Stato |
|---|---|---|
| Più azioni in una richiesta | "Sveglia alle 8, timer di 10 minuti e chiama Marco" | ⚠️ da riverificare: al primo tentativo partiva solo la prima azione, il prompt è stato corretto |
| Azione singola | Qualunque comando da solo | ✅ |

## Informazioni

| Funzione | Come si usa | Stato |
|---|---|---|
| Riepilogo all'apertura | Automatico all'avvio | ✅ |
| Meteo | "Che tempo fa a Milano?" | ✅ |
| Ricerca sul web | "Chi ha vinto...", "Prezzo di..." | ❌ Groq risponde sempre con un limite superato; l'assistente risponde dalle conoscenze del modello, dicendolo |

## Tempo e promemoria

| Funzione | Come si usa | Stato |
|---|---|---|
| Sveglia | "Svegliami alle 7 e 30" | ✅ all'ora richiesta |
| Timer | "Timer di 10 minuti" | ✅ |
| Promemoria | "Ricordami tra 20 minuti di..." | ✅ |
| Elenco promemoria | "Che promemoria ho?" | ✅ |
| Annullare i promemoria | "Cancella i promemoria" | ✅ |
| Evento in calendario | "Appuntamento domani alle 15 dal dentista" | ✅ |

## Telefono e app

| Funzione | Come si usa | Stato |
|---|---|---|
| Chiamate | "Chiama Marco" | ✅ |
| Messaggi WhatsApp | "Manda un whatsapp a Marco che arrivo" | ✅ |
| Navigazione | "Portami a Milano" | ✅ |
| Apertura app | "Apri Spotify" — una ventina di app note | ✅ |
| Fotocamera | "Apri la fotocamera" | ✅ |
| Telegram | "Apri Telegram" | ✅ |
| YouTube | "Cerca musica rilassante su YouTube" | ✅ |

## Sviluppo (GitHub)

| Funzione | Come si usa | Stato |
|---|---|---|
| Creare un repository | "Crea un repository chiamato..." | ⏳ manca `EXPO_PUBLIC_GITHUB_TOKEN_KEY` |
| Eliminare un repository | "Elimina il repository..." — con conferma | ⏳ come sopra |
| Ultimi commit | "Mostrami gli ultimi commit" | ⏳ come sopra |

## Interfaccia e sistema

| Funzione | Dove | Stato |
|---|---|---|
| Radar animato | Schermata principale | ✅ |
| Orologio e data | In alto a sinistra | ✅ |
| Monitor batteria | Sotto l'intestazione | ✅ |
| Pannello impostazioni | Pulsante ⋮ | ✅ |
| Cambio città del riepilogo | Impostazioni | ✅ |
| Riepilogo all'avvio on/off | Impostazioni | ✅ |
| Scheda Funzioni | Impostazioni | ✅ |
| Scheda Info e crediti | Impostazioni | ✅ |
| Memoria persistente | Automatica | ✅ |
| Pulisci chat | Pill "PULISCI" | ✅ |

## Compilazione

| Metodo | Stato |
|---|---|
| EAS / Expo | ✅ 15 build al mese sul piano gratuito |
| GitHub Actions | ✅ collaudato: APK identico per contenuto e dimensione, senza limiti di quota |

---

## Cosa resta aperto

**Ricerca web** — quarta strada, e stavolta senza chiavi. La risposta è arrivata dal codice di Mark-LIII, l'assistente desktop da cui è nata l'idea di questo progetto: lì la ricerca usa lo stesso identico Gemini che usiamo noi, stesso modello e stessa ricerca Google, ma sotto ha DuckDuckGo come riserva. È per questo che lì "funziona sempre": quando Gemini esaurisce la quota gratuita — e la esaurisce anche lì — DuckDuckGo raccoglie senza che l'utente se ne accorga. Ora l'ordine è DuckDuckGo, Gemini, Groq. DuckDuckGo non chiede registrazione né chiave, restituisce brani di pagine, e la risposta la scrive il modello di chat già in uso.

**Catene di azioni** — parzialmente risolte. Due azioni insieme funzionano, tre no, e qualsiasi catena che parta da una sveglia si ferma lì. La causa: impostare una sveglia apre l'orologio, l'app finisce dietro, e Android non lascia che un'app in secondo piano ne apra un'altra — la seconda azione veniva scartata senza un errore. Ora fra un'azione e la successiva l'app si riporta davanti (il permesso di sovrapposizione della bolla è anche l'eccezione che lo consente), e il prompt dice esplicitamente di non considerare chiusa la richiesta finché ogni parte non è stata eseguita.

**Vecchio meccanismo a comandi testuali** — resta nel codice come rete di sicurezza sotto agli strumenti. Una volta confermato il funzionamento delle catene va rimosso, insieme alla duplicazione che si porta dietro.

## Non ancora implementato

**Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto.

**Report in PDF, salvataggio file e riordino cartelle** — discussi e fattibili, appoggiati sugli strumenti: si costruiscono una volta confermate le catene.
