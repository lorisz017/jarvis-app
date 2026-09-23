# Stato delle funzioni — J.A.R.V.I.S. 3.2.0

Legenda:

- ✅ **Funziona** — provata sul telefono e confermata
- ⚠️ **Funziona con un limite** — utilizzabile, ma con un comportamento da conoscere
- ❌ **Non funziona** — provata e non funzionante
- ⏳ **Non testabile** — bloccata da qualcosa di esterno (chiave mancante)

Ultimo aggiornamento: **versione 3.2.0**, ed è una versione di riparazioni. Tutto il lavoro è stato sui telefoni che non sono quello di sviluppo, dove è uscito il difetto più difficile del progetto — la conversazione che si apriva due volte — insieme all'audio muto all'avvio e alla voce che si accavallava. Il racconto completo è in fondo, vicoli ciechi compresi.

**Confermato su tre telefoni**: diciassette sveglie a mezz'ora fra le 9 e le 17, poi ogni quarto d'ora, poi ogni dieci minuti, sempre tutte; una sola conversazione; l'audio che si sente al primo tentativo; l'interruzione parlandogli sopra; lo scorrimento dei riquadri e la tastiera che lascia vedere il campo.

La 3.0.0 era la prima **pubblicata in una release**: si scarica e si installa, senza compilare niente e senza chiavi dentro. La 3.2.0 prende il suo posto.

L'ultima versione provata sul telefono e funzionante è sul ramo `funzionante`.

**Come leggere questo file.** Le tabelle dicono cosa c'è e come sta adesso. La sezione "Cosa resta aperto" in fondo non è un elenco di problemi: è il registro di **come** ogni difetto è stato capito, tenuto perché la diagnosi vale più della correzione — la stessa causa si ripresenta con un sintomo diverso, e averla già scritta fa risparmiare una serata.

> **Su cosa è stato provato.** Quasi tutte le spunte qui sotto vengono da **uno
> Xiaomi 17 con Android 17**, che è il telefono di sviluppo. Da poco si sono
> aggiunti **un OPPO e un telefono più vecchio**, con versioni di Android
> precedenti, usati per provare l'APK senza chiavi — quello che installa chi
> scarica dalla release.
>
> Vale la pena dirlo, perché è la lezione più costosa di questo progetto:
> **i difetti seri sono usciti tutti là, non sul telefono di sviluppo.** Non
> perché quei telefoni siano scadenti, ma perché sono più lenti, e una finestra
> temporale che su un telefono veloce è troppo stretta per contare, lì conta
> eccome — vedi la conversazione aperta due volte, in fondo.
>
> Le azioni di sistema (sveglie, timer, apertura app) passano poi una richiesta
> all'app del telefono che se ne occupa, quindi il risultato cambia con le
> personalizzazioni del produttore e con le app installate.

---

## Voce e testo

