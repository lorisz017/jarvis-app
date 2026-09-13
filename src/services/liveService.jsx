import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {TOOLS, executeTool} from './tools';
import {SYSTEM_MESSAGE} from '../utils/constants';
import {base64ToBytes} from '../utils/base64';

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

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';
const LIVE_URL =
    'wss://generativelanguage.googleapis.com/ws/' +
    'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Gemini ascolta a 16 kHz e risponde a 24 kHz: sono i due formati che il
// modulo nativo produce e consuma.
const MIME_INVIO = 'audio/pcm;rate=16000';

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

export const isLiveSupported = () => Boolean(audio && geminiApiKey);

/**
 * Zittisce subito la voce della conversazione, lasciando la sessione aperta.
 *
 * Serve al pulsante FERMA, che finora conosceva solo la voce sintetizzata:
 * nella conversazione continua l'audio non passa da lì, quindi premerlo non
 * faceva niente. Qui la sessione resta in piedi e si può continuare a
 * parlare: si zittisce quello che stava dicendo, non la conversazione.
 */
export function flushLiveAudio() {
    try {
        audio?.flushPlayback();
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
        this.staParlando = false;
        this.pezziSopraSoglia = 0;
        // Con la voce spenta la conversazione continua a funzionare, ma non
        // si sente: l'audio arriva e viene scartato invece che suonato, e
        // resta la trascrizione a schermo.
        this.muta = false;
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

    async start() {
        if (!isLiveSupported()) {
            this.onErrore(new Error('La conversazione continua richiede Android e una chiave Gemini'));
            return false;
        }

        this.onStato('connessione');
        this.chiusaVolutamente = false;

        try {
            await audio.startPlayback();
        } catch (error) {
            this.onErrore(error);
            return false;
        }

        this.socket = new WebSocket(`${LIVE_URL}?key=${geminiApiKey}`);

        this.socket.onopen = () => this._mandaConfigurazione();
        this.socket.onmessage = (evento) => this._riceviMessaggio(evento);
        this.socket.onerror = (evento) => {
            this.onErrore(new Error(evento?.message || 'Connessione interrotta'));
        };

        this.socket.onclose = (evento) => {
            const eraPronta = this.pronta;
            this.pronta = false;
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

            this.onStato('chiusa');
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
                systemInstruction: {parts: [{text: SYSTEM_MESSAGE.content}]},
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
            // come dati binari: in quel caso vanno letti prima.
            const grezzo = typeof evento.data === 'string'
                ? evento.data
                : await new Response(evento.data).text();
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
            this._zittisci();
        }

        if (contenuto?.turnComplete || contenuto?.generationComplete) {
            this.staParlando = false;
        }

        if (contenuto?.inputTranscription?.text) {
            this.onTesto({chi: 'utente', testo: contenuto.inputTranscription.text});
        }

        if (contenuto?.outputTranscription?.text) {
            this.onTesto({chi: 'jarvis', testo: contenuto.outputTranscription.text});
        }

        for (const parte of contenuto?.modelTurn?.parts || []) {
            const suono = parte.inlineData?.data;
            if (suono && !this.muta) {
                this.staParlando = true;
                this.pezziSopraSoglia = 0;
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
            if (!this.pronta) return;

            // Si misura solo mentre sta parlando: per il resto del tempo
            // sarebbe lavoro sprecato dieci volte al secondo.
            if (this.staParlando) {
                if (livello(base64) >= SOGLIA_VOCE) {
                    this.pezziSopraSoglia += 1;
                    if (this.pezziSopraSoglia >= PEZZI_CONSECUTIVI) this._zittisci();
                } else {
                    this.pezziSopraSoglia = 0;
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
        this.staParlando = false;
        this.pezziSopraSoglia = 0;
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
