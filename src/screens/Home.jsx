import React, {useState, useRef, useEffect} from 'react';
import {
    Alert,
    AppState,
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
import SystemStatus from '../components/SystemStatus';
import MicrophoneButton from '../components/MicrophoneButton';
import ActivityLog from '../components/ActivityLog';
import ResponseBox from '../components/ResponseBox';
import VoicePickerModal from '../components/VoicePickerModal';
import SettingsModal from '../components/SettingsModal';

import {useVoiceSetup} from '../hooks/useVoiceSetup';
import {speakJarvisResponse, stopJarvisVoice, setPreferredVoice} from '../services/ttsService';
import {processAudioWithOpenAI, processTextMessage} from '../services/jarvisService';
import {setNativeAlarm, setNativeTimer, getWeatherByCity, createCalendarEvent} from '../services/deviceActions';
import {openApp, startNavigation} from '../services/appLauncher';
import {callContact, sendWhatsAppToContact} from '../services/contactsService';
import {loadState, saveState, DEFAULT_STATE} from '../services/storageService';
import {
    OVERLAY_STATE,
    hasOverlayPermission,
    hideOverlay,
    isOverlaySupported,
    onOverlayTap,
    requestOverlayPermission,
    setOverlayState,
    setOverlayVisible,
    showOverlay,
} from '../services/overlayService';
import {buildBriefing} from '../services/briefingService';

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
    // Città usata dal briefing di apertura per il meteo
    const [homeCity, setHomeCity] = useState(DEFAULT_STATE.homeCity);
    const [isBriefingEnabled, setIsBriefingEnabled] = useState(true);
    // Voce Deepgram scelta nelle impostazioni; vuota = scelta automatica
    const [voiceName, setVoiceName] = useState('');
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isStateLoaded, setIsStateLoaded] = useState(false);
    const [isOverlayEnabled, setIsOverlayEnabled] = useState(false);

    const scrollRef = useRef();
    const animatedScale = useRef(new Animated.Value(1)).current;
    const briefingDoneRef = useRef(false);
    // Cosa deve fare un tocco sulla bolla in questo momento. È un riferimento
    // e non una funzione presa direttamente: l'ascoltatore nativo si registra
    // una volta sola, e senza questo si porterebbe dietro per sempre lo stato
    // del primo render.
    const bubbleActionRef = useRef(null);

    useVoiceSetup({
        setAvailableVoices,
        setEnglishVoiceId,
        setRussianVoiceId,
        setSelectedVoiceId,
    });

    // Ripristina conversazione e preferenze dell'ultima sessione. Il messaggio
    // di sistema viene sempre riletto dal codice attuale, così i comandi
    // aggiunti nel frattempo restano validi anche su una chat vecchia.
    useEffect(() => {
        (async () => {
            const saved = await loadState();
            setChatHistory([SYSTEM_MESSAGE, ...saved.messages]);
            setIsVoiceEnabled(saved.isVoiceEnabled);
            setIsBriefingEnabled(saved.isBriefingEnabled);
            setVoiceName(saved.voiceName);
            setPreferredVoice(saved.voiceName);
            setHomeCity(saved.homeCity);
            // La bolla si riattiva solo se il permesso c'è ancora: può essere
            // stato revocato dalle impostazioni di Android nel frattempo.
            setIsOverlayEnabled(saved.isOverlayEnabled && (await hasOverlayPermission()));
            setIsStateLoaded(true);
        })();
    }, []);

    // Salva solo dopo il caricamento iniziale: salvare prima sovrascriverebbe
    // il file con lo stato vuoto di partenza.
    useEffect(() => {
        if (!isStateLoaded) return;
        saveState({
            messages: chatHistory,
            isVoiceEnabled,
            isBriefingEnabled,
            homeCity,
            voiceName,
            isOverlayEnabled,
        });
    }, [isStateLoaded, chatHistory, isVoiceEnabled, isBriefingEnabled, homeCity, voiceName, isOverlayEnabled]);

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

    // Usato sia dal pulsante in alto a destra sia dalla riga nelle
    // impostazioni: spegnendo la voce, quella in corso si ferma subito.
    const toggleVoice = () => {
        setIsVoiceEnabled((prev) => {
            const next = !prev;
            if (!next) stopJarvisVoice();
            return next;
        });
    };

    // Cambia la voce naturale dalle impostazioni: vale già dalla frase
    // successiva, senza ricompilare, e viene ricordata al prossimo avvio.
    const chooseVoice = (name) => {
        setVoiceName(name);
        setPreferredVoice(name);
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

    // Briefing di apertura: saluto in base all'ora, meteo della città
    // impostata e impegni di oggi. Una sola volta per avvio dell'app, e solo
    // dopo il ripristino delle preferenze, così usa la città giusta e
    // rispetta il toggle della voce.
    useEffect(() => {
        if (!isStateLoaded || briefingDoneRef.current) return;
        briefingDoneRef.current = true;
        if (!isBriefingEnabled) return;

        (async () => {
            try {
                const briefing = await buildBriefing(homeCity);
                setChatHistory((prev) => [...prev, {role: 'assistant', content: briefing}]);
                await speak(briefing);
            } catch (error) {
                console.warn('Briefing di apertura:', error);
            }
        })();
    }, [isStateLoaded]);

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
                startNavigation,
                callContact,
                sendWhatsAppToContact,
                setHomeCity,
                setNativeAlarm,
                setNativeTimer,
                getWeatherByCity,
                createCalendarEvent,
                setIsLoading,
            });
        }
    };

    // === Bolla flottante ===
    // Il tocco sulla bolla fa la stessa cosa del microfono nell'app: se sta
    // registrando ferma e manda, altrimenti comincia ad ascoltare.
    useEffect(() => {
        bubbleActionRef.current = recorderState.isRecording ? stopRecording : record;
    });

    useEffect(() => {
        return onOverlayTap(() => {
            const azione = bubbleActionRef.current;
            if (azione) azione();
        });
    }, []);

    // Il servizio parte qui, con l'app ancora aperta: Android concede il
    // microfono a un servizio in primo piano solo se a chiederlo è un'app che
    // in quel momento è in primo piano. Farlo partire nel momento in cui si
    // esce, come faceva la versione precedente, era proprio la richiesta che
    // Android rifiutava — ed era il motivo dei blocchi.
    useEffect(() => {
        if (!isStateLoaded) return;

        if (!isOverlayEnabled) {
            hideOverlay();
            return;
        }

        showOverlay();
        setOverlayVisible(false);

        // Il cerchio compare solo quando si esce: dentro c'è già il radar, due
        // cerchi sovrapposti non servono a nessuno.
        const iscrizione = AppState.addEventListener('change', (stato) => {
            setOverlayVisible(stato !== 'active');
        });

        return () => iscrizione.remove();
    }, [isStateLoaded, isOverlayEnabled]);

    // Da fuori non si vede lo schermo dell'app: il colore e la velocità della
    // bolla sono l'unico modo per capire se sta ascoltando o ragionando.
    useEffect(() => {
        if (!isOverlayEnabled) return;

        if (recorderState.isRecording) setOverlayState(OVERLAY_STATE.LISTENING);
        else if (isLoading) setOverlayState(OVERLAY_STATE.THINKING);
        else setOverlayState(OVERLAY_STATE.IDLE);
    }, [isOverlayEnabled, recorderState.isRecording, isLoading]);

    const toggleOverlay = async () => {
        if (isOverlayEnabled) {
            setIsOverlayEnabled(false);
            hideOverlay();
            return;
        }

        if (!isOverlaySupported()) {
            Alert.alert('Non disponibile', 'La bolla flottante esiste solo nella versione Android.');
            return;
        }

        // Questo permesso Android non lo concede da una finestra di dialogo:
        // apre una sua schermata, e va attivato lì a mano. Capita su tutti i
        // telefoni, non è una stranezza dell'app.
        if (!(await hasOverlayPermission())) {
            Alert.alert(
                'Serve un permesso',
                'Android chiede di autorizzare a mano la sovrapposizione alle altre app. ' +
                'Le apro la schermata: attivi il permesso, torni qui e riaccenda la bolla.',
                [
                    {text: 'Annulla', style: 'cancel'},
                    {text: 'Apri impostazioni', onPress: requestOverlayPermission},
                ]
            );
            return;
        }

        setIsOverlayEnabled(true);
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
            startNavigation,
            callContact,
            sendWhatsAppToContact,
            setHomeCity,
            setNativeAlarm,
            setNativeTimer,
            getWeatherByCity,
            createCalendarEvent,
            setIsLoading,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Impostazioni e toggle voce, fissi in alto a destra */}
            <TouchableOpacity style={styles.settingsButton} onPress={() => setIsSettingsVisible(true)}>
                <Text style={styles.settingsButtonText}>⋮</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voiceToggleButton} onPress={toggleVoice}>
                <Text style={styles.voiceToggleButtonText}>{isVoiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Header/>

                <SystemStatus/>

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

            <SettingsModal
                isVisible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
                homeCity={homeCity}
                setHomeCity={setHomeCity}
                isVoiceEnabled={isVoiceEnabled}
                onToggleVoice={toggleVoice}
                isBriefingEnabled={isBriefingEnabled}
                setIsBriefingEnabled={setIsBriefingEnabled}
                onSelectVoice={chooseVoice}
                isOverlayEnabled={isOverlayEnabled}
                onToggleOverlay={toggleOverlay}
            />
        </SafeAreaView>
    );
}