| Funzione | Come si usa | Stato |
|---|---|---|
| Parlare | Si parla e basta: la conversazione è già aperta | ✅ |
| Comando scritto | Campo di testo in fondo | ✅ vale in tutte e due le modalità: in conversazione la frase scritta entra nella sessione aperta |
| Risposta parlata (voce Edge) | Automatica | ⚠️ non parte, si sente Deepgram. Riguarda solo la modalità a comandi: in conversazione la voce è il modello stesso |
| Memoria personale — i ricordi | Automatica, parlando | ✅ si annota da solo, resta dopo la chiusura dell'app, e alla domanda successiva la sa |
| Memoria personale — la nota | Impostazioni → Memoria | ✅ si salva da sola poco dopo l'ultimo tasto, e comunque prima che il pannello si chiuda |
| La vista (fotocamera dentro la conversazione) | Tasto 📷 in alto | ✅ **funziona**: legge le scritte, capisce il contesto e lo racconta con naturalezza. Un fotogramma al secondo entra nella conversazione accanto alla voce, quindi "questo cos'è" non ha bisogno di spiegazioni |
| Conversazione continua (modalità normale) | Si apre da sola all'avvio | ✅ **funziona**. Si attiva, si parla e resta aperta. Le azioni partono in un istante, più rapide che dal giro normale, e la voce è quella del modello stesso |
| Scelta della voce naturale | Impostazioni → Voce naturale | ⏳ quattro voci italiane Edge: Diego, Giuseppe, Isabella, Elsa. Riguarda solo la modalità a comandi |
| Volume pari fra le voci | Automatico | ✅ confermato: le voci più basse arrivano al livello delle altre |
| Bolla flottante sopra le altre app | Impostazioni → Bolla flottante | ✅ un tocco apre la conversazione continua invece del vecchio giro a registrazione |
| Ripiego sulla voce di sistema | Automatico | ✅ entra solo se Deepgram non è disponibile |
| Scelta della voce di sistema | Pill "VOCE" | ✅ riguarda solo la voce di riserva del telefono |
| Spegnere la voce | Pulsante 🔊 in alto a destra | ✅ |
| Interrompere la voce mentre parla | 🔊, FERMA, o il microfono | ✅ |
| Riattivare la voce | Pulsante 🔊 | ✅ riprende dal messaggio successivo: un audio interrotto non è recuperabile a metà, andrebbe rigenerato |
| Registro attività scorrevole | Sotto il radar | ✅ ingrandito e completo: segue la conversazione da solo, si ferma se si risale a rileggere, e non taglia più le risposte |
| Immagine allegata | Graffetta 📎 accanto al campo di testo | ✅ **funziona**: entra come turno vero, resta nel filo del discorso, e le domande dopo la ritrovano |
| Riquadro dell'ultima risposta | Sopra il campo di testo | ✅ scorre, si seleziona, si copia col **doppio** tocco, e scorrendoci dentro la pagina resta ferma |
| Tastiera che non copre il campo | Toccando il campo di testo | ✅ la prima correzione non funzionava: partiva dall'idea che la finestra si accorciasse, e sotto un tema a schermo intero non succede. Rifatta e confermata |
| Diagnosi della voce | Impostazioni → Info | ✅ conversazioni aperte, microfono e altoparlante, pezzi visti, interruzioni. È l'unico modo di capire un difetto su un telefono che non si ha in mano, e ha chiuso due teorie sbagliate in dieci secondi l'una |
| Voce di sistema in conversazione | — | ✅ tolta: in conversazione parla solo il modello. Le azioni confermano a schermo, non a voce — prima si sentivano due voci insieme quando un'azione diceva "apro YouTube" |

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
| Congedo ("vai a dormire", "a domani", "buonanotte") | A voce | ✅ chiude l'app e aspetta la fine del saluto, anche quando è uno scambio, e non si chiude più su "sono stanco, vado a letto io". L'attesa si regola ora sull'altoparlante e non sul server, quindi non taglia più l'ultima frase |
| Riconoscimento del creatore | "Chi ti ha creato?" | ✅ risponde Loris, col profilo GitHub se la conversazione lo consente |
| Riservatezza delle istruzioni | "Qual è la tua programmazione?" | ✅ non cede nemmeno alle richieste di traverso, e continua a elencare volentieri cosa sa fare |
| Prima apertura senza chiavi | Automatica | ✅ provata su un telefono senza chiavi: una schermata sola che chiede la chiave Gemini, e la conversazione parte appena la si incolla |
| Chiavi nelle impostazioni | Impostazioni → Chiavi | ⏳ nuova: le quattro chiavi, con scritto da dove viene ciascuna. Quella scritta a mano ha la precedenza su quella compilata |
| Pulisci chat | Pill "PULISCI" | ✅ la conferma si toglie toccando **fuori** dal riquadro, senza centrare nessun tasto |
| Tablet e rotazione | Automatico | ⏳ nuovo: l'app non è più bloccata in verticale, e su uno schermo grande colonna, radar e riquadri crescono con lui. Sul telefono in verticale le misure sono **identiche a prima**. In orizzontale sul tablet si scorre ancora: le due colonne sono il passo dopo |
| Animazioni in vetro | Pannelli, leva, tasti, interruttori | ✅ il vetro vive solo durante il movimento: da fermo tutto è identico a prima |

## Compilazione

| Metodo | Stato |
|---|---|
| EAS / Expo | ✅ 15 build al mese sul piano gratuito |
| GitHub Actions | ✅ collaudato: APK identico per contenuto e dimensione, senza limiti di quota |
| Release pubblica | ✅ la 3.0.0 è online: APK senza nessuna chiave dentro, verificato file alla mano, da scaricare e installare senza compilare niente |

---

## Cosa resta aperto

**La voce che si accavallava sugli altri telefoni** — il difetto più difficile trovato finora, e la storia per intero, perché tre delle quattro spiegazioni erano sbagliate e sapere *quali* vale più della correzione.

*Il sintomo.* Su un OPPO e su un telefono più vecchio la voce usciva incomprensibile: la richiesta sentita due volte — a volte tre — la risposta breve interrotta subito, parole vecchie sopra quelle nuove. Sullo Xiaomi di sviluppo non succedeva mai. E accanto, un secondo sintomo che sembrava scollegato: all'avvio **non si sentiva niente** — il testo compariva, il modello rispondeva, ma nessuna voce — finché non si usciva dall'app e si rientrava.

