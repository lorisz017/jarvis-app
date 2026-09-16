import React, {useEffect, useRef, useState} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {styles, COLORS} from '../styles/mainStyles';
import TastoLiquido from './TastoLiquido';

// L'occhio: la fotocamera al posto del radar, dentro la stessa cornice.
//
// Non è una schermata a parte e non è una foto da allegare. Mentre è acceso,
// un fotogramma al secondo entra nella conversazione già aperta, accanto alla
// voce: si può chiedere "questo cos'è?" senza spiegare a cosa ci si
// riferisce, perché lo sta guardando anche lui.
//
// Tutto il resto della schermata resta dov'era — la leva, il registro, il
// riquadro della risposta, i tasti — perché a cambiare è solo cosa si guarda,
// non cosa si sta facendo.

// Un fotogramma al secondo è quello che consiglia il modello. Di più è banda
// buttata: non vede più in fretta perché gliene arrivano venti.
const OGNI = 1000;

// Le foto della fotocamera sono enormi rispetto a quello che serve qui. Si
// chiede al telefono quali misure sa fare e si prende la più piccola che stia
// sopra questa: sotto, il modello comincia a non distinguere le scritte.
const LARGHEZZA_MINIMA = 640;

function scegliMisura(misure) {
    if (!misure?.length) return undefined;

    // Arrivano come "1920x1080": si ordinano per area crescente.
    const valide = misure
        .map((m) => {
            const [l, a] = String(m).split('x').map(Number);
            return {nome: m, larghezza: l || 0, area: (l || 0) * (a || 0)};
        })
        .filter((m) => m.area > 0)
        .sort((x, y) => x.area - y.area);

    if (!valide.length) return undefined;
    return (valide.find((m) => m.larghezza >= LARGHEZZA_MINIMA) || valide[valide.length - 1]).nome;
}

export default function Occhio({onFotogramma, onChiudi, attiva, inAttesa}) {
    const [permesso, chiediPermesso] = useCameraPermissions();
    const [pronta, setPronta] = useState(false);
    const [misura, setMisura] = useState(undefined);
    const [davanti, setDavanti] = useState(false);
    const macchina = useRef(null);
    // Uno scatto per volta: se il telefono ci mette più di un secondo, il
    // secondo scatto non deve accodarsi al primo.
    const occupata = useRef(false);
    const viva = useRef(true);
    // Chi riceve i fotogrammi cambia identità a ogni ridisegno della
    // schermata: tenerlo fra le dipendenze del battito vorrebbe dire
    // ricominciare il conteggio di continuo e non scattare mai.
    const consegna = useRef(onFotogramma);
    consegna.current = onFotogramma;

    const gia = useRef(false);
    useEffect(() => {
        if (gia.current || !permesso) return;
        if (permesso.granted || !permesso.canAskAgain) return;
        // Una volta sola. Chiederlo a ogni cambio di stato vuol dire
        // ripresentare la finestra subito dopo un rifiuto, all'infinito:
        // dopo il primo no resta il tasto, che è una scelta e non un assedio.
        gia.current = true;
        chiediPermesso();
    }, [permesso]);

    useEffect(() => () => { viva.current = false; }, []);

    useEffect(() => {
        if (!pronta || !attiva) return;

        const battito = setInterval(async () => {
            if (occupata.current || !macchina.current || !viva.current) return;
            occupata.current = true;

            try {
                const scatto = await macchina.current.takePictureAsync({
                    base64: true,
                    quality: 0.4,
                    // Niente ritocchi dopo lo scatto e niente suono: è un
                    // fotogramma, non una fotografia da conservare.
                    skipProcessing: true,
                    shutterSound: false,
                    imageType: 'jpg',
                });
                if (scatto?.base64 && viva.current) consegna.current(scatto.base64);
            } catch (errore) {
                // Uno scatto perso non è un guasto: al prossimo secondo si
                // riprova. Se fallisce sempre, si vede perché non risponde.
                console.warn('Fotogramma non riuscito:', errore?.message || errore);
            } finally {
                occupata.current = false;
            }
        }, OGNI);

        return () => clearInterval(battito);
    }, [pronta, attiva]);

    const preparaMisure = async () => {
        try {
            const misure = await macchina.current?.getAvailablePictureSizesAsync?.();
            setMisura(scegliMisura(misure));
        } catch (errore) {
            console.warn('Misure della fotocamera:', errore?.message || errore);
        }
        setPronta(true);
    };

    const concesso = Boolean(permesso?.granted);

    return (
        <View style={styles.radarTouchable}>
            <View style={styles.radarWrapper}>
                {!concesso ? (
                    <View style={styles.occhioVuoto}>
                        <Text style={styles.occhioAvviso}>
                            {permesso
                                ? 'Serve il permesso della fotocamera, signore.'
                                : 'Sto chiedendo il permesso, signore.'}
                        </Text>
                        {permesso ? (
                            <TastoLiquido style={styles.occhioTasto} onPress={chiediPermesso}>
                                <Text style={styles.occhioTastoTesto}>CONCEDI</Text>
                            </TastoLiquido>
                        ) : null}
                    </View>
                ) : (
                    <CameraView
                        ref={macchina}
                        style={styles.occhioVista}
                        facing={davanti ? 'front' : 'back'}
                        pictureSize={misura}
                        animateShutter={false}
                        mute
                        onCameraReady={preparaMisure}
                    />
                )}

                {/* Gli angoli del radar restano: la cornice è la stessa */}
                <View style={[styles.radarCorner, styles.radarCornerTL]}/>
                <View style={[styles.radarCorner, styles.radarCornerTR]}/>
                <View style={[styles.radarCorner, styles.radarCornerBL]}/>
                <View style={[styles.radarCorner, styles.radarCornerBR]}/>

                {!pronta && concesso ? (
                    <ActivityIndicator style={styles.occhioAttesa} color={COLORS.CYAN}/>
                ) : null}
            </View>

            <View style={styles.statusRow}>
                <View style={[styles.statusDot, {backgroundColor: attiva ? COLORS.GREEN : COLORS.AMBER}]}/>
                <Text style={[styles.statusText, {color: attiva ? COLORS.GREEN : COLORS.AMBER}]}>
                    {inAttesa ? 'MI STO COLLEGANDO...' : attiva ? 'STO GUARDANDO...' : 'VISTA IN PAUSA'}
                </Text>
            </View>

            <View style={styles.occhioComandi}>
                <TastoLiquido style={styles.occhioTasto} onPress={() => setDavanti((p) => !p)}>
                    <Text style={styles.occhioTastoTesto}>{davanti ? 'RETRO' : 'FRONTALE'}</Text>
                </TastoLiquido>
                <TastoLiquido style={styles.occhioTasto} onPress={onChiudi}>
                    <Text style={styles.occhioTastoTesto}>CHIUDI VISTA</Text>
                </TastoLiquido>
            </View>
        </View>
    );
}
