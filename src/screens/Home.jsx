import React, {useState, useRef, useEffect} from 'react';
import {
    Alert,
    AppState,
    BackHandler,
    Text,
    Animated,
    View,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync} from 'expo-audio';
import {Linking} from 'react-native';

import Header from '../components/Header';
import SystemStatus from '../components/SystemStatus';
import MicrophoneButton from '../components/MicrophoneButton';
import ActivityLog from '../components/ActivityLog';
import TastoLiquido from '../components/TastoLiquido';
import Occhio from '../components/Occhio';
import ResponseBox from '../components/ResponseBox';
import VoicePickerModal from '../components/VoicePickerModal';
import SettingsModal from '../components/SettingsModal';
import ModeSwitch from '../components/ModeSwitch';

import {useVoiceSetup} from '../hooks/useVoiceSetup';
import {speakJarvisResponse, stopJarvisVoice, setPreferredVoice} from '../services/ttsService';
import {processAudioWithOpenAI, processTextMessage, buildToolContext} from '../services/jarvisService';
import {setNativeAlarm, setNativeTimer, getWeatherByCity, createCalendarEvent} from '../services/deviceActions';
import {openApp, startNavigation} from '../services/appLauncher';
import {callContact, sendWhatsAppToContact} from '../services/contactsService';
import {loadState, saveState, DEFAULT_STATE} from '../services/storageService';
import {LiveSession, isLiveSupported, flushLiveAudio} from '../services/liveService';
import {
    caricaMemoria,
    dimenticaRicordo,
    getMemoria,
    setNota,
} from '../services/memoryService';
import {
    OVERLAY_STATE,
    hasOverlayPermission,
    hideOverlay,
    isOverlaySupported,
    onOverlayRemoved,
    onOverlayTap,
    requestOverlayPermission,
    setOverlayState,
    setOverlayVisible,
    showOverlay,
} from '../services/overlayService';
import {buildBriefing} from '../services/briefingService';

import {buildSystemMessage} from '../utils/constants';
import {styles} from '../styles/mainStyles';
import * as ImagePicker from 'expo-image-picker';