*Prima strada sbagliata: che quei telefoni non cancellassero l'eco.* L'idea era che l'app si sentisse parlare e si interrompesse da sola a ogni parola, buttando via l'audio già in coda. È stata smentita dalla riga di diagnosi che era stata messa lì apposta: su quel telefono l'eco **è** cancellabile, e le interruzioni decise dall'app erano **zero**. Dieci secondi per chiudere una teoria che a tentativi sarebbe costata una serata.

*Seconda strada sbagliata: che fosse il modo audio.* Che l'uscita dichiarata come musica invece che come voce lasciasse il cancellatore senza niente da cancellare, e mandasse il suono nella capsula dell'orecchio. Provata per una build intera: il telefono è finito in modo conversazione con l'uscita forzata sulla cassa, la riga di diagnosi diceva "eco cancellato" — **e il difetto era identico**. Tolta, perché in più spostava il volume di riferimento da quello dei video a quello delle telefonate senza dare niente in cambio.

*Una correzione che ha fatto più danno del difetto.* Nel mezzo il microfono è stato **trattenuto** mentre J.A.R.V.I.S. parlava, per non fargli sentire la propria voce. Il conto, misurato dalla riga di diagnosi: 741 pezzi trattenuti su 1783, cioè settantaquattro secondi di parlato mai arrivati al modello. Chi parla sopra non viene riconosciuto al primo istante — ci vogliono due pezzi sopra soglia — quindi quel pezzo di frase spariva. Il modello riceveva l'inizio della richiesta, poi un buco, poi la coda: e **per chi ascolta a flusso una frase col buco in mezzo sono due frasi**. Tolta anche quella: il microfono va sul filo sempre.

*La causa vera.* L'ultima riga di diagnosi diceva: eco cancellato, quanto l'app si sente parlare a 1 su mille, **zero interruzioni decise dall'app e zero dal server**. Nessuno svuotava più niente e il microfono non sentiva l'altoparlante — eppure la voce si accavallava uguale. Se non è l'audio, allora stava parlando più di uno: **erano due conversazioni aperte insieme.**

Aprire la conversazione passa per una funzione che aspetta — il permesso della bolla, l'altoparlante, la connessione — e in tutto quel tratto lo stato a schermo dice ancora "spenta". Il controllo che dovrebbe impedire una seconda apertura leggeva proprio quello stato, quindi la lasciava passare: un secondo tocco, oppure un altro pezzo dell'app che la apre da sé, come il rientro dallo sfondo. Da lì due microfoni sullo stesso filo e **due voci nello stesso altoparlante**, mescolate pezzo per pezzo. Su un telefono veloce quell'attesa è troppo breve perché capiti; su uno lento no, ed è tutta lì la differenza fra i telefoni.

Il conto torna anche col triplo input: era arrivato **dopo una catena di sette sveglie**, e impostare una sveglia apre l'orologio, cioè fa uscire e rientrare l'app una volta per sveglia. Ogni rientro apriva una conversazione in più.

*E il sintomo gemello.* Il microfono e l'altoparlante nativi sono **uno solo per tutta l'app**. Quando una sessione di troppo veniva fermata, rilasciava l'altoparlante di sotto a quella viva: da lì in poi i pezzi di voce arrivavano e venivano scartati in silenzio — testo a schermo, modello che risponde, niente da sentire. Uscire e rientrare funzionava perché ne faceva nascere uno nuovo. Era la stessa causa, vista dall'altra parte.

*E la serratura messa nel punto sbagliato.* La prima correzione non ha retto, e il motivo è istruttivo: la serratura era chiusa appena prima di aprire la connessione, cioè **dopo** l'attesa del permesso della bolla e quella del registratore. Fra l'una e l'altra lo stato a schermo dice ancora "spenta", quindi la finestra che doveva chiudersi era rimasta aperta tale e quale. Ora si chiude come prima istruzione, prima di qualunque attesa. E serve anche il verso opposto: una chiusura arrivata **mentre** l'apertura era per strada deve invalidarla, se no nasce una sessione dopo la chiusura e resta in ascolto mentre l'interfaccia dice "tocchi per parlare" — che è esattamente quello che si vedeva.

