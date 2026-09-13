import React, {useEffect, useRef, useState} from 'react';
import {View, ScrollView, Text, ActivityIndicator, Alert} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {styles} from '../styles/mainStyles';

const VICINO_AL_FONDO = 30;

export default function ResponseBox({isLoading, displayedText, scrollRef}) {
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

    const copyToClipboard = () => {
        Clipboard.setStringAsync(displayedText);
        Alert.alert('Signore', 'Risposta copiata negli appunti.');
    };

    return (
        <View style={styles.thirdCon}>
            {isLoading && <ActivityIndicator size="large" color="#00ff00" style={{marginTop: 10}}/>}
            <ScrollView
                ref={riquadro}
                style={styles.responseScrollView}
                contentContainerStyle={styles.responseScrollViewContent}
                onScroll={guarda}
                scrollEventThrottle={80}
            >
                <Text onPress={copyToClipboard} selectable style={styles.resp}>
                    {displayedText || (isLoading ? 'Sto pensando...' : 'In attesa dei suoi comandi, signore.')}
                </Text>
            </ScrollView>
        </View>
    );
}