import React, {useRef} from 'react';
import {Animated, Pressable} from 'react-native';
import {BlurView} from 'expo-blur';

// Un tasto che reagisce al tocco come una superficie, non come un disegno.
//
// Sotto il dito si abbassa appena e si vela di vetro; lasciandolo risale con
// una molla corta. Da fermo è **identico** a com'era prima: il velo vive solo
// durante il tocco e finito quello sparisce del tutto.
//
// **Un solo nodo, non due.** La prima versione avvolgeva il premibile in un
// contenitore e gli lasciava lo stile: sembrava innocuo e ha rotto mezza
// schermata. Uno stile non descrive solo l'aspetto, dice anche **dove sta la
// cosa** — `position: absolute`, `flex: 1`, i margini — e quelle proprietà
// valgono rispetto al genitore. Spostandole dentro un contenitore, i due tasti
// in alto si posizionavano rispetto a un riquadro di dimensione zero: si
// vedevano al loro posto ma non ricevevano più il tocco, perché su Android
// quello che esce dai confini del genitore non viene toccato. E le tre
// pastiglie in fondo, che si dividono la riga con `flex: 1`, si sono
// accartocciate in un angolo.
//
// Quindi lo stile resta dov'era, sul premibile, e l'animazione si aggiunge a
// quello stesso nodo.

const PremibileAnimato = Animated.createAnimatedComponent(Pressable);

export default function TastoLiquido({children, style, onPress, disabled, raggio = 999, ...resto}) {
    const premuto = useRef(new Animated.Value(0)).current;

    const anima = (verso) =>
        Animated.spring(premuto, {
            toValue: verso,
            useNativeDriver: true,
            damping: verso ? 20 : 13,
            stiffness: verso ? 320 : 210,
            mass: 0.6,
        }).start();

    return (
        <PremibileAnimato
            style={[
                style,
                {
                    transform: [{
                        scale: premuto.interpolate({inputRange: [0, 1], outputRange: [1, 0.94]}),
                    }],
                },
            ]}
            onPressIn={() => anima(1)}
            onPressOut={() => anima(0)}
            onPress={onPress}
            disabled={disabled}
            {...resto}
        >
            {children}
            <Animated.View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: raggio,
                    overflow: 'hidden',
                    opacity: premuto.interpolate({inputRange: [0, 1], outputRange: [0, 0.45]}),
                }}
            >
                <BlurView intensity={26} tint="light" style={{flex: 1}}/>
            </Animated.View>
        </PremibileAnimato>
    );
}
