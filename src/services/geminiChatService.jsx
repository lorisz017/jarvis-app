// Ragionamento e azioni tramite Gemini.
//
// Perché si cambia: il piano gratuito di Groq concede 8000 token al minuto
// per gpt-oss-120b, e una sola richiesta di questa app — prompt di sistema
// più le descrizioni di una ventina di strumenti — ne consuma tremila. Una
// catena di azioni fa più giri, e al secondo o terzo il limite è finito: è
// da lì che venivano sia il vecchio "Request Entity Too Large" sia le azioni
// che sparivano a metà. Non era il modello a dimenticarsele: non gli veniva
// proprio più risposto.
//
// Gemini ha un tetto di token per minuto molto più alto, quindi il problema
// non si pone. Parla però una lingua diversa da quella di Groq, e questo file
// fa da traduttore nei due sensi: fuori ha la stessa forma delle risposte di
// Groq, così il resto dell'app non deve sapere chi sta rispondendo.


import {chiave} from './chiaviService';

const CHAT_MODEL = 'gemini-flash-latest';
const CHAT_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent`;

export const hasGeminiChat = () => Boolean(chiave('gemini'));

// Gemini vuole i tipi in maiuscolo: "STRING" dove Groq scrive "string".
function tipoGemini(tipo) {
    return String(tipo || 'string').toUpperCase();
}

function convertiParametri(parametri) {
    if (!parametri || !parametri.properties) return null;

    const properties = {};
    for (const [nome, campo] of Object.entries(parametri.properties)) {
        properties[nome] = {
            type: tipoGemini(campo.type),
            description: campo.description || '',
        };
        if (campo.items) properties[nome].items = {type: tipoGemini(campo.items.type)};
    }

    if (!Object.keys(properties).length) return null;

    return {
        type: 'OBJECT',
        properties,
        required: parametri.required || [],
    };
}

function convertiStrumenti(tools) {
    if (!tools?.length) return undefined;

    const dichiarazioni = tools.map(({function: f}) => {
        const dichiarazione = {name: f.name, description: f.description};
        const parametri = convertiParametri(f.parameters);
        // Uno strumento senza argomenti va dichiarato senza "parameters":
        // un oggetto vuoto viene rifiutato.
        if (parametri) dichiarazione.parameters = parametri;
        return dichiarazione;
    });

    return [{functionDeclarations: dichiarazioni}];
}

// Da messaggi in stile Groq a contenuti in stile Gemini.
function convertiMessaggi(messages) {
    const contents = [];
    let systemInstruction;
    // Gemini identifica la risposta di uno strumento col nome, Groq con l'id
    // della chiamata: qui si tiene il collegamento fra i due.
    const nomiPerId = {};

    for (const messaggio of messages) {
        if (messaggio.role === 'system') {
            systemInstruction = {parts: [{text: messaggio.content}]};
            continue;
        }

        if (messaggio.role === 'user') {
            contents.push({role: 'user', parts: [{text: messaggio.content || ''}]});
            continue;
        }

        if (messaggio.role === 'assistant') {
            if (messaggio.tool_calls?.length) {
                contents.push({
                    role: 'model',
                    parts: messaggio.tool_calls.map((chiamata) => {
                        nomiPerId[chiamata.id] = chiamata.function.name;
                        let args = {};
                        try {
                            args = JSON.parse(chiamata.function.arguments || '{}');
                        } catch (e) {
                            args = {};
                        }
                        return {functionCall: {name: chiamata.function.name, args}};
                    }),
                });
            } else if (messaggio.content) {
                contents.push({role: 'model', parts: [{text: messaggio.content}]});
            }
            continue;
        }

        if (messaggio.role === 'tool') {
            contents.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: nomiPerId[messaggio.tool_call_id] || 'azione',
                        response: {risultato: messaggio.content || ''},
                    },
                }],
            });
        }
    }

    return {contents, systemInstruction};
}

// Da risposta Gemini a risposta in stile Groq, che è la forma che il resto
// dell'app sa già leggere.
function convertiRisposta(data) {
    const parti = data.candidates?.[0]?.content?.parts || [];

    const testo = parti.map((p) => p.text || '').join('').trim();
    const chiamate = parti
        .filter((p) => p.functionCall)
        .map((p, i) => ({
            id: `gemini_${Date.now()}_${i}`,
            type: 'function',
            function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args || {}),
            },
        }));

    const message = {role: 'assistant', content: testo || null};
    if (chiamate.length) message.tool_calls = chiamate;

    return {choices: [{message}]};
}

export async function requestGeminiCompletion(messages, tools, timeoutMs = 45000) {
    if (!chiave('gemini')) throw new Error('Nessuna chiave Gemini configurata');

    const {contents, systemInstruction} = convertiMessaggi(messages);
    const corpo = {contents, generationConfig: {temperature: 0.2}};
    if (systemInstruction) corpo.systemInstruction = systemInstruction;

    const strumenti = convertiStrumenti(tools);
    if (strumenti) corpo.tools = strumenti;

    const controller = new AbortController();
    const scadenza = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(`${CHAT_URL}?key=${chiave('gemini')}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(corpo),
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('Gemini non ha risposto in tempo');
        throw error;
    } finally {
        clearTimeout(scadenza);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error?.message || `Gemini HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return convertiRisposta(data);
}
