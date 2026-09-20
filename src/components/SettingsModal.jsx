import React, {useState, useEffect, useRef} from 'react';
import {Animated, Easing, View, Text, ScrollView, TouchableOpacity, TextInput, Linking} from 'react-native';
import {BlurView} from 'expo-blur';
import {styles} from '../styles/mainStyles';
import FoglioLiquido from './FoglioLiquido';
import TastoLiquido from './TastoLiquido';
import {FEATURE_SECTIONS} from '../utils/features';
import {getVoiceInfo, getUltimoErroreEdge} from '../services/ttsService';
import {statoMemoria} from '../services/memoryService';
import {statoChiavi, setChiave} from '../services/chiaviService';
import {statisticheLive, diagnosticaAudio} from '../services/liveService';

const APP_VERSION = '3.0.0';
const GITHUB_PROFILE = 'https://github.com/lorisz017';
const GITHUB_REPO = 'https://github.com/lorisz017/jarvis-app';
const UPSTREAM_REPO = 'https://github.com/az11k-dev/jarvis-app';
const INSPIRATION_REPO = 'https://github.com/FatihMakes/Mark-LIII';

const TABS = [
    {key: 'settings', label: 'IMPOSTAZIONI'},
    {key: 'features', label: 'FUNZIONI'},
    {key: 'about', label: 'INFO'},
];

// Una chiave. Non mostra mai quella che c'è — né la propria né quella
// arrivata con l'installazione — perché una chiave visibile è una chiave che
// finisce in uno screenshot. Dice solo da dove viene e quanto è lunga.
function RigaChiave({dati, onSalva}) {
    const [valore, setValore] = useState('');
    const [salvata, setSalvata] = useState(false);

    const salva = async () => {
        await onSalva(dati.id, valore);
        setValore('');
        setSalvata(true);
        setTimeout(() => setSalvata(false), 2500);
    };

    const stato = dati.origine === 'tua'
        ? `impostata da lei · ${dati.lunghezza} caratteri`
        : dati.origine === 'installazione'
            ? `inclusa in questa installazione · ${dati.lunghezza} caratteri`
            : dati.necessaria ? 'MANCANTE — serve questa' : 'non impostata';

    return (
        <View style={styles.chiaveRiga}>
            <View style={styles.chiaveIntestazione}>
                <Text style={styles.chiaveNome}>{dati.nome}</Text>
                <Text style={[
                    styles.chiaveStato,
                    dati.origine === 'mancante' && dati.necessaria && styles.chiaveStatoMancante,
                ]}>
                    {salvata ? 'salvata' : stato}
                </Text>
            </View>

            <Text style={styles.settingsHint}>{dati.aCosaServe}</Text>

            <View style={styles.chiaveCampoRiga}>
                <TextInput
                    style={styles.chiaveCampo}
                    value={valore}
                    onChangeText={setValore}
                    placeholder={dati.origine === 'mancante' ? 'Incolli la chiave' : 'Incolli per sostituirla'}
                    placeholderTextColor="rgba(200, 244, 255, 0.35)"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TastoLiquido
                    style={[styles.chiaveSalva, !valore.trim() && styles.benvenutoTastoSpento]}
                    onPress={salva}
                    disabled={!valore.trim()}
                    raggio={14}
                >
                    <Text style={styles.chiaveSalvaTesto}>SALVA</Text>
                </TastoLiquido>
            </View>

            <TastoLiquido style={styles.chiaveDove} onPress={() => Linking.openURL(dati.dove)} raggio={12}>
                <Text style={styles.chiaveDoveTesto}>Dove si prende →</Text>
            </TastoLiquido>
        </View>
    );
}

function ToggleRow({label, value, onToggle}) {
    // Nell'istante in cui l'interruttore cambia, la pastiglia si gonfia appena
    // e si vela di vetro. Un battito solo: subito dopo è di nuovo la pastiglia
    // di prima, perché è a riposo che deve restare leggibile.
    const cambio = useRef(new Animated.Value(0)).current;
    const primoGiro = useRef(true);

    useEffect(() => {
        if (primoGiro.current) {
            primoGiro.current = false;
            return;
        }

        Animated.sequence([
            Animated.timing(cambio, {
                toValue: 1,
                duration: 120,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(cambio, {
                toValue: 0,
                useNativeDriver: true,
                damping: 14,
                stiffness: 200,
                mass: 0.7,
            }),
        ]).start();
    }, [value, cambio]);

    return (
        <TastoLiquido style={styles.settingsRow} onPress={onToggle} raggio={14}>
            <Text style={styles.settingsRowLabel}>{label}</Text>
            <Animated.View
                style={[
                    styles.settingsToggle,
                    value && styles.settingsToggleOn,
                    {
                        transform: [{
                            scale: cambio.interpolate({inputRange: [0, 1], outputRange: [1, 1.09]}),
                        }],
                    },
                ]}
            >
                <Text style={[styles.settingsToggleText, value && styles.settingsToggleTextOn]}>
                    {value ? 'ATTIVA' : 'SPENTA'}
                </Text>
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 999,
                        overflow: 'hidden',
                        opacity: cambio.interpolate({inputRange: [0, 1], outputRange: [0, 0.6]}),
                    }}
                >
                    <BlurView intensity={40} tint="light" style={{flex: 1}}/>
                </Animated.View>
            </Animated.View>
        </TastoLiquido>
    );
}

