import {Alert} from 'react-native';
import * as FileSystem from 'expo-file-system';
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
        'найди', 'поиск', 'ищи', 'кто такой', 'что такое', 'что значит',
        'who is', 'what is', 'search', 'look up', 'how to', 'latest', 'news', 'define'
    ];

    const lowerText = text.toLowerCase();

    // Gemini usa lo stesso modello per entrambi i casi; per le ricerche
    // si potrebbe attivare il grounding con Google Search (vedi note in fondo).
    return searchKeywords.some(keyword => lowerText.includes(keyword))
        ? 'gemini-2.5-flash'
        : 'gemini-2.5-flash';
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
    setJarvisResponseText('Думаю...');
    setDisplayedText('Думаю...');

    try {
        // === 1. TRASCRIZIONE AUDIO CON GEMINI (al posto di Whisper) ===
        // Gemini legge l'audio in base64, non come multipart/form-data.
        const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const transcriptionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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

        if (userMessage.toLowerCase().includes('напомни') && parsed) {
            const {reminderText, seconds} = parsed;

            setDisplayedText(`Сэр, установлено напоминание: "${reminderText}" через ${Math.floor(seconds / 60)} минут.`);
            setJarvisResponseText(`Сэр, установлено напоминание: "${reminderText}" через ${Math.floor(seconds / 60)} минут.`);
            await speak(`Сэр, установлено напоминание: ${reminderText} через ${Math.floor(seconds / 60)} минут.`);
            await scheduleReminder(reminderText, seconds);
            setIsLoading(false);
            return;
        }

        setDisplayedText(`Вы сказали: "${userMessage}"\nJARVIS думает...`);
        setJarvisResponseText(`Вы сказали: "${userMessage}"\nJARVIS думает...`);

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


        if (jarvisReply.toLowerCase().includes('open_camera')) {
            setJarvisResponseText('Сэр, открываю камеру...');
            setDisplayedText('Сэр, открываю камеру...');
            await speak('Сэр, открываю камеру.');
            await openCamera();
            return;
        }

        if (jarvisReply.toLowerCase().includes('open_telegram')) {
            setJarvisResponseText('Сэр, открываю Telegram...');
            setDisplayedText('Сэр, открываю Telegram...');
            await openTelegram();
            return;
        }

        if (jarvisReply.toLowerCase().includes('open_youtube')) {
            const parts = jarvisReply.split('open_youtube');
            const query = parts[1]?.trim(); // Получаем всё, что после команды
            const speakText = query
                ? `Сэр, открываю YouTube по запросу: ${query}...`
                : 'Сэр, открываю YouTube...';

            setJarvisResponseText(speakText);
            setDisplayedText(speakText);
            await openYoutube(query);
            return;
        }

        if (jarvisReply.toLowerCase().includes('напомни') && parseSecondsFromPhrase(jarvisReply)) {
            const seconds = parseSecondsFromPhrase(jarvisReply);
            const reminderText = jarvisReply.replace(/.*напомни.*(через.*)/i, '').trim() || 'о задаче';
            const confirmation = `Сэр, установлено напоминание: "${reminderText}" через ${Math.floor(seconds > 60 ? (seconds / 60) : seconds)} ${seconds > 60 ? "минут" : "секунд"}.`;

            setDisplayedText(confirmation);
            setJarvisResponseText(confirmation);
            await speak(confirmation);
            await scheduleReminder(reminderText, seconds);
            return;
        }

        if (jarvisReply.toLowerCase().startsWith('create_github_repo')) {
            const repoName = jarvisReply.replace('create_github_repo', '').trim();
            if (!repoName) {
                await speak('Сэр, я не расслышал название репозитория.');
                return;
            }

            try {
                const repoUrl = await createGitHubRepo({name: repoName});
                const responseText = `Сэр, репозиторий ${repoName} успешно создан. ${repoUrl}`;
                console.log(repoName);
                setDisplayedText(responseText);
                setJarvisResponseText(responseText);
                await speak(responseText);
            } catch (error) {
                const errText = `Не удалось создать репозиторий: ${error.message}`;
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
                await speak('Сэр, я не расслышал, какой репозиторий нужно удалить.');
                return;
            }

            try {
                const confirmed = await new Promise((resolve) => {
                    Alert.alert(
                        'Подтвердите удаление',
                        `Вы уверены, что хотите удалить репозиторий: ${repoName}?`,
                        [
                            {text: 'Отмена', style: 'cancel', onPress: () => resolve(false)},
                            {text: 'Удалить', style: 'destructive', onPress: () => resolve(true)},
                        ],
                    );
                });

                if (!confirmed) {
                    await speak('Удаление отменено, сэр.');
                    return;
                }

                const deleted = await deleteGitHubRepo('az11k-dev', repoName);
                if (deleted) {
                    const msg = `Сэр, репозиторий ${repoName} был успешно удалён.`;
                    setJarvisResponseText(msg);
                    setDisplayedText(msg);
                    await speak(msg);
                }
            } catch (error) {
                const errText = `Не удалось удалить репозиторий: ${error.message}`;
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
                    await speak("Сэр, не найдено ни одного коммита.");
                    return;
                }

                const commitMessages = commits.map(
                    c => `— ${c.author}: ${c.message.split('\n')[0]}`
                ).join('\n');

                const responseText = `Сэр, вот последние коммиты:\n${commitMessages}`;
                setDisplayedText(responseText);
                setJarvisResponseText(responseText);
                await speak(responseText);
            } catch (error) {
                const errText = `Не удалось получить коммиты: ${error.message}`;
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
        setJarvisResponseText('Произошла ошибка при обработке аудио.');
        setDisplayedText('Произошла ошибка при обработке аудио.');
        Alert.alert('Ошибка', err.message);
    } finally {
        setIsLoading(false);
    }
};
