import React, {useEffect, useRef} from 'react';
import {View, ScrollView, Text} from 'react-native';
import {styles} from '../styles/mainStyles';

export default function ActivityLog({chatHistory}) {
    const scrollRef = useRef();

    const entries = (chatHistory || []).filter(
        (message) => message.role === 'user' || message.role === 'assistant'
    );

    useEffect(() => {
        scrollRef.current?.scrollToEnd({animated: true});
    }, [entries.length]);

    return (
        <View style={styles.activityLogContainer}>
            <Text style={styles.activityLogTitle}>REGISTRO ATTIVITÀ</Text>
            <ScrollView ref={scrollRef} style={styles.activityLogScroll}>
                {entries.length === 0 ? (
                    <Text style={styles.activityLogEmpty}>Nessuna attività, in attesa dei suoi comandi.</Text>
                ) : (
                    entries.map((entry, index) => {
                        const isUser = entry.role === 'user';
                        const content = entry.content || '';
                        const line = content.length > 100 ? `${content.slice(0, 100)}…` : content;

                        return (
                            <Text key={index} style={styles.activityLogLine}>
                                <Text style={isUser ? styles.activityLogLabelUser : styles.activityLogLabelJarvis}>
                                    {isUser ? 'TU' : 'JARVIS'}:{' '}
                                </Text>
                                {line}
                            </Text>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