export default function Home() {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);
    const [displayedText, setDisplayedText] = useState('');
    // L'occhio: la fotocamera al posto del radar, dentro la conversazione.
    const [vistaAperta, setVistaAperta] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState(undefined);
    const [englishVoiceId, setEnglishVoiceId] = useState();
    const [russianVoiceId, setRussianVoiceId] = useState();
    const [isVoicePickerVisible, setIsVoicePickerVisible] = useState(false);
    const [chatHistory, setChatHistory] = useState([buildSystemMessage()]);

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
    // 'spenta' | 'connessione' | 'attiva'
    const [statoLive, setStatoLive] = useState('spenta');
    // 'comandi' | 'conversazione'. La conversazione è la modalità normale:
    // l'altra c'è ancora, ma va chiesta dalle impostazioni.
    const [modalita, setModalita] = useState('conversazione');
    const [isCommandModeEnabled, setIsCommandModeEnabled] = useState(false);
    const [apriConversazioneAllAvvio, setApriConversazioneAllAvvio] = useState(true);
    const [memoria, setMemoria] = useState({nota: '', ricordi: []});

    const scrollRef = useRef();
    // Quale voce sta parlando adesso e quanto ha detto finora: serve a
    // ricomporre la risposta dai frammenti che arrivano a flusso.
    const turnoLiveRef = useRef({chi: null, testo: ''});
    // Se la conversazione si è chiusa perché si è usciti dall'app, rientrando
    // va riaperta: chiuderla è una conseguenza dell'uscita, non una scelta.
    const chiusaPerUscitaRef = useRef(false);
    const animatedScale = useRef(new Animated.Value(1)).current;
    const briefingDoneRef = useRef(false);
    // Cosa deve fare un tocco sulla bolla in questo momento. È un riferimento
    // e non una funzione presa direttamente: l'ascoltatore nativo si registra
    // una volta sola, e senza questo si porterebbe dietro per sempre lo stato
    // del primo render.
    const bubbleActionRef = useRef(null);
    // Se in questo momento si sta registrando. Lo stato di React lo sa con un
    // istante di ritardo, e da fuori dall'app quel ritardo si vede: il secondo
    // tocco spegneva il microfono senza che la frase venisse mai elaborata.
    const staRegistrandoRef = useRef(false);
    // L'ultimo file audio già elaborato. Fuori dall'app arrivava sempre la
    // stessa prima frase: il registratore non riusciva a partire di nuovo e
    // continuava a restituire la registrazione precedente, che veniva
    // trascritta daccapo come se fosse nuova.
    const ultimoAudioRef = useRef(null);
    const sessioneLiveRef = useRef(null);
    // Vero se il servizio in primo piano è stato avviato apposta per la
    // conversazione, e va quindi spento quando finisce.
    const servizioPerLiveRef = useRef(false);

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
            // La memoria va letta prima della conversazione: il messaggio di
            // sistema la incorpora, e leggerla dopo vorrebbe dire partire
            // senza sapere niente di lui.
            setMemoria(await caricaMemoria());

            const saved = await loadState();
            // Il messaggio di sistema si costruisce **qui**, dopo la memoria:
            // quello preparato all'importazione del modulo è nato prima che il
            // file fosse letto, e portava dentro una memoria vuota.
            setChatHistory([buildSystemMessage(), ...saved.messages]);
            setIsVoiceEnabled(saved.isVoiceEnabled);
            setIsBriefingEnabled(saved.isBriefingEnabled);
            setVoiceName(saved.voiceName);
            setPreferredVoice(saved.voiceName);
            setHomeCity(saved.homeCity);
            // La bolla si riattiva solo se il permesso c'è ancora: può essere
            // stato revocato dalle impostazioni di Android nel frattempo.
            setIsOverlayEnabled(saved.isOverlayEnabled && (await hasOverlayPermission()));
            setIsCommandModeEnabled(saved.isCommandModeEnabled);
            setApriConversazioneAllAvvio(saved.apriConversazioneAllAvvio);
            if (!saved.isCommandModeEnabled) setModalita('conversazione');
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
            isCommandModeEnabled,
            apriConversazioneAllAvvio,
        });
    }, [
        isStateLoaded,
        chatHistory,
        isVoiceEnabled,
        isBriefingEnabled,
        homeCity,
        voiceName,
        isOverlayEnabled,
        isCommandModeEnabled,
        apriConversazioneAllAvvio,
    ]);

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
            sessioneLiveRef.current?.setMuta(!next);
            if (!next) {
                stopJarvisVoice();
                flushLiveAudio();
            }
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

        await speakJarvisResponse({text, scrollRef, setDisplayedText});
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
        // le voci si accavallano invece di fermarsi. Vale per entrambe le
        // modalità: anche la conversazione continua va zittita.
        stopJarvisVoice();
        flushLiveAudio();
        setDisplayedText('');
        setIsLoading(false);
        stopPulsing();
        // La sessione audio va rimessa in modalità registrazione prima di ogni
        // ripresa: dopo che J.A.R.V.I.S. ha parlato è impegnata dalla
        // riproduzione, e il microfono non riparte.
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
                shouldPlayInBackground: true,
            });
        } catch (error) {
            console.warn('Sessione audio non riconfigurata:', error);
        }

        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
        staRegistrandoRef.current = true;
        startPulsing();
    };

    const stopRecording = async () => {
        staRegistrandoRef.current = false;
        await audioRecorder.stop();
        stopPulsing();

        // Stesso file dell'ultima volta: il registratore non è ripartito, e
        // trascriverlo di nuovo farebbe rispondere alla frase precedente.
        // Meglio dirlo che far finta di aver capito.
        if (audioRecorder.uri && audioRecorder.uri === ultimoAudioRef.current) {
            await speak('Signore, non sono riuscito a registrare. Riprovi fra un istante.');
            return;
        }

        if (audioRecorder.uri) {
            ultimoAudioRef.current = audioRecorder.uri;
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
    // Un tocco sulla bolla apre la conversazione continua, non più il giro a
    // registrazione.
    //
    // Quel giro — registra un file, trascrivi, ragiona, sintetizza, riproduci
    // — ha cinque passaggi, e fuori dall'app ognuno può fallire in silenzio.
    // Dopo quattro correzioni era ancora rotto, e il problema non erano le
    // correzioni: era la strada. La conversazione continua non fa niente di
    // tutto questo, e fuori dall'app funziona per lo stesso motivo per cui
    // funziona dentro.
    useEffect(() => {
        bubbleActionRef.current = () => toggleLive();
    });

    useEffect(() => {
        return onOverlayTap(async () => {
            const azione = bubbleActionRef.current;
            if (!azione) return;

            try {
                await azione();
            } catch (error) {
                // Fuori dall'app non c'è uno schermo da guardare: se il tocco
                // non funziona bisogna sentirlo, altrimenti sembra solo che la
                // bolla sia morta. È quello che è successo al primo collaudo.
                console.warn('Tocco sulla bolla:', error);
                await speak('Signore, non riesco ad ascoltarla da qui.');
            }
        });
    }, []);

    // Conversazione aperta appena l'app è pronta, se la preferenza lo chiede.
    // Si aspetta il ripristino delle impostazioni, altrimenti si partirebbe
    // prima di sapere se è quello che vuole.
    const avvioLiveFattoRef = useRef(false);
    useEffect(() => {
        if (!isStateLoaded || avvioLiveFattoRef.current) return;
        if (!apriConversazioneAllAvvio || modalita !== 'conversazione') return;

        avvioLiveFattoRef.current = true;
        toggleLive();
    }, [isStateLoaded, apriConversazioneAllAvvio, modalita]);

    // Trascinata sulla linguetta "Rimuovi": l'interruttore si spegne da solo,
    // altrimenti le impostazioni direbbero che la bolla è accesa mentre non
    // c'è più, e riaccenderla richiederebbe due passaggi invece di uno.
    useEffect(() => {
        return onOverlayRemoved(() => {
            setIsOverlayEnabled(false);
            // Senza il servizio in primo piano Android non concede più il
            // microfono da fuori: lasciare la conversazione aperta vorrebbe
            // dire lasciarla muta senza dirlo.
            fermaLive();
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

    // Da fuori non si vede lo schermo dell'app: il colore della bolla è
    // l'unico modo per capire cosa sta succedendo. Verde quando la
    // conversazione è aperta e ti sta ascoltando, ambra mentre si collega o
    // mentre l'app sta elaborando, ciano quando è ferma.
    useEffect(() => {
        if (!isOverlayEnabled) return;

        if (statoLive === 'attiva') setOverlayState(OVERLAY_STATE.LISTENING);
        else if (statoLive === 'connessione' || isLoading) setOverlayState(OVERLAY_STATE.THINKING);
        else if (recorderState.isRecording) setOverlayState(OVERLAY_STATE.LISTENING);
        else setOverlayState(OVERLAY_STATE.IDLE);
    }, [isOverlayEnabled, statoLive, recorderState.isRecording, isLoading]);

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

    // === Conversazione continua ===
    // Non passa dal giro normale (registra, trascrivi, ragiona, sintetizza):
    // è un modello solo che ascolta e risponde con la propria voce, mentre
    // parli. Per questo va gestita a parte.
    // "Vai a dormire", "chiudi l'app", "ci sentiamo dopo". Congedarsi non è
    // chiudere e basta: la frase di saluto è già in viaggio quando l'azione
    // parte, e troncarla a metà sarebbe il modo peggiore di salutarsi. Quindi
    // si aspetta che abbia finito di parlare — non un tempo fisso, che sarebbe
    // un tiro a indovinare, ma la fine vera, con un limite oltre il quale non
    // si aspetta comunque.
    const congedo = async () => {
        const sessione = sessioneLiveRef.current;
        const scadenza = Date.now() + 12000;

        // Prima si aspetta che **cominci**: il saluto nasce dopo l'esito
        // dell'azione, e controllare subito se ha finito di parlare
        // troverebbe che non ha ancora iniziato, chiudendo l'app in silenzio.
        const inizio = Date.now() + 3500;
        while (sessione && !sessione.staParlando && Date.now() < inizio) {
            await new Promise((r) => setTimeout(r, 120));
        }

        // Poi che finisca davvero.
        while (sessione && sessione.staParlando && Date.now() < scadenza) {
            await new Promise((r) => setTimeout(r, 250));
        }

        // Un soffio dopo l'ultima sillaba: uscire nell'istante esatto in cui
        // tace taglia la coda della parola.
        await new Promise((r) => setTimeout(r, 400));
        // Anche a voce spenta o in modalità a comandi, un momento perché
        // l'ultima frase si veda a schermo prima che sparisca tutto.
        if (!sessione) await new Promise((r) => setTimeout(r, 1200));

        // Andare a dormire vuol dire smettere di ascoltare: la conversazione
        // si chiude anche se la bolla è accesa, e la bolla resta lì come il
        // modo per risvegliarlo.
        fermaLive();
        stopJarvisVoice();

        // Torna alla schermata iniziale del telefono, come il tasto Home.
        BackHandler.exitApp();
    };

    // L'azione risponde **subito**: la conversazione aspetta l'esito di ogni
    // strumento prima di far parlare il modello, quindi restare qui ad
    // aspettare vorrebbe dire impedirgli proprio il saluto che stiamo
    // aspettando. Il congedo va per conto suo.
    const vaiADormire = () => {
        congedo();
        return true;
    };

    // Guardare è una cosa che si fa **dentro** la conversazione: se non ce
    // n'è una aperta, aprirla è il primo passo, altrimenti i fotogrammi non
    // avrebbero dove andare.
    const apriChiudiVista = async () => {
        if (vistaAperta) {
            setVistaAperta(false);
            return;
        }

        setVistaAperta(true);
        if (!sessioneLiveRef.current && statoLive === 'spenta') await toggleLive();
    };

    const contestoAzioni = () => buildToolContext({
        goToSleep: vaiADormire,
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
    });

    const fermaLive = () => {
        sessioneLiveRef.current?.stop();
        sessioneLiveRef.current = null;
        setStatoLive('spenta');

        // Il servizio si spegne solo se era stato acceso per la
        // conversazione: se la bolla è attiva, deve restare.
        if (servizioPerLiveRef.current) {
            servizioPerLiveRef.current = false;
            if (!isOverlayEnabled) hideOverlay();
        }
    };

    // Uscire dall'app deve chiudere la conversazione, non lasciarla aperta a
    // microfono acceso dietro le altre applicazioni. L'eccezione è la bolla:
    // se è accesa, restare fuori è proprio il suo mestiere, e lì la
    // conversazione deve continuare.
    useEffect(() => {
        if (!isStateLoaded) return;

        const iscrizione = AppState.addEventListener('change', (stato) => {
            if (stato === 'active') {
                // Si riprende da dove si era, ma solo se era stata chiusa
                // uscendo e solo se la conversazione si apre da sola: altrimenti
                // si riaccenderebbe da sé una cosa che lui aveva spento.
                if (chiusaPerUscitaRef.current) {
                    chiusaPerUscitaRef.current = false;
                    if (apriConversazioneAllAvvio && modalita === 'conversazione') toggleLive();
                }
                return;
            }

            if (isOverlayEnabled) return;
            if (!sessioneLiveRef.current) return;

            chiusaPerUscitaRef.current = true;
            setVistaAperta(false);
            fermaLive();
        });

        return () => iscrizione.remove();
    }, [isStateLoaded, isOverlayEnabled, apriConversazioneAllAvvio, modalita]);

    const toggleLive = async () => {
        if (statoLive !== 'spenta') {
            fermaLive();
            return;
        }

        if (!isLiveSupported()) {
            Alert.alert(
                'Non disponibile',
                'La conversazione continua richiede Android e la chiave Gemini.'
            );
            return;
        }

        // Le due modalità non possono usare il microfono insieme.
        stopJarvisVoice();
        if (staRegistrandoRef.current) await stopRecording();

        // Il servizio in primo piano va acceso prima di cominciare, se non lo
        // è già. È quello che tiene vivo il processo quando si esce dall'app e
        // che mantiene il permesso del microfono: senza, la conversazione
        // funziona finché l'app è aperta e poi resta appesa. Il cerchio non si
        // mostra — quello dipende dall'interruttore delle impostazioni.
        if (!isOverlayEnabled && isOverlaySupported() && (await hasOverlayPermission())) {
            if (await showOverlay()) {
                setOverlayVisible(false);
                servizioPerLiveRef.current = true;
            }
        }

        const sessione = new LiveSession({
            contesto: contestoAzioni(),
            onStato: (stato, dettagli) => {
                setStatoLive(stato === 'chiusa' ? 'spenta' : stato);
                if (stato === 'chiusa') {
                    sessioneLiveRef.current = null;
                    // Senza una conversazione i fotogrammi non hanno dove
                    // andare: tenere la fotocamera accesa sarebbe solo una
                    // spia rossa che non serve a niente.
                    setVistaAperta(false);
                    // La leva torna indietro solo se la sessione è **caduta**,
                    // e solo se la modalità a comandi esiste: spostarla dopo
                    // uno stop chiesto da lui lasciava il radar in mano ai
                    // comandi, e il tocco successivo — quello per riprendere a
                    // parlare — apriva una registrazione invece della
                    // conversazione. Da fuori sembrava che non rispondesse più.
                    if (!dettagli?.volontaria && isCommandModeEnabled) setModalita('comandi');
                }
            },
            onTesto: ({chi, testo}) => {
                if (!testo?.trim()) return;
                // Le trascrizioni arrivano a pezzi mentre si parla: si
                // accodano all'ultima riga se è della stessa voce, invece di
                // riempire il registro di frammenti.
                setChatHistory((prev) => {
                    const ruolo = chi === 'utente' ? 'user' : 'assistant';
                    const ultimo = prev[prev.length - 1];
                    if (chi !== 'azione' && ultimo?.role === ruolo && ultimo.live) {
                        const aggiornato = {...ultimo, content: `${ultimo.content}${testo}`};
                        return [...prev.slice(0, -1), aggiornato];
                    }
                    return [...prev, {role: ruolo, content: testo, live: true}];
                });
                // Il riquadro sopra il registro mostra l'ultima risposta
                // **intera**. Le trascrizioni arrivano parola per parola: se
                // ognuna sostituisse la precedente resterebbe a schermo solo
                // l'ultima, che è esattamente come si comportava.
                if (chi !== 'utente') {
                    if (turnoLiveRef.current.chi !== chi) {
                        turnoLiveRef.current = {chi, testo: ''};
                    }
                    turnoLiveRef.current.testo += testo;
                    setDisplayedText(turnoLiveRef.current.testo);
                } else {
                    // Ha ripreso la parola: la risposta che segue è nuova.
                    turnoLiveRef.current = {chi: null, testo: ''};
                }
                // Se l'azione era un'annotazione, la sezione Memoria deve
                // mostrarla adesso: è l'unico modo per vedere subito se la
                // scrittura è arrivata a destinazione.
                if (chi === 'azione') setMemoria({...getMemoria()});
            },
            onErrore: (errore) => {
                console.warn('Conversazione continua:', errore);
                // Anche nel registro, non solo in una finestra: la finestra si
                // chiude con un tocco e il motivo sparisce, e senza quel
                // motivo non si capisce perché la conversazione sia morta.
                setChatHistory((prev) => [
                    ...prev,
                    {role: 'assistant', content: `Conversazione continua: ${errore.message}`},
                ]);
                Alert.alert('Conversazione continua', errore.message);
                fermaLive();
            },
        });

        sessione.setMuta(!isVoiceEnabled);
        sessioneLiveRef.current = sessione;
        await sessione.start();
    };

    // Se si chiude l'app la sessione va chiusa: resterebbe il microfono
    // acceso e la connessione aperta.
    useEffect(() => () => sessioneLiveRef.current?.stop(), []);

    // La leva non è una preferenza da ricordare: cambiarla accende o spegne
    // davvero la conversazione, così quello che si vede e quello che succede
    // restano la stessa cosa.
    const cambiaModalita = async (nuova) => {
        if (nuova === modalita) return;

        if (nuova === 'conversazione') {
            setModalita('conversazione');
            if (statoLive === 'spenta') await toggleLive();
            return;
        }

        setModalita('comandi');
        if (statoLive !== 'spenta') fermaLive();
    };

    const sendTypedMessage = async () => {
        const message = typedText.trim();
        if (!message) return;

        // Stessa logica di interruzione voce usata dal microfono: scrivere
        // un nuovo messaggio mentre JARVIS sta ancora parlando lo interrompe.
        stopJarvisVoice();
        flushLiveAudio();
        setTypedText('');

        // In conversazione la frase scritta entra nella sessione aperta
        // invece di aprire un giro a parte: stessa memoria, stessa voce.
        if (sessioneLiveRef.current?.sendText(message)) {
            setChatHistory((prev) => [...prev, {role: 'user', content: message, live: true}]);
            return;
        }

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
            {modalita === 'conversazione' ? (
                <TastoLiquido style={styles.eyeButton} onPress={apriChiudiVista}>
                    <Text style={styles.settingsButtonText}>{vistaAperta ? '🚫' : '📷'}</Text>
                </TastoLiquido>
            ) : null}

            <TastoLiquido style={styles.settingsButton} onPress={() => setIsSettingsVisible(true)}>
                <Text style={styles.settingsButtonText}>⋮</Text>
            </TastoLiquido>

            <TastoLiquido style={styles.voiceToggleButton} onPress={toggleVoice}>
                <Text style={styles.voiceToggleButtonText}>{isVoiceEnabled ? '🔊' : '🔇'}</Text>
            </TastoLiquido>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Header/>

                {isCommandModeEnabled ? (
                    <ModeSwitch
                        valore={modalita}
                        onChange={cambiaModalita}
                        attiva={statoLive === 'attiva'}
                        inAttesa={statoLive === 'connessione'}
                    />
                ) : null}

                <SystemStatus/>

                {vistaAperta ? (
                    <Occhio
                        attiva={statoLive === 'attiva'}
                        inAttesa={statoLive === 'connessione'}
                        onFotogramma={(base64) => sessioneLiveRef.current?.sendFrame(base64)}
                        onChiudi={() => setVistaAperta(false)}
                    />
                ) : (
                <MicrophoneButton
                    onPress={
                        modalita === 'conversazione'
                            // Mentre si collega il tocco si ignora: premendo
                            // più volte si apriva e chiudeva la sessione a
                            // metà collegamento, e il risultato era confusione.
                            ? (statoLive === 'connessione' ? () => {} : toggleLive)
                            : recorderState.isRecording ? stopRecording : record
                    }
                    isRecording={
                        modalita === 'conversazione'
                            ? statoLive === 'attiva'
                            : recorderState.isRecording
                    }
                    isLoading={
                        modalita === 'conversazione'
                            ? statoLive === 'connessione'
                            : isLoading
                    }
                    animatedScale={animatedScale}
                />
                )}

                <ActivityLog chatHistory={chatHistory}/>

                <ResponseBox
                    isLoading={isLoading}
                    displayedText={displayedText}
                    scrollRef={scrollRef}
                />

                <View style={styles.controlsContainer}>
                    {modalita === 'conversazione' ? (
                        <Text style={styles.conversazioneNota}>
                            {statoLive === 'attiva'
                                ? 'La conversazione è aperta, signore. Parli pure, o scriva se preferisce.'
                                : statoLive === 'connessione'
                                    ? 'Mi sto collegando, signore...'
                                    : 'Conversazione chiusa. Tocchi il cerchio per riaprirla.'}
                        </Text>
                    ) : null}

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
                        <TastoLiquido style={styles.sendButton} onPress={sendTypedMessage}>
                            <Text style={styles.sendButtonText}>➤</Text>
                        </TastoLiquido>
                    </KeyboardAvoidingView>

                    <View style={styles.actionRow}>
                        <TastoLiquido style={styles.pillButton} onPress={() => setIsVoicePickerVisible(true)}>
                            <Text style={styles.pillButtonIcon}>🎙</Text>
                            <Text style={styles.pillButtonText}>VOCE</Text>
                        </TastoLiquido>

                        <TastoLiquido
                            style={[styles.pillButton, styles.pillButtonDanger]}
                            onPress={() => {
                                setChatHistory([buildSystemMessage()]);
                                setDisplayedText('In attesa dei suoi comandi, signore.');
                                Alert.alert('Chat cancellata', 'La cronologia della conversazione è stata azzerata.');
                            }}
                        >
                            <Text style={styles.pillButtonIcon}>🗑</Text>
                            <Text style={[styles.pillButtonText, styles.pillButtonTextDanger]}>PULISCI</Text>
                        </TastoLiquido>

                        <TastoLiquido
                            style={[styles.pillButton, styles.pillButtonDanger]}
                            onPress={() => {
                                // Due modalità, due sorgenti audio diverse: la voce
                                // sintetizzata e quella della conversazione continua.
                                // FERMA deve zittirle tutte e due, altrimenti in
                                // conversazione non fa niente.
                                stopJarvisVoice();
                                flushLiveAudio();
                                setDisplayedText('');
                            }}
                        >
                            <Text style={styles.pillButtonIcon}>⛔</Text>
                            <Text style={[styles.pillButtonText, styles.pillButtonTextDanger]}>FERMA</Text>
                        </TastoLiquido>
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
                isCommandModeEnabled={isCommandModeEnabled}
                onToggleCommandMode={() => {
                    setIsCommandModeEnabled((prima) => {
                        // Spegnendola mentre la si sta usando si tornerebbe a
                        // una schermata senza leva e bloccata sui comandi: si
                        // riporta in conversazione insieme all'interruttore.
                        if (prima && modalita === 'comandi') cambiaModalita('conversazione');
                        return !prima;
                    });
                }}
                apriConversazioneAllAvvio={apriConversazioneAllAvvio}
                onToggleApriAllAvvio={() => setApriConversazioneAllAvvio((p) => !p)}
                memoria={memoria}
                onSalvaNota={async (nota) => {
                    const errore = await setNota(nota);
                    setMemoria({...getMemoria()});
                    if (errore) {
                        Alert.alert('Memoria non salvata', errore);
                        return;
                    }
                    // Una conversazione già aperta ha ricevuto il prompt di
                    // sistema quando è partita: quello che si scrive adesso lo
                    // saprà solo la prossima. Meglio dirlo che lasciarlo
                    // scoprire chiedendoglielo e sentendosi rispondere di no.
                    if (sessioneLiveRef.current) {
                        setChatHistory((prev) => [...prev, {
                            role: 'assistant',
                            content: 'Memoria aggiornata. La conversazione in corso non la conosce ' +
                                'ancora: chiuda e riapra il radar perché la legga.',
                            live: true,
                        }]);
                    }
                }}
                onDimentica={async (indice) => {
                    await dimenticaRicordo(indice);
                    setMemoria({...getMemoria()});
                }}
                onRileggiMemoria={() => setMemoria({...getMemoria()})}
            />
        </SafeAreaView>
    );
}
