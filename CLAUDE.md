# Come si lavora su questo progetto

Appunti di lavoro fra lorisz017 e Claude. Non è documentazione del codice —
per quella ci sono `README.md` e `STATO_FUNZIONI.md`. Qui stanno le cose che
altrimenti vivrebbero solo nella conversazione, e che si perdono quando la
conversazione viene compattata.

## Che cos'è

J.A.R.V.I.S. Mobile: un assistente vocale Android in italiano, che oltre a
rispondere **agisce sul telefono** — sveglie, timer, chiamate, messaggi,
navigazione, calendario.

Due debiti d'origine, entrambi nei crediti e da tenere così:

- **[az11k-dev/jarvis-app](https://github.com/az11k-dev/jarvis-app)** — lo
  scheletro iniziale. Nei crediti va nominato **solo per quello**: tutto il
  resto (interfaccia, azioni, voce) è di lorisz017.
- **[FatihMakes/Mark-LIII](https://github.com/FatihMakes/Mark-LIII)** — un
  assistente desktop in Python. Non è codice di partenza, è l'idea. Va nei
  crediti come ringraziamento, e la nota sulla sua licenza CC BY-NC (che non
  si combina con MIT) sta in fondo, sotto Licenza, non accanto al
  ringraziamento.

È anche la migliore documentazione che abbiamo: quando qualcosa non funziona
qui e lì funziona, **conviene leggere come lo fa lui**. È già successo due
volte, e tutte e due le volte ha risolto.

## Com'è fatto

React Native 0.81 con Expo SDK 54, ma in **bare workflow**: le cartelle
`android/` e `ios/` sono committate nel repository. Ha una conseguenza che
costa una giornata a scoprirla da soli:

- **EAS salta il prebuild**, quindi le impostazioni native in
  `app.config.js` — permessi, temi — vengono **ignorate**. Un permesso nuovo
  va scritto a mano in `android/app/src/main/AndroidManifest.xml`.
- La versione che finisce nell'APK è `versionName` in
  `android/app/build.gradle`, non `version` in `app.config.js`. Vanno tenuti
  allineati lo stesso — insieme a `package.json` e a `APP_VERSION` in
  `SettingsModal.jsx`, che è quella mostrata nella scheda Info.
- **L'icona è generata da codice**, da `strumenti/icona.py`. Non c'è nessuna
  libreria di immagini in questo ambiente, quindi i PNG sono scritti a mano
  con `zlib`. Il disegno è il radar dell'app: ogni elemento è una funzione
  che dice quanta luce accende un punto, i bordi si calcolano invece che
  campionarli — così restano netti anche a 48 pixel — e la luce si somma,
  che è quello che fa sembrare l'icona accesa invece che disegnata.
  `python3 strumenti/icona.py` rifà tutte le densità, `anteprima 512 file.png`
  ne fa una sola grande da guardare. L'area sicura di un'icona adattiva è il
  cerchio centrale, un terzo del raggio del lato: fuori di lì ogni telefono
  taglia in modo diverso, e sotto una certa misura i dettagli fini (tacche,
  reticolo) vanno tolti o diventano sporcizia.

### Il percorso di una richiesta (modalità a comandi)

1. **Si parla** → la registrazione va a Whisper su Groq e torna trascritta.
2. **Ragiona** → il testo va a Gemini, con l'elenco delle azioni disponibili.
   Groq resta sotto come riserva.
3. **Agisce** → se il modello chiede delle azioni, l'app le esegue in ordine
   e le conferma tutte insieme.
4. **Risponde** → la voce di Edge legge la risposta, con Deepgram sotto e la
   voce di sistema in fondo.

La **conversazione continua** non fa niente di tutto questo: una connessione
aperta con Gemini Live, audio che entra ed esce a flusso, un modello solo che
ascolta e risponde con la propria voce.

Dalla stessa connessione passa anche **quello che vede la fotocamera**:
`realtimeInput.video` sta accanto ad `audio`, con `image/jpeg` e un
fotogramma al secondo — è il ritmo che consiglia Google, di più è banda
buttata. Le foto della fotocamera sono enormi rispetto a quello che serve,
quindi si chiede al telefono quali misure sa fare e si prende la più piccola
sopra i 640 pixel: sotto, il modello non distingue più le scritte. Uno scatto
per volta, se no un telefono lento accoda fotogrammi che non guarderà
nessuno.

**La conversazione è la modalità normale.** Quella a comandi esiste ancora ma
va chiesta: si accende da Impostazioni → Modalità comandi, e solo allora
compare in cima alla schermata la leva per passare dall'una all'altra.

La scelta è sua, presa dopo averle confrontate sullo stesso compito: quattro
azioni insieme (due sveglie, un timer, una chiamata) la conversazione le ha
fatte in un istante, la modalità a comandi ci ha messo qualche secondo e ne ha
completate due. E si sente anche da come parla: in conversazione il modello
riceve la voce, con tono e pause, mentre a comandi riceve un testo trascritto
e ripulito di tutto.

La leva non è una preferenza da ricordare — spostarla apre o chiude davvero la
sessione, e una sessione che si chiude da sola la riporta indietro, così
quello che si vede e quello che succede restano la stessa cosa. Ogni modalità
mostra la sua parte: il campo di testo appartiene ai comandi, e in
conversazione il radar apre e chiude la sessione.

Interrompere J.A.R.V.I.S. mentre parla non aspetta che se ne accorga il
server: l'app misura quanto entra dal microfono e si zittisce da sola. La
soglia sta a 0,04 perché la voce vera misura molto meno di quanto sembri a
orecchio, ed è protetta da due pezzi consecutivi sopra soglia più la
cancellazione dell'eco della sorgente da telefonata. **Se dovesse
interrompersi da solo, la soglia va alzata; se non si ferma quando gli si
parla sopra, abbassata.**

"Sta parlando" vuol dire però **l'altoparlante**, non il server: Gemini manda
un turno molto più in fretta di quanto lo si ascolti, e quando smette di
mandare ce ne sono ancora secondi da sentire. Si stima dai byte consegnati
all'altoparlante, e anche il congedo si regola su quello — prima poteva
chiudere l'app a metà frase.

### La sera in cui la voce si accavallava, e cosa NON era

Su un OPPO e su un telefono più vecchio la voce usciva incomprensibile: la
richiesta sentita due volte, parole vecchie sopra le nuove. Sullo Xiaomi non
succedeva. Sono state percorse due strade sbagliate prima di quella giusta, e
**non vanno ripercorse**:

- *Che quei telefoni non cancellassero l'eco*, e l'app si sentisse parlare.
  Smentita dalla riga di diagnosi: l'eco lì è cancellabile e le interruzioni
  decise dall'app erano zero.
- *Che fosse il modo audio* — uscita dichiarata come musica invece che come
  voce. Provata per una build: il telefono è finito in modo conversazione con
  l'uscita forzata sulla cassa, la riga diceva "eco cancellato"… e il difetto
  era identico. Tolto tutto: cambiava il volume di riferimento (quello delle
  telefonate invece dei video) senza risolvere niente.

Nel mezzo è stato anche **trattenuto il microfono** mentre lui parlava, per
non fargli sentire la propria voce: era la correzione giusta per il problema
sbagliato e ha fatto un danno peggiore — 741 pezzi su 1783 mai arrivati al
modello, cioè frasi col buco in mezzo, che per chi ascolta a flusso sono due
frasi. Anche quello è stato tolto. **Il microfono va sul filo sempre.**

Era tutt'altro: **erano due conversazioni aperte insieme** — e da lì discende
anche l'altro sintomo, quello che sembrava scollegato: *"all'inizio non si
sente l'audio, poi esco e rientro e si sente"*. Il microfono e l'altoparlante
nativi sono **uno solo per tutta l'app**. Quando una sessione superata viene
fermata, rilascia l'altoparlante **di sotto a quella viva**: da lì in poi i
pezzi di voce arrivano e vengono buttati, il testo compare, il modello
risponde, e non si sente niente. Uscire e rientrare funzionava perché ne
faceva nascere uno nuovo. Perciò: **una sessione rilascia microfono e
altoparlante solo se sono ancora suoi.** Vedi anche la trappola sulla
serratura fatta con uno stato di React, più sotto.

La morale, che vale oltre questo caso: i numeri in **Impostazioni → Info**
hanno chiuso due teorie in dieci secondi l'una, e ogni volta la risposta
stava nella parte della riga che non si stava guardando. **Prima di toccare
una soglia si guarda lì, e si legge tutta la riga.**

Quella riga adesso dice quattro cose, e ognuna si è guadagnata il posto:

- **Conversazioni aperte** — deve dire 1. Se dice di più, ne sono nate altre e
  il difetto è tornato.
- **Microfono e altoparlante** — accesi o fermi. Un altoparlante *fermo* a
  conversazione aperta è la differenza fra "non risponde" e "risponde e non si
  sente".
- **Pezzi dal microfono e di voce** — distinguono "non è successo" da "quel
  codice non è mai girato".
- **Interruzioni decise dall'app e dal server.**

### Dove sta cosa

| File | Cosa fa |
|---|---|
| `src/services/jarvisService.jsx` | Il cuore: trascrizione, ragionamento, ciclo delle azioni, ricerca |
| `src/services/geminiChatService.jsx` | Traduce fra il formato di Groq e quello di Gemini, nei due sensi |
| `src/services/liveService.jsx` | La conversazione continua e l'interruzione |
| `src/components/ModeSwitch.jsx` | La leva fra le due modalità |
| `src/components/FoglioLiquido.jsx` | L'apertura dei pannelli: vetro sul fondo, foglio che sale |
| `src/components/TastoLiquido.jsx` | Il tasto che si abbassa e si vela sotto il dito |
| `src/components/Occhio.jsx` | La fotocamera al posto del radar, un fotogramma al secondo |
| `src/components/Avviso.jsx` | L'avviso che si toglie toccando fuori |
| `src/components/ResponseBox.jsx` | L'ultima risposta: scorre, si seleziona, si copia col doppio tocco |
| `src/components/ActivityLog.jsx` | Il registro: segue la conversazione, si ferma se si risale |
| `src/services/tools.jsx` | Le 21 azioni: schema per il modello ed esecuzione |
| `src/services/ttsService.jsx` | La catena della voce e il pareggiamento del volume |
| `src/services/edgeTtsService.jsx` | La voce di Edge |
| `src/services/webSearchService.jsx` | Ricerca via DuckDuckGo, con lettura delle pagine |
| `src/services/deviceActions.jsx` | Sveglie, timer, meteo, calendario |
| `src/services/overlayService.jsx` | Il ponte con la bolla nativa |
| `src/services/memoryService.jsx` | La memoria personale: la nota e i ricordi |
| `src/services/chiaviService.jsx` | Le chiavi API: quelle scritte a mano e quelle compilate dentro |
| `src/components/Benvenuto.jsx` | Il primo avvio di chi non ha le chiavi nell'APK |
| `src/utils/constants.jsx` | Il prompt di sistema, costruito con la memoria dentro |
| `src/utils/sha256.jsx`, `base64.jsx` | Funzioni pure, verificate contro Node |
| `android/.../overlay/` | Il codice nativo: bolla, servizio, audio a flusso |

Il codice nativo è registrato **a mano** in `MainApplication.kt`
(`packages.add(JarvisOverlayPackage())`): non essendo una libreria di
terze parti, non viene agganciato in automatico.

## I fornitori, e i loro limiti

| Servizio | A cosa serve | Limite da ricordare |
|---|---|---|
| **Groq** | Trascrizione (Whisper), ragionamento di riserva | **8000 token al minuto.** Una sola richiesta di quest'app ne consuma ~3000 |
| **Gemini** | Ragionamento, conversazione continua, vista | Tetto alto. La **ricerca Google** però non è nel piano gratuito |
| **Edge** | Voce principale | Nessuna chiave, nessuna quota. **Non è una API ufficiale** |
| **Deepgram** | Voce di riserva | $200 di credito che non scade. Ottimizzata per la latenza, non per la qualità |
| **DuckDuckGo** | Ricerca sul web | Nessuna chiave. Pagine HTML da leggere, non una API |
| **Open-Meteo** | Meteo | Nessuna chiave |

Scartati, e perché — per non ripercorrerli:

- **Tavily** — funzionerebbe, ma era una registrazione in più per un problema
  che DuckDuckGo risolve senza chiedere niente.
- **Kokoro** (open source, illimitato) — ha un difetto aperto: le voci
  italiane pronunciano con accento inglese.
- **ElevenLabs** — la voce migliore in assoluto, ma 10.000 crediti al mese
  sono dieci minuti di parlato.
- **Sintesi vocale di Gemini** — provata e tolta: suona peggio di Deepgram e
  ci mette molto di più, perché genera l'audio con una richiesta completa al
  modello invece che con un servizio fatto per parlare.
- **Speechify** (50.000 caratteri al mese, senza carta, prima nelle
  classifiche indipendenti) e **Cartesia Sonic-3** (20.000 al mese) — **non
  scartati**: sono il piano B se la voce di Edge si chiude.

## Le trappole di Android, imparate una alla volta

Ognuna di queste è costata almeno una build, alcune parecchie:

- `Linking.sendIntent` manda ogni numero come **decimale**, quindi gli intent
  che leggono interi (`SET_ALARM`, `SET_TIMER`) si ritrovano i valori di
  default **senza dare errore**. Si usa `expo-intent-launcher`.
- Un servizio in primo piano ottiene il tipo **microfono** solo se l'app è in
  primo piano **nel momento in cui il servizio parte**. Farlo partire mentre
  si esce — il momento ovvio per una bolla — è l'unico che Android rifiuta, e
  l'eccezione esce da `onCreate` portandosi giù l'applicazione.
- Per riprodurre audio da fuori serve **anche** il tipo riproduzione
  multimediale. Senza, Android fa partire l'audio e non lo manda da nessuna
  parte.
- Prima di riprodurre si esce dalla modalità registrazione: finché la
  sessione è impegnata dal microfono, si può suonare nel vuoto.
- Un'app in secondo piano **non può aprire la schermata di un'altra app**.
  Impostare una sveglia apre l'orologio, e da lì ogni azione successiva della
  catena viene scartata in silenzio. Il permesso di sovrapposizione è
  l'eccezione prevista: si torna davanti, e si **aspetta di esserci davvero**.
- La conversazione continua sopravvive all'uscita dall'app **solo se c'è un
  servizio in primo piano**: è quello che tiene vivo il processo e mantiene il
  permesso del microfono. Al primo collaudo funzionava per caso, perché la
  bolla era accesa; ora la conversazione accende da sé il servizio che le
  serve, invece di dipendere da un interruttore che non la riguarda.
- Ogni richiesta di rete vuole un limite di tempo. Dentro l'app una richiesta
  bloccata sembra lenta; da una bolla non c'è schermo, ed è indistinguibile
  da un'app morta.
- Le richieste che comportano azioni vogliono una **temperatura bassa**. Col
  valore predefinito il modello ripianifica ogni volta la stessa frase in modo
  diverso, e quale azione sopravviva a una catena diventa un sorteggio.
- In Kotlin gli **apici singoli sono un carattere**, non una stringa.
- **Svuotare una `AudioTrack` da un thread mentre un altro ci sta scrivendo è
  una corsa**, e il pezzo già consegnato esce lo stesso, *dopo*: si sentono
  parole vecchie sopra le nuove. Si scrive a fette (40 ms) ricontrollando fra
  l'una e l'altra, e svuotamento e arresto si fanno **sullo stesso thread che
  scrive**. Per l'arresto non è nemmeno una questione di suono: rilasciare la
  traccia mentre qualcuno ci scrive dentro è un modo di far cadere l'app.
- **Una serratura fatta con uno stato di React non chiude niente.** Aprire la
  conversazione passa per una funzione che aspetta — il permesso della bolla,
  l'altoparlante, la connessione — e in tutto quel tratto lo stato a schermo
  dice ancora "spenta". Su un telefono lento quell'attesa dura abbastanza
  perché un secondo tocco, o un altro pezzo dell'app che la apre da sé, ne
  faccia partire **un'altra**: due microfoni sullo stesso filo e **due voci
  nello stesso altoparlante**, mescolate pezzo per pezzo. Chi guarda vede la
  richiesta sentita due volte e un discorso incomprensibile, e pensa all'audio.
  La serratura va chiusa **subito**, con un riferimento, e chi possiede la
  risorsa — il servizio della conversazione — deve rifiutarsi di averne due.
  E le richiamate di una sessione superata vanno ignorate: la sua chiusura,
  arrivando dopo, spegne quella viva.

  **"Subito" vuol dire prima della prima attesa, non prima dell'ultima.** Al
  primo tentativo la serratura era chiusa appena prima di aprire la
  connessione, cioè *dopo* l'attesa del permesso della bolla: lasciava aperta
  esattamente la finestra che doveva chiudere, e il difetto si è ripresentato
  identico. Va presa come prima istruzione dopo i controlli, con tutto il
  resto dentro un `try`/`finally` che la riapre.

  E serve anche il verso opposto: **una chiusura arrivata mentre l'apertura
  era per strada deve invalidarla.** Un contatore che sale a ogni chiusura
  basta — chi si è avviato con il numero vecchio si ferma da sé. Senza,
  nasce una sessione *dopo* la chiusura e resta in ascolto mentre
  l'interfaccia dice "tocchi per parlare".
- **Uscire dall'app per una propria azione non è uscire dall'app.** Impostare
  una sveglia apre l'orologio, quindi una catena di diciassette sveglie fa
  uscire e rientrare l'app diciassette volte. Se ogni uscita chiude la
  conversazione e ogni rientro ne apre una, si smonta e rimonta tutto
  diciassette volte di fila, ed è lì che ogni corsa viene a galla. Mentre le
  azioni girano, l'uscita si ignora — l'app torna davanti da sola — con un
  ricontrollo dopo qualche secondo, perché se invece è rimasta fuori davvero
  il microfono non può restare acceso.
- **Un conteggio a zero non è una diagnosi**, è un'ambiguità: può voler dire
  "il fenomeno non è successo" oppure "quel pezzo di codice non è mai girato".
  Ogni numero mostrato vuole accanto il numero che distingue i due casi — i
  pezzi visti dal microfono e quelli di voce.
- **Microfono e altoparlante nativi sono uno solo per tutta l'app.** Chi li
  spegne deve prima chiedersi se sono ancora suoi: una sessione superata che
  rilascia l'altoparlante lo toglie di sotto a quella viva, e da lì i pezzi di
  voce arrivano e vengono buttati in silenzio — testo a schermo, modello che
  risponde, e niente da sentire. Vale per qualunque risorsa nativa condivisa.

  E accanto al permesso ci vuole la **rete**: l'altoparlante si ricostruisce
  al primo pezzo che lo trova mancante. Un guasto che dura per il resto della
  conversazione diventa così un istante di silenzio, e questo vale anche per
  la causa che non si è ancora trovata — che è il punto di una rete.

### Come si muove l'interfaccia

Una regola sola, e tiene insieme tutto il resto: **il vetro vive solo durante
il movimento.** A riposo ogni cosa è identica a com'era — stessi colori,
stesse misure, nessun velo residuo — perché è da ferma che si legge, e un
pannello perennemente traslucido è un pannello che si fatica a leggere.

- `FoglioLiquido` apre i pannelli: il fondo si vela di vetro smerigliato
  mentre il foglio sale di poco e si apre da 92 a 100 con una molla. Resta
  montato finché l'animazione di chiusura non è finita, altrimenti sparirebbe
  di scatto a metà.
- `TastoLiquido` sostituisce `TouchableOpacity` sui tasti che si premono di
  continuo, ed è **un nodo solo**: l'animazione si aggiunge allo stesso
  premibile che porta lo stile, senza contenitori attorno.

  **Un contenitore in mezzo rompe la schermata**, ed è costato una build.
  Uno stile non descrive solo l'aspetto: dice anche **dove sta la cosa** —
  `position: absolute`, `flex: 1`, i margini — e quelle proprietà valgono
  rispetto al genitore. Infilando un contenitore fra il genitore e il tasto,
  i due tondi in alto (che sono assoluti) si sono messi a posizionarsi
  rispetto a un riquadro di dimensione zero: si vedevano al loro posto e non
  ricevevano più il tocco, perché su Android quello che esce dai confini del
  genitore non viene toccato. Le tre pastiglie in fondo, che si dividono la
  riga con `flex: 1`, si sono accartocciate in un angolo. Vale per qualunque
  componente che avvolga qualcosa di già disposto: **lo stile di disposizione
  non si sposta di nodo.**
- La leva delle modalità si stira nel verso in cui va (`scaleX` in su,
  `scaleY` in giù) e un velo la attraversa: è la stessa idea della goccia che
  si allunga e si ricompone.
- Tutto passa dal driver nativo, quindi si animano **trasformazioni e
  opacità**, mai l'intensità della sfocatura: quella si accende scoprendo un
  `BlurView` già montato.
- Su Android la sfocatura dentro una finestra modale non sempre prende quello
  che c'è sotto. Sotto al vetro resta perciò un velo scuro vero: se il vetro
  non si vede, il pannello si legge lo stesso.
- **Un riquadro scorrevole dentro un altro non scorre**, su Android, senza
  `nestedScrollEnabled`: il gesto se lo prende quello esterno e il contenuto
  lungo resta tagliato senza modo di risalire. Messo quello però si scorre in
  due: il riquadro interno si muove e **la pagina sotto lo segue**. La pagina
  va fermata da sé — `scrollEnabled` a falso appena il dito tocca il riquadro
  — e basta che regga l'istante in cui Android decide chi prende il gesto:
  da lì in poi il riquadro interno se lo tiene da solo fino al distacco. Il
  rilascio non può dipendere dal tocco finale: quando il riquadro interno
  prende il gesto, l'app riceve un annullamento e poi **non riceve più niente**,
  quindi serve anche una sicura a tempo, se no la pagina resta bloccata.
- **Le misure dello schermo stanno in `src/utils/misure.jsx`**, e la regola
  che le tiene insieme è una sola: **sul telefono in verticale i numeri
  restano quelli di sempre** — colonna 380, radar 240, registro 190, risposta
  200. Quella disposizione è confermata e non si tocca. Cambiano solo dove
  prima non c'era niente di pensato: il tablet (lato corto ≥ 600, che è la
  misura con cui Android stessa distingue i due) e il telefono in orizzontale,
  dove i riquadri prendono una quota dell'altezza invece di mangiarsela tutta.
  Chi aggiunge una misura fissa nuova la aggiunge lì, non negli stili.
- **Il radar si ingrandisce con una trasformazione, non rifacendo gli anelli.**
  Sono dieci stili con lo stesso numero dentro, più gli angoli e il braccio:
  rifarli tutti a runtime è il tipo di cosa che rompe una schermata. Una
  trasformazione non cambia lo spazio occupato, quindi glielo si restituisce
  con un margine verticale — negativo quando rimpicciolisce.
- **La rotazione non ricrea la schermata**, perché il manifest elenca già
  `orientation|screenSize|screenLayout` fra i cambi che l'attività gestisce da
  sé. È il motivo per cui la conversazione sopravvive a un giro del tablet:
  senza quella riga Android rifarebbe l'attività da capo e la sessione
  morirebbe a metà frase.
- **Copiare al tocco singolo impedisce di selezionare**: ogni tentativo di
  prendere una parola fa partire la copia di tutto. Copia il doppio tocco.
- La tastiera: il manifest ha `adjustResize`, **e non serve a niente**. Il tema
  è `Theme.EdgeToEdge` e da lì in poi la finestra non si accorcia più: la
  tastiera si apre *sopra* l'applicazione, che resta immobile, e il campo di
  testo sparisce sotto. Lo spazio va fatto a mano — si ascolta
  `keyboardDidShow`, si aggiunge in fondo alla pagina un margine alto quanto la
  tastiera e ci si sposta. E ci vuole una riserva: se l'evento non arriva, lo
  spazio si prende a stima (~42% dell'altezza dello schermo), perché un campo
  di testo invisibile è peggio di un po' di spazio di troppo.

## Cosa si può verificare prima di una build

Qui non c'è né SDK Android né telefono, ma non è vero che non si può
controllare niente:

- **Ricostruire il pacchetto JavaScript**
  (`npx esbuild index.js --bundle --packages=external --loader:.js=jsx`)
  prende import rotti, funzioni che non esistono, stringhe non chiuse.
- **`python3 strumenti/controlla.py`**, sempre, prima di dire che è pronto.
  Fa i tre controlli che il pacchetto **non** fa: che ogni componente usato
  in JSX sia importato o definito nel file, che ogni `styles.X` citato esista
  in `mainStyles.jsx`, e che ogni costante in maiuscolo usata negli stili sia
  davvero dichiarata lì — un colore scritto col nome sbagliato non è un errore
  di compilazione, è una variabile che al momento di leggerla non c'è, e l'app
  muore all'apertura.

  Il primo è costato una build. `esbuild` compila benissimo un `<Pippo/>` che
  non esiste da nessuna parte — per lui è solo una variabile libera — e il
  vuoto si scopre all'apertura della schermata, cioè sul telefono, con l'app
  che si chiude. È successo perché una sostituzione automatica non aveva
  trovato la riga di import che cercava (`{ styles }` con gli spazi invece di
  `{styles}`) e nessuno se n'era accorto: da qui la seconda regola, sotto.
- **Provare le funzioni pure con Node**: SHA-256 e base64 sono stati
  confrontati con l'implementazione di riferimento prima di finire in una
  build.
- **Eseguire davvero** i pezzi di shell dei workflow prima di spingerli: una
  doppia barra rovesciata a fine riga ha già fatto fallire una build.
- **Ogni sostituzione automatica va verificata che abbia davvero sostituito.**
  Modificare i file con uno script è l'unico modo pratico di lavorare qui, ma
  una `replace` che non trova niente non dà errore: restituisce il testo
  identico e tira dritto. Ogni sostituzione vuole la sua verifica — un
  `assert` sul testo cercato prima, o un controllo del risultato dopo — se no
  quello che si è saltato lo scopre lui.
- Quello che **non** si può verificare: il Kotlin (niente SDK) e qualunque
  cosa passi da un WebSocket (bloccati in uscita da questo ambiente, anche
  verso un server di prova).

## Chi fa cosa

lorisz017 lavora **solo dal browser del telefono**: niente ambiente di
sviluppo, niente terminale, nessuna possibilità di modificare file a mano.
Quindi ogni modifica la scrive Claude direttamente su GitHub. Chiedergli di
"aprire un file e cambiare una riga" non è un'opzione.

Il collaudo invece lo può fare solo lui, e ora su **tre telefoni**:

| Telefono | Che parte fa |
|---|---|
| **Xiaomi 17, Android 17** | Il suo. È dove si sviluppa e dove quasi tutto funziona al primo colpo — ed è proprio per questo che non basta |
| **OPPO, Android più vecchio** | Non è suo e non ce l'ha sempre. È lì che sono saltati fuori il doppio input e l'audio muto all'avvio |
| **Un secondo telefono più vecchio** | Quello dove prova l'APK senza chiavi, cioè il primo avvio di chi scarica dalla release |

**I difetti che contano sono usciti tutti sui telefoni che non sono il suo**,
e quasi sempre perché lì le cose sono più lente e una finestra temporale che
sul suo è troppo stretta per contare, lì conta. Quando qualcosa "funziona",
la domanda successiva è: su quale telefono. E quando non si ha in mano quello
che sbaglia, la sola strada è farsi riportare dei numeri — vedi la riga di
diagnosi in Impostazioni → Info.

## Le chiavi API

**Non passano mai dalla conversazione.** Vanno nei Secrets del repository
privato, oppure le scrive lui nell'app. Se serve una chiave nuova, si dice il
nome del secret e dove registrarsi, mai il valore.

**Due strade, e l'ordine conta.** `chiaviService.jsx` legge prima quella
scritta a mano nell'app, poi quella compilata dentro l'APK. Chi si compila
l'app da sé non si accorge di niente: le sue chiavi sono già dentro, l'app
parte e non chiede nulla. Chi installa un APK senza chiavi vede al primo
avvio **una schermata sola con un campo solo** — Gemini — e le altre tre le
aggiunge da Impostazioni → Chiavi quando gli servono.

Da qui discendono tre regole:

- Nessun servizio legge più `process.env` per conto suo: lo fa solo
  `chiaviService`, e lo fa **al momento dell'uso**. Una costante letta
  all'importazione del modulo si fisserebbe prima che l'utente possa scrivere
  la sua chiave.
- Una chiave **non si mostra mai**, nemmeno la propria: le impostazioni
  dicono da dove viene e quanti caratteri ha, non qual è. Una chiave visibile
  è una chiave che finisce in uno screenshot.
- Una chiave mancante non è un guasto da annunciare. Solo Gemini è
  necessaria; Groq, Deepgram e GitHub servono a pezzi che sono spenti o
  facoltativi, e chi non li usa non deve vedere avvisi su di loro.

**Niente servizi che richiedono una fatturazione attiva**, nemmeno se il
piano gratuito basterebbe e la carta non verrebbe mai addebitata. È una
condizione ferma, non una preferenza.

## Le build

Due repository, e servono a due cose diverse:

| Dove | A cosa serve |
|---|---|
| `lorisz017/jarvis-app` (pubblico) | Il codice. Minuti illimitati, ma **nessuna chiave**: le build qui servono solo a verificare che compili |
| `lorisz017/jarvis-app-build` (privato) | Le chiavi e l'APK vero. Scarica `main` dal pubblico, quindi non c'è niente da sincronizzare |

Il workflow del repository privato ha una copia nel pubblico, in
`strumenti/build-apk-privato.yml`: non gira lì — sta fuori da
`.github/workflows/` apposta — e serve per **darlo a qualcun altro**. Chi lo
vuole si crea un repository privato suo, incolla quel file in
`.github/workflows/build-apk.yml` e mette la propria
`EXPO_PUBLIC_GEMINI_API_KEY` nei secret: il codice non lo copia, lo scarica
dal pubblico a ogni build, quindi per aggiornarsi gli basta rilanciare il
workflow. Con la sola chiave Gemini l'app funziona tutta — resta fuori solo
la modalità a comandi, che è spenta di default.

**La release pubblica** è la terza strada, e per chi non è lui è la prima:
`.github/workflows/rilascio.yml` compila l'APK **senza passargli nessun
secret** e lo allega a una release con il numero di versione. Si lancia a
mano, si scrive la versione, e il workflow si ferma se quella versione non è
la stessa che sta in `build.gradle` — una release che dice 3.1 contenendo la
3.0 è peggio che non pubblicarla. Chi scarica non compila niente: installa e
incolla la sua chiave Gemini al primo avvio.

Il giro è questo:

1. Le modifiche si scrivono su **`main`**.
2. La build si lancia sul **repository privato**, e **solo dopo che l'ha
   chiesto lui**. Mai di propria iniziativa, nemmeno quando è ovvio che
   servirà: consuma i suoi minuti ed è lui a decidere quando gli serve un
   APK da installare. Quello che si fa senza chiedere è arrivare pronti —
   codice scritto, controllato e spinto su `main` — e poi dirlo.
   È l'unica build che produce un APK utilizzabile.
3. **Prima di toccare il codice, se una build sta girando la si annulla.**
   Altrimenti diventa carta straccia e i minuti sono buttati.
4. Se una build fallisce, il debug si fa sul **repository pubblico**, che è
   gratuito, per non bruciare la quota mentre si cerca l'errore.
5. Ogni volta che si lancia qualcosa, **si manda il link**.

Verifica preventiva sul repository pubblico **solo** quando si è toccato
codice Kotlin nuovo o il manifest: lì Claude è cieco, non ha l'SDK Android e
non può compilare. Per le modifiche solo JavaScript basta il controllo locale,
che ricostruisce l'intero pacchetto e prende import rotti e funzioni
inesistenti.

## I rami

| Ramo | Significato |
|---|---|
| `main` | Dove si lavora |
| `funzionante` | **L'ultima versione che lorisz017 ha provato sul telefono e che funziona.** Si sposta solo quando lo conferma lui |
| `claude/jarvis-mobile-project-overview-dz4vy7` | Segue `main`, esiste per un controllo automatico |

`funzionante` è l'unico ramo che contiene un'informazione che git da solo non
ha: quale versione è stata davvero provata. Serve a tornare indietro con
certezza invece che a memoria.

**Va spostato appena lui conferma che una build funziona**, senza aspettare
che lo chieda: è il momento in cui l'informazione esiste, e rimandare vuol
dire perderla. Ci va il commit **da cui è stata costruita quella build** —
non l'ultimo di `main`, che nel frattempo si è già mosso. Lo si dice quando
si fa, così sa dove si è fermato il punto sicuro.

Attenzione: tornare indietro col codice **non riporta indietro il telefono**.
Conversazione salvata, preferenze e permessi concessi restano come sono.

## Come si risponde

- **In italiano.** Il README ha due metà, inglese e italiano; quella italiana
  è scritta in forma impersonale, non dando del lei.
- **Ogni messaggio finisce con la lista da testare.** Sempre, anche quando il
  messaggio è breve o non si è toccato codice. Il formato è quello qui sotto
  e l'ha scelto lui: va rispettato, non reinventato ogni volta.
- **Gli orari si scrivono nel suo fuso**, che è due ore avanti rispetto a UTC.
  GitHub mostra tutto in UTC: va tradotto prima di scriverlo.
- **Niente attese a tempo fisso** per aspettare una build: sono tiri a
  indovinare, e se la build finisce prima si resta fermi per niente. Si
  controlla lo stato quando lui scrive.

Le build lanciate da Claude compaiono su GitHub a nome di lorisz017, perché
Claude agisce con la sua autorizzazione e non ha un'identità propria lì
dentro. Non vuol dire che le abbia lanciate lui.

## Il formato della lista da testare

Va in fondo a **ogni** messaggio, così com'è:

```markdown
---

## 📋 DA TESTARE ALLA PROSSIMA BUILD

### [Nome del gruppo]

1. **[Cosa provare]** — [come provarlo, e cosa deve succedere perché sia a posto]
2. **[Cosa provare]** — [...]

### [Un altro gruppo]

3. **[...]** — [...]

### ⏳ In attesa di configurazione

- **`NOME_DEL_SECRET`** → [a cosa serve, e cosa resta fermo senza]
```

Le regole che lo rendono utile invece che decorativo:

- **La numerazione è continua** attraverso i gruppi: 1, 2, 3, 4… non riparte
  da capo a ogni titolo. Serve per poter dire "il punto 4 non funziona".
- **I gruppi si nominano in base al giro in corso** — "La bolla", "Le
  catene", "La voce" — non con etichette fisse.
- **Le cose nuove o rischiose stanno in cima**, le conferme di routine in
  fondo.
- **Ogni punto dice anche come si capisce che è andato bene**, non solo cosa
  toccare. "Deve rispondere con la sua voce restando fuori dall'app" è utile;
  "prova la bolla" non lo è.
- Quando una cosa si sa già rotta, ci va **un gruppo che dice di non
  provarla** e perché: fargli ricollaudare un problema noto è tempo suo
  buttato.
- Se il titolo dice "IN QUESTA BUILD" invece di "ALLA PROSSIMA", è perché la
  build è già pronta da installare.

## I documenti da tenere aggiornati

- **`README.md`** — le due metà vanno tenute allineate fra loro. La sezione
  per chi sviluppa raccoglie le trappole di Android che sono costate tempo:
  vale la pena aggiungerne ogni volta che se ne scopre una.
- **`STATO_FUNZIONI.md`** — cosa funziona, cosa no, e **perché**. La sezione
  "Cosa resta aperto" è quella che conta: ci va la diagnosi, non solo il
  sintomo.

## Cosa è ancora aperto

Lo stato dettagliato sta in `STATO_FUNZIONI.md`; qui la sostanza.

**Funziona e va lasciato stare:** la conversazione continua, la sua voce, le
azioni concatenate, la ricerca, l'interruzione immediata, la bolla, la **vista**
dalla fotocamera e le **immagini allegate**.

Sulle catene: la prova più dura è **diciassette sveglie a mezz'ora fra le 9 e
le 17 in una richiesta sola**, poi rifatta ogni quarto d'ora e ogni dieci
minuti — su un telefono che non è il suo. Le ha messe tutte, ogni volta.
Quella parte non è più in discussione. Una volta sola, al primo tentativo, ne
aveva fatte alcune doppie e altre slittate di un minuto: **non è mai più
successo in decine di prove, e lui ha detto esplicitamente di non intervenire.**
Sta scritto qui perché non venga "corretto" da solo un giorno.

Sulla vista: il ritmo di un fotogramma al secondo e la misura sopra i 640
pixel erano due numeri scelti a tavolino e sono risultati giusti al primo
collaudo — legge le scritte, capisce il contesto e lo racconta con naturalezza.
Non si toccano senza un motivo.

Sul congedo, la regola che ha smesso di sbagliare è una domanda sola: **sta
salutando te, o sta parlando di sé?** Allargare gli esempi allarga il sospetto
e l'app comincia a chiudersi quando uno dice che è stanco. Nel dubbio non
chiudere: chiudere per sbaglio interrompe tutto, non chiudere costa una frase.

**Confermato sul telefono** (versione 3.0.0): la memoria personale in tutte e
due le metà, il campo di testo dentro la conversazione, la voce spegnibile, il
riconoscimento del creatore, l'icona nuova, la riservatezza delle istruzioni —
che ha retto anche alle richieste di traverso — i tasti e le pastiglie dopo la
correzione del contenitore, i pannelli in vetro, il riepilogo d'apertura detto
dalla conversazione con la sua voce, il congedo sullo scambio di saluti e sui
commiati non espliciti, e **le immagini allegate** in tutte le loro parti:
miniatura, invio con la domanda, domande successive sulla stessa immagine.
Confermato anche il giro successivo: il congedo non si chiude più su "sono
stanco, vado a letto io", il riquadro della risposta scorre e si seleziona, e
il registro non taglia più le risposte.

**Confermato nella 3.2.0**, sui telefoni che non sono il suo: una conversazione
sola anche dopo le catene lunghe, l'audio che si sente al primo tentativo,
l'interruzione parlandogli sopra, lo scorrimento dei riquadri con la pagina
ferma, e la tastiera che lascia vedere il campo di testo. Il numero
*Conversazioni aperte* in Info conta le aperture **dall'avvio dell'app**, non
quelle vive adesso: 4 dopo una serata di prove è normale, quello che
preoccuperebbe è vederlo salire di molti colpi dopo **una** catena.

**Da confermare** (la 3.2.0):

- che in conversazione **non si senta più la voce di sistema** sopra la sua,
  quando un'azione conferma quello che ha fatto;
- che le impostazioni riordinate stiano in piedi, con le chiavi in fondo sotto
  *Configurazione*.

**Ancora aperto davvero:**

- **"Chiave non valida" con una chiave valida, e risposte lente**, su due
  dispositivi con l'APK pubblico (il suo tablet e il telefono di un amico) e
  mai sul telefono di sviluppo. Non è il processore: sono tutti telefoni e
  tablet di fascia altissima. L'unica differenza certa è che sull'APK pubblico
  la chiave arriva solo da quella scritta a mano. Le cause possibili danno le
  stesse parole — chiave vuota arrivata a Google, chiave appena creata che si
  sta ancora propagando, limite del piano gratuito — e **non si è tentata
  nessuna correzione**: l'app riporta in Info i numeri che le separano (secondi
  di vita, lunghezza e forma della chiave, chiusure non volute, attesa della
  risposta). **Prima si leggono quelli.**

  **E dopo, in quest'ordine, perché l'ha chiesto lui:** trovata e corretta la
  causa, si sposta `funzionante` sul commit della build che lui conferma, e si
  pubblica una **release nuova** — versione alzata nei quattro posti, poi
  *Pubblica una release*. È scritto qui perché la conversazione si sta
  riempiendo e non deve perdersi.

- **La voce di Edge non è più un problema aperto, e non va rimessa in lista.**
  Non parla e si sente la riserva, ma la sintesi vocale riguarda solo la
  modalità a comandi, che ora è un ripiego dietro un interruttore: in
  conversazione la voce è il modello stesso. Resta scritto qui perché è già
  stato affrontato, non perché serva ricollaudarlo. Se un giorno la modalità
  a comandi tornasse in primo piano, il piano B è Speechify o Cartesia.
- **`EXPO_PUBLIC_GITHUB_TOKEN_KEY`** non è mai stata configurata: i tre
  comandi GitHub sono fermi lì.
- **`groq/compound-mini` è deprecato** — sta in `jarvisService.jsx` come
  modello della ricerca, che è solo della modalità a comandi. Groq lo ritira,
  quindi va sostituito; non è urgente perché quel pezzo è spento di default,
  ma il giorno che smette di rispondere la ricerca a comandi muore in
  silenzio. Era stato rimandato per non invalidare una build in corso.

Cose decise, da non rimettere in discussione:

- **La voce della conversazione non va cambiata**, nemmeno per proporre di
  meglio. È quella che voleva dall'inizio.
- **La modalità a comandi non si cancella.** Ha detto che si potrebbe
  togliere del tutto, ma la conclusione è stata un'altra: sparisce
  dall'interfaccia, resta nel codice e si riaccende da un interruttore. Il
  motivo è che è l'unica strada che non passa da Gemini: il giorno che il
  modello Live non risponde — è in anteprima — quella è la differenza fra
  un'app più lenta e un'app morta. Lo ha ripetuto anche dopo ("piano piano
  andrà a morire"), come previsione e non come richiesta: la **voce di
  sistema** invece è sparita dall'interfaccia su sua richiesta — la pastiglia
  VOCE è diventata BOLLA — ma resta nel codice come ultima riserva della
  modalità a comandi, che senza non parlerebbe.
- Per lo stesso motivo **Groq e Deepgram restano**. Non servono a niente
  finché tutto funziona: sono lì proprio per quando qualcosa non funzionerà.

## Una cosa imparata a caro prezzo

Quando qualcosa non funziona fuori dall'app, o dentro una sessione che non si
può ispezionare, **la prima mossa non è tentare una correzione: è farsi dire
il motivo.** Tre problemi di questo progetto sono rimasti aperti per giorni e
si sono chiusi in un colpo appena l'app ha cominciato a riportare l'errore
esatto invece di fallire in silenzio — il limite di token di Groq, il campo
deprecato della sessione vocale, il permesso del servizio in primo piano.

Una correzione tentata alla cieca costa una build da venti minuti e una sera.
Una riga di diagnostica costa lo stesso e dice quale correzione fare.
