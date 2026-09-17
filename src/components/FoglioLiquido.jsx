import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Modal, Pressable} from 'react-native';
import {BlurView} from 'expo-blur';
import {styles} from '../styles/mainStyles';

// L'involucro dei pannelli che si aprono sopra la schermata.
//
// Al posto della comparsa a scorrimento di sistema: il fondo si vela di vetro
// smerigliato — quello vero, sotto si intravede l'interfaccia — mentre il
// foglio sale di poco e si apre da 92 a 100 con una molla. Chiudendolo la
// stessa cosa al contrario, e il pannello resta montato finché l'animazione
// non è finita, altrimenti sparirebbe di scatto a metà.
//
// Da fermo, aperto, è esattamente il pannello di prima: nessun velo, nessuna
// trasformazione residua.

export default function FoglioLiquido({visibile, onChiudi, stile, chiudiFuori, children}) {
    const apertura = useRef(new Animated.Value(0)).current;
    const [montato, setMontato] = useState(visibile);

    useEffect(() => {
        if (visibile) {
            setMontato(true);
            Animated.spring(apertura, {
                toValue: 1,
                useNativeDriver: true,
                damping: 22,
                stiffness: 240,
                mass: 0.85,
            }).start();
            return;
        }

        Animated.timing(apertura, {
            toValue: 0,
            duration: 190,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
        }).start(({finished}) => {
            if (finished) setMontato(false);
        });
    }, [visibile, apertura]);

    if (!montato) return null;

    return (
        <Modal animationType="none" transparent visible onRequestClose={onChiudi}>
            <Animated.View style={[styles.modalOverlay, {opacity: apertura}]}>
                {/* Toccare accanto al pannello lo chiude, quando è previsto.
                    Il foglio è avvolto in un premibile che non fa niente:
                    serve solo ad assorbire il tocco, perché in React Native
                    un tocco che nessuno raccoglie risale al genitore — e il
                    genitore, qui, è il gesto che chiude. */}
                {chiudiFuori ? (
                    <Pressable
                        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                        onPress={onChiudi}
                    />
                ) : null}
                <BlurView
                    intensity={36}
                    tint="dark"
                    pointerEvents="none"
                    style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                />
                <Animated.View
                    style={[
                        stile,
                        {
                            transform: [
                                {
                                    scale: apertura.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1],
                                    }),
                                },
                                {
                                    translateY: apertura.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [26, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {chiudiFuori ? <Pressable onPress={() => {}}>{children}</Pressable> : children}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
