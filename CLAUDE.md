# Come si lavora su questo progetto

Appunti di lavoro fra lorisz017 e Claude. Non è documentazione del codice —
per quella ci sono `README.md` e `STATO_FUNZIONI.md`. Qui stanno le cose che
altrimenti vivrebbero solo nella conversazione, e che si perdono quando la
conversazione viene compattata.

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
2. La build si lancia sul **repository privato**. È l'unica che produce un
   APK utilizzabile, e l'unica che consuma i suoi minuti.
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

Attenzione: tornare indietro col codice **non riporta indietro il telefono**.
Conversazione salvata, preferenze e permessi concessi restano come sono.

## Come si risponde

- **In italiano.** Il README ha due metà, inglese e italiano; quella italiana
  è scritta in forma impersonale, non dando del lei.
- **Ogni messaggio finisce con la lista `📋 DA TESTARE ALLA PROSSIMA BUILD`**,
  divisa per argomento, con in fondo la sezione `⏳ In attesa di
  configurazione` per le chiavi mancanti. È il formato che ha scelto lui.
- **Gli orari si scrivono nel suo fuso**, che è due ore avanti rispetto a UTC.
  GitHub mostra tutto in UTC: va tradotto prima di scriverlo.
- **Niente attese a tempo fisso** per aspettare una build: sono tiri a
  indovinare, e se la build finisce prima si resta fermi per niente. Si
  controlla lo stato quando lui scrive.

Le build lanciate da Claude compaiono su GitHub a nome di lorisz017, perché
Claude agisce con la sua autorizzazione e non ha un'identità propria lì
dentro. Non vuol dire che le abbia lanciate lui.

## I documenti da tenere aggiornati

- **`README.md`** — le due metà vanno tenute allineate fra loro. La sezione
  per chi sviluppa raccoglie le trappole di Android che sono costate tempo:
  vale la pena aggiungerne ogni volta che se ne scopre una.
- **`STATO_FUNZIONI.md`** — cosa funziona, cosa no, e **perché**. La sezione
  "Cosa resta aperto" è quella che conta: ci va la diagnosi, non solo il
  sintomo.

## Una cosa imparata a caro prezzo

Quando qualcosa non funziona fuori dall'app, o dentro una sessione che non si
può ispezionare, **la prima mossa non è tentare una correzione: è farsi dire
il motivo.** Tre problemi di questo progetto sono rimasti aperti per giorni e
si sono chiusi in un colpo appena l'app ha cominciato a riportare l'errore
esatto invece di fallire in silenzio — il limite di token di Groq, il campo
deprecato della sessione vocale, il permesso del servizio in primo piano.

Una correzione tentata alla cieca costa una build da venti minuti e una sera.
Una riga di diagnostica costa lo stesso e dice quale correzione fare.
