// Elenco delle funzioni dell'app, mostrato nella scheda "Funzioni" delle
// impostazioni. Fa anche da manuale: per ogni voce, la frase da dire.
export const FEATURE_SECTIONS = [
    {
        title: 'VOCE E TESTO',
        items: [
            {name: 'Comando vocale', example: 'Tocchi il radar e parli'},
            {name: 'Comando scritto', example: 'Scriva nel campo in fondo alla schermata'},
            {name: 'Risposta parlata', example: 'Voce naturale, con ripiego su quella di sistema'},
            {name: 'Voce disattivabile', example: 'Il pulsante in alto a destra'},
            {name: 'Interruzione immediata', example: 'Il pulsante FERMA, o tocchi il radar'},
            {name: 'Bolla flottante', example: 'Resta sopra le altre app: un tocco per parlare'},
        ],
    },
    {
        title: 'INFORMAZIONI',
        items: [
            {name: 'Meteo', example: '"Che tempo fa a Milano?"'},
            {name: 'Ricerca sul web', example: '"Chi ha vinto ieri?", "Prezzo di..."'},
            {name: 'Riepilogo di apertura', example: 'All\'avvio: ora, meteo e impegni del giorno'},
        ],
    },
    {
        title: 'TEMPO E PROMEMORIA',
        items: [
            {name: 'Sveglia', example: '"Svegliami alle 7 e 30"'},
            {name: 'Timer', example: '"Timer di 10 minuti per la pasta"'},
            {name: 'Promemoria', example: '"Ricordami tra 20 minuti di chiamare il dentista"'},
            {name: 'Elenco promemoria', example: '"Che promemoria ho?"'},
            {name: 'Annulla promemoria', example: '"Cancella i promemoria"'},
            {name: 'Evento in calendario', example: '"Appuntamento domani alle 15 dal dentista"'},
        ],
    },
    {
        title: 'TELEFONO E APP',
        items: [
            {name: 'Chiamate', example: '"Chiama Marco"'},
            {name: 'Messaggi WhatsApp', example: '"Manda un whatsapp a Marco che arrivo"'},
            {name: 'Navigazione', example: '"Portami a Milano"'},
            {name: 'Apertura app', example: '"Apri Spotify" — una ventina di app note'},
            {name: 'Fotocamera', example: '"Apri la fotocamera"'},
            {name: 'Telegram', example: '"Apri Telegram"'},
            {name: 'YouTube', example: '"Cerca musica rilassante su YouTube"'},
        ],
    },
    {
        title: 'SVILUPPO',
        items: [
            {name: 'Crea repository', example: '"Crea un repository chiamato ..."'},
            {name: 'Elimina repository', example: '"Elimina il repository ..." — con conferma'},
            {name: 'Ultimi commit', example: '"Mostrami gli ultimi commit"'},
            {name: 'Nota', example: 'Richiede il token GitHub configurato su expo.dev'},
        ],
    },
    {
        title: 'SISTEMA',
        items: [
            {name: 'Registro attività', example: 'La conversazione, scorrevole sotto il radar'},
            {name: 'Memoria persistente', example: 'La chat resta anche dopo aver chiuso l\'app'},
            {name: 'Monitor batteria', example: 'Livello e stato di ricarica nell\'intestazione'},
        ],
    },
];
