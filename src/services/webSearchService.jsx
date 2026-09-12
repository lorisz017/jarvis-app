const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Ricerca sul web, tre strade in fila.
//
// La prima è DuckDuckGo, che non chiede nessuna chiave. È la stessa scelta
// fatta da Mark-LIII, l'assistente desktop da cui è nata l'idea di questo
// progetto: lì la ricerca "funziona sempre" proprio perché quando Gemini
// esaurisce la quota gratuita — e la esaurisce — DuckDuckGo raccoglie senza
// che l'utente se ne accorga.
//
// La seconda è Gemini con la ricerca Google integrata: scrive una risposta
// migliore, ma la ricerca non rientra nel piano gratuito e risponde "quota
// esaurita". Resta perché il giorno che quella quota ci fosse, è la migliore.
//
// La terza, Groq Compound, sta in fondo e finora non ha mai funzionato.
//
// DuckDuckGo restituisce pagine HTML pensate per un browser, non per un
// programma: i risultati vanno estratti dal testo. Non è elegante, ma è
// l'unico modo di cercare sul web senza registrarsi da nessuna parte.

export const hasGeminiKey = Boolean(geminiApiKey);

const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';
const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/';

// Senza uno User-Agent da browser DuckDuckGo risponde con una pagina vuota.
const BROWSER_UA =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/120.0.0.0 Mobile Safari/537.36';

// Le pagine sono scritte per un browser, che i simboli scritti in codice li
// scioglie da solo. Qui vanno sciolti a mano, altrimenti finiscono nel testo
// che il modello legge — e poi nella frase che viene pronunciata.
const ENTITA = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
    lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
    egrave: 'è', eacute: 'é', agrave: 'à', ograve: 'ò', igrave: 'ì', ugrave: 'ù',
    euro: '€', deg: '°', middot: '·',
};

function decodeEntities(testo) {
    return String(testo)
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
        .replace(/&([a-z]+);/gi, (intero, nome) => {
            const sciolto = ENTITA[nome.toLowerCase()];
            return sciolto === undefined ? intero : sciolto;
        });
}

function ripulisci(html) {
    return decodeEntities(String(html).replace(/<[^>]*>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
}

function estraiTutti(html, regex) {
    const trovati = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
        const testo = ripulisci(m[1]);
        if (testo) trovati.push(testo);
    }
    return trovati;
}

// Esportata per poterla provare senza fare richieste di rete.
export function parseDuckDuckGo(html) {
    if (!html) return [];

    // Pagina completa: titolo e riassunto sono due link con classi note.
    let titoli = estraiTutti(html, /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
    let brani = estraiTutti(html, /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g);

    // Versione leggera: i risultati stanno in una tabella.
    if (!brani.length) {
        titoli = estraiTutti(html, /<a[^>]*class="[^"]*result-link[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
        brani = estraiTutti(html, /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/g);
    }

    const risultati = [];
    const quanti = Math.min(brani.length || titoli.length, 6);

    for (let i = 0; i < quanti; i++) {
        const titolo = titoli[i] || '';
        const brano = brani[i] || '';
        if (!titolo && !brano) continue;
        risultati.push({titolo, brano});
    }

    return risultati;
}

// Al primo collaudo la richiesta è tornata con "Network request failed": non
// una risposta sbagliata, proprio una richiesta mai partita. Dato che da qui
// non si può provare — il proxy di sviluppo blocca DuckDuckGo — invece di
// indovinare quale sia la forma giusta si provano tutte quelle plausibili, e
// l'errore riporta cosa ha risposto ciascuna.
const TENTATIVI = [
    {nome: 'lite GET', url: DDG_LITE_URL, metodo: 'GET'},
    {nome: 'html GET', url: DDG_HTML_URL, metodo: 'GET'},
    {nome: 'html POST', url: DDG_HTML_URL, metodo: 'POST'},
];

const TIMEOUT_MS = 12000;

async function scarica(tentativo, query) {
    const {url, metodo} = tentativo;

    // Senza un limite di tempo una richiesta che non risponde lascia
    // J.A.R.V.I.S. muto a tempo indeterminato.
    const controller = new AbortController();
    const scadenza = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const opzioni = {
            method: metodo,
            signal: controller.signal,
            headers: {
                'User-Agent': BROWSER_UA,
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'it-IT,it;q=0.9',
            },
        };

        let indirizzo = url;
        if (metodo === 'POST') {
            opzioni.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            opzioni.body = `q=${encodeURIComponent(query)}`;
        } else {
            indirizzo = `${url}?q=${encodeURIComponent(query)}`;
        }

        const response = await fetch(indirizzo, opzioni);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return await response.text();
    } finally {
        clearTimeout(scadenza);
    }
}

/** Restituisce i brani trovati pronti da riassumere, o null. */
export async function searchWithDuckDuckGo(query) {
    const problemi = [];

    for (const tentativo of TENTATIVI) {
        try {
            const risultati = parseDuckDuckGo(await scarica(tentativo, query));
            if (risultati.length) {
                return risultati
                    .map((r, i) => `[${i + 1}] ${r.titolo}\n${r.brano}`)
                    .join('\n\n');
            }
            problemi.push(`${tentativo.nome}: nessun risultato`);
        } catch (error) {
            problemi.push(`${tentativo.nome}: ${error.message}`);
        }
    }

    // Nessuna delle strade ha portato niente: si dice quali si sono provate
    // e come è andata ciascuna, invece di un generico "non ha funzionato".
    const error = new Error(problemi.join('; '));
    error.tutteFallite = true;
    throw error;
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
