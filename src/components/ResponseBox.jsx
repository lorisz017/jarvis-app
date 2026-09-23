import React, {useEffect, useRef, useState} from 'react';
import {View, ScrollView, Text, ActivityIndicator, Alert} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {styles} from '../styles/mainStyles';
import {useMisure} from '../utils/misure';

const VICINO_AL_FONDO = 30;

export default function ResponseBox({isLoading, displayedText, scrollRef, onGesto}) {
    const misure = useMisure();
    const mio = useRef();
    const riquadro = scrollRef || mio;
    // Come per il registro: mentre la risposta arriva a flusso il riquadro la
    // segue, ma se si risale a rileggere resta dov'è.
    const [seguiIlFondo, setSeguiIlFondo] = useState(true);

    useEffect(() => {
        if (!seguiIlFondo) return;
        riquadro.current?.scrollToEnd({animated: true});
    }, [displayedText, seguiIlFondo]);

    const guarda = ({nativeEvent}) => {
        const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
        const distanza = contentSize.height - layoutMeasurement.height - contentOffset.y;
        setSeguiIlFondo(distanza <= VICINO_AL_FONDO);
    };

    // Copiare al primo tocco rendeva il testo impossibile da selezionare: ogni
    // volta che si provava a prenderne un pezzo partiva la copia dell'intera
    // risposta. Ora copia il **doppio** tocco; il tocco singolo non fa niente,
    // così restano liberi sia la selezione sia lo scorrimento.
    const ultimoTocco = useRef(0);

    const forseCopia = () => {
        const adesso = Date.now();
        if (adesso - ultimoTocco.current < 300) {
            ultimoTocco.current = 0;
            Clipboard.setStringAsync(displayedText);
            Alert.alert('Signore', 'Risposta copiata negli appunti.');
            return;
        }
        ultimoTocco.current = adesso;
    };

    // Scorrere qui dentro non deve trascinarsi dietro la pagina: appena il
    // dito tocca il riquadro la pagina sotto si ferma, e riprende quando il
    // dito si stacca o quando il riquadro ha finito di scorrere.
    return (
        <View
            style={[styles.thirdCon, {maxWidth: misure.colonna, height: misure.risposta}]}
            onTouchStart={() => onGesto?.(true)}
            onTouchEnd={() => onGesto?.(false)}
            onTouchCancel={() => onGesto?.(false)}
        >
            {isLoading && <ActivityIndicator size="large" color="#00ff00" style={{marginTop: 10}}/>}
            <ScrollView
                ref={riquadro}
                style={styles.responseScrollView}
                contentContainerStyle={styles.responseScrollViewContent}
                onScroll={guarda}
                scrollEventThrottle={80}
                onScrollBeginDrag={() => onGesto?.(true)}
                onScrollEndDrag={() => onGesto?.(false)}
                onMomentumScrollEnd={() => onGesto?.(false)}
                // Senza questo, su Android un riquadro scorrevole dentro un
                // altro riquadro scorrevole non scorre affatto: il gesto se lo
                // prende quello esterno e la risposta lunga resta tagliata.
                nestedScrollEnabled
            >
                <Text onPress={forseCopia} selectable style={styles.resp}>
                    {displayedText || (isLoading ? 'Sto pensando...' : 'In attesa dei suoi comandi, signore.')}
                </Text>
            </ScrollView>
        </View>
    );
}