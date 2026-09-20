import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {TOOLS, executeTool} from './tools';
import {decodeUtf8} from '../utils/utf8';
import {buildSystemMessage} from '../utils/constants';
import {base64ToBytes} from '../utils/base64';
import {chiave} from './chiaviService';

// Conversazione a voce con Gemini, in tempo reale.
//
// È una strada diversa da quella normale dell'app. Finora il giro era:
// registri un file, lo mandi a trascrivere, mandi il testo a un modello,
// prendi la risposta scritta e la fai leggere da una voce sintetica. Quattro
// passaggi, quattro attese, e una voce che legge un testo scritto da un
// altro.
//
// Qui c'è un modello solo che ascolta la voce e risponde con la propria,
// mentre parli. Niente trascrizione, niente sintesi: la voce è sua. È il
// motivo per cui l'assistente desktop da cui è nato questo progetto suona
// meglio, e non era una questione di quale servizio scegliere.
//
// La conversazione viaggia su una connessione aperta che resta viva per tutta
// la sessione, con l'audio spedito a pezzi mentre lo dici.

const audio = Platform.OS === 'android' ? NativeModules.JarvisAudio : null;
const emettitore = audio ? new NativeEventEmitter(audio) : null;


const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';
const LIVE_URL =
    'wss://generativelanguage.googleapis.com/ws/' +
    'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Gemini ascolta a 16 kHz e risponde a 24 kHz: sono i due formati che il
// modulo nativo produce e consuma.
const MIME_INVIO = 'audio/pcm;rate=16000';
const MIME_FOTOGRAMMA = 'image/jpeg';

// Il primo tentativo mandava l'audio dentro "mediaChunks", e il server
// chiudeva la sessione dopo un secondo dicendo che quel campo non si usa più:
// va messo direttamente in "audio". Era l'intero motivo per cui la
// conversazione moriva appena si cominciava a parlare.

const VOCE = 'Charon';

// === Interruzione immediata ===
//
// Il server si accorge da solo che l'utente ha ripreso a parlare e lo
// segnala, ma ci mette il tempo di ascoltare e decidere. In una
// conversazione vera quel ritardo si sente: si comincia a parlare e l'altro
// va avanti ancora per un istante.
//
// Qui la si riconosce sul posto, misurando quanto suona forte quello che
// entra dal microfono mentre J.A.R.V.I.S. sta parlando. Serve prudenza: una
// soglia troppo bassa e si interrompe da solo sentendo la propria voce. Due
// difese — la registrazione usa la sorgente da telefonata, che porta la
// cancellazione dell'eco, e non basta un singolo colpo: ci vogliono due
// pezzi di fila sopra la soglia, cioè un quinto di secondo di voce vera.
//
// La soglia è 0,04 e non di più: la voce vera ha un valore efficace molto più
// basso di quanto sembri a orecchio, perché è fatta di picchi separati da
// pause, mentre un suono continuo della stessa intensità misura il triplo.
// Con 0,06 un parlato pacato non sarebbe bastato a interrompere, e non
// interrompere è il difetto peggiore dei due.
const SOGLIA_VOCE = 0.04;
const PEZZI_CONSECUTIVI = 2;

// Ma una soglia fissa presuppone che il telefono cancelli l'eco. Parecchi non
// lo fanno — e non sono i telefoni vecchi, è proprio una cosa che cambia da
// modello a modello — e lì l'app si sente parlare forte quanto una persona:
// si interrompe da sola a ogni parola che dice, e quello che se ne sente è
// una voce a scatti che salta avanti.
//
// Il rimedio è misurare **quanto forte l'app sente sé stessa** su questo
// telefono e alzare la soglia di conseguenza. Dove l'eco è cancellato il
// pavimento resta quasi a zero e comanda la soglia fissa, come prima; dove
// non lo è, il pavimento sale e con lui la soglia.
const MARGINE_ECO = 2.5;
// Sale piano e scende in fretta: un pavimento che sale di colpo si porterebbe
// dietro anche la voce vera, e da lì in poi non si interromperebbe più niente.
const SALITA_ECO = 0.12;
const DISCESA_ECO = 0.35;
// Oltre questa soglia non si sale comunque: un telefono che si sente urlare
// addosso alzerebbe l'asticella fino a rendere impossibile interromperlo, e
// non poter interrompere è il difetto peggiore dei due.
const SOGLIA_MASSIMA = 0.25;
// E si parte prudenti invece che da zero: partendo da zero, su un telefono che
// non cancella l'eco le prime parole di ogni sessione sono già abbastanza per
// far scattare l'interruzione, prima che il pavimento abbia avuto il tempo di
// accorgersi di dov'è. Dove l'eco è cancellato questo valore scende da sé nel
// giro di un decimo di secondo, perché il pavimento scende molto più in fretta
// di quanto salga.
const PAVIMENTO_INIZIALE = 0.05;

