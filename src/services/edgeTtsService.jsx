import {sha256} from '../utils/sha256';
import {bytesToBase64} from '../utils/base64';

// Voce di Microsoft Edge.
//
// È il motore che legge le pagine ad alta voce dentro Edge: voci neurali,
// qualità alta, italiano vero. Non chiede chiavi né registrazione.
//
// Va detto chiaramente: questo è un accesso **non ufficiale**. Non esiste una
// API pubblica documentata, e il servizio è pensato per essere usato dal
// browser. Funziona, lo usano in molti, ma può smettere di funzionare da un
// giorno all'altro senza preavviso e senza che sia colpa di nessuno. Per
// questo Deepgram resta sotto: se questa strada si chiude, l'assistente
// continua a parlare.

const TOKEN_CLIENT = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VERSIONE = '1-130.0.2849.68';
const BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

// Voci italiane. Diego è la più adatta a J.A.R.V.I.S.: maschile, pacata,
// senza l'enfasi da lettura pubblicitaria delle altre.
export const VOCI_EDGE = [
    {id: 'it-IT-DiegoNeural', nome: 'Diego'},
    {id: 'it-IT-GiuseppeMultilingualNeural', nome: 'Giuseppe'},
    {id: 'it-IT-IsabellaNeural', nome: 'Isabella'},
    {id: 'it-IT-ElsaNeural', nome: 'Elsa'},
];

const VOCE_PREDEFINITA = VOCI_EDGE[0].id;

const TIMEOUT_MS = 20000;

// Il servizio vuole una firma che cambia nel tempo: il conteggio dei
// centesimi di microsecondo dal 1601, arrotondato ai cinque minuti, unito al
// token del client e passato per SHA-256.
function firma() {
    const ticks = Math.floor((Date.now() / 1000 + 11644473600) * 10000000);
    const arrotondati = ticks - (ticks % 3000000000);
    return sha256(`${arrotondati}${TOKEN_CLIENT}`).toUpperCase();
}

function intestazione(percorso, richiesta) {
    const quando = new Date().toString();
    return `X-RequestId:${richiesta}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${quando}Z\r\nPath:${percorso}\r\n\r\n`;
}

// Le parentesi angolari e la e commerciale romperebbero il documento.
function proteggi(testo) {
    return String(testo)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function costruisciSsml(testo, voce) {
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='it-IT'>` +
        `<voice name='${voce}'>` +
        `<prosody pitch='-2Hz' rate='+4%' volume='+0%'>${proteggi(testo)}</prosody>` +
        `</voice></speak>`;
}

function identificativo() {
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

/**
 * Restituisce l'audio parlato in base64 (MP3), o lancia un errore.
 */
export function synthesizeWithEdge(testo, voce = VOCE_PREDEFINITA) {
    return new Promise((resolve, reject) => {
        const richiesta = identificativo();
        const url = `${BASE}?TrustedClientToken=${TOKEN_CLIENT}` +
            `&Sec-MS-GEC=${firma()}&Sec-MS-GEC-Version=${VERSIONE}`;

        let socket;
        try {
            socket = new WebSocket(url, undefined, {
                headers: {
                    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                        '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                },
            });
        } catch (error) {
            reject(error);
            return;
        }

        socket.binaryType = 'arraybuffer';

        const pezzi = [];
        let totale = 0;
        let concluso = false;

        const scadenza = setTimeout(() => {
            chiudi();
            reject(new Error('La voce Edge non ha risposto in tempo'));
        }, TIMEOUT_MS);

        function chiudi() {
            clearTimeout(scadenza);
            try {
                socket.close();
            } catch (e) {
                // Già chiusa.
            }
        }

        function concludi() {
            if (concluso) return;
            concluso = true;
            chiudi();

            if (!totale) {
                reject(new Error('La voce Edge non ha restituito audio'));
                return;
            }

            const audio = new Uint8Array(totale);
            let p = 0;
            for (const pezzo of pezzi) {
                audio.set(pezzo, p);
                p += pezzo.length;
            }
            resolve(bytesToBase64(audio));
        }

        socket.onopen = () => {
            socket.send(
                `X-Timestamp:${new Date().toString()}\r\n` +
                'Content-Type:application/json; charset=utf-8\r\n' +
                'Path:speech.config\r\n\r\n' +
                JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataoptions: {
                                    sentenceBoundaryEnabled: 'false',
                                    wordBoundaryEnabled: 'false',
                                },
                                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                            },
                        },
                    },
                })
            );

            socket.send(intestazione('ssml', richiesta) + costruisciSsml(testo, voce));
        };

        socket.onmessage = (evento) => {
            const dato = evento.data;

            if (typeof dato === 'string') {
                // I messaggi di testo sono avvisi di stato: l'unico che conta
                // dice che il turno è finito e l'audio è tutto arrivato.
                if (dato.includes('Path:turn.end')) concludi();
                return;
            }

            // I messaggi binari cominciano con la lunghezza dell'intestazione
            // su due byte, poi l'intestazione, poi l'audio vero.
            const bytes = new Uint8Array(dato);
            if (bytes.length < 2) return;

            const lunghezzaIntestazione = (bytes[0] << 8) | bytes[1];
            const inizioAudio = 2 + lunghezzaIntestazione;
            if (inizioAudio >= bytes.length) return;

            const pezzo = bytes.subarray(inizioAudio);
            pezzi.push(pezzo);
            totale += pezzo.length;
        };

        socket.onerror = () => {
            clearTimeout(scadenza);
            if (!concluso) reject(new Error('Voce Edge: connessione non riuscita'));
        };

        socket.onclose = (evento) => {
            clearTimeout(scadenza);
            if (concluso) return;

            // Se è arrivato dell'audio prima della chiusura lo si tiene: la
            // frase c'è, manca solo il saluto finale.
            if (totale) {
                concludi();
                return;
            }

            const codice = evento?.code ?? 'ignoto';
            const motivo = (evento?.reason || '').trim();
            reject(new Error(
                `Voce Edge non disponibile (codice ${codice})${motivo ? `: ${motivo}` : ''}`
            ));
        };
    });
}