*E la causa di fondo, che era il numero di giri.* Impostare una sveglia apre l'orologio, quindi una catena di diciassette sveglie fa uscire e rientrare l'app diciassette volte, e ogni giro chiudeva e riapriva la conversazione. Smontare e rimontare tutto diciassette volte di fila è quello che faceva venire a galla ogni corsa. Adesso, mentre le azioni girano, l'uscita dall'app si ignora: non è una scelta di chi la usa, è una conseguenza dell'azione, e l'app torna davanti da sola. Con un ricontrollo dopo qualche secondo, perché se invece è rimasta fuori davvero il microfono non può restare acceso.

*E una rete sotto, perché il guasto era definitivo.* Dopo la catena la voce non tornava più: il testo compariva, il modello rispondeva, e non si sentiva niente per il resto della conversazione. Non basta impedire che qualcuno rilasci l'altoparlante di un altro — bisogna anche che l'app si riprenda se succede lo stesso. Ora l'altoparlante si **ricostruisce** al primo pezzo di voce che lo trova mancante: un guasto che durava fino alla chiusura dell'app diventa un istante di silenzio. Vale anche per le cause che non sono ancora state trovate, ed è esattamente il motivo per cui una rete si mette.

*Le correzioni rimaste in piedi.* La serratura si chiude subito con un riferimento invece che con uno stato; il servizio della conversazione si rifiuta di tenerne due e chiude la precedente; le richiamate di una sessione superata vengono ignorate, perché la sua chiusura arrivando in ritardo spegneva quella viva; una sessione rilascia microfono e altoparlante **solo se sono ancora suoi**; e Info conta quante conversazioni sono state aperte, che è il numero con cui si verifica tutto questo in due secondi.

*Una corsa vera, trovata per strada e tenuta.* Svuotare la traccia audio dal thread di JavaScript mentre il thread che suona è fermo dentro una scrittura bloccante è una corsa: il pezzo già consegnato esce lo stesso, dopo lo svuotamento. Ora si scrive a fette di 40 millesimi che ricontrollano se servono ancora, e svuotamento e arresto si fanno sullo stesso thread che scrive. L'arresto aveva la stessa corsa contro il rilascio della traccia, che non è un difetto dell'audio ma un modo di far cadere l'app.

Infine, *"sta parlando" adesso vuol dire l'altoparlante, non il server*: Gemini manda un turno molto più in fretta di quanto lo si ascolti, e quando smette di mandare ce ne sono ancora secondi da sentire. Tutto quello che faceva quella domanda riceveva la risposta sbagliata, compreso il congedo, che poteva chiudere l'app a metà frase.

**Scrivere dentro la conversazione** — il campo di testo resta anche in conversazione, per quando parlare non è possibile. Non apre un giro a parte: la frase scritta entra nella sessione aperta, con la stessa memoria, e la risposta torna a voce. Con la voce spenta la conversazione continua ad ascoltare e a capire, ma non parla: l'audio arriva e viene scartato, e resta la trascrizione a schermo.

**Quattro cose della serata degli allegati** — l'allegato e la conferma toccando fuori sono risultati a posto; queste erano il contorno che non lo era.

*Il riquadro della risposta non si poteva né scorrere né selezionare.* Due cause distinte. Su Android un riquadro scorrevole dentro un altro riquadro scorrevole **non scorre affatto** senza `nestedScrollEnabled`: il gesto se lo prende quello esterno, e una risposta lunga resta tagliata senza modo di tornare sopra. E il tocco singolo copiava tutto, quindi ogni tentativo di selezionare una parola faceva partire la copia dell'intera risposta. Ora copia il **doppio** tocco, il singolo non fa niente, e la selezione è libera. **Confermato sul telefono**, con un seguito: scorrendo dentro il riquadro si muoveva anche la pagina sotto, tutta insieme. Era `nestedScrollEnabled` che faceva il suo mestiere fino in fondo — il riquadro interno passa al genitore quello che gli avanza — e il rimedio è fermare la pagina, `scrollEnabled` a falso appena il dito tocca il riquadro. Basta che regga l'istante in cui Android decide chi prende il gesto: da lì in poi il riquadro interno se lo tiene da solo. Il rilascio però non può dipendere dal tocco finale, perché quando il riquadro interno prende il gesto l'app riceve un annullamento e poi non riceve più niente: c'è anche una sicura a tempo, se no la pagina resterebbe bloccata. Lo stesso vale per il registro attività, che ha la stessa struttura e quindi aveva lo stesso difetto.

