import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

// La bolla flottante è codice nativo Android: su altre piattaforme il modulo
// non esiste, e tutto quello che segue diventa una serie di no-op invece di
// far crollare l'app.
const modulo = Platform.OS === 'android' ? NativeModules.JarvisOverlay : null;
const emettitore = modulo ? new NativeEventEmitter(modulo) : null;

// Gli stati che la bolla sa mostrare. Devono corrispondere alle costanti in
// OverlayBubbleView.kt.
export const OVERLAY_STATE = {
    IDLE: 'idle',
    LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking',
};

export const isOverlaySupported = () => Boolean(modulo);

export async function hasOverlayPermission() {
    if (!modulo) return false;
    try {
        return await modulo.hasPermission();
    } catch (error) {
        console.warn('Permesso sovrapposizione:', error);
        return false;
    }
}

// Apre la schermata di sistema: questo permesso non si concede da una
// finestrella come gli altri, va attivato a mano nelle impostazioni Android.
export function requestOverlayPermission() {
    try {
        modulo?.requestPermission();
    } catch (error) {
        console.warn('Richiesta permesso sovrapposizione:', error);
    }
}

export async function showOverlay() {
    if (!modulo) return false;
    try {
        return await modulo.show();
    } catch (error) {
        console.warn('Avvio bolla:', error);
        return false;
    }
}

export function hideOverlay() {
    try {
        modulo?.hide();
    } catch (error) {
        console.warn('Chiusura bolla:', error);
    }
}

// Mostra o nasconde il cerchio senza spegnere il servizio. Sono due cose
// separate apposta: il servizio deve partire mentre l'app è ancora in primo
// piano, perché è l'unico momento in cui Android concede il microfono, mentre
// il cerchio deve comparire solo quando si esce.
export function setOverlayVisible(visibile) {
    try {
        modulo?.setVisible(visibile);
    } catch (error) {
        console.warn('Visibilità bolla:', error);
    }
}

// Riporta davanti l'app dopo un'azione che ha aperto un'altra schermata.
export function bringAppToFront() {
    try {
        modulo?.bringAppToFront();
    } catch (error) {
        console.warn('Rientro in primo piano:', error);
    }
}

export function setOverlayState(stato) {
    try {
        modulo?.setState(stato);
    } catch (error) {
        console.warn('Stato bolla:', error);
    }
}

function ascolta(evento, callback) {
    if (!emettitore) return () => {};
    const iscrizione = emettitore.addListener(evento, callback);
    return () => iscrizione.remove();
}

/** Tocco breve sulla bolla: si comincia o si smette di ascoltare. */
export const onOverlayTap = (callback) => ascolta('jarvisOverlayTap', callback);

/** Pressione lunga: l'app è tornata in primo piano. */
export const onOverlayOpenApp = (callback) => ascolta('jarvisOverlayOpenApp', callback);

/** Trascinata sulla linguetta "Rimuovi": la bolla è stata tolta. */
export const onOverlayRemoved = (callback) => ascolta('jarvisOverlayRemoved', callback);