// Quanto microfono si tiene da parte mentre J.A.R.V.I.S. parla: mezzo secondo
// scarso, che è quello che si perderebbe delle prime parole di chi lo
// interrompe.
const PEZZI_ARRETRATI = 4;

// Quanti byte al secondo escono dall'altoparlante: 24 kHz a 16 bit.
const BYTE_AL_SECONDO = 24000 * 2;

// === Che cosa è successo in questa sessione ===
//
// Se la voce esce a pezzi su un telefono che non si ha in mano, tentare
// correzioni alla cieca costa una build per volta. Questi numeri stanno in
// Impostazioni → Info e dicono quale delle due cose sta succedendo: se l'app
// si interrompe da sola (pavimento dell'eco alto, interruzioni locali che
// salgono da sole) oppure se è il server a troncare i turni.
// I tre conteggi dei pezzi servono a distinguere fra loro tre cose che da
// fuori si somigliano: un microfono che non parte, una voce che non arriva, e
// un'app che tiene il microfono fuori dal filo. Senza, un pavimento a zero può
// voler dire sia "l'eco non c'è" sia "quel pezzo di codice non è mai girato",
// e sono diagnosi opposte.
const conteggi = {
    pezziMicrofono: 0,
    pezziVoce: 0,
    pezziTrattenuti: 0,
    interruzioniLocali: 0,
    interruzioniServer: 0,
    pavimentoEco: 0,
};

export function statisticheLive() {
    return {...conteggi};
}

export async function diagnosticaAudio() {
    try {
        return await audio?.diagnosticaAudio();
    } catch (error) {
        return null;
    }
}

/** Quanto suona forte un pezzo di audio PCM a 16 bit. */
function livello(base64) {
    const bytes = base64ToBytes(base64);
    const fine = bytes.length - (bytes.length % 2);
    if (!fine) return 0;

    let somma = 0;
    for (let i = 0; i < fine; i += 2) {
        let campione = bytes[i] | (bytes[i + 1] << 8);
        if (campione > 32767) campione -= 65536;
        somma += campione * campione;
    }

    return Math.sqrt(somma / (fine / 2)) / 32768;
}

export const isLiveSupported = () => Boolean(audio && chiave('gemini'));

/**
 * Zittisce subito la voce della conversazione, lasciando la sessione aperta.
 *
 * Serve al pulsante FERMA, che finora conosceva solo la voce sintetizzata:
 * nella conversazione continua l'audio non passa da lì, quindi premerlo non
 * faceva niente. Qui la sessione resta in piedi e si può continuare a
 * parlare: si zittisce quello che stava dicendo, non la conversazione.
 */
// L'unica sessione aperta in questo momento, se ce n'è una.
let sessioneCorrente = null;

export function flushLiveAudio() {
    try {
        // Passando dalla sessione si azzera anche il conto di quanto le resta
        // da dire: svuotare solo l'altoparlante la lascerebbe convinta che
        // stia ancora parlando, e con quella convinzione tiene il microfono
        // fuori dal filo.
        if (sessioneCorrente) sessioneCorrente._zittisci();
        else audio?.flushPlayback();
    } catch (error) {
        console.warn('Interruzione della voce continua:', error);
    }
}

// Gli stessi strumenti della modalità normale, nella forma che vuole Gemini.
function dichiarazioniStrumenti() {
    return TOOLS.map(({function: f}) => {
        const dichiarazione = {name: f.name, description: f.description};
        const proprieta = f.parameters?.properties || {};

        if (Object.keys(proprieta).length) {
            const properties = {};
            for (const [nome, campo] of Object.entries(proprieta)) {
                properties[nome] = {
                    type: String(campo.type || 'string').toUpperCase(),
                    description: campo.description || '',
                };
            }
            dichiarazione.parameters = {
                type: 'OBJECT',
                properties,
                required: f.parameters.required || [],
            };
        }

        return dichiarazione;
    });
}