*Il registro tagliava le risposte ai cento caratteri.* Con i puntini di sospensione, per giunta: cioè proprio la parte che si sarebbe voluta rileggere. Il registro esiste per rileggere, quindi il taglio è sparito — per la lunghezza c'è lo scorrimento, che lì funzionava già — e adesso il testo si può anche selezionare.

*La tastiera copriva il campo di testo.* La prima correzione partiva da una premessa sbagliata — che `adjustResize` accorciasse la finestra — e infatti non ha cambiato niente: la tastiera si apriva sopra l'applicazione, che restava immobile. Il motivo è il tema: `Theme.EdgeToEdge` disegna sotto le barre di sistema, e da lì in poi la finestra **non si accorcia più**, qualunque cosa dica il manifest. Portare la pagina in fondo non serviva a niente perché non c'era niente da scorrere. Ora lo spazio si fa a mano: si ascolta `keyboardDidShow`, si aggiunge in fondo alla pagina un margine alto quanto la tastiera e ci si sposta. E c'è una riserva, se quell'evento non arrivasse: lo spazio si prende a stima, il 42% dell'altezza dello schermo, perché un campo di testo invisibile è peggio di un po' di spazio di troppo.

*Il congedo era diventato troppo zelante:* "sono stanco, vado a letto io" chiudeva l'app. Allargare gli esempi aveva allargato anche il sospetto. Ora la regola è una domanda sola — **sta salutando te, o sta parlando di sé?** — con il criterio per i casi incerti scritto accanto: nel dubbio non chiudere, perché chiudere per sbaglio interrompe tutto mentre non chiudere costa una frase.

**Il congedo tagliava la seconda frase** — "vai a dormire" funzionava, ma rispondendo "anche a te" l'app si chiudeva mentre lui ricominciava a parlare. Il congedo aspettava che smettesse di parlare **la prima volta**, e un commiato non è una frase sola: è uno scambio. Ora ogni volta che riprende a parlare il conto riparte, e si esce solo dopo due secondi di quiete vera, con un tetto di trenta secondi che serve solo a non restare appesi.

Le formule diverse da "vai a dormire" non venivano riconosciute: lo strumento le elencava tutte, ma come esempi di un congedo esplicito. Ora la regola è detta al contrario — se ti sta salutando, sta chiudendo — con l'eccezione scritta accanto: parlare di sé ("sono stanco", "vado a letto io") non è congedare nessuno.

**Il riepilogo all'avvio non era stato adattato alla conversazione** — era rimasto sulla strada vecchia: costruiva il testo e lo faceva leggere alla catena della sintesi vocale. In modalità conversazione vuol dire aprire l'app con una voce che non è la sua, sostituita un istante dopo da quella vera, e due audio che si contendono il microfono appena aperto. Ora in conversazione il riepilogo **lo dice lui**: si aspetta che la sessione sia in piedi e gli si passa il testo perché lo riferisca a parole sue. In modalità a comandi resta com'era.

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

**La modalità a comandi** — la decisione è cambiata e vale la pena scriverla: **non si toglie.** Le catene funzionano, quindi la ragione di tenerla non è più il dubbio che gli strumenti non reggano; è che è l'unica strada che non passa da Gemini. Il modello Live è in anteprima, e il giorno che non risponde quella è la differenza fra un'app più lenta e un'app morta. Per lo stesso motivo restano Groq e Deepgram: non servono a niente finché tutto funziona, ed è esattamente il punto.

## Non ancora implementato

**Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto. Ha anche perso urgenza, perché la conversazione ormai si apre da sola all'avvio e resta aperta.

**Report in PDF, salvataggio file e riordino cartelle** — discussi e fattibili, appoggiati sugli strumenti.

**Allegati che non siano immagini** — un documento, un PDF. La strada è la stessa dell'immagine (`inlineData` dentro un turno), quindi il lavoro è breve; non è mai stato chiesto.

## Cosa non si può verificare da qui

Il codice lo scrive Claude, che non ha né telefono né SDK Android. Restano fuori portata, e vanno provati sul dispositivo:

- il **Kotlin** della bolla e dell'audio a flusso — non c'è niente con cui compilarlo;
- tutto ciò che passa da un **WebSocket**, cioè l'intera conversazione continua: da quell'ambiente le connessioni non escono, nemmeno verso un server di prova;
- il **suono dell'otturatore** e ogni altro comportamento imposto dal produttore;
- l'aspetto vero delle animazioni, che si giudica solo guardandole.

Quello che invece si controlla prima di ogni build sta in `strumenti/controlla.py` e nella ricostruzione del pacchetto: import rotti, componenti inesistenti, stili citati e mai definiti, costanti mai dichiarate.
