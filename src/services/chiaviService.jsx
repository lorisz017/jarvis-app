import * as FileSystem from 'expo-file-system/legacy';

// Le chiavi API, da due posti diversi.
//
// Fino a ieri stavano solo dentro l'APK: venivano scritte al momento della
// compilazione e non c'era altro modo di averle. Va benissimo per chi si
// compila l'app da sé, ma chiunque altro doveva crearsi un repository,
// incollarci un workflow e aspettare venti minuti prima di vedere qualcosa.
//
// Ora ce n'è un secondo: quello che l'utente scrive nell'app. Le due strade
// convivono e l'ordine è questo — **prima quella scritta a mano, poi quella
// della compilazione**. Chi si compila l'app col proprio workflow non si
// accorge di niente: le sue chiavi sono già dentro, l'app parte e non chiede
// nulla. Chi scarica l'APK pubblico, che di chiavi non ne ha, ne incolla una
// sola e ha la stessa app.
//
// La chiave scritta a mano vince su quella compilata anche quando ci sono
// tutte e due: è l'unico modo che ha l'utente di cambiarne una senza
// ricompilare.

// Questi vanno scritti per esteso: il compilatore sostituisce il testo
// `process.env.EXPO_PUBLIC_QUALCOSA` con il valore, e non saprebbe cosa fare
// di un nome costruito al volo.
const DALLA_COMPILAZIONE = {
    gemini: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    groq: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
    deepgram: process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '',
    github: process.env.EXPO_PUBLIC_GITHUB_TOKEN_KEY || '',
};

export const CHIAVI = [
    {
        id: 'gemini',
        nome: 'Gemini',
        dove: 'https://aistudio.google.com/apikey',
        necessaria: true,
        aCosaServe: 'La conversazione, il ragionamento e la vista dalla fotocamera. '
            + "Senza questa l'app non ha la sua strada principale.",
    },
    {
        id: 'groq',
        nome: 'Groq',
        dove: 'https://console.groq.com/keys',
        necessaria: false,
        aCosaServe: 'Trascrizione e ragionamento della modalità a comandi, che è '
            + 'spenta salvo richiesta. Senza, tutto il resto funziona lo stesso.',
    },
    {
        id: 'deepgram',
        nome: 'Deepgram',
        dove: 'https://console.deepgram.com',
        necessaria: false,
        aCosaServe: 'Voce di riserva della sola modalità a comandi. In '
            + 'conversazione la voce è il modello stesso.',
    },
    {
        id: 'github',
        nome: 'GitHub',
        dove: 'https://github.com/settings/tokens',
        necessaria: false,
        aCosaServe: 'Solo per i tre comandi sui repository: crearne uno, '
            + 'eliminarlo, leggere gli ultimi commit.',
    },
];

const FILE = `${FileSystem.documentDirectory}jarvis-chiavi.json`;

let scritteAMano = {};
let caricate = false;
let ultimoErrore = null;

export async function caricaChiavi() {
    try {
        const info = await FileSystem.getInfoAsync(FILE);
        if (info.exists) {
            const salvate = JSON.parse(await FileSystem.readAsStringAsync(FILE));
            scritteAMano = {};
            for (const {id} of CHIAVI) {
                if (typeof salvate[id] === 'string' && salvate[id].trim()) {
                    scritteAMano[id] = salvate[id].trim();
                }
            }
        }
        ultimoErrore = null;
    } catch (errore) {
        ultimoErrore = String(errore?.message || errore);
        console.warn('Lettura chiavi:', errore);
    }

    caricate = true;
    return scritteAMano;
}

/** La chiave da usare adesso, da qualunque delle due strade arrivi. */
export function chiave(id) {
    return scritteAMano[id] || DALLA_COMPILAZIONE[id] || '';
}

/** Salva una chiave scritta a mano. Vuota vuol dire: torna a quella dell'APK. */
export async function setChiave(id, valore) {
    const pulito = String(valore || '').trim();

    if (pulito) scritteAMano = {...scritteAMano, [id]: pulito};
    else {
        scritteAMano = {...scritteAMano};
        delete scritteAMano[id];
    }

    try {
        await FileSystem.writeAsStringAsync(FILE, JSON.stringify(scritteAMano));
        ultimoErrore = null;
        return null;
    } catch (errore) {
        ultimoErrore = String(errore?.message || errore);
        console.warn('Salvataggio chiavi:', errore);
        return ultimoErrore;
    }
}

/**
 * Da dove viene ogni chiave, **senza mai restituirne il valore**: le
 * impostazioni devono poter dire "c'è" senza mostrarla, e una chiave
 * arrivata dalla compilazione non è dell'utente e non si fa vedere.
 */
export function statoChiavi() {
    return CHIAVI.map((c) => ({
        ...c,
        origine: scritteAMano[c.id]
            ? 'tua'
            : DALLA_COMPILAZIONE[c.id] ? 'installazione' : 'mancante',
        // Quanto è lunga, per far capire che qualcosa c'è davvero.
        lunghezza: chiave(c.id).length,
    }));
}

export function chiaviCaricate() {
    return caricate;
}

export function erroreChiavi() {
    return ultimoErrore;
}

/** Vero se manca quello che serve per funzionare: solo Gemini lo è. */
export function mancaIlNecessario() {
    return !chiave('gemini');
}
