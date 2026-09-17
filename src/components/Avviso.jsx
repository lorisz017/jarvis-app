import React from 'react';
import {Text, View} from 'react-native';
import {styles} from '../styles/mainStyles';
import FoglioLiquido from './FoglioLiquido';

// Un avviso che si toglie di mezzo da solo.
//
// Prima era una finestra di sistema con il suo tasto OK: per far sparire una
// riga di conferma bisognava centrare un pulsante. Qui basta toccare
// **ovunque** fuori dal riquadro — che è il gesto che uno fa comunque, senza
// pensarci — mentre il riquadro assorbe i tocchi e resta al suo posto.

export default function Avviso({visibile, titolo, testo, onChiudi}) {
    return (
        <FoglioLiquido visibile={visibile} onChiudi={onChiudi} stile={styles.avvisoFoglio} chiudiFuori>
            <View>
                {titolo ? <Text style={styles.avvisoTitolo}>{titolo}</Text> : null}
                <Text style={styles.avvisoTesto}>{testo}</Text>
                <Text style={styles.avvisoNota}>Tocchi fuori per chiudere</Text>
            </View>
        </FoglioLiquido>
    );
}
