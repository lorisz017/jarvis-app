import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer } from 'expo-audio';

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const deepgramApiKey = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak';
const DEEPGRAM_MODELS_URL = 'https://api.deepgram.com/v1/models';

// Voce italiana scelta dall'utente nelle impostazioni, nella forma
// aura-2-<nome>-it. Vuota significa "decidi tu": l'app prende la prima delle
// voci italiane disponibili.
let preferredVoice = '';

// Modello TTS di Gemini e voce predefinita.
// Voci disponibili (30+): Charon, Puck, Kore, Fenrir, Aoede, Zephyr, Leda,
// Orus, Enceladus, Iapetus, Algieba, Schedar, Sadachbia, Achird...
// Charon e Fenrir sono le più profonde/maschili, adatte a J.A.R.V.I.S.
const TTS_MODEL = 'gemini-3.1-flash-tts-preview';
const TTS_VOICE = 'Charon';

// Gemini restituisce audio PCM grezzo a 24 kHz, mono, 16 bit.
// Android non sa riprodurre il PCM nudo: va incapsulato in un file WAV.
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Codifica in base64 un array di byte. Serve solo per l'intestazione WAV
// (poche decine di byte), quindi è velocissimo.
function bytesToBase64(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        out += B64_CHARS[b0 >> 2];
        out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
        out += B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)];
        out += B64_CHARS[b2 & 63];
    }
    return out;
}

// Costruisce l'intestazione WAV. È lunga 54 byte (44 standard + un chunk
// "JUNK" di riempimento da 10): un multiplo di 3, così la sua codifica base64
// si può concatenare direttamente a quella del PCM senza dover decodificare
// e ricodificare centinaia di kilobyte di audio.
function buildWavHeaderBase64(pcmByteLength) {
    const header = new Uint8Array(54);
    const view = new DataView(header.buffer);
    let p = 0;

    const writeAscii = (str) => {
        for (let i = 0; i < str.length; i++) header[p++] = str.charCodeAt(i);
    };

    const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
    const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

    writeAscii('RIFF');
    view.setUint32(p, 46 + pcmByteLength, true); p += 4; // dimensione totale - 8
    writeAscii('WAVE');

    writeAscii('fmt ');
    view.setUint32(p, 16, true); p += 4;              // dimensione chunk fmt
    view.setUint16(p, 1, true); p += 2;               // formato: PCM
    view.setUint16(p, NUM_CHANNELS, true); p += 2;
    view.setUint32(p, SAMPLE_RATE, true); p += 4;
    view.setUint32(p, byteRate, true); p += 4;
    view.setUint16(p, blockAlign, true); p += 2;
    view.setUint16(p, BITS_PER_SAMPLE, true); p += 2;

    // Chunk di riempimento, ignorato da qualsiasi lettore WAV
    writeAscii('JUNK');
    view.setUint32(p, 2, true); p += 4;
    view.setUint16(p, 0, true); p += 2;

    writeAscii('data');
    view.setUint32(p, pcmByteLength, true); p += 4;

    return bytesToBase64(header);
}

// Quanti byte rappresenta una stringa base64
function base64ByteLength(b64) {
    let padding = 0;
    if (b64.endsWith('==')) padding = 2;
    else if (b64.endsWith('=')) padding = 1;
    return (b64.length / 4) * 3 - padding;
}

// === Pareggiamento del volume ===
//
// Le voci di Deepgram non sono incise tutte allo stesso livello: alcune si
// sentono bene, altre costringono ad alzare il telefono al massimo per
// capire cosa dicono. Non c'è un parametro per chiederle più forti, e il
// volume del lettore non può salire sopra il massimo del dispositivo, quindi
// l'unico modo è alzare il guadagno dell'audio prima di riprodurlo.
//
// Si misura quanto suona in media lo spezzone (il valore efficace, non il
// picco: è quello che l'orecchio percepisce come "volume") e lo si porta a un
// livello di riferimento uguale per tutte le voci. Chi è già abbastanza alto
// resta com'è: il guadagno non scende mai sotto 1.
const TARGET_RMS = 0.12;
const MAX_GAIN = 4;

const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;

