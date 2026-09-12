import {Alert} from 'react-native';
import {
    scheduleReminder,
    parseSecondsFromPhrase,
    parseReminderDetails,
    listReminders,
    cancelAllReminders,
} from './notificationsService';
import {getLatestCommits} from "../core/github/commits";
import {createGitHubRepo} from "../core/github/createRepo";
import {deleteGitHubRepo} from "../core/github/deleteRepo";
import {TOOLS, executeTool} from './tools';
import {searchWithDuckDuckGo, searchWithGemini, hasGeminiKey} from './webSearchService';
import {bringAppToFront} from './overlayService';

// Azioni che aprono la schermata di un'altra app. Dopo una di queste la
// nostra app è dietro, e Android non lascia che un'app in secondo piano ne
// apra un'altra: la seconda azione di una catena veniva scartata in silenzio.
// È il motivo per cui "sveglia e chiama Marco" impostava la sveglia e basta.
const AZIONI_CHE_APRONO_SCHERMATE = new Set([
    'set_alarm',
    'set_timer',
    'call_contact',
    'send_whatsapp',
    'start_navigation',
    'open_app',
    'open_camera',
    'open_telegram',
    'open_youtube',
]);

const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
const CHAT_MODEL = 'openai/gpt-oss-120b';
// Compound: stesso formato di chiamata, ma cerca davvero sul web prima di
// rispondere (notizie, fatti attuali, prezzi) invece di affidarsi solo a
// quello che il modello sa "a memoria".
// Si usa la variante "mini": fa una sola ricerca per richiesta invece di
// dieci, quindi consuma molti meno token al minuto (il limite che faceva
// fallire ogni ricerca con "Request Entity Too Large") ed è più veloce.
const SEARCH_MODEL = 'groq/compound-mini';

// La cronologia della chat cresce senza limiti mentre si parla con JARVIS:
// si manda al modello solo il messaggio di sistema più gli scambi recenti,
// mentre la cronologia mostrata a schermo resta comunque intera.
const MAX_HISTORY_MESSAGES = 20;

// Quante volte si torna dal modello a chiedere se resta un'altra azione da
// fare. Quattro basta per le richieste concatenate più lunghe che si dicono
// a voce, e mette un tetto se il modello dovesse insistere a vuoto.
const MAX_TOOL_ROUNDS = 4;

function trimHistoryForApi(history, limit) {
    if (history.length <= limit) return history;
    const [systemMessage, ...rest] = history;
    return [systemMessage, ...rest.slice(-(limit - 1))];
}

// Alla ricerca web si manda solo la domanda, con un prompt minimo.
// Il prompt di sistema completo elenca tutti i comandi dell'app: sono più di
// mille token che al modello di ricerca non servono (non deve emettere
// comandi, deve solo cercare e rispondere) e che pesavano sul limite di
// token al minuto, quello che faceva fallire ogni ricerca.
const SEARCH_SYSTEM_MESSAGE = {
    role: 'system',
    content:
        'Sei J.A.R.V.I.S. Rispondi in italiano, in modo breve e preciso, ' +
        'rivolgendoti all\'utente come "Signore". Usa le informazioni che trovi sul web.',
};

function buildSearchMessages(userMessage) {
    return [SEARCH_SYSTEM_MESSAGE, {role: 'user', content: userMessage}];
}

async function requestChatCompletion(model, messages, tools) {
    const completion = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tools ? {model, messages, tools, tool_choice: 'auto'} : {model, messages}),
    });

    const responseData = await completion.json().catch(() => ({}));

    if (!completion.ok) {
        const error = new Error(
            responseData.error?.message || `Errore Groq (HTTP ${completion.status})`
        );
        error.status = completion.status;
        throw error;
    }

    return responseData;
}

if (!groqApiKey) {
    Alert.alert('Groq API Key Missing', 'Please set your Groq API key in app.json');
}