export class LiveSession {
    /**
     * @param {object} opzioni
     * @param {function} opzioni.onStato   'connessione' | 'attiva' | 'chiusa'
     * @param {function} opzioni.onTesto   trascrizione di chi parla: {chi, testo}
     * @param {function} opzioni.onErrore
     * @param {object}   opzioni.contesto  quello che serve a eseguire le azioni
     */
    constructor({onStato, onTesto, onErrore, contesto}) {
        this.onStato = onStato || (() => {});
        this.onTesto = onTesto || (() => {});
        this.onErrore = onErrore || (() => {});
        this.contesto = contesto || {};

        this.socket = null;
        this.iscrizioneMicrofono = null;
        this.pronta = false;
        this.chiusaVolutamente = false;
        // Fino a quando l'altoparlante avrà finito di parlare. Non è la stessa
        // cosa di "il server ha finito di generare": Gemini manda il turno
        // molto più in fretta di quanto si ascolti, e quando smette di mandare
        // ce ne sono ancora secondi da sentire. Contare la fine della
        // generazione voleva dire credere finita una frase ancora a metà.
        this.fineVoce = 0;
        this.pezziSopraSoglia = 0;
        this.pavimentoEco = PAVIMENTO_INIZIALE;
        // Il microfono degli ultimi istanti, tenuto da parte mentre parla lui.
        this.arretrato = [];
        // Con la voce spenta la conversazione continua a funzionare, ma non
        // si sente: l'audio arriva e viene scartato invece che suonato, e
        // resta la trascrizione a schermo.
        this.muta = false;
    }

    /**
     * Sta parlando adesso? Lo dice l'altoparlante, non il server.
     */
    get staParlando() {
        return Date.now() < this.fineVoce;
    }

    /** Accende o spegne la voce senza chiudere la conversazione. */
    setMuta(muta) {
        this.muta = Boolean(muta);
        if (this.muta) this._zittisci();
    }

    /**
     * Manda una frase scritta dentro la conversazione.
     *
     * Serve quando non si può parlare. Non è una modalità a parte: entra
     * nella stessa sessione, con la stessa memoria, e la risposta torna a
     * voce come tutte le altre.
     */
    sendText(testo) {
        const pulito = String(testo || '').trim();
        if (!pulito || !this.pronta) return false;

        // Quello che stava dicendo va zittito: chi scrive mentre l'altro
        // parla si aspetta di essere ascoltato, esattamente come chi parla.
        this._zittisci();

        this._invia({
            clientContent: {
                turns: [{role: 'user', parts: [{text: pulito}]}],
                turnComplete: true,
            },
        });

        return true;
    }

    /**
     * Manda un fotogramma di quello che vede la fotocamera.
     *
     * Va nello stesso canale della voce e con la stessa forma — `video` sta
     * accanto ad `audio` dentro `realtimeInput` — quindi il modello riceve le
     * due cose come un flusso solo e può rispondere a "questo cos'è?" senza
     * che nessuno gli spieghi a cosa si riferisce "questo".
     *
     * Un fotogramma al secondo: è quanto consiglia il modello, e di più
     * sarebbe soltanto banda buttata.
     */
    /**
     * Manda un'immagine dentro la conversazione, con una frase se c'è.
     *
     * Diversa dai fotogrammi della fotocamera: quelli passano e non restano,
     * questa entra nel filo del discorso come un turno vero. Resta quindi
     * nella memoria della sessione, e le domande successive — "e questo
     * pezzo?", "cosa c'è scritto sotto?" — trovano ancora l'immagine lì.
     */
    sendImage(base64, mimeType = 'image/jpeg', testo = '') {
        if (!base64 || !this.pronta) return false;

        this._zittisci();

        const parti = [{inlineData: {mimeType, data: base64}}];
        const pulito = String(testo || '').trim();
        if (pulito) parti.push({text: pulito});

        this._invia({
            clientContent: {turns: [{role: 'user', parts: parti}], turnComplete: true},
        });

        return true;
    }

    sendFrame(base64) {
        if (!base64 || !this.pronta) return false;
        this._invia({realtimeInput: {video: {mimeType: MIME_FOTOGRAMMA, data: base64}}});
        return true;
    }