function base64ToBytes(b64) {
    const puliti = b64.replace(/[^A-Za-z0-9+/]/g, '');
    const gruppi = puliti.length >> 2;
    const coda = puliti.length & 3;
    const bytes = new Uint8Array(gruppi * 3 + (coda === 3 ? 2 : coda === 2 ? 1 : 0));
    let i = 0;
    let p = 0;

    for (let g = 0; g < gruppi; g++) {
        const n =
            (B64_LOOKUP[puliti.charCodeAt(i++)] << 18) |
            (B64_LOOKUP[puliti.charCodeAt(i++)] << 12) |
            (B64_LOOKUP[puliti.charCodeAt(i++)] << 6) |
            B64_LOOKUP[puliti.charCodeAt(i++)];
        bytes[p++] = n >> 16;
        bytes[p++] = (n >> 8) & 255;
        bytes[p++] = n & 255;
    }

    if (coda >= 2) {
        const c0 = B64_LOOKUP[puliti.charCodeAt(i++)];
        const c1 = B64_LOOKUP[puliti.charCodeAt(i++)];
        bytes[p++] = (c0 << 2) | (c1 >> 4);
        if (coda === 3) bytes[p++] = ((c1 & 15) << 4) | (B64_LOOKUP[puliti.charCodeAt(i)] >> 2);
    }

    return bytes;
}

// Come bytesToBase64, ma regge una lunghezza qualsiasi (aggiunge il
// riempimento finale) e costruisce il risultato a pezzi invece che
// concatenando centinaia di migliaia di volte una stringa che cresce.
function pcmToBase64(bytes) {
    const pezzi = [];
    const n = bytes.length;
    const interi = n - (n % 3);

    for (let i = 0; i < interi; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        pezzi.push(
            B64_CHARS[b0 >> 2] +
            B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
            B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] +
            B64_CHARS[b2 & 63]
        );
    }

    const resto = n - interi;
    if (resto === 1) {
        const b0 = bytes[n - 1];
        pezzi.push(`${B64_CHARS[b0 >> 2]}${B64_CHARS[(b0 & 3) << 4]}==`);
    } else if (resto === 2) {
        const b0 = bytes[n - 2];
        const b1 = bytes[n - 1];
        pezzi.push(
            `${B64_CHARS[b0 >> 2]}${B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)]}${B64_CHARS[(b1 & 15) << 2]}=`
        );
    }

    return pezzi.join('');
}

// Deepgram dovrebbe restituire il PCM nudo, ma se dovesse arrivare dentro un
// contenitore WAV si salta l'intestazione cercando il blocco "data": meglio
// che riprodurre l'intestazione come se fosse audio.
function pcmStart(bytes) {
    if (bytes.length < 12) return 0;
    const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (!riff) return 0;

    for (let i = 12; i + 8 <= bytes.length; i++) {
        if (bytes[i] === 0x64 && bytes[i + 1] === 0x61 && bytes[i + 2] === 0x74 && bytes[i + 3] === 0x61) {
            return i + 8;
        }
    }
    return 44;
}

// Alza il volume di uno spezzone PCM a 16 bit e lo restituisce in base64.
// I campioni si leggono byte per byte invece che con Int16Array: così non
// dipende da dove inizia l'audio né da come il dispositivo ordina i byte.
function normalizePcmBase64(pcmBase64) {
    const bytes = base64ToBytes(pcmBase64);
    const inizio = pcmStart(bytes);
    const fine = bytes.length - ((bytes.length - inizio) % 2);

    let somma = 0;
    let campioni = 0;

    for (let i = inizio; i < fine; i += 2) {
        let s = bytes[i] | (bytes[i + 1] << 8);
        if (s > 32767) s -= 65536;
        somma += s * s;
        campioni++;
    }

    if (!campioni) return pcmToBase64(bytes.subarray(inizio));

    const rms = Math.sqrt(somma / campioni) / 32768;
    // Silenzio quasi totale: non c'è niente da alzare, e dividere per un
    // valore vicino a zero darebbe un guadagno assurdo.
    if (rms < 0.0005) return pcmToBase64(bytes.subarray(inizio));

    const guadagno = Math.min(Math.max(TARGET_RMS / rms, 1), MAX_GAIN);
    if (guadagno <= 1.01) return pcmToBase64(bytes.subarray(inizio));

    for (let i = inizio; i < fine; i += 2) {
        let s = bytes[i] | (bytes[i + 1] << 8);
        if (s > 32767) s -= 65536;

        s = Math.round(s * guadagno);
        // I picchi che escono dalla scala si appiattiscono qui: su una voce
        // parlata sono pochi e brevi, e si sentono molto meno di quanto si
        // senta una voce troppo bassa.
        if (s > 32767) s = 32767;
        else if (s < -32768) s = -32768;

        bytes[i] = s & 255;
        bytes[i + 1] = (s >> 8) & 255;
    }

    return pcmToBase64(bytes.subarray(inizio));
}

