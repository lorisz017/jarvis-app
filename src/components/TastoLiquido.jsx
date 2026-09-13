import React, {useRef} from 'react';
import {Animated, Pressable} from 'react-native';
import {BlurView} from 'expo-blur';

// Un tasto che reagisce al tocco come una superficie, non come un disegno.
//
// Sotto il dito si abbassa appena e si vela di vetro; lasciandolo risale con
// una molla corta. Da fermo è **identico** a com'era prima: il velo vive solo
// durante il tocco e finito quello sparisce del tutto.
//
// Si usa al posto di TouchableOpacity, con le stesse proprietà. Lo stile resta
// sul Pressable e non sul contenitore, così l'area toccabile non si restringe
// di quanto vale il bordo interno.

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
        <Animated.View
            style={{
                transform: [{
                    scale: premuto.interpolate({inputRange: [0, 1], outputRange: [1, 0.94]}),
                }],
            }}
        >
            <Pressable
                style={style}
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
            </Pressable>
        </Animated.View>
    );
}
