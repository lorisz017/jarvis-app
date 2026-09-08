import * as FileSystem from 'expo-file-system/legacy';

const STATE_FILE = `${FileSystem.documentDirectory}jarvis-state.json`;

// Quanti messaggi conservare tra un avvio e l'altro: la conversazione resta
// utile senza far crescere il file all'infinito.
const MAX_PERSISTED_MESSAGES = 40;

export const DEFAULT_STATE = {
    messages: [],
    isVoiceEnabled: true,
    isBriefingEnabled: true,
    homeCity: 'Roma',
};

export async function loadState() {
    try {
        const info = await FileSystem.getInfoAsync(STATE_FILE);
        if (!info.exists) return DEFAULT_STATE;

        const raw = await FileSystem.readAsStringAsync(STATE_FILE);
        const saved = JSON.parse(raw);

        return {
            // Si salvano solo i messaggi di utente e assistente: il messaggio
            // di sistema viene sempre ripreso dalla versione attuale del
            // codice, altrimenti un vecchio prompt salvato mesi prima
            // continuerebbe a girare senza i comandi aggiunti dopo.
            messages: Array.isArray(saved.messages)
                ? saved.messages.filter((m) => m?.role === 'user' || m?.role === 'assistant')
                : [],
            isVoiceEnabled: typeof saved.isVoiceEnabled === 'boolean' ? saved.isVoiceEnabled : true,
            isBriefingEnabled: typeof saved.isBriefingEnabled === 'boolean' ? saved.isBriefingEnabled : true,
            homeCity: typeof saved.homeCity === 'string' && saved.homeCity ? saved.homeCity : DEFAULT_STATE.homeCity,
        };
    } catch (error) {
        console.warn('Lettura stato salvato:', error);
        return DEFAULT_STATE;
    }
}

export async function saveState({messages, isVoiceEnabled, isBriefingEnabled, homeCity}) {
    try {
        const persistable = (messages || [])
            .filter((m) => m?.role === 'user' || m?.role === 'assistant')
            .slice(-MAX_PERSISTED_MESSAGES);

        await FileSystem.writeAsStringAsync(
            STATE_FILE,
            JSON.stringify({messages: persistable, isVoiceEnabled, isBriefingEnabled, homeCity})
        );
    } catch (error) {
        console.warn('Salvataggio stato:', error);
    }
}
