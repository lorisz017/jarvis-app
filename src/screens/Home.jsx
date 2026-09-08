import React, {useState, useRef} from 'react';
import {
    Alert,
    TouchableOpacity,
    Text,
    Animated,
    View,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAudioRecorder, useAudioRecorderState, RecordingPresets} from 'expo-audio';
import {Linking} from 'react-native';

import Header from '../components/Header';
import MicrophoneButton from '../components/MicrophoneButton';
import ActivityLog from '../components/ActivityLog';
import ResponseBox from '../components/ResponseBox';
import VoicePickerModal from '../components/VoicePickerModal';

import {useVoiceSetup} from '../hooks/useVoiceSetup';
import {speakJarvisResponse, stopJarvisVoice} from '../services/ttsService';
import {processAudioWithOpenAI, processTextMessage} from '../services/jarvisService';
import {setNativeAlarm, setNativeTimer, getWeatherByCity, createCalendarEvent} from '../services/deviceActions';
import {openApp} from '../services/appLauncher';

import {SYSTEM_MESSAGE} from '../utils/constants';
import {styles} from '../styles/mainStyles';
import * as ImagePicker from 'expo-image-picker';

export default function Home() {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);
    const [displayedText, setDisplayedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState(undefined);
    const [englishVoiceId, setEnglishVoiceId] = useState();
    const [russianVoiceId, setRussianVoiceId] = useState();
    const [isVoicePickerVisible, setIsVoicePickerVisible] = useState(false);
    const [chatHistory, setChatHistory] = useState([SYSTEM_MESSAGE]);

    // Testo digitato dall'utente nel campo di input
    const [typedText, setTypedText] = useState('');
    // Toggle voce: quando false, JARVIS risponde solo a schermo (niente TTS)
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

    const scrollRef = useRef();
    const animatedScale = useRef(new Animated.Value(1)).current;

    useVoiceSetup({
        setAvailableVoices,
        setEnglishVoiceId,
        setRussianVoiceId,
        setSelectedVoiceId,
    });

    const startPulsing = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedScale, {
                    toValue: 1.1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedScale, {
                    toValue: 1.0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopPulsing = () => {
        animatedScale.stopAnimation();
        animatedScale.setValue(1);
    };

    const speak = async (text) => {
        // Voce disattivata: mostra comunque il testo, come farebbe la TTS,
        // ma senza riprodurre audio.
        if (!isVoiceEnabled) {
            setDisplayedText(text);
            scrollRef?.current?.scrollToEnd({animated: true});
            return;
        }

        await speakJarvisResponse({
            text,
            selectedVoiceId,
            availableVoices,
            scrollRef,
            setDisplayedText,
            setSelectedVoiceId,
            englishVoiceId,
            russianVoiceId,
        });
    };

    const openCamera = async () => {
        try {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permesso negato', 'Per usare la fotocamera è necessario concedere il permesso.');
                await speak('Signore, non posso aprire la fotocamera senza il suo permesso.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });

            if (!result.canceled) {
                console.log('Foto scattata:', result.assets[0].uri);
                await speak('Signore, foto scattata con successo.');
            } else {
                await speak('Signore, ha annullato lo scatto.');
            }
        } catch (error) {
            console.error('Errore durante l\'apertura della fotocamera:', error);
            Alert.alert('Errore fotocamera', 'Impossibile aprire la fotocamera: ' + error.message);
            await speak('Signore, si è verificato un errore nel tentativo di aprire la fotocamera.');
        }
    };

    const openTelegram = async () => {
        const tgUrl = 'tg://';
        const fallbackUrl = 'https://t.me';

        try {
            await Linking.openURL(tgUrl);
            await speak('Apro Telegram, signore.');
        } catch (error) {
            await Linking.openURL(fallbackUrl);
            await speak('Signore, Telegram non è installato. Passo al browser.');
        }
    };

    const openYoutube = async (query) => {
        try {
            if (query) {
                const youtubeAppUrl = `vnd.youtube://results?search_query=${encodeURIComponent(query)}`;

                await Linking.openURL(youtubeAppUrl);
                await speak(`Apro YouTube per la ricerca: ${query}, signore.`);
            } else {
                const youtubeAppUrl = `vnd.youtube://`;

                await Linking.openURL(youtubeAppUrl);
                await speak(`Apro YouTube, signore.`);
            }
        } catch (error) {
            const fallbackUrl = query
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
                : `https://youtube.com`;

            await Linking.openURL(fallbackUrl);
            await speak(`Signore, l'app di YouTube non è stata trovata. Apro nel browser.`);
        }
    };

    const record = async () => {
        // Interrompe subito qualsiasi voce ancora in corso: senza questo,
        // premendo di nuovo il microfono mentre JARVIS sta ancora parlando,
        // le voci si accavallano invece di fermarsi.
        stopJarvisVoice();
        setDisplayedText('');
        setIsLoading(false);
        stopPulsing();
        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
        startPulsing();
    };

    const stopRecording = async () => {
        await audioRecorder.stop();
        stopPulsing();
        if (audioRecorder.uri) {
            await processAudioWithOpenAI({
                audioUri: audioRecorder.uri,
                chatHistory,
                setChatHistory,
                setDisplayedText,
                setJarvisResponseText: setDisplayedText,
                speak,
                openCamera,
                openTelegram,
                openYoutube,
                openApp,
                setNativeAlarm,
                setNativeTimer,
                getWeatherByCity,
                createCalendarEvent,
                setIsLoading,
            });
        }
    };

    const sendTypedMessage = async () => {
        const message = typedText.trim();
        if (!message) return;

        // Stessa logica di interruzione voce usata dal microfono: scrivere
        // un nuovo messaggio mentre JARVIS sta ancora parlando lo interrompe.
        stopJarvisVoice();
        setTypedText('');

        await processTextMessage({
            text: message,
            chatHistory,
            setChatHistory,
            setDisplayedText,
            setJarvisResponseText: setDisplayedText,
            speak,
            openCamera,
            openTelegram,
            openYoutube,
            openApp,
            setNativeAlarm,
            setNativeTimer,
            getWeatherByCity,
            createCalendarEvent,
            setIsLoading,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Toggle voce, fisso in alto a destra, sopra tutto il resto */}
            <TouchableOpacity
                style={styles.voiceToggleButton}
                onPress={() => setIsVoiceEnabled((prev) => {
                    const next = !prev;
                    if (!next) {
                        // Disattivando la voce, ferma subito quella in corso
                        stopJarvisVoice();
                    }
                    return next;
                })}
            >
                <Text style={styles.voiceToggleButtonText}>{isVoiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Header/>

                <MicrophoneButton
                    onPress={recorderState.isRecording ? stopRecording : record}
                    isRecording={recorderState.isRecording}
                    isLoading={isLoading}
                    animatedScale={animatedScale}
                />

                <ActivityLog chatHistory={chatHistory}/>

                <ResponseBox
                    isLoading={isLoading}
                    displayedText={displayedText}
                    scrollRef={scrollRef}
                />

                <View style={styles.controlsContainer}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.textInputRow}
                    >
                        <TextInput
                            style={styles.textInput}
                            value={typedText}
                            onChangeText={setTypedText}
                            placeholder="Scriva un comando, signore..."
                            placeholderTextColor="rgba(200, 244, 255, 0.35)"
                            onSubmitEditing={sendTypedMessage}
                            returnKeyType="send"
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={sendTypedMessage}>
                            <Text style={styles.sendButtonText}>➤</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.pillButton} onPress={() => setIsVoicePickerVisible(true)}>
                            <Text style={styles.pillButtonIcon}>🎙</Text>
                            <Text style={styles.pillButtonText}>VOCE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.pillButton, styles.pillButtonDanger]}
                            onPress={() => {
                                setChatHistory([SYSTEM_MESSAGE]);
                                setDisplayedText('In attesa dei suoi comandi, signore.');
                                Alert.alert('Chat cancellata', 'La cronologia della conversazione è stata azzerata.');
                            }}
                        >
                            <Text style={styles.pillButtonIcon}>🗑</Text>
                            <Text style={[styles.pillButtonText, styles.pillButtonTextDanger]}>PULISCI</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.pillButton, styles.pillButtonDanger]}
                            onPress={() => {
                                stopJarvisVoice();
                                setDisplayedText('');
                            }}
                        >
                            <Text style={styles.pillButtonIcon}>⛔</Text>
                            <Text style={[styles.pillButtonText, styles.pillButtonTextDanger]}>FERMA</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <VoicePickerModal
                isVisible={isVoicePickerVisible}
                availableVoices={availableVoices}
                selectedVoiceId={selectedVoiceId}
                setSelectedVoiceId={setSelectedVoiceId}
                onClose={() => setIsVoicePickerVisible(false)}
            />
        </SafeAreaView>
    );
}
