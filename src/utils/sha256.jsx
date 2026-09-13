// SHA-256 in JavaScript puro.
//
// Serve a firmare le richieste della voce Edge. Si potrebbe usare
// expo-crypto, ma quello è un modulo nativo: aggiungerlo vuol dire toccare la
// compilazione Android per una funzione di sessanta righe che non ha
// dipendenze. Questa è verificata contro i valori noti dello standard.

const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function ruotaDestra(valore, quanto) {
    return (valore >>> quanto) | (valore << (32 - quanto));
}

/** Testo UTF-8 in byte. */
function inByte(testo) {
    const byte = [];
    for (const carattere of testo) {
        let punto = carattere.codePointAt(0);
        if (punto < 0x80) {
            byte.push(punto);
        } else if (punto < 0x800) {
            byte.push(0xc0 | (punto >> 6), 0x80 | (punto & 63));
        } else if (punto < 0x10000) {
            byte.push(0xe0 | (punto >> 12), 0x80 | ((punto >> 6) & 63), 0x80 | (punto & 63));
        } else {
            byte.push(
                0xf0 | (punto >> 18),
                0x80 | ((punto >> 12) & 63),
                0x80 | ((punto >> 6) & 63),
                0x80 | (punto & 63)
            );
        }
    }
    return byte;
}

/** Restituisce l'impronta in esadecimale minuscolo. */
export function sha256(testo) {
    const h = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    const byte = inByte(testo);
    const lunghezzaInBit = byte.length * 8;

    byte.push(0x80);
    while (byte.length % 64 !== 56) byte.push(0);

    // La lunghezza va in coda su 64 bit. I primi quattro byte restano a zero:
    // sono i bit alti, e un testo così lungo qui non esiste.
    byte.push(0, 0, 0, 0);
    byte.push(
        (lunghezzaInBit >>> 24) & 255,
        (lunghezzaInBit >>> 16) & 255,
        (lunghezzaInBit >>> 8) & 255,
        lunghezzaInBit & 255
    );

    const w = new Uint32Array(64);

    for (let blocco = 0; blocco < byte.length; blocco += 64) {
        for (let i = 0; i < 16; i++) {
            const p = blocco + i * 4;
            w[i] = (byte[p] << 24) | (byte[p + 1] << 16) | (byte[p + 2] << 8) | byte[p + 3];
        }

        for (let i = 16; i < 64; i++) {
            const s0 = ruotaDestra(w[i - 15], 7) ^ ruotaDestra(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = ruotaDestra(w[i - 2], 17) ^ ruotaDestra(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;

        for (let i = 0; i < 64; i++) {
            const S1 = ruotaDestra(e, 6) ^ ruotaDestra(e, 11) ^ ruotaDestra(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = ruotaDestra(a, 2) ^ ruotaDestra(a, 13) ^ ruotaDestra(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            hh = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hh) >>> 0;
    }

    return h.map((n) => n.toString(16).padStart(8, '0')).join('');
}
