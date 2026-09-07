import {Alert} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {scheduleReminder, parseSecondsFromPhrase, parseReminderDetails} from './notificationsService';
import {getLatestCommits} from "../core/github/commits";
import {createGitHubRepo} from "../core/github/createRepo";
import {deleteGitHubRepo} from "../core/github/deleteRepo";

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!geminiApiKey) {
    Alert.alert('Gemini API Key Missing', 'Please set your Gemini API key in app.json');
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
        'cerca', 'trova', 'chi è', 'cos\'è', 'cosa significa', 'come si fa',
        'who is', 'what is', 'search', 'look up', 'how to', 'latest', 'news', 'define'
    ];

    const lowerText = text.toLowerCase();

    // Gemini usa lo stesso modello per entrambi i casi; per le ricerche
    // si potrebbe attivare il grounding con Google Search (vedi note in fondo).
    return searchKeywords.some(keyword => lowerText.includes(keyword))
        ? 'gemini-3.6-flash'
        : 'gemini-3.6-flash';
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
        // === 1. TRASCRIZIONE AUDIO CON GEMINI (al posto di Whisper) ===
        // Gemini legge l'audio in base64, non come multipart/form-data.
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const transcriptionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {text: 'Trascrivi esattamente questo audio. Rispondi SOLO con il testo trascritto, senza aggiungere nulla.'},
                            {
                                inline_data: {
                                    mime_type: 'audio/mp4',
                                    data: base64Audio,
                                },
                            },
                        ],
                    }],
                }),
            }
        );

        const transcriptionData = await transcriptionResponse.json();

        if (!transcriptionResponse.ok) {
            throw new Error(transcriptionData.error?.message || 'Gemini Transcription Error');
        }

        const userMessage = (transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

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

        const chosenModel = chooseModelByText(userMessage);

        // === 2. RISPOSTA DEL MODELLO ===
        // Gemini espone un endpoint compatibile con il formato OpenAI:
        // cambia solo l'URL, il resto del corpo della richiesta resta identico.
        const completion = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${geminiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: chosenModel,
                messages: updatedHistory,
            }),
        });

        const responseData = await completion.json();

        if (!completion.ok) {
            throw new Error(responseData.error?.message || 'Gemini Chat Error');
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
