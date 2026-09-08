import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';
import * as Battery from 'expo-battery';
import {styles, COLORS} from '../styles/mainStyles';

export default function SystemStatus() {
    const [level, setLevel] = useState(null);
    const [isCharging, setIsCharging] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const read = async () => {
            try {
                const [batteryLevel, batteryState] = await Promise.all([
                    Battery.getBatteryLevelAsync(),
                    Battery.getBatteryStateAsync(),
                ]);
                if (cancelled) return;
                setLevel(Math.round(batteryLevel * 100));
                setIsCharging(batteryState === Battery.BatteryState.CHARGING);
            } catch (error) {
                console.warn('Lettura batteria:', error);
            }
        };

        read();
        const interval = setInterval(read, 60000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    if (level === null) return null;

    const color = isCharging ? COLORS.GREEN : level <= 20 ? COLORS.RED : level <= 50 ? COLORS.AMBER : COLORS.CYAN;

    return (
        <View style={styles.systemStatusRow}>
            <Text style={styles.systemStatusLabel}>ALIMENTAZIONE</Text>

            <View style={styles.systemStatusBarTrack}>
                <View style={[styles.systemStatusBarFill, {width: `${level}%`, backgroundColor: color}]}/>
            </View>

            <Text style={[styles.systemStatusValue, {color}]}>
                {level}%{isCharging ? ' ⚡' : ''}
            </Text>
        </View>
    );
}
