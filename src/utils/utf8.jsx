// Decodifica UTF-8 a mano.
//
// Serve perché i messaggi della conversazione continua possono arrivare come
// dati binari, e la conversione che React Native usa per conto suo legge ogni
// byte come se fosse un carattere: "perché" diventa "perchÃ©". Le accentate
// occupano due byte, e trattarli separatamente li rompe tutti e due.
//
// Se l'ambiente ha un decodificatore vero si usa quello; questo resta per
// quando non c'è, ed è stato confrontato con l'implementazione di Node.

export function decodeUtf8(buffer) {
    const byte = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (typeof TextDecoder !== 'undefined') {
        try {
            return new TextDecoder('utf-8').decode(byte);
        } catch (error) {
            // Si prosegue a mano.
        }
    }

    let fuori = '';
    for (let i = 0; i < byte.length;) {
        const primo = byte[i];
        let punto;
        let quanti;

        if (primo < 0x80) {
            punto = primo;
            quanti = 1;
        } else if ((primo & 0xe0) === 0xc0) {
            punto = primo & 0x1f;
            quanti = 2;
        } else if ((primo & 0xf0) === 0xe0) {
            punto = primo & 0x0f;
            quanti = 3;
        } else if ((primo & 0xf8) === 0xf0) {
            punto = primo & 0x07;
            quanti = 4;
        } else {
            // Byte isolato che non comincia niente: carattere di sostituzione.
            fuori += '�';
            i += 1;
            continue;
        }

        if (i + quanti > byte.length) {
            fuori += '�';
            break;
        }

        let valido = true;
        for (let k = 1; k < quanti; k += 1) {
            const seguito = byte[i + k];
            if ((seguito & 0xc0) !== 0x80) {
                valido = false;
                break;
            }
            punto = (punto << 6) | (seguito & 0x3f);
        }

        if (!valido) {
            fuori += '�';
            i += 1;
            continue;
        }

        i += quanti;

        // Fuori dal piano base servono due unità: JavaScript conta in UTF-16.
        if (punto > 0xffff) {
            const resto = punto - 0x10000;
            fuori += String.fromCharCode(0xd800 + (resto >> 10), 0xdc00 + (resto & 0x3ff));
        } else {
            fuori += String.fromCharCode(punto);
        }
    }

    return fuori;
}