    async start() {
        if (!isLiveSupported()) {
            this.onErrore(new Error('La conversazione continua richiede Android e una chiave Gemini'));
            return false;
        }

        this.onStato('connessione');
        this.chiusaVolutamente = false;
        sessioneCorrente = this;

        try {
            await audio.startPlayback();
        } catch (error) {
            this.onErrore(error);
            return false;
        }

        this.socket = new WebSocket(`${LIVE_URL}?key=${chiave('gemini')}`);
        // Meglio i byte grezzi che un Blob: da un ArrayBuffer si decodifica
        // l'UTF-8 per conto proprio, che è l'unico modo per non perdere le
        // accentate per strada.
        try {
            this.socket.binaryType = 'arraybuffer';
        } catch (error) {
            // Non tutte le implementazioni lo lasciano scegliere: si legge
            // comunque, passando dal Blob.
        }

        this.socket.onopen = () => this._mandaConfigurazione();
        this.socket.onmessage = (evento) => this._riceviMessaggio(evento);
        this.socket.onerror = (evento) => {
            this.onErrore(new Error(evento?.message || 'Connessione interrotta'));
        };

        this.socket.onclose = (evento) => {
            const eraPronta = this.pronta;
            this.pronta = false;
            this.fineVoce = 0;
            if (sessioneCorrente === this) sessioneCorrente = null;
            this._fermaMicrofono();
            audio?.stopPlayback();

            // Quando il server rifiuta qualcosa non manda un errore: chiude e
            // basta, e il motivo sta tutto nel codice di chiusura e nella
            // riga che lo accompagna. Senza leggerli, una sessione che muore
            // dopo un secondo è indistinguibile da una che non parte affatto
            // — che è esattamente com'era al collaudo.
            if (!this.chiusaVolutamente) {
                const codice = evento?.code ?? 'ignoto';
                const motivo = (evento?.reason || '').trim();
                this.onErrore(new Error(
                    `Sessione chiusa dal server (codice ${codice})` +
                    (motivo ? `: ${motivo}` : eraPronta
                        ? ', senza motivo indicato, dopo che era già attiva'
                        : ', senza motivo indicato, prima di diventare attiva')
                ));
            }

            this.onStato('chiusa', {volontaria: this.chiusaVolutamente});
        };

        return true;
    }

