import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, Text, View} from 'react-native';
import {BlurView} from 'expo-blur';
import {styles, COLORS} from '../styles/mainStyles';

// La leva che cambia modalità.
//
// Le due modalità non sono una variante l'una dell'altra: una risponde a
// comandi, l'altra è una conversazione aperta. Meritavano di stare in alto e
// di vedersi, non di essere un pulsante in fondo fra gli altri.
//
// Il vetro smerigliato è quello vero di sistema, non un colore chiaro che gli
// somiglia: sotto scorre l'interfaccia e si intravede.

const MODALITA = [
    {id: 'comandi', etichetta: 'COMANDI'},
    {id: 'conversazione', etichetta: 'CONVERSAZIONE'},
];

export default function ModeSwitch({valore, onChange, attiva, inAttesa}) {
    const indice = Math.max(0, MODALITA.findIndex((m) => m.id === valore));
    const scorrimento = useRef(new Animated.Value(indice)).current;
    const respiro = useRef(new Animated.Value(0)).current;
    const [larghezza, setLarghezza] = useState(0);

    useEffect(() => {
        Animated.spring(scorrimento, {
            toValue: indice,
            useNativeDriver: true,
            // Una molla appena elastica: si sente che la leva si sposta, senza
            // rimbalzare come un giocattolo.
            damping: 18,
            stiffness: 190,
            mass: 0.9,
        }).start();
    }, [indice, scorrimento]);

    // Quando la conversazione è aperta il bordo respira piano: da lontano si
    // capisce che sta ascoltando senza dover leggere niente.
    useEffect(() => {
        if (!attiva && !inAttesa) {
            respiro.stopAnimation();
            respiro.setValue(0);
            return;
        }

        const ciclo = Animated.loop(
            Animated.sequence([
                Animated.timing(respiro, {
                    toValue: 1,
                    duration: inAttesa ? 450 : 1400,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(respiro, {
                    toValue: 0,
                    duration: inAttesa ? 450 : 1400,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        ciclo.start();
        return () => ciclo.stop();
    }, [attiva, inAttesa, respiro]);

    const metà = larghezza ? larghezza / 2 : 0;

    return (
        <View
            style={styles.modeSwitch}
            onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}
        >
            <BlurView intensity={28} tint="dark" style={styles.modeSwitchBlur}>
                {/* Il cursore che scorre sotto alle scritte */}
                <Animated.View
                    style={[
                        styles.modeSwitchCursore,
                        {
                            width: metà,
                            transform: [{
                                translateX: scorrimento.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, metà],
                                }),
                            }],
                            borderColor: attiva ? COLORS.GREEN : COLORS.CYAN,
                            opacity: respiro.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0.55],
                            }),
                        },
                    ]}
                />

                {MODALITA.map((modalita) => {
                    const scelta = modalita.id === valore;
                    return (
                        <Pressable
                            key={modalita.id}
                            style={styles.modeSwitchMetà}
                            onPress={() => onChange(modalita.id)}
                            android_ripple={{color: 'rgba(0, 217, 255, 0.12)', borderless: false}}
                        >
                            <Text
                                style={[
                                    styles.modeSwitchTesto,
                                    scelta && styles.modeSwitchTestoScelto,
                                    scelta && attiva && styles.modeSwitchTestoAttivo,
                                ]}
                                numberOfLines={1}
                            >
                                {modalita.etichetta}
                            </Text>
                        </Pressable>
                    );
                })}
            </BlurView>
        </View>
    );
}
