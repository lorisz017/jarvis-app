// Conversione byte / base64, in un posto solo.
//
// Serviva già alla voce e alla ricerca, ognuna con la sua copia. Con l'arrivo
// di una terza le copie diventavano tre, e una copia che invecchia da sola è
// un errore che aspetta di succedere.

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const TABELLA = new Uint8Array(256);
for (let i = 0; i < ALFABETO.length; i++) TABELLA[ALFABETO.charCodeAt(i)] = i;

/** Byte in base64, con il riempimento finale dove serve. */
export function bytesToBase64(bytes) {
    const pezzi = [];
    const n = bytes.length;
    const interi = n - (n % 3);

    for (let i = 0; i < interi; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        pezzi.push(
            ALFABETO[b0 >> 2] +
            ALFABETO[((b0 & 3) << 4) | (b1 >> 4)] +
            ALFABETO[((b1 & 15) << 2) | (b2 >> 6)] +
            ALFABETO[b2 & 63]
        );
    }

    const resto = n - interi;
    if (resto === 1) {
        const b0 = bytes[n - 1];
        pezzi.push(`${ALFABETO[b0 >> 2]}${ALFABETO[(b0 & 3) << 4]}==`);
    } else if (resto === 2) {
        const b0 = bytes[n - 2];
        const b1 = bytes[n - 1];
        pezzi.push(
            `${ALFABETO[b0 >> 2]}${ALFABETO[((b0 & 3) << 4) | (b1 >> 4)]}${ALFABETO[(b1 & 15) << 2]}=`
        );
    }

    return pezzi.join('');
}

/** Base64 in byte. Ignora a capo e riempimento. */
export function base64ToBytes(b64) {
    const puliti = String(b64).replace(/[^A-Za-z0-9+/]/g, '');
    const gruppi = puliti.length >> 2;
    const coda = puliti.length & 3;
    const bytes = new Uint8Array(gruppi * 3 + (coda === 3 ? 2 : coda === 2 ? 1 : 0));
    let i = 0;
    let p = 0;

    for (let g = 0; g < gruppi; g++) {
        const n =
            (TABELLA[puliti.charCodeAt(i++)] << 18) |
            (TABELLA[puliti.charCodeAt(i++)] << 12) |
            (TABELLA[puliti.charCodeAt(i++)] << 6) |
            TABELLA[puliti.charCodeAt(i++)];
        bytes[p++] = n >> 16;
        bytes[p++] = (n >> 8) & 255;
        bytes[p++] = n & 255;
    }

    if (coda >= 2) {
        const c0 = TABELLA[puliti.charCodeAt(i++)];
        const c1 = TABELLA[puliti.charCodeAt(i++)];
        bytes[p++] = (c0 << 2) | (c1 >> 4);
        if (coda === 3) bytes[p++] = ((c1 & 15) << 4) | (TABELLA[puliti.charCodeAt(i)] >> 2);
    }

    return bytes;
}