// Scrive uno spezzone PCM come file WAV riproducibile, pareggiandone prima
// il volume, e restituisce il percorso del file.
async function writeWavFile(pcmBase64) {
    const pareggiato = normalizePcmBase64(pcmBase64);
    const wavBase64 = buildWavHeaderBase64(base64ByteLength(pareggiato)) + pareggiato;
    const fileUri = `${FileSystem.cacheDirectory}jarvis-voice-${Date.now()}.wav`;

    await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
}

let currentPlayer = null;
let currentFileUri = null;

// Riproduce un file audio già scritto su disco, sostituendo quello in corso.
async function playAudioFile(fileUri) {
    stopJarvisVoice();

    // Il player precedente non serve più: si libera qui, dove al suo posto ne
    // arriva subito uno nuovo.
    try {
        currentPlayer?.remove();
    } catch (e) {
        console.warn('Rilascio player precedente:', e);
    }

    // Il file appena sostituito si cancella: l'audio non compresso pesa
    // qualche centinaio di kilobyte a frase, e la cache non si svuota da sé.
    if (currentFileUri && currentFileUri !== fileUri) {
        FileSystem.deleteAsync(currentFileUri, {idempotent: true}).catch(() => {});
    }
    currentFileUri = fileUri;

    currentPlayer = createAudioPlayer({ uri: fileUri });
    currentPlayer.play();
}

// I dati binari che tornano da Deepgram vanno scritti su file, e FileSystem
// scrive testo: la conversione in base64 la fa FileReader, che è nativo e
// quindi non blocca l'interfaccia come farebbe un ciclo in JavaScript su
// centinaia di kilobyte.
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Conversione audio fallita'));
        reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// Nome del modello vocale, chiesto a Deepgram invece che scritto a mano: i
// nomi delle voci italiane non sono documentati pubblicamente e cambiano nel
// tempo, così non c'è niente da cercare né da aggiornare. Si risolve una
// volta per avvio dell'app e poi resta in memoria.
let resolvedVoice;
let availableVoiceNames = [];

// Serve al pannello impostazioni per mostrare quale voce è in uso e quali
// altre ci sono: sul telefono i messaggi di log non sono consultabili.
export const getVoiceInfo = () => ({
    selected: resolvedVoice ?? null,
    available: availableVoiceNames,
    hasKey: Boolean(deepgramApiKey),
});

// Sceglie fra le voci già note: la preferita se c'è ancora, altrimenti la
// prima disponibile.
function pickVoice() {
    return availableVoiceNames.find((nome) => nome === preferredVoice) || availableVoiceNames[0] || null;
}

// Cambia voce senza ricompilare: la scelta ha effetto dalla frase successiva.
// Passando una stringa vuota si torna alla scelta automatica.
export const setPreferredVoice = (voiceName) => {
    preferredVoice = voiceName || '';
    // L'elenco delle voci è già in memoria: si ripesca da lì, senza rifare
    // la chiamata di rete a ogni cambio.
    if (availableVoiceNames.length) resolvedVoice = pickVoice();
};

