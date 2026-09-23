import React, {useEffect, useRef} from 'react';
import {TouchableOpacity, View, Text, Animated, Easing} from 'react-native';
import {styles, COLORS} from '../styles/mainStyles';
import {useMisure} from '../utils/misure';

// Il lato del radar negli stili: serve a calcolare quanto spazio in più
// prendersi quando lo si ingrandisce.
const RADAR = 240;

export default function MicrophoneButton({onPress, isRecording, isLoading, animatedScale}) {
    const misure = useMisure();
    const rotation = useRef(new Animated.Value(0)).current;

    // Il radar ruota sempre, più veloce mentre ascolta: dà l'idea di un
    // sistema costantemente attivo, come nella versione desktop.
    useEffect(() => {
        rotation.setValue(0);
        const loop = Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: isRecording ? 2200 : 7000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [isRecording]);

    const spin = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const statusColor = isRecording ? COLORS.GREEN : isLoading ? COLORS.AMBER : COLORS.CYAN_DIM;
    const statusLabel = isRecording
        ? 'IN ASCOLTO...'
        : isLoading
            ? 'ELABORAZIONE...'
            : 'TOCCHI PER PARLARE';

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.radarTouchable}>
            {/* Si ingrandisce con una trasformazione invece che rifacendo le
                misure di ogni anello: una trasformazione non cambia lo spazio
                occupato, quindi il margine glielo restituisce. Così non si
                sposta nessuno stile di disposizione, che in questo progetto è
                già costato una build. */}
            <View
                style={[
                    styles.radarWrapper,
                    misure.scalaRadar !== 1 && {
                        transform: [{scale: misure.scalaRadar}],
                        marginVertical: Math.round((RADAR * (misure.scalaRadar - 1)) / 2),
                    },
                ]}
            >
                <View style={styles.radarRingOuter}/>
                <View style={styles.radarRingMiddle}/>
                <View style={styles.radarRingInner}/>

                <Animated.View style={[styles.radarSweep, {transform: [{rotate: spin}]}]}/>

                <View style={[styles.radarCorner, styles.radarCornerTL]}/>
                <View style={[styles.radarCorner, styles.radarCornerTR]}/>
                <View style={[styles.radarCorner, styles.radarCornerBL]}/>
                <View style={[styles.radarCorner, styles.radarCornerBR]}/>

                <Animated.View style={[styles.radarCore, {transform: [{scale: animatedScale}]}]}>
                    <Text style={styles.radarCoreText}>JARVIS</Text>
                </Animated.View>
            </View>

            <View style={styles.statusRow}>
                <View style={[styles.statusDot, {backgroundColor: statusColor}]}/>
                <Text style={[styles.statusText, {color: statusColor}]}>{statusLabel}</Text>
            </View>
        </TouchableOpacity>
    );
}
