const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Ricerca sul web tramite Gemini con la ricerca Google integrata.
//
// Il tentativo precedente passava da Groq Compound, che però risponde sempre
// con un limite superato qualunque cosa gli si mandi: ridurre la cronologia,
// cambiare modello e alleggerire il prompt non hanno cambiato nulla. Questa è
// una strada diversa, non l'ennesima variazione sulla stessa: il modello fa
// la ricerca per conto suo e restituisce una risposta già scritta.
//
// Usa la chiave Gemini che serve anche per la voce di riserva, quindi non
// serve configurare nulla di nuovo. Sono comunque due quote separate: quella
// della sintesi vocale si esaurisce presto, questa no.
const SEARCH_MODEL = 'gemini-flash-latest';
const SEARCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/${SEARCH_MODEL}:generateContent`;

const SEARCH_INSTRUCTION =
    'Sei J.A.R.V.I.S. Rispondi in italiano, in modo breve e preciso, rivolgendoti ' +
    'all\'utente come "Signore". Basa la risposta su quello che trovi cercando sul web, ' +
    'e riporta la data del dato quando è rilevante.';

// Restituisce la risposta trovata, oppure null se la ricerca non è possibile:
// chi chiama decide come ripiegare.
export async function searchWeb(query) {
    if (!geminiApiKey) return null;

    const response = await fetch(`${SEARCH_URL}?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            systemInstruction: {parts: [{text: SEARCH_INSTRUCTION}]},
            contents: [{role: 'user', parts: [{text: query}]}],
            tools: [{google_search: {}}],
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error?.message || `Errore Gemini (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
    }

    const testo = (data.candidates?.[0]?.content?.parts || [])
        .map((part) => part.text || '')
        .join('')
        .trim();

    return testo || null;
}
