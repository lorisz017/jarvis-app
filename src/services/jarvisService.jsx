import {Alert} from 'react-native';
import {scheduleReminder, parseSecondsFromPhrase, parseReminderDetails} from './notificationsService';
import {getLatestCommits} from "../core/github/commits";
import {createGitHubRepo} from "../core/github/createRepo";
import {deleteGitHubRepo} from "../core/github/deleteRepo";

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// Groq espone API compatibili con il formato OpenAI, quindi le chiamate
// hanno la stessa struttura dell'originale del progetto.
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Trascrizione: Whisper Large v3 Turbo (velocissimo, quota separata dalla chat)
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';

// Chat: Llama 3.3 70B, il modello più capace del piano gratuito Groq
const CHAT_MODEL = 'llama-3.3-70b-versatile';

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
                                                 setIsLoading,
                                             }) => {
    setIsLoading(true);
    setJarvisResponseText('Sto elaborando...');
    setDisplayedText('Sto elaborando...');

    try {
        // === 1. TRASCRIZIONE AUDIO CON WHISPER SU GROQ ===
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

        // === 2. RISPOSTA DEL MODELLO ===
        const completion = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: updatedHistory,
            }),
        });

        const responseData = await completion.json();

        if (!completion.ok) {
            throw new Error(responseData.error?.message || 'Groq Chat Error');
        }

        const jarvisReply = stripMarkdown(responseData.choices?.[0]?.message?.content) || '...';

        // Salva anche la risposta di JARVIS nella cronologia, non solo i messaggi
        // dell'utente: senza questo il modello non ricorda cosa ha appena detto o
        // fatto, e tende a ripetere azioni vecchie o a confondersi tra un comando
        // e l'altro.
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
            const query = parts[1]?.trim(); // Prende tutto ciò che segue il comando
            const speakText = query
                ? `Signore, apro YouTube per la ricerca: ${query}...`
                : 'Signore, apro YouTube...';

            setJarvisResponseText(speakText);
            setDisplayedText(speakText);
            await openYoutube(query);
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

        // === GitHub: Delete Repository ===
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
        setJarvisResponseText('Si è verificato un errore durante l\'elaborazione dell\'audio.');
        setDisplayedText('Si è verificato un errore durante l\'elaborazione dell\'audio.');
        Alert.alert('Errore', err.message);
    } finally {
        setIsLoading(false);
    }
};
