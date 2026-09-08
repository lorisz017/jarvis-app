import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';
import {styles} from '../styles/mainStyles';

export default function Header() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const timeText = now.toLocaleTimeString('it-IT');
    const dateText = now.toLocaleDateString('it-IT', {weekday: 'short', day: '2-digit', month: 'short'});

    return (
        <View style={styles.header}>
            <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>J.A.R.V.I.S.</Text>
                <Text style={styles.headerSubtitle}>Just A Rather Very Intelligent System</Text>
            </View>
            <View style={styles.headerClockBlock}>
                <Text style={styles.headerClockText}>{timeText}</Text>
                <Text style={styles.headerDateText}>{dateText}</Text>
            </View>
        </View>
    );
}
