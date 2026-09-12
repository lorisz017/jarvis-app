import React, {useState, useEffect} from 'react';
import {Modal, View, Text, ScrollView, TouchableOpacity, TextInput, Linking} from 'react-native';
import {styles} from '../styles/mainStyles';
import {FEATURE_SECTIONS} from '../utils/features';
import {getVoiceInfo} from '../services/ttsService';

const APP_VERSION = '2.0.0';
const GITHUB_PROFILE = 'https://github.com/lorisz017';
const GITHUB_REPO = 'https://github.com/lorisz017/jarvis-app';
const UPSTREAM_REPO = 'https://github.com/az11k-dev/jarvis-app';
const INSPIRATION_REPO = 'https://github.com/FatihMakes/Mark-LIII';

const TABS = [
    {key: 'settings', label: 'IMPOSTAZIONI'},
    {key: 'features', label: 'FUNZIONI'},
    {key: 'about', label: 'INFO'},
];

function ToggleRow({label, value, onToggle}) {
    return (
        <TouchableOpacity style={styles.settingsRow} onPress={onToggle}>
            <Text style={styles.settingsRowLabel}>{label}</Text>
            <View style={[styles.settingsToggle, value && styles.settingsToggleOn]}>
                <Text style={[styles.settingsToggleText, value && styles.settingsToggleTextOn]}>
                    {value ? 'ATTIVA' : 'SPENTA'}
                </Text>
            </View>
        </TouchableOpacity>
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
                                      }) {
    const [activeTab, setActiveTab] = useState('settings');
    // La voce viene scelta alla prima frase pronunciata: si rilegge ogni volta
    // che il pannello si apre, così mostra sempre lo stato aggiornato.
    const [voiceInfo, setVoiceInfo] = useState(getVoiceInfo);

    useEffect(() => {
        if (isVisible) setVoiceInfo(getVoiceInfo());
    }, [isVisible]);

    return (
        <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.settingsSheet}>
                    <View style={styles.settingsTabRow}>
                        {TABS.map((tab) => (
                            <TouchableOpacity
                                key={tab.key}
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
                            </TouchableOpacity>
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

                                <Text style={styles.settingsSectionTitle}>BOLLA FLOTTANTE</Text>
                                <ToggleRow
                                    label="Resta sopra le altre app"
                                    value={isOverlayEnabled}
                                    onToggle={onToggleOverlay}
                                />
                                <Text style={styles.settingsHint}>
                                    Uscendo dall&apos;app resta un cerchio sullo schermo. Un tocco
                                    comincia ad ascoltare, un secondo tocco chiude la frase e la manda,
                                    una pressione lunga riapre l&apos;app. Si trascina dove serve, e
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
                                    Con la voce spenta, J.A.R.V.I.S. risponde solo a schermo.
                                </Text>

                                <Text style={styles.settingsSectionTitle}>VOCE NATURALE</Text>
                                {!voiceInfo.hasKey ? (
                                    <Text style={styles.settingsHint}>
                                        Nessuna chiave Deepgram configurata: si usa la voce di riserva.
                                    </Text>
                                ) : voiceInfo.available.length ? (
                                    <>
                                        <Text style={styles.settingsHint}>
                                            Tocchi una voce per usarla: cambia dalla frase successiva.
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
                                                        {nome.replace(/^aura-2-|-it$/g, '')}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <Text style={styles.settingsHint}>
                                        Ancora da determinare: verrà scelta alla prima risposta parlata.
                                    </Text>
                                )}
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
                                    Trascrizione e ragionamento tramite Groq (Whisper, GPT-OSS), ricerca sul
                                    web tramite Gemini, voce naturale tramite Deepgram, meteo tramite
                                    Open-Meteo. Applicazione realizzata con React Native ed Expo.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
                        <Text style={styles.closeModalButtonText}>Chiudi</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
