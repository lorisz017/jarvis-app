import React, {useEffect, useRef, useState} from 'react';
import {View, ScrollView, Text} from 'react-native';
import {styles} from '../styles/mainStyles';

// Quanto si può stare sopra il fondo continuando a considerarsi "in fondo":
// scorrendo con un dito non ci si ferma mai al pixel esatto.
const VICINO_AL_FONDO = 40;

export default function ActivityLog({chatHistory, onGesto}) {
    const scrollRef = useRef();
    // Finché si sta guardando il fondo, il registro segue la conversazione da
    // solo. Appena si risale a rileggere qualcosa deve restare fermo: essere
    // riportati in fondo mentre si legge è il modo più rapido di perdere il
    // segno.
    const [seguiIlFondo, setSeguiIlFondo] = useState(true);

    const entries = (chatHistory || []).filter(
        (message) => message.role === 'user' || message.role === 'assistant'
    );

    // Non basta contare le righe: in conversazione l'ultima **cresce** parola
    // per parola senza che ne compaiano di nuove, ed era proprio in quel caso
    // che il registro restava indietro.
    const ultimo = entries[entries.length - 1];
    const impronta = `${entries.length}:${ultimo?.content?.length || 0}`;

    useEffect(() => {
        if (!seguiIlFondo) return;
        scrollRef.current?.scrollToEnd({animated: true});
    }, [impronta, seguiIlFondo]);

    const guarda = ({nativeEvent}) => {
        const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
        const distanza = contentSize.height - layoutMeasurement.height - contentOffset.y;
        setSeguiIlFondo(distanza <= VICINO_AL_FONDO);
    };

    // Scorrere qui dentro non deve trascinarsi dietro la pagina: appena il
    // dito tocca il riquadro la pagina sotto si ferma, e riprende quando il
    // dito si stacca o quando il riquadro ha finito di scorrere.
    return (
        <View
            style={styles.activityLogContainer}
            onTouchStart={() => onGesto?.(true)}
            onTouchEnd={() => onGesto?.(false)}
            onTouchCancel={() => onGesto?.(false)}
        >
            <Text style={styles.activityLogTitle}>REGISTRO ATTIVITÀ</Text>
            <ScrollView
                ref={scrollRef}
                style={styles.activityLogScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                onScroll={guarda}
                scrollEventThrottle={80}
                onScrollBeginDrag={() => onGesto?.(true)}
                onScrollEndDrag={() => onGesto?.(false)}
                onMomentumScrollEnd={() => onGesto?.(false)}
            >
                {entries.length === 0 ? (
                    <Text style={styles.activityLogEmpty}>Nessuna attività, in attesa dei suoi comandi.</Text>
                ) : (
                    entries.map((entry, index) => {
                        const isUser = entry.role === 'user';
                        // Niente taglio ai cento caratteri: una risposta
                        // troncata con i puntini è proprio quella che si
                        // vorrebbe rileggere, e il registro esiste per
                        // rileggere. Per la lunghezza c'è lo scorrimento.
                        const content = entry.content || '';

                        return (
                            <Text key={index} selectable style={styles.activityLogLine}>
                                <Text style={isUser ? styles.activityLogLabelUser : styles.activityLogLabelJarvis}>
                                    {isUser ? 'TU' : 'JARVIS'}:{' '}
                                </Text>
                                {content}
                            </Text>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
