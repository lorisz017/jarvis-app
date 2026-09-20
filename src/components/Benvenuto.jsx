import React, {useState} from 'react';
import {View, Text, TextInput, Linking, ActivityIndicator} from 'react-native';
import {styles, COLORS} from '../styles/mainStyles';
import {setChiave, CHIAVI} from '../services/chiaviService';
import TastoLiquido from './TastoLiquido';

// Il primo avvio, per chi l'app non se l'è compilata da sé.
//
// Compare **solo** se manca la chiave Gemini: chi ha l'APK con le chiavi già
// dentro non la vede mai, e non si accorge che esiste. Chiede una cosa sola —
// le altre tre sono facoltative e stanno nelle impostazioni — perché una
// schermata d'apertura con quattro campi da riempire è una schermata che fa
// chiudere l'app.

const GEMINI = CHIAVI.find((c) => c.id === 'gemini');

export default function Benvenuto({onFatto}) {
    const [valore, setValore] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [errore, setErrore] = useState(null);

    const salva = async () => {
        const pulito = valore.trim();
        if (!pulito || salvando) return;

        setSalvando(true);
        const problema = await setChiave('gemini', pulito);
        setSalvando(false);

        if (problema) {
            setErrore(problema);
            return;
        }

        onFatto();
    };

    return (
        <View style={styles.benvenutoSchermo}>
            <View style={styles.benvenutoFoglio}>
                <Text style={styles.benvenutoTitolo}>J.A.R.V.I.S.</Text>
                <Text style={styles.benvenutoSottotitolo}>
                    Just A Rather Very Intelligent System
                </Text>

                <Text style={styles.benvenutoTesto}>
                    Manca una cosa sola per cominciare: una chiave Gemini. È gratuita,
                    si ottiene in un minuto, e resta su questo telefono — non passa da
                    nessuna altra parte.
                </Text>

                <TextInput
                    style={styles.benvenutoCampo}
                    value={valore}
                    onChangeText={(t) => { setValore(t); setErrore(null); }}
                    placeholder="Incolli qui la chiave"
                    placeholderTextColor="rgba(200, 244, 255, 0.35)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                />

                {errore ? (
                    <Text style={styles.benvenutoErrore}>Non si è potuta salvare: {errore}</Text>
                ) : null}

                <TastoLiquido
                    style={[styles.benvenutoTasto, !valore.trim() && styles.benvenutoTastoSpento]}
                    onPress={salva}
                    disabled={!valore.trim() || salvando}
                >
                    {salvando
                        ? <ActivityIndicator color={COLORS.BG}/>
                        : <Text style={styles.benvenutoTastoTesto}>COMINCIAMO</Text>}
                </TastoLiquido>

                <TastoLiquido
                    style={styles.benvenutoLink}
                    onPress={() => Linking.openURL(GEMINI.dove)}
                >
                    <Text style={styles.benvenutoLinkTesto}>Dove si prende la chiave →</Text>
                </TastoLiquido>

                <Text style={styles.benvenutoNota}>
                    Le altre chiavi — Groq, Deepgram, GitHub — sono facoltative e si
                    aggiungono quando servono, da Impostazioni → Chiavi.
                </Text>
            </View>
        </View>
    );
}
