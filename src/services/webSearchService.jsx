const tavilyApiKey = process.env.EXPO_PUBLIC_TAVILY_API_KEY;
const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Ricerca sul web. Ci sono volute tre strade perché nessuna delle prime due
// reggeva da sola:
//
//   1. Groq Compound risponde sempre con un limite superato, qualunque cosa
//      gli si mandi. Resta in fondo come ultima spiaggia.
//   2. Gemini con la ricerca Google integrata funziona, ma la ricerca non
//      rientra nel piano gratuito: risponde che la quota è esaurita già al
//      primo tentativo, e attivare la fatturazione non è un'opzione.
//   3. Tavily è un motore di ricerca pensato per essere letto da un modello.
//      Il piano gratuito non chiede carta di credito e basta ampiamente per
//      l'uso di una persona sola.
//
// Tavily restituisce brani di pagine, non una risposta già scritta: a
// scriverla è il modello di chat che l'app usa già, partendo da quei brani.
// Così la risposta ha la voce di J.A.R.V.I.S. invece di essere un incollaggio.

export const hasSearchKey = Boolean(tavilyApiKey || geminiApiKey);
export const hasTavilyKey = Boolean(tavilyApiKey);
export const hasGeminiKey = Boolean(geminiApiKey);

const TAVILY_URL = 'https://api.tavily.com/search';

/** Restituisce i brani trovati, o null se non c'è niente di utile. */
export async function searchWithTavily(query) {
    if (!tavilyApiKey) return null;

    const response = await fetch(TAVILY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tavilyApiKey}`,
        },
        body: JSON.stringify({
            query,
            max_results: 5,
            search_depth: 'basic',
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.detail?.error || data.error || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const risultati = Array.isArray(data.results) ? data.results : [];
    if (!risultati.length) return null;

    return risultati
        .map((r, i) => `[${i + 1}] ${r.title || 'senza titolo'}\n${(r.content || '').trim()}`)
        .join('\n\n');
}

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ISTRUZIONE = 'Sei J.A.R.V.I.S. Rispondi in italiano, in modo breve e preciso, ' +
    'rivolgendoti all\'utente come "Signore". Basa la risposta su quello che trovi ' +
    'cercando sul web, e riporta la data del dato quando è rilevante.';

/** Restituisce la risposta già scritta da Gemini, o null. */
export async function searchWithGemini(query) {
    if (!geminiApiKey) return null;

    const response = await fetch(`${GEMINI_URL}?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            systemInstruction: {parts: [{text: ISTRUZIONE}]},
            contents: [{role: 'user', parts: [{text: query}]}],
            tools: [{google_search: {}}],
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error?.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const testo = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || '')
        .join('')
        .trim();

    return testo || null;
}
