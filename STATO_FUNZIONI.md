# Stato delle funzioni — J.A.R.V.I.S. 3.0.0

Legenda:

- ✅ **Funziona** — provata sul telefono e confermata
- ⚠️ **Funziona con un limite** — utilizzabile, ma con un comportamento da conoscere
- ❌ **Non funziona** — provata e non funzionante
- ⏳ **Non testabile** — bloccata da qualcosa di esterno (chiave mancante)

Ultimo aggiornamento: versione 3.0.0 — conversazione continua come modalità normale, memoria personale, icona nuova.

L'ultima versione provata sul telefono e funzionante è sul ramo `funzionante`.

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
| Comando scritto | Campo di testo in fondo | ✅ vale in tutte e due le modalità: in conversazione la frase scritta entra nella sessione aperta |
| Risposta parlata (voce Edge) | Automatica | ⚠️ non parte, si sente Deepgram. Riguarda solo la modalità a comandi: in conversazione la voce è il modello stesso |
| Memoria personale — i ricordi | Automatica, parlando | ✅ si annota da solo, resta dopo la chiusura dell'app, e alla domanda successiva la sa |
| Memoria personale — la nota | Impostazioni → Memoria | ✅ si salva da sola poco dopo l'ultimo tasto, e comunque prima che il pannello si chiuda |
| Conversazione continua (modalità normale) | Si apre da sola all'avvio | ✅ **funziona**. Si attiva, si parla e resta aperta. Le azioni partono in un istante, più rapide che dal giro normale, e la voce è quella del modello stesso |
| Scelta della voce naturale | Impostazioni → Voce naturale | ⏳ quattro voci italiane Edge: Diego, Giuseppe, Isabella, Elsa |
| Volume pari fra le voci | Automatico | ✅ confermato: le voci più basse arrivano al livello delle altre |
| Bolla flottante sopra le altre app | Impostazioni → Bolla flottante | ✅ un tocco apre la conversazione continua invece del vecchio giro a registrazione |
| Ripiego su Gemini e voce di sistema | Automatico | ✅ entra solo se Deepgram non è disponibile |
| Scelta della voce di sistema | Pill "VOCE" | ✅ riguarda solo la voce di riserva del telefono |
| Spegnere la voce | Pulsante 🔊 in alto a destra | ✅ |
| Interrompere la voce mentre parla | 🔊, FERMA, o il microfono | ✅ |
| Riattivare la voce | Pulsante 🔊 | ✅ riprende dal messaggio successivo: un audio interrotto non è recuperabile a metà, andrebbe rigenerato |
| Registro attività scorrevole | Sotto il radar | ✅ ingrandito: si legge senza sforzo |

## Azioni

| Funzione | Come si usa | Stato |
|---|---|---|
| Più azioni in una richiesta | "Sveglia alle 8, timer di 10 minuti e chiama Marco" | ✅ in conversazione partono tutte insieme e in un istante |
| Azione singola | Qualunque comando da solo | ✅ |

## Informazioni

| Funzione | Come si usa | Stato |
|---|---|---|
| Riepilogo all'apertura | Automatico all'avvio | ✅ |
| Meteo | "Che tempo fa a Milano?" | ✅ |
| Ricerca sul web | "Chi ha vinto...", "Prezzo di..." | ✅ via DuckDuckGo, leggendo le pagine. È una vera azione anche dentro la conversazione |

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
| Conversazione salvata fra un avvio e l'altro | Automatica | ✅ da non confondere con la memoria personale, che è un'altra cosa |
| Leva fra conversazione e comandi | In cima, se la modalità a comandi è accesa | ✅ spostarla apre o chiude davvero la sessione |
| Icona dell'app | Schermata iniziale | ✅ il radar dell'app, generata da `strumenti/icona.py` |
| Congedo ("vai a dormire", "chiudi l'app") | A voce | ⏳ nuova: saluta, finisce di parlare e poi torna alla schermata iniziale del telefono |
| Riconoscimento del creatore | "Chi ti ha creato?" | ✅ risponde Loris, col profilo GitHub se la conversazione lo consente |
| Riservatezza delle istruzioni | "Qual è la tua programmazione?" | ✅ non cede nemmeno alle richieste di traverso, e continua a elencare volentieri cosa sa fare |
| Pulisci chat | Pill "PULISCI" | ✅ |

## Compilazione

| Metodo | Stato |
|---|---|
| EAS / Expo | ✅ 15 build al mese sul piano gratuito |
| GitHub Actions | ✅ collaudato: APK identico per contenuto e dimensione, senza limiti di quota |

---

## Cosa resta aperto

**Scrivere dentro la conversazione** — il campo di testo resta anche in conversazione, per quando parlare non è possibile. Non apre un giro a parte: la frase scritta entra nella sessione aperta, con la stessa memoria, e la risposta torna a voce. Con la voce spenta la conversazione continua ad ascoltare e a capire, ma non parla: l'audio arriva e viene scartato, e resta la trascrizione a schermo.

**Sei difetti del collaudo della 3.0.0** — trovati tutti nella stessa sera, con cause diverse fra loro. **Tutti confermati risolti sul telefono**, insieme alla memoria e alla riservatezza delle istruzioni.