// Toglie la formattazione markdown lasciando intatto il testo.
//
// La versione precedente cancellava ogni "-" ovunque si trovasse, non solo
// quelli usati come elenco puntato: "costa 1-2 euro" diventava "costa 12
// euro" e "COVID-19" diventava "COVID19". Qui ogni simbolo viene rimosso
// soltanto dove ha davvero valore di markup.
//
// Il corsivo con "_" non viene gestito di proposito: i comandi dell'app
// contengono underscore (open_app, whatsapp_contact) e verrebbero spezzati.
function stripMarkdown(text) {
    return (text || '')
        // Immagini e collegamenti: resta il testo, sparisce l'indirizzo
        .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Titoli, citazioni ed elenchi: solo a inizio riga
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        // Grassetto, corsivo, barrato, codice
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\n{2,}/g, '\n')
        .trim();
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
    openApp,
    startNavigation,
    callContact,
    sendWhatsAppToContact,
    setHomeCity,
    setNativeAlarm,
    setNativeTimer,
    getWeatherByCity,
    createCalendarEvent,
    setIsLoading,
}) {
    const respond = async (message) => {
        setDisplayedText(message);
        setJarvisResponseText(message);
        await speak(message);
    };

    // Eliminare un repository è irreversibile: si chiede sempre conferma
    // esplicita, qualunque sia la strada da cui arriva la richiesta.
    const confirmRepoDeletion = (repoName) => new Promise((resolve) => {
        Alert.alert(
            'Conferma eliminazione',
            `È sicuro di voler eliminare il repository: ${repoName}?`,
            [
                {text: 'Annulla', style: 'cancel', onPress: () => resolve(false)},
                {text: 'Elimina', style: 'destructive', onPress: () => resolve(true)},
            ],
        );
    });

    // Tutto ciò che le azioni possono usare: alcune funzioni arrivano dalla
    // schermata (hanno bisogno dello stato di React), altre da questo modulo.
    const toolContext = {
        setNativeAlarm,
        setNativeTimer,
        scheduleReminder,
        listReminders,
        cancelAllReminders,
        getWeatherByCity,
        createCalendarEvent,
        openApp,
        openCamera,
        openTelegram,
        openYoutube,
        startNavigation,
        callContact,
        sendWhatsAppToContact,
        setHomeCity,
        createGitHubRepo,
        deleteGitHubRepo,
        getLatestCommits,
        confirmRepoDeletion,
    };

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

        let responseData;
        let searchLimitReached = false;
        // Errori esatti restituiti da chi doveva cercare sul web, uno per
        // provider tentato: servono a capire quale dei due ha fallito e
        // perché, e vengono mostrati in un avviso.
        const searchDiagnostics = [];

        // === Ricerca sul web ===
        // Tre strade in fila. DuckDuckGo per primo perché non chiede chiavi e
        // non ha quote: restituisce i brani delle pagine, e la risposta la
        // scrive il modello di chat che l'app usa già. Poi Gemini, che
        // scriverebbe meglio ma ha la quota esaurita. Groq in fondo. Si passa
        // al successivo solo se il precedente non dà niente, e ogni
        // fallimento resta registrato col nome di chi ha fallito.
        if (chosenModel === SEARCH_MODEL) {
            const rispondiConTesto = async (testo) => {
                const pulita = stripMarkdown(testo);
                setChatHistory([...updatedHistory, {role: 'assistant', content: pulita}]);
                await respond(pulita);
            };

            {
                try {
                    const brani = await searchWithDuckDuckGo(userMessage);
                    if (brani) {
                        // I brani li riassume il modello di chat che l'app usa
                        // già: poco testo, nessun rischio di superare limiti.
                        const composta = await requestChatCompletion(CHAT_MODEL, [
                            {
                                role: 'system',
                                content:
                                    'Sei J.A.R.V.I.S. Rispondi in italiano, breve e preciso, ' +
                                    'rivolgendoti all\'utente come "Signore". Usa solo le ' +
                                    'informazioni nei brani che ti vengono dati. Se non ' +
                                    'bastano, dillo invece di inventare.',
                            },
                            {
                                role: 'user',
                                content: `Domanda: ${userMessage}\n\nBrani trovati sul web:\n${brani}`,
                            },
                        ]);

                        const testo = composta.choices?.[0]?.message?.content;
                        if (testo) {
                            await rispondiConTesto(testo);
                            return;
                        }
                        searchDiagnostics.push('DuckDuckGo: risultati trovati ma nessuna risposta composta');
                    } else {
                        searchDiagnostics.push('DuckDuckGo: nessun risultato');
                    }
                } catch (error) {
                    console.warn('Ricerca con DuckDuckGo non riuscita:', error.message);
                    searchDiagnostics.push(`DuckDuckGo: ${error.message}`);
                }
            }

            if (hasGeminiKey) {
                try {
                    const risposta = await searchWithGemini(userMessage);
                    if (risposta) {
                        await rispondiConTesto(risposta);
                        return;
                    }
                    searchDiagnostics.push('Gemini: ha risposto senza testo');
                } catch (error) {
                    console.warn('Ricerca web con Gemini non riuscita:', error.message);
                    searchDiagnostics.push(`Gemini: ${error.message}`);
                }
            } else {
                searchDiagnostics.push('Gemini: chiave EXPO_PUBLIC_GEMINI_API_KEY assente');
            }
        }

        // === Risposta del modello ===

        const isSearch = chosenModel === SEARCH_MODEL;
        const messages = isSearch
            ? buildSearchMessages(userMessage)
            : trimHistoryForApi(updatedHistory, MAX_HISTORY_MESSAGES);
        // Gli strumenti si mandano solo al modello di chat: quello di ricerca
        // deve cercare e rispondere, non eseguire azioni.
        const tools = isSearch ? undefined : TOOLS;

        try {
            responseData = await requestChatCompletion(chosenModel, messages, tools);
        } catch (error) {
            const isRateLimited = error.status === 413 || error.status === 429;

            if (tools && !isRateLimited) {
                // Se il modello rifiuta la richiesta con gli strumenti, si
                // riprova senza: si perdono le azioni concatenate, ma la
                // vecchia strada a comandi testuali funziona ancora e
                // l'utente riceve comunque una risposta.
                console.warn('Richiesta con strumenti rifiutata, riprovo senza:', error.message);
                responseData = await requestChatCompletion(chosenModel, messages);
            } else if (isSearch && isRateLimited) {
                // La ricerca web brucia in fretta il limite di token al minuto
                // di Groq, che risponde 413 (o 429): meglio rispondere lo
                // stesso col modello normale, dicendo che la risposta non
                // arriva dal web, invece di un errore secco.
                searchLimitReached = true;
                searchDiagnostics.push(`Groq: HTTP ${error.status} — ${error.message}`);
                responseData = await requestChatCompletion(
                    CHAT_MODEL,
                    trimHistoryForApi(updatedHistory, MAX_HISTORY_MESSAGES)
                );
            } else {
                throw error;
            }
        }

        // === Azioni richieste dal modello ===
        // Una richiesta concatenata ("sveglia alle 8, timer di 10 minuti e
        // chiama Marco") può diventare più azioni. Il modello però non le
        // chiede quasi mai tutte insieme: ne chiede una, si aspetta di
        // sapere com'è andata, e solo allora chiede la successiva. La
        // versione precedente eseguiva il primo gruppo e si fermava lì,
        // ed è per questo che partiva solo la sveglia.
        //
        // Qui invece si continua a rispondere al modello con l'esito di
        // ogni azione finché non smette di chiederne. Il limite di giri
        // evita che una richiesta mal interpretata giri all'infinito.
        let toolCalls = responseData.choices?.[0]?.message?.tool_calls;

        if (toolCalls?.length) {
            const esiti = [];
            const conversazione = [...messages];
            let ultimaRisposta = responseData;
            let giro = 0;
            let davantiCeUnAltraApp = false;

            while (toolCalls?.length && giro < MAX_TOOL_ROUNDS) {
                giro += 1;
                conversazione.push(ultimaRisposta.choices[0].message);

                for (const call of toolCalls) {
                    const nome = call.function?.name;

                    // Si torna davanti solo se resta qualcosa da fare: alla
                    // fine della catena l'utente deve restare dov'è finito,
                    // non essere riportato dentro J.A.R.V.I.S. a forza.
                    if (davantiCeUnAltraApp) {
                        bringAppToFront();
                        await new Promise((resolve) => setTimeout(resolve, 700));
                    }

                    let esito;
                    try {
                        const args = JSON.parse(call.function?.arguments || '{}');
                        esito = await executeTool(nome, args, toolContext);
                    } catch (error) {
                        console.error(`Azione ${nome}:`, error);
                        esito = `Non sono riuscito a completare "${nome}": ${error.message}`;
                    }
                    esiti.push(esito);
                    davantiCeUnAltraApp = AZIONI_CHE_APRONO_SCHERMATE.has(nome);
                    // L'esito torna al modello con l'id della chiamata a cui
                    // risponde: senza, l'API rifiuta il messaggio.
                    conversazione.push({role: 'tool', tool_call_id: call.id, content: esito});
                }

                try {
                    ultimaRisposta = await requestChatCompletion(chosenModel, conversazione, TOOLS);
                } catch (error) {
                    // Se il giro successivo non parte si tiene comunque quello
                    // che è già stato fatto, invece di perdere tutto.
                    console.warn('Giro di azioni interrotto:', error.message);
                    break;
                }

                toolCalls = ultimaRisposta.choices?.[0]?.message?.tool_calls;
            }

            const risposta = `Signore. ${esiti.join(' ')}`;
            setChatHistory([...updatedHistory, {role: 'assistant', content: risposta}]);
            await respond(risposta);
            return;
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

        // === Apertura di un'altra app, tramite il registro di app note ===
        if (jarvisReply.toLowerCase().startsWith('open_app')) {
            const appName = jarvisReply.replace(/open_app/i, '').trim();
            if (!appName) {
                await speak('Signore, quale applicazione desidera aprire?');
                return;
            }
            try {
                await openApp(appName);
                const msg = `Signore, apro ${appName}.`;
                setDisplayedText(msg);
                setJarvisResponseText(msg);
                await speak(msg);
            } catch (error) {
                const errText = `Non sono riuscito ad aprire ${appName}, signore: ${error.message}`;
                setDisplayedText(errText);
                setJarvisResponseText(errText);
                await speak(errText);
            }
            return;
        }

        // === Navigazione stradale ===
        if (jarvisReply.toLowerCase().startsWith('navigate_to')) {
            const destination = jarvisReply.replace(/navigate_to/i, '').trim();
            if (!destination) {
                await speak('Signore, verso quale destinazione desidera andare?');
                return;
            }
            try {
                await startNavigation(destination);
                await respond(`Signore, avvio la navigazione verso ${destination}.`);
            } catch (error) {
                await respond(`Non sono riuscito ad avviare la navigazione: ${error.message}`);
            }
            return;
        }

        // === Chiamata a un contatto in rubrica ===
        if (jarvisReply.toLowerCase().startsWith('call_contact')) {
            const name = jarvisReply.replace(/call_contact/i, '').trim();
            if (!name) {
                await speak('Signore, chi desidera chiamare?');
                return;
            }
            try {
                const contactName = await callContact(name);
                await respond(`Signore, chiamo ${contactName}.`);
            } catch (error) {
                await respond(`Non sono riuscito a chiamare ${name}, signore: ${error.message}`);
            }
            return;
        }

        // === Messaggio WhatsApp a un contatto ===
        if (jarvisReply.toLowerCase().startsWith('whatsapp_contact')) {
            const payload = jarvisReply.replace(/whatsapp_contact/i, '').trim();
            const [rawName, ...messageParts] = payload.split('|');
            const name = rawName.trim();
            const messageText = messageParts.join('|').trim();

            if (!name || !messageText) {
                await speak('Signore, mi servono il nome del contatto e il testo del messaggio.');
                return;
            }
            try {
                const contactName = await sendWhatsAppToContact(name, messageText);
                await respond(`Signore, ho preparato il messaggio per ${contactName}.`);
            } catch (error) {
                await respond(`Non sono riuscito a scrivere a ${name}, signore: ${error.message}`);
            }
            return;
        }

        // === Promemoria ancora attivi ===
        if (jarvisReply.toLowerCase().startsWith('list_reminders')) {
            try {
                const reminders = await listReminders();
                if (!reminders.length) {
                    await respond('Signore, non ha promemoria attivi.');
                    return;
                }
                const list = reminders
                    .map((r) => (r.time ? `— ${r.text} (alle ${r.time})` : `— ${r.text}`))
                    .join('\n');
                await respond(`Signore, ecco i suoi promemoria attivi:\n${list}`);
            } catch (error) {
                await respond(`Non sono riuscito a leggere i promemoria: ${error.message}`);
            }
            return;
        }

        // === Annullamento dei promemoria ===
        if (jarvisReply.toLowerCase().startsWith('cancel_reminders')) {
            try {
                const removed = await cancelAllReminders();
                await respond(
                    removed
                        ? `Signore, ho annullato ${removed} promemoria.`
                        : 'Signore, non c\'era alcun promemoria da annullare.'
                );
            } catch (error) {
                await respond(`Non sono riuscito ad annullare i promemoria: ${error.message}`);
            }
            return;
        }

        // === Città usata dal briefing di apertura ===
        if (jarvisReply.toLowerCase().startsWith('set_home_city')) {
            const city = jarvisReply.replace(/set_home_city/i, '').trim();
            if (!city) {
                await speak('Signore, quale città devo impostare?');
                return;
            }
            setHomeCity(city);
            await respond(`Signore, d'ora in poi userò ${city} per il riepilogo di apertura.`);
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

        // Il testo del comando resta intatto fin qui, così i controlli sopra
        // riescono a riconoscerlo: l'avviso si aggiunge solo alla risposta
        // normale, quella che viene letta e mostrata.
        const finalReply = searchLimitReached
            ? `Signore, la ricerca web non è disponibile al momento; le rispondo con le mie conoscenze. ${jarvisReply}`
            : jarvisReply;

        setJarvisResponseText(finalReply);
        await speak(finalReply);

        // L'errore tecnico va mostrato in un avviso e non solo sotto la
        // risposta: il riquadro del testo è alto poche righe e la diagnostica
        // finiva fuori campo senza che nessuno la vedesse.
        if (searchDiagnostics.length) {
            Alert.alert('Diagnostica ricerca web', searchDiagnostics.join('\n\n'));
        }
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
                                                 openApp,
                                                 startNavigation,
                                                 callContact,
                                                 sendWhatsAppToContact,
                                                 setHomeCity,
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
            openApp,
            startNavigation,
            callContact,
            sendWhatsAppToContact,
            setHomeCity,
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
                                              openApp,
                                              startNavigation,
                                              callContact,
                                              sendWhatsAppToContact,
                                              setHomeCity,
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
        openApp,
        startNavigation,
        callContact,
        sendWhatsAppToContact,
        setHomeCity,
        setNativeAlarm,
        setNativeTimer,
        getWeatherByCity,
        createCalendarEvent,
        setIsLoading,
    });
};
