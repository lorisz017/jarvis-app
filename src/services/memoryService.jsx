import * as FileSystem from 'expo-file-system/legacy';

// La memoria personale di J.A.R.V.I.S.
//
// Due cose diverse tenute nello stesso posto:
//
// - **La nota**, scritta a mano nelle impostazioni. Chi è l'utente, cosa fa,
//   che dispositivi ha. Non cambia da sola e non la tocca nessuno se non lui.
// - **I ricordi**, che si annota lui mentre parlate. Non è un registro di
//   tutto: "ha chiesto il meteo alle sei" non serve a niente domani. Servono
//   i fatti che restano veri — come si chiama, dove lavora, cosa possiede.
//
// Tutto sta in un file, e va nel prompt di sistema all'avvio di ogni
// conversazione.

const FILE = `${FileSystem.documentDirectory}jarvis-memoria.json`;

// Oltre questo numero i ricordi più vecchi cedono il posto: una memoria che
// cresce all'infinito finisce per occupare il prompt invece di aiutarlo.
const MAX_RICORDI = 40;

let memoria = {nota: '', ricordi: []};

export function getMemoria() {
    return memoria;
}

export async function caricaMemoria() {
    try {
        const info = await FileSystem.getInfoAsync(FILE);
        if (!info.exists) return memoria;

        const salvata = JSON.parse(await FileSystem.readAsStringAsync(FILE));
        memoria = {
            nota: typeof salvata.nota === 'string' ? salvata.nota : '',
            ricordi: Array.isArray(salvata.ricordi)
                ? salvata.ricordi.filter((r) => typeof r === 'string' && r.trim())
                : [],
        };
    } catch (error) {
        console.warn('Lettura memoria:', error);
    }

    return memoria;
}

async function salva() {
    try {
        await FileSystem.writeAsStringAsync(FILE, JSON.stringify(memoria));
    } catch (error) {
        console.warn('Salvataggio memoria:', error);
    }
}

export async function setNota(nota) {
    memoria = {...memoria, nota: nota || ''};
    await salva();
}

/** Aggiunge un ricordo. Restituisce false se era già noto. */
export async function aggiungiRicordo(testo) {
    const pulito = String(testo || '').trim();
    if (!pulito) return false;

    // Un modello che riscopre lo stesso fatto ogni due giorni riempirebbe la
    // memoria di copie: il confronto è alla buona ma prende i doppioni veri.
    const normale = pulito.toLowerCase();
    if (memoria.ricordi.some((r) => r.toLowerCase() === normale)) return false;

    memoria = {...memoria, ricordi: [...memoria.ricordi, pulito].slice(-MAX_RICORDI)};
    await salva();
    return true;
}

export async function dimenticaRicordo(indice) {
    memoria = {...memoria, ricordi: memoria.ricordi.filter((_, i) => i !== indice)};
    await salva();
}

export async function dimenticaTutto() {
    memoria = {nota: '', ricordi: []};
    await salva();
}

/**
 * La memoria come blocco da mettere nel prompt di sistema.
 * Restituisce stringa vuota se non c'è niente: un titolo senza contenuto
 * sotto insegnerebbe al modello che la memoria è vuota per definizione.
 */
export function memoriaPerIlPrompt() {
    const pezzi = [];

    if (memoria.nota.trim()) {
        pezzi.push(`Quello che l'utente ha scritto di sé:\n${memoria.nota.trim()}`);
    }

    if (memoria.ricordi.length) {
        pezzi.push(
            'Cose che hai annotato parlando con lui:\n' +
            memoria.ricordi.map((r) => `- ${r}`).join('\n')
        );
    }

    if (!pezzi.length) return '';

    return `\n\n[MEMORIA]\n${pezzi.join('\n\n')}\n\n` +
        'Usa queste informazioni quando servono a rispondere, senza annunciare ' +
        'che le stai consultando e senza ripeterle a chi già le sa.';
}
