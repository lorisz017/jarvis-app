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
                console.error('Voice setup error:', err);
                Alert.alert('Errore configurazione voce', err.message);
            }
        };

        setup();
    }, []);
};
