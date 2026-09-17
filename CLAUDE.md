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
| `src/services/tools.jsx` | Le 21 azioni: schema per il modello ed esecuzione |
| `src/services/ttsService.jsx` | La catena della voce e il pareggiamento del volume |
| `src/services/edgeTtsService.jsx` | La voce di Edge |
| `src/services/webSearchService.jsx` | Ricerca via DuckDuckGo, con lettura delle pagine |
| `src/services/deviceActions.jsx` | Sveglie, timer, meteo, calendario |
| `src/services/overlayService.jsx` | Il ponte con la bolla nativa |
| `src/services/memoryService.jsx` | La memoria personale: la nota e i ricordi |
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

Il collaudo invece lo può fare solo lui: l'app gira sul suo telefono, uno
**Xiaomi 17 con Android 17**, ed è l'unico dispositivo su cui questo progetto
sia mai stato provato.

## Le chiavi API

**Non passano mai dalla conversazione.** Vanno solo nei Secrets del
repository privato. Se serve una chiave nuova, si dice il nome del secret e
dove registrarsi, mai il valore.

**Niente servizi che richiedono una fatturazione attiva**, nemmeno se il
piano gratuito basterebbe e la carta non verrebbe mai addebitata. È una
condizione ferma, non una preferenza.

## Le build

Due repository, e servono a due cose diverse:

| Dove | A cosa serve |
|---|---|
| `lorisz017/jarvis-app` (pubblico) | Il codice. Minuti illimitati, ma **nessuna chiave**: le build qui servono solo a verificare che compili |
| `lorisz017/jarvis-app-build` (privato) | Le chiavi e l'APK vero. Scarica `main` dal pubblico, quindi non c'è niente da sincronizzare |

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
azioni concatenate, la ricerca, l'interruzione immediata, la bolla, e **la
vista** — confermata al primo collaudo: legge le scritte, capisce il contesto
e lo racconta con naturalezza. Il ritmo di un fotogramma al secondo e la
misura sopra i 640 pixel erano due numeri scelti a tavolino e sono risultati
giusti: non si toccano senza un motivo.

**Confermato sul telefono** (versione 3.0.0): la memoria personale in tutte e
due le metà, il campo di testo dentro la conversazione, la voce spegnibile, il
registro che segue la conversazione senza rubare lo scorrimento, il
riconoscimento del creatore, l'icona nuova, la riservatezza delle istruzioni —
che ha retto anche alle richieste di traverso — e i sei difetti della serata
del collaudo.

**Confermato anche**: i tasti in alto e le tre pastiglie dopo la correzione
del contenitore, i pannelli che si aprono col vetro, e il congedo — che chiude
l'app davvero.

**Da confermare**: il congedo su un commiato non esplicito ("a domani",
"ciao") e sullo scambio di saluti — chiudeva tagliando la seconda frase — più
il riepilogo d'apertura detto dalla conversazione con la sua voce.

**Ancora aperto davvero:**

- **La voce di Edge non è più un problema aperto, e non va rimessa in lista.**
  Non parla e si sente la riserva, ma la sintesi vocale riguarda solo la
  modalità a comandi, che ora è un ripiego dietro un interruttore: in
  conversazione la voce è il modello stesso. Resta scritto qui perché è già
  stato affrontato, non perché serva ricollaudarlo. Se un giorno la modalità
  a comandi tornasse in primo piano, il piano B è Speechify o Cartesia.
- **`EXPO_PUBLIC_GITHUB_TOKEN_KEY`** non è mai stata configurata: i tre
  comandi GitHub sono fermi lì.

Cose decise, da non rimettere in discussione:

- **La voce della conversazione non va cambiata**, nemmeno per proporre di
  meglio. È quella che voleva dall'inizio.
- **La modalità a comandi non si cancella.** Ha detto che si potrebbe
  togliere del tutto, ma la conclusione è stata un'altra: sparisce
  dall'interfaccia, resta nel codice e si riaccende da un interruttore. Il
  motivo è che è l'unica strada che non passa da Gemini: il giorno che il
  modello Live non risponde — è in anteprima — quella è la differenza fra
  un'app più lenta e un'app morta.
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
