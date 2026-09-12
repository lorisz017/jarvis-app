# Stato delle funzioni — J.A.R.V.I.S. 2.0.0

Legenda:

- ✅ **Funziona** — provata sul telefono e confermata
- ⚠️ **Funziona con un limite** — utilizzabile, ma con un comportamento da conoscere
- ❌ **Non funziona** — provata e non funzionante
- ⏳ **Non testabile** — bloccata da qualcosa di esterno (chiave mancante)

Ultimo aggiornamento: dopo il collaudo della bolla flottante, della ricerca via DuckDuckGo e delle catene di azioni.

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
| Bolla flottante sopra le altre app | Impostazioni → Bolla flottante | ⏳ compare, non crasha, il tocco accende il microfono e la linguetta "Rimuovi" funziona. Da fuori però la risposta non arriva ancora: restava sempre la prima frase, e il resto si sbloccava solo rientrando. Tre cause affrontate in un colpo, da riconfermare |
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

**Risposta dalla bolla, da fuori** — è il punto aperto principale. Al collaudo: si tocca, si parla, si ritocca, e la bolla pensa senza fine; nessun suono esce, e la risposta compare solo rientrando nell'app — sempre la stessa, la prima frase detta da fuori. Tre cause distinte sono state affrontate insieme, perché ognuna basta da sola a produrre quel sintomo: il registratore non ripartiva e restituiva il file precedente (ora la sessione audio viene rimessa in modalità registrazione prima di ogni ripresa, e un file identico al precedente viene rifiutato a voce); le richieste della voce non avevano limite di tempo (ora sì); e la riproduzione avveniva con la sessione ancora impegnata dal microfono, cosa che su Android può suonare nel vuoto (ora si esce prima dalla modalità registrazione). In più, qualunque cosa vada storta, entro un minuto la bolla lo dice invece di continuare a girare.

**Ricerca web** — funziona. Alla domanda sull'ultimo modello di ChatGPT ha risposto con data e nome esatti. Restava un eccesso di prudenza: sul Gran Premio aveva trovato Monza e il primato di Antonelli, ma si è fermata a "non indicano il vincitore" invece di dire quello che aveva davanti. Ora l'istruzione dice di ricavare la risposta quando si deduce dai brani, dichiarandolo, e di ammettere di non sapere solo se i brani non c'entrano con la domanda. Legge anche tre pagine invece di due.

**Catene di azioni** — dipendevano da come veniva detta la frase: le stesse azioni, chieste in modo naturale invece che scandito, sparivano. Buona parte era casualità del modello, che a ogni richiesta riformulava il piano in modo diverso: ora le richieste che comportano azioni vengono fatte a temperatura bassa, così la stessa frase dà sempre lo stesso risultato. La combinazione sveglia più messaggio WhatsApp, l'unica che non riusciva mai, è ora scritta come esempio nel prompt.

**Vecchio meccanismo a comandi testuali** — resta nel codice come rete di sicurezza sotto agli strumenti. Una volta confermato il funzionamento delle catene va rimosso, insieme alla duplicazione che si porta dietro.

## Non ancora implementato

**Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto.

**Report in PDF, salvataggio file e riordino cartelle** — discussi e fattibili, appoggiati sugli strumenti: si costruiscono una volta confermate le catene.
