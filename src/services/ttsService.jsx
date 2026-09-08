import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer } from 'expo-audio';

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

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

let currentPlayer = null;

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

    // Il testo compare subito: con l'audio generato da Gemini non esiste
    // l'evento "onBoundary" che faceva scorrere il testo parola per parola.
    setDisplayedText(text);
    scrollRef?.current?.scrollToEnd({ animated: true });

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

        // PCM grezzo -> file WAV riproducibile
        const wavBase64 = buildWavHeaderBase64(base64ByteLength(pcmBase64)) + pcmBase64;
        const fileUri = `${FileSystem.cacheDirectory}jarvis-voice-${Date.now()}.wav`;

        await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        stopJarvisVoice();

        // Il player precedente non serve più: si libera qui, dove al suo
        // posto ne arriva subito uno nuovo.
        try {
            currentPlayer?.remove();
        } catch (e) {
            console.warn('Rilascio player precedente:', e);
        }

        currentPlayer = createAudioPlayer({ uri: fileUri });
        currentPlayer.play();
    } catch (err) {
        console.error('Gemini TTS error:', err);
        // Se la voce di Gemini non funziona (quota esaurita, rete assente,
        // modello non disponibile) l'assistente parla comunque, con la voce
        // di sistema.
        speakWithDeviceVoice(text, { scrollRef, setDisplayedText });
    }
};
