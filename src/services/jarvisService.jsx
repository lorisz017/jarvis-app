import {Alert} from 'react-native';
import {scheduleReminder, parseSecondsFromPhrase, parseReminderDetails} from './notificationsService';
import {getLatestCommits} from "../core/github/commits";
import {createGitHubRepo} from "../core/github/createRepo";
import {deleteGitHubRepo} from "../core/github/deleteRepo";

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
const CHAT_MODEL = 'openai/gpt-oss-120b';
// Compound: stesso formato di chiamata, ma cerca davvero sul web prima di
// rispondere (notizie, fatti attuali, prezzi) invece di affidarsi solo a
// quello che il modello sa "a memoria".
const SEARCH_MODEL = 'groq/compound';

if (!groqApiKey) {
    Alert.alert('Groq API Key Missing', 'Please set your Groq API key in app.json');
}

function stripMarkdown(text) {
    return text
        .replace(/[*~`#>-]+/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/^\s*\n/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{2,}/g, '\n');
}

function chooseModelByText(text) {
    const searchKeywords = [
        'cerca', 'trova', 'chi è', 'chi ha', 'cos\'è', 'cosa significa',
        'notizie', 'ultime notizie', 'oggi è successo', 'quanto costa',
        'chi ha vinto', 'risultato', 'classifica', 'prezzo di',
    ];

    const lowerText = text.toLowerCase();

    return searchKeywords.some(keyword => lowerText.includes(keyword))
        ? SEARCH_MODEL
        : CHAT_MODEL;
}

// === Logica condivisa: elabora un messaggio dell'utente (testo puro), sia
// che provenga dalla trascrizione audio sia che sia stato digitato in chat.
// Tutta la gestione dei comandi (sveglia, meteo, calendario, GitHub, ecc.)
// vive qui, in un unico posto. ===
async function handleUserMessage(userMessage, {
    chatHistory,
    setChatHistory,
    setDisplayedText,
    setJarvisResponseText,
    speak,
    openCamera,
    openYoutube,
    openTelegram,
    setNativeAlarm,
    setNativeTimer,
    getWeatherByCity,
    createCalendarEvent,
    setIsLoading,
}) {
    try {
        const parsed = parseReminderDetails(userMessage);

        if (userMessage.toLowerCase().includes('ricorda') && parsed) {
            const {reminderText, seconds} = parsed;

            setDisplayedText(`Signore, promemoria impostato: "${reminderText}" tra ${Math.floor(seconds / 60)} minuti.`);
            setJarvisResponseText(`Signore, promemoria impostato: "${reminderText}" tra ${Math.floor(seconds / 60)} minuti.`);
            await speak(`Signore, promemoria impostato: ${reminderText} tra ${Math.floor(seconds / 60)} minuti.`);
            await scheduleReminder(reminderText, seconds);
            setIsLoading(false);
            return;
        }

        setDisplayedText(`Lei ha detto: "${userMessage}"\nJARVIS sta pensando...`);
        setJarvisResponseText(`Lei ha detto: "${userMessage}"\nJARVIS sta pensando...`);

        const updatedHistory = [...chatHistory, {role: 'user', content: userMessage}];
        setChatHistory(updatedHistory);

        const chosenModel = chooseModelByText(userMessage);

        // === Risposta del modello ===
        const completion = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: chosenModel,
                messages: updatedHistory,
            }),
        });

        const responseData = await completion.json();

        if (!completion.ok) {
            throw new Error(responseData.error?.message || 'Groq Chat Error');
        }

        const jarvisReply = stripMarkdown(responseData.choices?.[0]?.message?.content) || '...';

        setChatHistory([...updatedHistory, {role: 'assistant', content: jarvisReply}]);


        if (jarvisReply.toLowerCase().includes('open_camera')) {
            setJarvisResponseText('Signore, apro la fotocamera...');
            setDisplayedText('Signore, apro la fotocamera...');
            await speak('Signore, apro la fotocamera.');
            await openCamera();
            return;
        }

        if (jarvisReply.toLowerCase().includes('open_telegram')) {
            setJarvisResponseText('Signore, apro Telegram...');
            setDisplayedText('Signore, apro Telegram...');
            await openTelegram();
            return;
        }

        if (jarvisReply.toLowerCase().includes('open_youtube')) {
            const parts = jarvisReply.split('open_youtube');
            const query = parts[1]?.trim();
            const speakText = query
                ? `Signore, apro YouTube per la ricerca: ${query}...`
                : 'Signore, apro YouTube...';

            setJarvisResponseText(speakText);
            setDisplayedText(speakText);
            await openYoutube(query);
            return;
        }

        // === Sveglia nativa ===
        if (jarvisReply.toLowerCase().startsWith('set_alarm')) {
            const match = jarvisReply.match(/set_alarm\s+(\d{1,2}):(\d{2})\s*(.*)/i);
            if (!match) {
                await speak('Signore, non ho capito a che ora impostare la sveglia.');
                return;
            }
            const [, hour, minute, label] = match;
            try {
                await setNativeAlarm(parseInt(hour, 10), parseInt(minute, 10), label.trim() || 'JARVIS');
                const msg = `Signore, sveglia impostata per le ${hour}:${minute}.`;
                setDisplayedText(msg);
                setJarvisResponseText(msg);
                await speak(msg);
            } catch (error) {
                const errText = `Non sono riuscito a impostare la sveglia: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        // === Timer nativo ===
        if (jarvisReply.toLowerCase().startsWith('set_timer')) {
            const match = jarvisReply.match(/set_timer\s+(\d+)\s*(.*)/i);
            if (!match) {
                await speak('Signore, non ho capito la durata del timer.');
                return;
            }
            const [, seconds, label] = match;
            try {
                await setNativeTimer(parseInt(seconds, 10), label.trim() || 'JARVIS');
                const secs = parseInt(seconds, 10);
                const humanTime = secs >= 60 ? `${Math.round(secs / 60)} minuti` : `${secs} secondi`;
                const msg = `Signore, timer impostato per ${humanTime}.`;
                setDisplayedText(msg);
                setJarvisResponseText(msg);
                await speak(msg);
            } catch (error) {
                const errText = `Non sono riuscito a impostare il timer: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        // === Meteo ===
        if (jarvisReply.toLowerCase().startsWith('get_weather')) {
            const city = jarvisReply.replace(/get_weather/i, '').trim();
            if (!city) {
                await speak('Signore, per quale città desidera il meteo?');
                return;
            }
            try {
                const weatherText = await getWeatherByCity(city);
                setDisplayedText(weatherText);
                setJarvisResponseText(weatherText);
                await speak(weatherText);
            } catch (error) {
                const errText = `Non sono riuscito a recuperare il meteo: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        // === Evento calendario ===
        // Formato atteso dal modello: create_calendar_event GIORNO HH:MM Titolo
        // dove GIORNO è: oggi, domani, oppure un giorno della settimana.
        if (jarvisReply.toLowerCase().startsWith('create_calendar_event')) {
            const match = jarvisReply.match(/create_calendar_event\s+(\S+)\s+(\d{1,2}):(\d{2})\s+(.*)/i);
            if (!match) {
                await speak('Signore, non ho capito data, ora o titolo dell\'evento.');
                return;
            }
            const [, dayWord, hour, minute, title] = match;
            try {
                const eventDate = await createCalendarEvent(dayWord, parseInt(hour, 10), parseInt(minute, 10), title.trim());
                const msg = `Signore, ho aggiunto "${title.trim()}" al calendario per ${eventDate}.`;
                setDisplayedText(msg);
                setJarvisResponseText(msg);
                await speak(msg);
            } catch (error) {
                const errText = `Non sono riuscito a creare l'evento: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        if (jarvisReply.toLowerCase().includes('ricorda') && parseSecondsFromPhrase(jarvisReply)) {
            const seconds = parseSecondsFromPhrase(jarvisReply);
            const reminderText = jarvisReply.replace(/.*ricorda.*(tra.*)/i, '').trim() || 'un promemoria';
            const confirmation = `Signore, promemoria impostato: "${reminderText}" tra ${Math.floor(seconds > 60 ? (seconds / 60) : seconds)} ${seconds > 60 ? "minuti." : "secondi."}`;

            setDisplayedText(confirmation);
            setJarvisResponseText(confirmation);
            await speak(confirmation);
            await scheduleReminder(reminderText, seconds);
            return;
        }

        if (jarvisReply.toLowerCase().startsWith('create_github_repo')) {
            const repoName = jarvisReply.replace('create_github_repo', '').trim();
            if (!repoName) {
                await speak('Signore, non ho sentito bene il nome del repository.');
                return;
            }

            try {
                const repoUrl = await createGitHubRepo({name: repoName});
                const responseText = `Signore, il repository ${repoName} è stato creato con successo. ${repoUrl}`;
                console.log(repoName);
                setDisplayedText(responseText);
                setJarvisResponseText(responseText);
                await speak(responseText);
            } catch (error) {
                const errText = `Impossibile creare il repository: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        if (jarvisReply.toLowerCase().startsWith('delete_github_repo')) {
            const repoName = jarvisReply.replace('delete_github_repo', '').trim();
            if (!repoName) {
                await speak('Signore, non ho capito quale repository eliminare.');
                return;
            }

            try {
                const confirmed = await new Promise((resolve) => {
                    Alert.alert(
                        'Conferma eliminazione',
                        `È sicuro di voler eliminare il repository: ${repoName}?`,
                        [
                            {text: 'Annulla', style: 'cancel', onPress: () => resolve(false)},
                            {text: 'Elimina', style: 'destructive', onPress: () => resolve(true)},
                        ],
                    );
                });

                if (!confirmed) {
                    await speak('Eliminazione annullata, signore.');
                    return;
                }

                const deleted = await deleteGitHubRepo('lorisz017', repoName);
                if (deleted) {
                    const msg = `Signore, il repository ${repoName} è stato eliminato con successo.`;
                    setJarvisResponseText(msg);
                    setDisplayedText(msg);
                    await speak(msg);
                }
            } catch (error) {
                const errText = `Impossibile eliminare il repository: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }

            return;
        }

        if (jarvisReply.toLowerCase().startsWith('get_latest_commits')) {
            const number = parseInt(jarvisReply.replace('get_latest_commits', '').trim()) || 5;
            try {
                const commits = await getLatestCommits(number);
                if (!commits.length) {
                    await speak("Signore, non è stato trovato nessun commit.");
                    return;
                }

                const commitMessages = commits.map(
                    c => `— ${c.author}: ${c.message.split('\n')[0]}`
                ).join('\n');

                const responseText = `Signore, ecco gli ultimi commit:\n${commitMessages}`;
                setDisplayedText(responseText);
                setJarvisResponseText(responseText);
                await speak(responseText);
            } catch (error) {
                const errText = `Impossibile recuperare i commit: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        setJarvisResponseText(jarvisReply);
        await speak(jarvisReply);
    } catch (err) {
        console.error('Jarvis error:', err);
        setJarvisResponseText('Si è verificato un errore durante l\'elaborazione del messaggio.');
        setDisplayedText('Si è verificato un errore durante l\'elaborazione del messaggio.');
        Alert.alert('Errore', err.message);
    } finally {
        setIsLoading(false);
    }
}

export const processAudioWithOpenAI = async ({
                                                 audioUri,
                                                 chatHistory,
                                                 setChatHistory,
                                                 setDisplayedText,
                                                 setJarvisResponseText,
                                                 speak,
                                                 openCamera,
                                                 openYoutube,
                                                 openTelegram,
                                                 setNativeAlarm,
                                                 setNativeTimer,
                                                 getWeatherByCity,
                                                 createCalendarEvent,
                                                 setIsLoading,
                                             }) => {
    setIsLoading(true);
    setJarvisResponseText('Sto elaborando...');
    setDisplayedText('Sto elaborando...');

    try {
        // === TRASCRIZIONE AUDIO CON WHISPER SU GROQ ===
        const formData = new FormData();
        formData.append('file', {
            uri: audioUri,
            name: 'recording.m4a',
            type: 'audio/m4a',
        });
        formData.append('model', TRANSCRIPTION_MODEL);
        formData.append('language', 'it');

        const whisperResponse = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });

        const whisperData = await whisperResponse.json();

        if (!whisperResponse.ok) {
            throw new Error(whisperData.error?.message || 'Whisper API Error');
        }

        const userMessage = (whisperData.text || '').trim();

        if (!userMessage) {
            throw new Error('Trascrizione vuota');
        }

        // Da qui in poi il flusso è identico a quello di un messaggio digitato:
        // handleUserMessage gestisce anche isLoading/finally.
        await handleUserMessage(userMessage, {
            chatHistory,
            setChatHistory,
            setDisplayedText,
            setJarvisResponseText,
            speak,
            openCamera,
            openYoutube,
            openTelegram,
            setNativeAlarm,
            setNativeTimer,
            getWeatherByCity,
            createCalendarEvent,
            setIsLoading,
        });
    } catch (err) {
        console.error('Jarvis error (audio):', err);
        setJarvisResponseText('Si è verificato un errore durante l\'elaborazione dell\'audio.');
        setDisplayedText('Si è verificato un errore durante l\'elaborazione dell\'audio.');
        Alert.alert('Errore', err.message);
        setIsLoading(false);
    }
};

// === Nuovo: elabora un messaggio scritto dall'utente nella chat, riusando
// la stessa logica di comandi/risposta usata per l'audio. ===
export const processTextMessage = async ({
                                              text,
                                              chatHistory,
                                              setChatHistory,
                                              setDisplayedText,
                                              setJarvisResponseText,
                                              speak,
                                              openCamera,
                                              openYoutube,
                                              openTelegram,
                                              setNativeAlarm,
                                              setNativeTimer,
                                              getWeatherByCity,
                                              createCalendarEvent,
                                              setIsLoading,
                                          }) => {
    const userMessage = (text || '').trim();
    if (!userMessage) return;

    setIsLoading(true);
    setJarvisResponseText('Sto elaborando...');
    setDisplayedText('Sto elaborando...');

    await handleUserMessage(userMessage, {
        chatHistory,
        setChatHistory,
        setDisplayedText,
        setJarvisResponseText,
        speak,
        openCamera,
        openYoutube,
        openTelegram,
        setNativeAlarm,
        setNativeTimer,
        getWeatherByCity,
        createCalendarEvent,
        setIsLoading,
    });
};