*La nota scritta a mano spariva, i ricordi no.* Le due metà della memoria si salvano nello stesso file, quindi il file non c'entrava: la nota si salvava **solo quando la casella perdeva il fuoco**, e chiudendo il pannello con un tocco il fuoco non si perde mai. Ora si salva mezzo secondo dopo l'ultimo tasto e comunque prima che il pannello si chiuda. Il fatto che i ricordi annotati dal modello resistessero alla chiusura dell'app è anche la prova che il resto della memoria funziona.

*Il radar non riprendeva dopo uno stop.* Fermando la conversazione, la chiusura del WebSocket riportava la leva sui comandi — un rimedio pensato per le sessioni che **cadono**, applicato anche a quelle chiuse apposta. Il radar passava così in mano alla modalità a comandi, e il tocco successivo apriva una registrazione invece di riaprire la conversazione. Da fuori sembrava semplicemente che non rispondesse più. Ora la chiusura dice se era voluta, e la leva si sposta solo se la sessione è caduta e solo se la modalità a comandi esiste.

*Le accentate storpiate nel riquadro della risposta.* I messaggi della sessione arrivano anche come dati binari, e la conversione che React Native fa da sola legge ogni byte come un carattere: un'accentata occupa due byte e usciva spezzata in due simboli, "perché" diventava "perchÃ©". Ora i byte si chiedono grezzi e si decodificano come UTF-8 con una funzione propria, confrontata con l'implementazione di Node.

*Il riquadro mostrava solo l'ultima parola.* Le trascrizioni arrivano a flusso e ognuna sostituiva la precedente. Ora si accumulano per turno, il testo si può selezionare oltre che copiare con un tocco, e il riquadro segue quello che cresce.

*Il registro non seguiva la conversazione.* Scorreva solo quando **compariva** una riga nuova, mentre in conversazione è l'ultima a crescere parola per parola. Ora segue anche quella — ma solo finché si sta guardando il fondo: appena si risale a rileggere qualcosa resta fermo.

*Uscendo dall'app il microfono restava acceso.* La conversazione continuava a sentire e a rispondere anche senza la bolla. Ora uscire la chiude, a meno che la bolla non sia accesa — che è il caso in cui restare fuori è proprio il suo mestiere — e rientrando riprende da sola se era impostata per aprirsi all'avvio.

*L'avviso "Errore configurazione voce" a ogni apertura.* Non era un guasto: è il telefono che non elenca le proprie voci di sistema, cioè l'ultima riserva della modalità a comandi, quella che in conversazione non entra mai in gioco. L'app funzionava lo stesso. Una finestra a ogni avvio per annunciare che manca una riserva mai usata è solo rumore: ora resta nel registro tecnico e basta.

**La memoria non arrivava al modello** — al collaudo J.A.R.V.I.S. non sapeva dire che dispositivo ha l'utente, pur avendo la nota scritta e visibile nelle impostazioni. Un pezzo del motivo è certo: in modalità a comandi la conversazione partiva da `SYSTEM_MESSAGE`, una costante costruita quando il modulo viene importato — cioè **prima** che il file della memoria sia stato letto. Portava dentro una memoria vuota per sempre. Ora il messaggio di sistema si costruisce dopo la lettura, e anche a ogni nuova conversazione.

Il resto non era diagnosticabile da qui, quindi adesso si racconta invece di fallire in silenzio: ogni scrittura e ogni lettura registrano il loro esito, la sezione Memoria mostra quanto finisce davvero nel prompt e l'errore esatto se il file non si lascia scrivere, e l'annotazione fatta dal modello compare nel registro attività col fatto annotato — così si distingue **il modello che non chiama lo strumento** da **la scrittura che fallisce**, che è la domanda vera. Un ricordo che non riesce a salvarsi non resta più in memoria a fingere: sparirebbe comunque alla chiusura dell'app.

Resta una cosa per costruzione: il prompt di sistema si manda all'apertura della sessione, quindi una nota scritta mentre la conversazione è già aperta la conosce solo la prossima. Ora l'app lo dice nel registro invece di lasciarlo scoprire.

**Ricerca sul web nella conversazione continua** — chiedendole di cercare qualcosa apriva YouTube. Non era un capriccio del modello: fra le diciotto azioni **non ce n'era una per cercare sul web**, perché nella modalità normale la ricerca è una strada a parte e non uno strumento. Il modello sceglieva la cosa più vicina che aveva. Ora la ricerca è una vera azione: restituisce il testo trovato e lo riassume il modello stesso, senza aprire niente.

**Interruzione e pulsante FERMA** — parlando sopra a J.A.R.V.I.S. i pezzi di voce già affidati alla riproduzione restavano in coda e ripartivano appena si smetteva di parlare, rispondendo a cose vecchie e accavallandosi. Ora ogni interruzione invalida i pezzi del giro superato. In più l'interruzione non aspetta più che se ne accorga il server: mentre J.A.R.V.I.S. parla, l'app misura quanto entra dal microfono e si zittisce da sola dopo un quinto di secondo di voce vera. Il pulsante FERMA, che conosceva solo la voce sintetizzata, zittisce adesso anche la conversazione — e lo stesso fanno il radar, il campo di testo e lo spegnimento della voce.

