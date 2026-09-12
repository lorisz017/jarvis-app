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
| Bolla flottante sopra le altre app | Impostazioni → Bolla flottante | ⏳ non crasha più, il tocco avvia e chiude la registrazione, la linguetta "Rimuovi" c'è. Restava un'attesa senza fine quando la rete non rispondeva: ora tutte le richieste hanno un limite di tempo e l'errore viene detto a voce |
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

**Ricerca web** — DuckDuckGo risponde: la rete funziona e i risultati arrivano. Restava che i riassunti di DuckDuckGo descrivono il sito e non la notizia, e il modello — correttamente — diceva di non poter rispondere senza inventare. Ora oltre ai riassunti vengono aperte e lette le prime due pagine trovate, così il modello ha davanti il testo vero invece di una descrizione generica.

**Catene di azioni** — quasi. Due azioni riescono, la terza spesso no, e dopo due passaggi nell'orologio quello che segue si perde. Due cause affrontate: l'app non aspettava davvero di essere tornata in primo piano prima di lanciare l'azione successiva (adesso aspetta, fino a quattro secondi, invece di sperarci dopo un tempo fisso), e il modello considerava chiusa la richiesta appena un'azione riusciva (adesso, quando smette di chiedere strumenti, gli si ricorda una volta di rileggere la richiesta azione per azione).

**Vecchio meccanismo a comandi testuali** — resta nel codice come rete di sicurezza sotto agli strumenti. Una volta confermato il funzionamento delle catene va rimosso, insieme alla duplicazione che si porta dietro.

## Non ancora implementato

**Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto.

**Report in PDF, salvataggio file e riordino cartelle** — discussi e fattibili, appoggiati sugli strumenti: si costruiscono una volta confermate le catene.