    _mandaConfigurazione() {
        this._invia({
            setup: {
                model: LIVE_MODEL,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {prebuiltVoiceConfig: {voiceName: VOCE}},
                    },
                },
                // Si costruisce adesso e non all'avvio dell'app: se durante la
                // conversazione precedente ha annotato qualcosa, questa deve
                // saperlo già.
                systemInstruction: {parts: [{text: buildSystemMessage().content}]},
                tools: [{functionDeclarations: dichiarazioniStrumenti()}],
                // Le trascrizioni delle due voci servono a riempire il
                // registro attività: senza, a schermo non resterebbe traccia
                // di quello che ci si è detti.
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        });
    }

    async _riceviMessaggio(evento) {
        let messaggio;
        try {
            // I messaggi arrivano come testo JSON, ma su alcune connessioni
            // come dati binari. Vanno decodificati come UTF-8 **a mano**: la
            // conversione che React Native fa da sola legge ogni byte come un
            // carattere, e ogni accentata — che di byte ne occupa due — esce
            // spezzata in due simboli ("perché" diventa "perchÃ©").
            const grezzo = typeof evento.data === 'string'
                ? evento.data
                : decodeUtf8(evento.data instanceof ArrayBuffer
                    ? evento.data
                    : await new Response(evento.data).arrayBuffer());
            messaggio = JSON.parse(grezzo);
        } catch (error) {
            return;
        }

        // Il server segnala i problemi anche dentro i messaggi, non solo
        // chiudendo: se c'è, questo è il motivo scritto a lettere.
        if (messaggio.error) {
            this.onErrore(new Error(
                messaggio.error.message || JSON.stringify(messaggio.error)
            ));
            return;
        }

        if (messaggio.setupComplete) {
            this.pronta = true;
            this.onStato('attiva');
            this._avviaMicrofono();
            return;
        }

        const contenuto = messaggio.serverContent;

        if (contenuto?.interrupted) {
            // Se l'ha notato il server, si butta comunque quello che resta.
            conteggi.interruzioniServer += 1;
            this._zittisci();
        }

        // Il turno finito non spegne la voce: quello che è già stato mandato
        // all'altoparlante deve ancora uscire, e finché esce lui sta parlando.

        if (contenuto?.inputTranscription?.text) {
            this.onTesto({chi: 'utente', testo: contenuto.inputTranscription.text});
        }

        if (contenuto?.outputTranscription?.text) {
            this.onTesto({chi: 'jarvis', testo: contenuto.outputTranscription.text});
        }

        for (const parte of contenuto?.modelTurn?.parts || []) {
            const suono = parte.inlineData?.data;
            if (suono && !this.muta) {
                conteggi.pezziVoce += 1;
                if (!this.staParlando) this.arretrato = [];
                // Quanto dura questo pezzo, una volta suonato. Da base64 a
                // byte si scende di un quarto.
                const durata = ((suono.length * 3) / 4 / BYTE_AL_SECONDO) * 1000;
                this.fineVoce = Math.max(this.fineVoce, Date.now()) + durata;
                audio?.playChunk(suono);
            }
        }

        if (messaggio.toolCall?.functionCalls?.length) {
            await this._eseguiAzioni(messaggio.toolCall.functionCalls);
        }
    }

    async _eseguiAzioni(chiamate) {
        const risposte = [];

        for (const chiamata of chiamate) {
            let esito;
            try {
                esito = await executeTool(chiamata.name, chiamata.args || {}, this.contesto);
            } catch (error) {
                esito = `Non sono riuscito a completare "${chiamata.name}": ${error.message}`;
            }

            this.onTesto({chi: 'azione', testo: esito});
            risposte.push({
                id: chiamata.id,
                name: chiamata.name,
                response: {risultato: esito},
            });
        }

        this._invia({toolResponse: {functionResponses: risposte}});
    }

    _avviaMicrofono() {
        if (this.iscrizioneMicrofono) return;

        this.iscrizioneMicrofono = emettitore.addListener('jarvisAudioChunk', (base64) => {
            conteggi.pezziMicrofono += 1;
            if (!this.pronta) return;

            // Si misura solo mentre sta parlando: per il resto del tempo
            // sarebbe lavoro sprecato dieci volte al secondo.
            if (this.staParlando) {
                const forza = livello(base64);
                const soglia = Math.min(
                    SOGLIA_MASSIMA,
                    Math.max(SOGLIA_VOCE, this.pavimentoEco * MARGINE_ECO)
                );

                if (forza >= soglia) {
                    this.pezziSopraSoglia += 1;
                } else {
                    this.pezziSopraSoglia = 0;
                }

                const peso = forza > this.pavimentoEco ? SALITA_ECO : DISCESA_ECO;
                this.pavimentoEco = this.pavimentoEco * (1 - peso) + forza * peso;
                conteggi.pavimentoEco = this.pavimentoEco;

                if (this.pezziSopraSoglia < PEZZI_CONSECUTIVI) {
                    // Mentre parla lui il microfono non va sul filo. Se la
                    // cancellazione dell'eco non tiene, quello che arriverebbe
                    // al modello è la sua stessa voce: si interrompe da solo,
                    // risponde a sé stesso, e quello che si sente è un discorso
                    // che si accavalla. Si tiene da parte, e se poi si scopre
                    // che a parlare era davvero qualcuno, glielo si manda
                    // tutto insieme senza perdere le prime parole.
                    conteggi.pezziTrattenuti += 1;
                    this.arretrato.push(base64);
                    if (this.arretrato.length > PEZZI_ARRETRATI) this.arretrato.shift();
                    return;
                }

                conteggi.interruzioniLocali += 1;
                // Si prende prima di zittire, che lo svuota.
                const daMandare = this.arretrato;
                this._zittisci();

                for (const vecchio of daMandare) {
                    this._invia({
                        realtimeInput: {audio: {mimeType: MIME_INVIO, data: vecchio}},
                    });
                }
            }

            this._invia({
                realtimeInput: {audio: {mimeType: MIME_INVIO, data: base64}},
            });
        });

        audio.startCapture().catch((error) => this.onErrore(error));
    }

    /** Zittisce subito quello che sta uscendo e dimentica il resto del turno. */
    _zittisci() {
        this.fineVoce = 0;
        this.pezziSopraSoglia = 0;
        this.arretrato = [];
        audio?.flushPlayback();
    }

    _fermaMicrofono() {
        this.iscrizioneMicrofono?.remove();
        this.iscrizioneMicrofono = null;
        audio?.stopCapture();
    }

    _invia(oggetto) {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify(oggetto));
    }

    stop() {
        this.chiusaVolutamente = true;
        this.pronta = false;
        this._fermaMicrofono();
        audio?.stopPlayback();

        try {
            this.socket?.close();
        } catch (error) {
            // Già chiusa.
        }
        this.socket = null;
    }
}
