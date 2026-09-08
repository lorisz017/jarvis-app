import React from 'react';
import {View, ScrollView, Text, ActivityIndicator, Alert} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {styles} from '../styles/mainStyles';

export default function ResponseBox({isLoading, displayedText, scrollRef}) {

    const copyToClipboard = () => {
        Clipboard.setStringAsync(displayedText);
        Alert.alert('Signore', 'Risposta copiata negli appunti.');
    };

    return (
        <View style={styles.thirdCon}>
            {isLoading && <ActivityIndicator size="large" color="#00ff00" style={{marginTop: 10}}/>}
            <ScrollView
                ref={scrollRef}
                style={styles.responseScrollView}
                contentContainerStyle={styles.responseScrollViewContent}
            >
                <Text onPress={copyToClipboard} style={styles.resp}>
                    {displayedText || (isLoading ? 'Sto pensando...' : 'In attesa dei suoi comandi, signore.')}
                </Text>
            </ScrollView>
        </View>
    );
}