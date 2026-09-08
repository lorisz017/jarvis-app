import {Linking} from 'react-native';

// Registro delle app più comuni: ogni voce ha lo schema URI per aprirla
// direttamente (se installata) e il nome del pacchetto Android, usato come
// ripiego per aprire la sua scheda sul Play Store se l'apertura diretta
// fallisce (app non installata, o schema non supportato su quel dispositivo).
const APP_REGISTRY = {
    whatsapp: {scheme: 'whatsapp://', packageName: 'com.whatsapp'},
    instagram: {scheme: 'instagram://app', packageName: 'com.instagram.android'},
    facebook: {scheme: 'fb://', packageName: 'com.facebook.katana'},
    messenger: {scheme: 'fb-messenger://', packageName: 'com.facebook.orca'},
    spotify: {scheme: 'spotify:', packageName: 'com.spotify.music'},
    gmail: {scheme: 'googlegmail://', packageName: 'com.google.android.gm'},
    maps: {scheme: 'comgooglemaps://', packageName: 'com.google.android.apps.maps'},
    chrome: {scheme: 'googlechrome://', packageName: 'com.android.chrome'},
    netflix: {scheme: 'nflx://', packageName: 'com.netflix.mediaclient'},
    tiktok: {scheme: 'tiktok://', packageName: 'com.zhiliaoapp.musically'},
    twitter: {scheme: 'twitter://', packageName: 'com.twitter.android'},
    linkedin: {scheme: 'linkedin://', packageName: 'com.linkedin.android'},
    discord: {scheme: 'discord://', packageName: 'com.discord'},
    snapchat: {scheme: 'snapchat://', packageName: 'com.snapchat.android'},
    pinterest: {scheme: 'pinterest://', packageName: 'com.pinterest'},
    reddit: {scheme: 'reddit://', packageName: 'com.reddit.frontpage'},
    twitch: {scheme: 'twitch://', packageName: 'tv.twitch.android.app'},
    paypal: {scheme: 'paypal://', packageName: 'com.paypal.android.p2pmobile'},
    drive: {scheme: 'googledrive://', packageName: 'com.google.android.apps.docs'},
    photos: {scheme: 'googlephotos://', packageName: 'com.google.android.apps.photos'},
    playstore: {scheme: 'market://', packageName: 'com.android.vending'},
    impostazioni: {scheme: 'android.settings.SETTINGS', packageName: null, isSettings: true},
};

// Nomi diversi con cui l'utente potrebbe chiamare la stessa app a voce o
// scrivendola: ognuno rimanda alla chiave corrispondente in APP_REGISTRY.
const ALIASES = {
    whatsapp: 'whatsapp',
    'whats app': 'whatsapp',
    instagram: 'instagram',
    insta: 'instagram',
    facebook: 'facebook',
    fb: 'facebook',
    messenger: 'messenger',
    spotify: 'spotify',
    gmail: 'gmail',
    posta: 'gmail',
    email: 'gmail',
    mail: 'gmail',
    maps: 'maps',
    mappe: 'maps',
    'google maps': 'maps',
    chrome: 'chrome',
    browser: 'chrome',
    netflix: 'netflix',
    tiktok: 'tiktok',
    'tik tok': 'tiktok',
    twitter: 'twitter',
    x: 'twitter',
    linkedin: 'linkedin',
    discord: 'discord',
    snapchat: 'snapchat',
    pinterest: 'pinterest',
    reddit: 'reddit',
    twitch: 'twitch',
    paypal: 'paypal',
    drive: 'drive',
    'google drive': 'drive',
    photos: 'photos',
    foto: 'photos',
    'google foto': 'photos',
    playstore: 'playstore',
    'play store': 'playstore',
    impostazioni: 'impostazioni',
    settings: 'impostazioni',
};

function normalize(name) {
    return (name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // rimuove accenti
        .trim();
}

// Apre un'app conosciuta a partire dal suo nome (in italiano o inglese).
// Se non è tra quelle note, o se l'apertura diretta fallisce perché non è
// installata, prova ad aprire la sua scheda sul Play Store.
export const openApp = async (rawName) => {
    const normalized = normalize(rawName);
    const key = ALIASES[normalized];
    const app = key ? APP_REGISTRY[key] : undefined;

    if (!app) {
        throw new Error(`app "${rawName}" non riconosciuta`);
    }

    if (app.isSettings) {
        await Linking.sendIntent(app.scheme);
        return;
    }

    try {
        await Linking.openURL(app.scheme);
    } catch (error) {
        if (!app.packageName) throw error;
        await Linking.openURL(`market://details?id=${app.packageName}`);
    }
};

// Avvia la navigazione verso una destinazione. Prova prima a far partire
// direttamente le indicazioni stradali di Google Maps; se l'app non c'è,
// ripiega sulla versione web.
export const startNavigation = async (destination) => {
    const query = encodeURIComponent(destination);

    try {
        await Linking.openURL(`google.navigation:q=${query}`);
    } catch (error) {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    }
};
