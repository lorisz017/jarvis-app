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

// Quello che è successo davvero al file. Serve perché un errore di scrittura
// qui non si vede: la memoria resta giusta finché l'app è aperta e sparisce
// alla riapertura, che è il modo più lento possibile di scoprire un guasto.
let diagnosi = {
    percorso: FILE,
    caricata: false,
    fileEsisteva: null,
    scritture: 0,
    erroreLettura: null,
    erroreScrittura: null,
};

export function getMemoria() {
    return memoria;
}

/** Come sta la memoria: da mostrare nelle impostazioni, non al modello. */
export function statoMemoria() {
    return {
        ...diagnosi,
        nota: memoria.nota.length,
        ricordi: memoria.ricordi.length,
        nelPrompt: memoriaPerIlPrompt().length,
    };
}

export async function caricaMemoria() {
    try {
        const info = await FileSystem.getInfoAsync(FILE);
        diagnosi = {...diagnosi, caricata: true, fileEsisteva: !!info.exists, erroreLettura: null};
        if (!info.exists) return memoria;

        const salvata = JSON.parse(await FileSystem.readAsStringAsync(FILE));
        memoria = {
            nota: typeof salvata.nota === 'string' ? salvata.nota : '',
            ricordi: Array.isArray(salvata.ricordi)
                ? salvata.ricordi.filter((r) => typeof r === 'string' && r.trim())
                : [],
        };
    } catch (error) {
        diagnosi = {...diagnosi, caricata: true, erroreLettura: String(error?.message || error)};
        console.warn('Lettura memoria:', error);
    }

    return memoria;
}

/** Scrive su disco. Restituisce il motivo del fallimento, o null se è andata. */
async function salva() {
    try {
        await FileSystem.writeAsStringAsync(FILE, JSON.stringify(memoria));
        diagnosi = {...diagnosi, scritture: diagnosi.scritture + 1, erroreScrittura: null};
        return null;
    } catch (error) {
        const motivo = String(error?.message || error);
        diagnosi = {...diagnosi, erroreScrittura: motivo};
        console.warn('Salvataggio memoria:', error);
        return motivo;
    }
}

export async function setNota(nota) {
    memoria = {...memoria, nota: nota || ''};
    return await salva();
}

/**
 * Aggiunge un ricordo e dice com'è andata: `{esito, fatto, errore}`, dove
 * l'esito è 'annotato', 'noto' o 'fallito'. Un booleano non basta più —
 * una scrittura che fallisce e un fatto già noto non sono la stessa cosa, e
 * chi chiama deve poterlo dire a chi guarda lo schermo.
 */
export async function aggiungiRicordo(testo) {
    const pulito = String(testo || '').trim();
    if (!pulito) return {esito: 'fallito', fatto: '', errore: 'fatto vuoto'};

    // Un modello che riscopre lo stesso fatto ogni due giorni riempirebbe la
    // memoria di copie: il confronto è alla buona ma prende i doppioni veri.
    const normale = pulito.toLowerCase();
    if (memoria.ricordi.some((r) => r.toLowerCase() === normale)) {
        return {esito: 'noto', fatto: pulito, errore: null};
    }

    const prima = memoria;
    memoria = {...memoria, ricordi: [...memoria.ricordi, pulito].slice(-MAX_RICORDI)};
    const errore = await salva();
    if (errore) {
        // Tenerlo in memoria e non su disco sarebbe la bugia peggiore:
        // funzionerebbe fino alla chiusura dell'app e poi no.
        memoria = prima;
        return {esito: 'fallito', fatto: pulito, errore};
    }
    return {esito: 'annotato', fatto: pulito, errore: null};
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