async function resolveDeepgramVoice() {
    if (resolvedVoice !== undefined) return resolvedVoice;

    try {
        const response = await fetch(DEEPGRAM_MODELS_URL, {
            headers: { Authorization: `Token ${deepgramApiKey}` },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const nomi = (data.tts || [])
            .map((model) => model.canonical_name || model.name || '')
            .filter((nome) => nome.startsWith('aura-2') && nome.endsWith('-it'));

        availableVoiceNames = nomi;
        resolvedVoice = pickVoice();

        if (!resolvedVoice) {
            console.warn('Nessuna voce italiana Aura-2 trovata su Deepgram');
        }
    } catch (error) {
        console.warn('Elenco voci Deepgram non raggiungibile:', error.message);
        resolvedVoice = preferredVoice || null;
    }

    return resolvedVoice;
}

// Voce principale: Deepgram Aura-2. Il credito iniziale vale milioni di
// caratteri e non scade, quindi regge l'uso quotidiano — al contrario di
// Gemini, che si esaurisce dopo pochi scambi ravvicinati.
async function speakWithDeepgram(text) {
    if (!deepgramApiKey) return false;

    const voce = await resolveDeepgramVoice();
    if (!voce) return false;

    // Si chiede l'audio non compresso (PCM a 16 bit, 24 kHz, senza
    // contenitore) invece dell'MP3 predefinito: l'MP3 andrebbe decodificato
    // per poterne alzare il volume, il PCM è già la forma d'onda.
    const parametri = `model=${voce}&encoding=linear16&sample_rate=${SAMPLE_RATE}&container=none`;

    const response = await fetch(`${DEEPGRAM_URL}?${parametri}`, {
        method: 'POST',
        headers: {
            Authorization: `Token ${deepgramApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Deepgram HTTP ${response.status} ${detail}`.trim());
    }

    const base64 = await blobToBase64(await response.blob());

    await playAudioFile(await writeWavFile(base64));
    return true;
}

// Ferma la voce in corso, qualunque delle due sia: quella di sistema o
// l'audio generato da Gemini.
//
// Qui si mette solo in pausa, senza rimuovere il player: rimuoverlo lo rende
// inutilizzabile e sembra lasciare l'audio in uno stato da cui le
// riproduzioni successive non si sentono più — era il motivo per cui, dopo
// aver zittito JARVIS una volta, riattivando la voce non tornava a parlare.
// La rimozione avviene invece quando si crea il player successivo, dove il
// vecchio è ormai davvero da buttare.
export const stopJarvisVoice = () => {
    try {
        Speech.stop();
    } catch (e) {
        console.warn('Stop voce di sistema:', e);
    }

    try {
        currentPlayer?.pause();
    } catch (e) {
        console.warn('Pausa voce Gemini:', e);
    }
};

// Ripiego sulla voce di sistema se Gemini TTS non è disponibile
const speakWithDeviceVoice = (text, { scrollRef, setDisplayedText }) => {
    Speech.speak(text, {
        language: 'it-IT',
        rate: 0.9,
        pitch: 1.1,
        onStart: () => setDisplayedText(''),
        onBoundary: ({ charIndex, charLength }) => {
            setDisplayedText(text.substring(0, charIndex + charLength));
            scrollRef?.current?.scrollToEnd({ animated: true });
        },
        onDone: () => {
            setDisplayedText(text);
            scrollRef?.current?.scrollToEnd({ animated: true });
        },
        onError: (e) => {
            console.error('TTS error:', e);
            setDisplayedText(text);
        },
    });
};

export const speakJarvisResponse = async ({
                                              text,
                                              selectedVoiceId,
                                              availableVoices,
                                              scrollRef,
                                              setDisplayedText,
                                              setSelectedVoiceId,
                                              englishVoiceId,
                                              russianVoiceId,
                                          }) => {
    if (!text) return;

    // Il testo compare subito: con l'audio generato non esiste l'evento
    // "onBoundary" che faceva scorrere il testo parola per parola.
    setDisplayedText(text);
    scrollRef?.current?.scrollToEnd({ animated: true });

    // Si prova prima la voce migliore e si scende di livello solo se fallisce,
    // così l'assistente non resta mai muto: Deepgram, poi Gemini, infine la
    // voce di sistema del telefono.
    try {
        if (await speakWithDeepgram(text)) return;
    } catch (err) {
        console.warn('Voce Deepgram non disponibile, passo a Gemini:', err.message);
    }

    if (!geminiApiKey) {
        speakWithDeviceVoice(text, { scrollRef, setDisplayedText });
        return;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Leggi con voce calma, sicura e leggermente formale, come un maggiordomo britannico d'élite: ${text}`,
                        }],
                    }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: TTS_VOICE },
                            },
                        },
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini TTS Error');
        }

        const pcmBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!pcmBase64) {
            throw new Error('Nessun audio restituito da Gemini TTS');
        }

        // PCM grezzo -> file WAV riproducibile, al volume di riferimento
        await playAudioFile(await writeWavFile(pcmBase64));
    } catch (err) {
        console.error('Gemini TTS error:', err);
        // Se la voce di Gemini non funziona (quota esaurita, rete assente,
        // modello non disponibile) l'assistente parla comunque, con la voce
        // di sistema.
        speakWithDeviceVoice(text, { scrollRef, setDisplayedText });
    }
};
