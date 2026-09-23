import {useWindowDimensions} from 'react-native';

// Le misure che cambiano con lo schermo.
//
// Il disegno dell'app è nato su un telefono in verticale, e quelle misure
// erano numeri fissi: una colonna larga 380, il radar da 240, il registro da
// 190 e il riquadro della risposta da 200. Su un telefono riempiono lo
// schermo; su un tablet diventano una striscia stretta in mezzo a due campi
// di nero, e in orizzontale non ci stanno nemmeno in altezza — sono già più
// di settecento punti prima dei margini.
//
// Qui quei numeri smettono di essere fissi. **Sul telefono in verticale
// restano identici a com'erano**, perché quella è la disposizione confermata
// e non si tocca: cambiano solo dove prima non c'era niente di pensato.

// Il lato corto è la misura con cui Android distingue un tablet da un
// telefono: un telefono girato in orizzontale resta un telefono.
const LATO_TABLET = 600;

// I valori di partenza, che sono quelli del telefono.
const COLONNA = 380;
const REGISTRO = 190;
const RISPOSTA = 200;

// Sotto questa altezza i due riquadri non possono tenersi le loro misure: fra
// radar, intestazione, pastiglie e campo di testo non resterebbe niente da
// vedere. Succede su un telefono in orizzontale.
const ALTEZZA_STRETTA = 560;

export function useMisure() {
    const {width, height} = useWindowDimensions();
    const grande = Math.min(width, height) >= LATO_TABLET;

    if (!grande) {
        if (height >= ALTEZZA_STRETTA) {
            return {colonna: COLONNA, scalaRadar: 1, registro: REGISTRO, risposta: RISPOSTA};
        }
        // Telefono in orizzontale: i riquadri si accontentano di una quota
        // dell'altezza invece di mangiarsela tutta.
        return {
            colonna: COLONNA,
            scalaRadar: 0.8,
            registro: Math.round(height * 0.3),
            risposta: Math.round(height * 0.32),
        };
    }

    // Tablet. La colonna si allarga fino a dove resta comoda da leggere — una
    // riga lunghissima non è un miglioramento — e il radar cresce con lei,
    // perché a misura di telefono in mezzo a un tablet sembra perso.
    return {
        colonna: Math.min(Math.round(width * 0.62), 620),
        scalaRadar: 1.25,
        registro: Math.round(Math.min(height * 0.24, 300)),
        risposta: Math.round(Math.min(height * 0.26, 320)),
    };
}