export default function SettingsModal({
                                          isVisible,
                                          onClose,
                                          homeCity,
                                          setHomeCity,
                                          isVoiceEnabled,
                                          onToggleVoice,
                                          isBriefingEnabled,
                                          setIsBriefingEnabled,
                                          onSelectVoice,
                                          isOverlayEnabled,
                                          onToggleOverlay,
                                          isCommandModeEnabled,
                                          onToggleCommandMode,
                                          apriConversazioneAllAvvio,
                                          onToggleApriAllAvvio,
                                          memoria,
                                          onSalvaNota,
                                          onDimentica,
                                          onRileggiMemoria,
                                      }) {
    const [activeTab, setActiveTab] = useState('settings');
    // La voce viene scelta alla prima frase pronunciata: si rilegge ogni volta
    // che il pannello si apre, così mostra sempre lo stato aggiornato.
    const [voiceInfo, setVoiceInfo] = useState(getVoiceInfo);
    const [erroreVoce, setErroreVoce] = useState(null);
    // La nota si modifica qui e si salva quando si smette di scriverla: farlo
    // a ogni lettera vorrebbe dire scrivere su disco a ogni tasto.
    const [nota, setNotaLocale] = useState(memoria?.nota || '');
    // Com'è andata al file, non cosa c'è dentro: senza questo, una scrittura
    // fallita si scopre solo riaprendo l'app e trovando il vuoto.
    const [diagnosi, setDiagnosi] = useState(null);
    const [chiavi, setChiavi] = useState(statoChiavi);
    // Perché la voce esce a pezzi su un telefono che non si ha in mano.
    const [voce, setVoce] = useState(null);
    // Salvare solo quando si esce dalla casella non bastava: chiudendo il
    // pannello con un tocco, la casella non perde il fuoco e quello che era
    // stato scritto non veniva mai salvato. Ora si salva da solo poco dopo
    // l'ultimo tasto, e comunque prima che il pannello si chiuda.
    const attesaSalvataggio = useRef(null);
    const notaRef = useRef(nota);
    notaRef.current = nota;

    const salvaNota = (testo) => {
        clearTimeout(attesaSalvataggio.current);
        attesaSalvataggio.current = null;
        onSalvaNota?.(testo);
    };

    const scriviNota = (testo) => {
        setNotaLocale(testo);
        clearTimeout(attesaSalvataggio.current);
        // Mezzo secondo dopo l'ultimo tasto: scrivere a ogni lettera
        // vorrebbe dire toccare il disco a ogni battuta.
        attesaSalvataggio.current = setTimeout(() => salvaNota(testo), 500);
    };

    useEffect(() => {
        if (!isVisible) return;
        setVoiceInfo(getVoiceInfo());
        setErroreVoce(getUltimoErroreEdge());
        onRileggiMemoria?.();
        setDiagnosi(statoMemoria());
        setChiavi(statoChiavi());

        let vivo = true;
        diagnosticaAudio().then((motore) => {
            if (vivo) setVoce({...statisticheLive(), motore});
        });
        return () => {
            vivo = false;
        };
    }, [isVisible, memoria]);

    // Il pannello si chiude: quello che è rimasto nella casella va salvato
    // adesso, non alla prossima apertura.
    useEffect(() => {
        if (isVisible) return;
        if (attesaSalvataggio.current) salvaNota(notaRef.current);
    }, [isVisible]);

    useEffect(() => () => clearTimeout(attesaSalvataggio.current), []);

    // Se la memoria cambia da fuori — perché se l'è annotata lui mentre si
    // parlava — la casella deve rifletterlo invece di restare indietro.
    useEffect(() => {
        setNotaLocale(memoria?.nota || '');
    }, [memoria?.nota]);

    return (
        <FoglioLiquido visibile={isVisible} onChiudi={onClose} stile={styles.settingsSheet}>
                    <View style={styles.settingsTabRow}>
                        {TABS.map((tab) => (
                            <TastoLiquido
                                key={tab.key}
                                raggio={12}
                                style={[styles.settingsTab, activeTab === tab.key && styles.settingsTabActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Text
                                    style={[
                                        styles.settingsTabText,
                                        activeTab === tab.key && styles.settingsTabTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TastoLiquido>
                        ))}
                    </View>

                    <ScrollView style={styles.settingsScroll}>
                        {activeTab === 'settings' && (
                            <View>
                                <Text style={styles.settingsSectionTitle}>RIEPILOGO DI APERTURA</Text>
                                <Text style={styles.settingsHint}>
                                    Città usata per il meteo del riepilogo che ascolta all&apos;avvio.
                                </Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    value={homeCity}
                                    onChangeText={setHomeCity}
                                    placeholder="La sua città"
                                    placeholderTextColor="rgba(200, 244, 255, 0.35)"
                                />
                                <ToggleRow
                                    label="Riepilogo all'avvio"
                                    value={isBriefingEnabled}
                                    onToggle={() => setIsBriefingEnabled(!isBriefingEnabled)}
                                />

                                <Text style={styles.settingsSectionTitle}>CHIAVI</Text>
                                <Text style={styles.settingsHint}>
                                    Restano su questo telefono e non passano da nessuna altra
                                    parte. Quella che scrive qui ha la precedenza su quella
                                    eventualmente inclusa nell'installazione; svuotando il
                                    campo e salvando si torna a quest'ultima.
                                </Text>

                                {chiavi.map((dati) => (
                                    <RigaChiave
                                        key={dati.id}
                                        dati={dati}
                                        onSalva={async (id, valore) => {
                                            await setChiave(id, valore);
                                            setChiavi(statoChiavi());
                                        }}
                                    />
                                ))}

                                <Text style={styles.settingsSectionTitle}>MEMORIA</Text>
                                <Text style={styles.settingsHint}>
                                    Quello che scrive qui J.A.R.V.I.S. lo sa sempre: chi è, di cosa si
                                    occupa, che dispositivi possiede. Serve a rispondere senza doverglielo
                                    ripetere ogni volta.
                                </Text>
                                <TextInput
                                    style={styles.memoriaInput}
                                    value={nota}
                                    onChangeText={scriviNota}
                                    onBlur={() => salvaNota(nota)}
                                    placeholder="Mi chiamo... lavoro come... ho un..."
                                    placeholderTextColor="rgba(200, 244, 255, 0.35)"
                                    multiline
                                    textAlignVertical="top"
                                />

                                {memoria?.ricordi?.length ? (
                                    <>
                                        <Text style={styles.settingsHint}>
                                            Cose che si è annotato da solo parlando con lei. Tocchi una
                                            voce per farla dimenticare.
                                        </Text>
                                        {memoria.ricordi.map((ricordo, indice) => (
                                            <TouchableOpacity
                                                key={`${indice}-${ricordo}`}
                                                style={styles.ricordoRiga}
                                                onPress={() => onDimentica?.(indice)}
                                            >
                                                <Text style={styles.ricordoTesto}>{ricordo}</Text>
                                                <Text style={styles.ricordoScarta}>✕</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                ) : (
                                    <Text style={styles.settingsHint}>
                                        Non si è ancora annotato niente da solo: lo fa quando le sente
                                        dire qualcosa che resterà vero anche fra un mese.
                                    </Text>
                                )}

                                {diagnosi ? (
                                    <Text style={styles.settingsHint}>
                                        {diagnosi.erroreScrittura
                                            ? `⚠ L'ultimo salvataggio non è riuscito: ${diagnosi.erroreScrittura}`
                                            : diagnosi.erroreLettura
                                                ? `⚠ La memoria non si è potuta rileggere: ${diagnosi.erroreLettura}`
                                                : diagnosi.nelPrompt
                                                    ? `Nel prompt: ${diagnosi.nota} caratteri di nota e ${diagnosi.ricordi} ricordi, ${diagnosi.nelPrompt} caratteri in tutto. Salvataggi riusciti: ${diagnosi.scritture}.`
                                                    : 'Nel prompt non va niente: la memoria è vuota. Se ha appena scritto qualcosa qui sopra, tocchi fuori dalla casella per salvarla.'}
                                        {diagnosi.fileEsisteva === false && !diagnosi.scritture
                                            ? ' Il file non esiste ancora.'
                                            : ''}
                                    </Text>
                                ) : null}

                                <Text style={styles.settingsSectionTitle}>CONVERSAZIONE</Text>
                                <ToggleRow
                                    label="Aprila all'avvio"
                                    value={apriConversazioneAllAvvio}
                                    onToggle={onToggleApriAllAvvio}
                                />
                                <Text style={styles.settingsHint}>
                                    Con questa accesa si apre l&apos;app e si parla, senza toccare
                                    niente. Spenta, la conversazione si apre toccando il cerchio.
                                </Text>

                                <Text style={styles.settingsSectionTitle}>MODALITÀ COMANDI</Text>
                                <ToggleRow
                                    label="Mostra la modalità a comandi"
                                    value={isCommandModeEnabled}
                                    onToggle={onToggleCommandMode}
                                />
                                <Text style={styles.settingsHint}>
                                    È il modo precedente: si registra una frase, viene trascritta e il
                                    modello risponde a comandi. Funziona, ma è più lento e capisce
                                    meno — la conversazione sente la voce, non un testo ripulito.
                                    Accendendola compare una leva in cima alla schermata per passare
                                    dall&apos;una all&apos;altra.
                                </Text>

                                <Text style={styles.settingsSectionTitle}>BOLLA FLOTTANTE</Text>
                                <ToggleRow
                                    label="Resta sopra le altre app"
                                    value={isOverlayEnabled}
                                    onToggle={onToggleOverlay}
                                />
                                <Text style={styles.settingsHint}>
                                    Uscendo dall&apos;app resta un cerchio sullo schermo. Un tocco apre
                                    lì la conversazione continua: si parla e basta, senza rientrare. Una
                                    pressione lunga riapre l&apos;app. Si trascina dove serve, e
                                    trascinandola sulla linguetta in basso si toglie. Android chiede un
                                    permesso a parte la prima volta.
                                </Text>

                                <Text style={styles.settingsSectionTitle}>VOCE</Text>
                                <ToggleRow
                                    label="Risposta vocale"
                                    value={isVoiceEnabled}
                                    onToggle={onToggleVoice}
                                />
                                <Text style={styles.settingsHint}>
                                    Con la voce spenta J.A.R.V.I.S. risponde solo a schermo, anche in
                                    conversazione: continua ad ascoltare e a capire, ma non parla.
                                </Text>

                                {isCommandModeEnabled ? (
                                <>
                                <Text style={styles.settingsSectionTitle}>VOCE NATURALE</Text>
                                {erroreVoce ? (
                                    <Text style={styles.settingsHint}>
                                        Ultimo tentativo con la voce principale non riuscito:{' '}
                                        {erroreVoce}. Sta parlando la voce di riserva.
                                    </Text>
                                ) : null}
                                {voiceInfo.available.length ? (
                                    <>
                                        <Text style={styles.settingsHint}>
                                            Tocchi una voce per usarla: cambia dalla frase successiva.
                                            Se questa voce non fosse raggiungibile, J.A.R.V.I.S. scende
                                            da solo su quella di riserva senza restare muto.
                                        </Text>
                                        {voiceInfo.available.map((nome) => {
                                            const inUso = nome === voiceInfo.selected;
                                            return (
                                                <TouchableOpacity
                                                    key={nome}
                                                    style={[styles.voiceItem, inUso && styles.selectedVoiceItem]}
                                                    onPress={() => {
                                                        onSelectVoice(nome);
                                                        setVoiceInfo(getVoiceInfo());
                                                    }}
                                                >
                                                    <Text style={styles.voiceText}>
                                                        {inUso ? '● ' : '   '}
                                                        {nome.replace(/^it-IT-|Neural$|MultilingualNeural$/g, '')}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <Text style={styles.settingsHint}>
                                        Nessuna voce disponibile: si usa quella di sistema.
                                    </Text>
                                )}
                                </>
                                ) : null}
                            </View>
                        )}

                        {activeTab === 'features' && (
                            <View>
                                {FEATURE_SECTIONS.map((section) => (
                                    <View key={section.title}>
                                        <Text style={styles.settingsSectionTitle}>{section.title}</Text>
                                        {section.items.map((item) => (
                                            <View key={item.name} style={styles.featureItem}>
                                                <Text style={styles.featureName}>{item.name}</Text>
                                                <Text style={styles.featureExample}>{item.example}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}

                        {activeTab === 'about' && (
                            <View>
                                <Text style={styles.aboutTitle}>J.A.R.V.I.S.</Text>
                                <Text style={styles.aboutSubtitle}>Just A Rather Very Intelligent System</Text>
                                <Text style={styles.aboutVersion}>Versione {APP_VERSION}</Text>

                                <Text style={styles.settingsSectionTitle}>VOCE DELLA CONVERSAZIONE</Text>
                                <Text style={styles.aboutText}>
                                    {voce
                                        ? [
                                            `Eco: ${
                                                voce.motore?.ecoDisponibile
                                                    ? (voce.motore?.ecoAttiva ? 'cancellato' : 'disponibile, mai acceso')
                                                    : 'non cancellabile su questo telefono'
                                            }.`,
                                            `Rumore: ${
                                                voce.motore?.rumoreDisponibile
                                                    ? (voce.motore?.rumoreAttiva ? 'ridotto' : 'disponibile, mai acceso')
                                                    : 'non riducibile'
                                            }.`,
                                            `Modo audio: ${voce.motore?.modo || 'sconosciuto'}, uscita ${
                                                voce.motore?.inCassa ? 'sulla cassa' : 'non sulla cassa'
                                            }.`,
                                            `Microfono ${voce.motore?.microfonoAcceso ? 'acceso' : 'fermo'}, altoparlante ${
                                                voce.motore?.altoparlanteAcceso ? 'acceso' : 'fermo'
                                            }.`,
                                            `Volume della conversazione: ${voce.motore?.volume ?? '?'} su ${
                                                voce.motore?.volumeMassimo ?? '?'
                                            }.`,
                                            `Conversazioni aperte: ${voce.sessioni}.`,
                                            `Pezzi da quando l'app è aperta: ${voce.pezziMicrofono} dal microfono, ${
                                                voce.pezziVoce
                                            } di voce.`,
                                            `Quanto si sente parlare: ${
                                                Math.round((voce.pavimentoEco || 0) * 1000)
                                            } su mille, con un picco di ${
                                                Math.round((voce.piccoEco || 0) * 1000)
                                            }.`,
                                            `Interruzioni: ${voce.interruzioniLocali} decise dall'app, ${
                                                voce.interruzioniServer
                                            } dal server.`,
                                        ].join(' ')
                                        : 'Nessun dato: la conversazione non è ancora stata aperta.'}
                                </Text>

                                <Text style={styles.settingsSectionTitle}>QUESTA VERSIONE</Text>
                                <Text style={styles.aboutText}>
                                    Di lorisz017: l&apos;interfaccia, le azioni sul telefono, la voce e in
                                    pratica tutto quello che l&apos;app fa oggi.
                                </Text>
                                <TouchableOpacity onPress={() => Linking.openURL(GITHUB_PROFILE)}>
                                    <Text style={styles.aboutLink}>github.com/lorisz017</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL(GITHUB_REPO)}>
                                    <Text style={styles.aboutLink}>github.com/lorisz017/jarvis-app</Text>
                                </TouchableOpacity>

                                <Text style={styles.settingsSectionTitle}>SCHELETRO INIZIALE</Text>
                                <Text style={styles.aboutText}>
                                    Di Azizbek Anvarjonov: è il progetto da cui questo è nato. Licenza MIT,
                                    copyright (c) 2025 Azizbek Anvarjonov, copyright (c) 2026 lorisz017.
                                </Text>
                                <TouchableOpacity onPress={() => Linking.openURL(UPSTREAM_REPO)}>
                                    <Text style={styles.aboutLink}>github.com/az11k-dev/jarvis-app</Text>
                                </TouchableOpacity>

                                <Text style={styles.settingsSectionTitle}>UN GRAZIE PARTICOLARE</Text>
                                <Text style={styles.aboutText}>
                                    A FatihMakes, autore dell&apos;assistente desktop Mark-LIII. È da lì che è
                                    nata l&apos;idea di questo progetto, ed è per via della sua interfaccia che
                                    quest&apos;app ha l&apos;aspetto che ha.
                                </Text>
                                <TouchableOpacity onPress={() => Linking.openURL(INSPIRATION_REPO)}>
                                    <Text style={styles.aboutLink}>github.com/FatihMakes/Mark-LIII</Text>
                                </TouchableOpacity>

                                <Text style={styles.settingsSectionTitle}>TECNOLOGIE</Text>
                                <Text style={styles.aboutText}>
                                    Conversazione, voce e ragionamento tramite Gemini. Ricerca sul web
                                    tramite DuckDuckGo, meteo tramite Open-Meteo. Applicazione
                                    realizzata con React Native ed Expo.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                <TastoLiquido style={styles.closeModalButton} onPress={onClose}>
                    <Text style={styles.closeModalButtonText}>Chiudi</Text>
                </TastoLiquido>
        </FoglioLiquido>
    );
}
