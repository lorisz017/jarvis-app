import React, {useState} from 'react';
import {Modal, View, Text, ScrollView, TouchableOpacity, TextInput, Linking} from 'react-native';
import {styles} from '../styles/mainStyles';
import {FEATURE_SECTIONS} from '../utils/features';

const APP_VERSION = '1.1.0';
const GITHUB_PROFILE = 'https://github.com/lorisz017';
const GITHUB_REPO = 'https://github.com/lorisz017/jarvis-app';
const UPSTREAM_REPO = 'https://github.com/az11k-dev/jarvis-app';

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
                                      }) {
    const [activeTab, setActiveTab] = useState('settings');

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

                                <Text style={styles.settingsSectionTitle}>VOCE</Text>
                                <ToggleRow
                                    label="Risposta vocale"
                                    value={isVoiceEnabled}
                                    onToggle={onToggleVoice}
                                />
                                <Text style={styles.settingsHint}>
                                    Con la voce spenta, J.A.R.V.I.S. risponde solo a schermo.
                                </Text>
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
                                    Adattamento italiano, interfaccia e funzioni aggiuntive di lorisz017.
                                </Text>
                                <TouchableOpacity onPress={() => Linking.openURL(GITHUB_PROFILE)}>
                                    <Text style={styles.aboutLink}>github.com/lorisz017</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL(GITHUB_REPO)}>
                                    <Text style={styles.aboutLink}>github.com/lorisz017/jarvis-app</Text>
                                </TouchableOpacity>

                                <Text style={styles.settingsSectionTitle}>PROGETTO ORIGINALE</Text>
                                <Text style={styles.aboutText}>
                                    Basato sul lavoro di Azizbek Anvarjonov, distribuito con licenza MIT.
                                    Copyright (c) 2025 Azizbek Anvarjonov.
                                </Text>
                                <TouchableOpacity onPress={() => Linking.openURL(UPSTREAM_REPO)}>
                                    <Text style={styles.aboutLink}>github.com/az11k-dev/jarvis-app</Text>
                                </TouchableOpacity>

                                <Text style={styles.settingsSectionTitle}>TECNOLOGIE</Text>
                                <Text style={styles.aboutText}>
                                    Trascrizione e ragionamento tramite Groq (Whisper, GPT-OSS, Compound per la
                                    ricerca sul web), voce naturale tramite Gemini, meteo tramite Open-Meteo.
                                    Applicazione realizzata con React Native ed Expo.
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
