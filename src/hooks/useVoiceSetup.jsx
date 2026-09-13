import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { AudioModule, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

export const useVoiceSetup = ({
                                  setAvailableVoices,
                                  setEnglishVoiceId,
                                  setRussianVoiceId,
                                  setSelectedVoiceId,
                              }) => {
    useEffect(() => {
        const setup = async () => {
            try {
                const permission = await AudioModule.requestRecordingPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Permesso per il microfono negato');
                    return;
                }

                await setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true,
                    // Senza questo la voce si zittisce appena si esce
                    // dall'app, e la bolla flottante non avrebbe senso.
                    shouldPlayInBackground: true,
                });

                const voices = await Speech.getAvailableVoicesAsync();
                const enVoices = voices.filter(v => v.language.startsWith('en-US'));
                const itVoices = voices.filter(v => v.language.startsWith('it'));

                setEnglishVoiceId(enVoices[0]?.identifier);
                setRussianVoiceId(itVoices[0]?.identifier);
                setAvailableVoices([...itVoices, ...enVoices]);

                const defaultVoice = itVoices.find(v =>
                    Platform.OS === 'ios' ? v.quality === 'enhanced' : true
                ) || itVoices[0];

                if (defaultVoice) {
                    setSelectedVoiceId(defaultVoice.identifier);
                    console.log('Voce italiana predefinita selezionata:', defaultVoice.name);
                } else {
                    console.warn('Nessuna voce italiana trovata sul dispositivo.');
                }
            } catch (err) {
                // Non è un guasto da annunciare. Qui si cerca la voce di
                // sistema del telefono, che è l'ultima riserva della modalità
                // a comandi: in conversazione la voce è il modello stesso e
                // questa non entra mai in gioco. Se Android non la elenca,
                // l'app funziona lo stesso — e una finestra a ogni avvio per
                // dire che manca una riserva mai usata è solo rumore.
                console.warn('Voci di sistema non disponibili:', err?.message || err);
            }
        };

        setup();
    }, []);
};