**Conversazione continua** — risolta. La sessione moriva dopo un secondo perché l'audio veniva mandato in `realtime_input.media_chunks`, che è deprecato: va messo in `audio`. Il messaggio di chiusura del server lo diceva a lettere, ma nessuno lo leggeva. Al collaudo: si attiva, resta aperta, risponde in un istante, e le azioni partono più in fretta che dal giro normale.

**Voce di Edge** — chiusa, non come risolta ma come superata. Non parla e si sente la riserva; il motivo del rifiuto l'app lo riporta nelle impostazioni, sotto VOCE NATURALE, e da qui non è verificabile perché i WebSocket non escono da questo ambiente. Due sospetti erano già stati tolti di mezzo: la versione di Edge dichiarata era vecchia di dieci versioni, e la scelta della voce finiva nella preferenza sbagliata. Quello che ha cambiato il peso della cosa è la conversazione continua: lì la voce non è una sintesi, è il modello che parla. La sintesi vocale serve solo alla modalità a comandi, che ora è un ripiego dietro un interruttore — quindi non è più una cosa da ricollaudare.

**Il limite che spiegava quasi tutto** — il piano gratuito di Groq concede 8000 token al minuto per `gpt-oss-120b`. Una sola richiesta di questa app, fra prompt di sistema e descrizioni di una ventina di strumenti, ne consuma circa tremila: bastano due giri di una catena per esaurirli, e da lì in poi il modello non risponde più. Non era il modello a dimenticarsi le azioni: non gli veniva proprio più risposto. È anche l'origine del vecchio "Request Entity Too Large" sulla ricerca. Il ragionamento passa ora da Gemini, che ha un tetto molto più alto, con Groq sotto come riserva; la trascrizione resta su Groq, dove quel limite non si avvicina nemmeno.

**Perché l'assistente desktop sembra più sveglio** — Mark-LIII non fa quello che fa questa app. Non trascrive, non ragiona e poi sintetizza: parla con `gemini-3.1-flash-live-preview`, cioè l'API Live di Gemini, un modello che ascolta la voce e risponde in voce direttamente. Niente tre passaggi, niente attese in mezzo, e un timbro che nessuna sintesi di testo può eguagliare. Portarla qui è possibile ma è un lavoro a sé: vuol dire una connessione continua e audio trasmesso a flusso invece che a file.

**Risposta dalla bolla, da fuori** — chiusa. È stata poi spostata sulla conversazione continua, ed è lì che ha cominciato a funzionare: la strada vecchia aveva cinque passaggi che fuori dall'app potevano fallire in silenzio. Quello che segue è come si presentava e cosa era stato corretto prima di cambiare strada. Al collaudo: si tocca, si parla, si ritocca, e la bolla pensa senza fine; nessun suono esce, e la risposta compare solo rientrando nell'app — sempre la stessa, la prima frase detta da fuori. Tre cause distinte sono state affrontate insieme, perché ognuna basta da sola a produrre quel sintomo: il registratore non ripartiva e restituiva il file precedente (ora la sessione audio viene rimessa in modalità registrazione prima di ogni ripresa, e un file identico al precedente viene rifiutato a voce); le richieste della voce non avevano limite di tempo (ora sì); e la riproduzione avveniva con la sessione ancora impegnata dal microfono, cosa che su Android può suonare nel vuoto (ora si esce prima dalla modalità registrazione). In più, qualunque cosa vada storta, entro un minuto la bolla lo dice invece di continuare a girare.

**Ricerca web** — funziona. Alla domanda sull'ultimo modello di ChatGPT ha risposto con data e nome esatti. Restava un eccesso di prudenza: sul Gran Premio aveva trovato Monza e il primato di Antonelli, ma si è fermata a "non indicano il vincitore" invece di dire quello che aveva davanti. Ora l'istruzione dice di ricavare la risposta quando si deduce dai brani, dichiarandolo, e di ammettere di non sapere solo se i brani non c'entrano con la domanda. Legge anche tre pagine invece di due.

**Catene di azioni** — dipendevano da come veniva detta la frase: le stesse azioni, chieste in modo naturale invece che scandito, sparivano. Buona parte era casualità del modello, che a ogni richiesta riformulava il piano in modo diverso: ora le richieste che comportano azioni vengono fatte a temperatura bassa, così la stessa frase dà sempre lo stesso risultato. La combinazione sveglia più messaggio WhatsApp, l'unica che non riusciva mai, è ora scritta come esempio nel prompt.

**Vecchio meccanismo a comandi testuali** — resta nel codice come rete di sicurezza sotto agli strumenti. Una volta confermato il funzionamento delle catene va rimosso, insieme alla duplicazione che si porta dietro.

## Non ancora implementato

**Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto.

**Report in PDF, salvataggio file e riordino cartelle** — discussi e fattibili, appoggiati sugli strumenti: si costruiscono una volta confermate le catene.
