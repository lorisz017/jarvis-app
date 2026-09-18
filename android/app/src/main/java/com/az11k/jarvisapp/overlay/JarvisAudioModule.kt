package com.az11k.jarvisapp.overlay

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * Audio a flusso continuo, per parlare con Gemini in tempo reale.
 *
 * La registrazione normale dell'app scrive un file e lo manda quando hai
 * finito di parlare: va bene per un comando, non per una conversazione. Qui
 * il microfono viene letto di continuo e spedito a pezzi mentre parli, e la
 * voce che torna viene suonata mano a mano che arriva, senza aspettare che
 * la frase sia completa.
 *
 * I due formati non sono uguali e non è un caso: Gemini ascolta a 16 kHz e
 * risponde a 24 kHz.
 *
 * === Perché microfono e altoparlante devono stare nella stessa sessione ===
 *
 * La registrazione usa la sorgente da telefonata proprio per avere la
 * cancellazione dell'eco: senza, J.A.R.V.I.S. si sente parlare e si
 * interrompe da solo. Ma la cancellazione dell'eco non lavora sull'aria:
 * lavora **per sottrazione**, togliendo dal microfono il segnale che il
 * telefono sta mandando all'altoparlante. Per poterlo fare deve sapere quale
 * è quel segnale, e lo sa solo se la riproduzione appartiene alla stessa
 * sessione di comunicazione: `USAGE_VOICE_COMMUNICATION` come uso della
 * traccia, `MODE_IN_COMMUNICATION` come modo del telefono.
 *
 * Suonando come `USAGE_MEDIA` — com'era — su alcuni telefoni funziona per
 * caso, perché il loro filtro prende tutto quello che esce. Su altri (gli
 * OPPO fra questi) il filtro è fedele alla specifica: la voce suonata come
 * musica non entra nel riferimento, non viene sottratta, rientra intera dal
 * microfono e l'app si interrompe da sola a ogni frase. Era lo stesso codice
 * a comportarsi in due modi diversi, e la differenza stava tutta qui.
 *
 * Passare alla linea di comunicazione porta con sé due conseguenze da
 * gestire, e sono gestite sotto: l'audio andrebbe all'auricolare invece che
 * all'altoparlante, e il volume non è più quello della musica ma quello
 * delle chiamate.
 */
class JarvisAudioModule(private val contesto: ReactApplicationContext) :
    ReactContextBaseJavaModule(contesto) {

    companion object {
        private const val FREQUENZA_INVIO = 16000
        private const val FREQUENZA_RISPOSTA = 24000

        /** Circa un decimo di secondo di parlato per pezzo. */
        private const val CAMPIONI_PER_PEZZO = FREQUENZA_INVIO / 10

        /**
         * Quanto audio si scrive per volta nell'altoparlante: 20 millesimi
         * di secondo.
         *
         * Non è un'ottimizzazione, è quello che rende l'interruzione vera.
         * La scrittura blocca finché la traccia non ha posto, quindi un pezzo
         * intero può restare a metà proprio mentre lo si vuole zittire: la
         * parte già passata al sistema si sente comunque, e la voce riprende
         * per un istante dopo essere stata tagliata. Scrivendo a fette si
         * controlla fra l'una e l'altra se quel pezzo appartiene ancora al
         * giro in corso, e il taglio cade dentro il pezzo invece che dopo.
         */
        private const val FETTA_BYTE = FREQUENZA_RISPOSTA / 50 * 2
    }

    override fun getName(): String = "JarvisAudio"

    private var registratore: AudioRecord? = null
    private var inAscolto = false

    private var altoparlante: AudioTrack? = null
    private val codaRiproduzione = Executors.newSingleThreadExecutor()

    private val gestoreAudio: AudioManager
        get() = contesto.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    // I due filtri del telefono, agganciati a mano alla sessione del
    // microfono. La sorgente da telefonata di solito li accende da sé, ma
    // "di solito" non è "sempre": chiederli esplicitamente costa niente e
    // toglie una variabile.
    private var eco: AcousticEchoCanceler? = null
    private var rumore: NoiseSuppressor? = null

    // Quello che si è cambiato al telefono e che va rimesso com'era: il modo
    // audio, il volume della linea voce, l'uscita forzata sull'altoparlante.
    private var modoPrecedente: Int? = null
    private var volumePrecedente: Int? = null
    private var uscitaForzata = false

    // Quando si interrompe J.A.R.V.I.S. a metà frase non basta svuotare la
    // traccia audio: i pezzi già affidati alla coda continuerebbero a essere
    // scritti dopo, e la voce riprenderebbe da sola qualche istante dopo.
    // Ogni interruzione alza questo numero, e i pezzi che appartengono a un
    // giro ormai superato vengono buttati invece che suonati.
    @Volatile
    private var generazione = 0

    // ===== Microfono =====

    @ReactMethod
    fun startCapture(promise: Promise) {
        if (inAscolto) {
            promise.resolve(true)
            return
        }

        val minimo = AudioRecord.getMinBufferSize(
            FREQUENZA_INVIO,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        if (minimo <= 0) {
            promise.reject("E_AUDIO", "Il dispositivo non accetta la registrazione a 16 kHz")
            return
        }

        val dimensione = maxOf(minimo, CAMPIONI_PER_PEZZO * 2 * 4)

        val record = try {
            AudioRecord(
                // Sorgente da telefonata: porta con sé la cancellazione
                // dell'eco, senza la quale J.A.R.V.I.S. si sente parlare e
                // si interrompe da solo.
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                FREQUENZA_INVIO,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                dimensione
            )
        } catch (e: Exception) {
            promise.reject("E_AUDIO", e.message, e)
            return
        }

        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            promise.reject("E_AUDIO", "Microfono non disponibile")
            return
        }

        registratore = record
        collegaFiltri(record.audioSessionId)
        inAscolto = true
        record.startRecording()

        thread(name = "jarvis-microfono") {
            val buffer = ByteArray(CAMPIONI_PER_PEZZO * 2)
            while (inAscolto) {
                val letti = record.read(buffer, 0, buffer.size)
                if (letti > 0) {
                    emetti(
                        "jarvisAudioChunk",
                        Base64.encodeToString(buffer, 0, letti, Base64.NO_WRAP)
                    )
                } else if (letti < 0) {
                    break
                }
            }
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun stopCapture() {
        inAscolto = false
        staccaFiltri()
        val record = registratore ?: return
        registratore = null
        try {
            if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) record.stop()
        } catch (e: Exception) {
            // Già fermo.
        }
        record.release()
    }

    /**
     * Chiede al telefono di togliere eco e rumore da quello che entra.
     *
     * `setEnabled` restituisce un numero invece di niente, quindi va chiamato
     * come metodo: scritto come proprietà Kotlin non compila.
     */
    private fun collegaFiltri(sessione: Int) {
        staccaFiltri()

        eco = try {
            if (AcousticEchoCanceler.isAvailable()) {
                AcousticEchoCanceler.create(sessione)?.also { it.setEnabled(true) }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }

        rumore = try {
            if (NoiseSuppressor.isAvailable()) {
                NoiseSuppressor.create(sessione)?.also { it.setEnabled(true) }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun staccaFiltri() {
        try {
            eco?.release()
        } catch (e: Exception) {
            // Già rilasciato.
        }
        try {
            rumore?.release()
        } catch (e: Exception) {
            // Già rilasciato.
        }
        eco = null
        rumore = null
    }

    // ===== Altoparlante =====

    @ReactMethod
    fun startPlayback(promise: Promise) {
        if (altoparlante != null) {
            promise.resolve(true)
            return
        }

        val minimo = AudioTrack.getMinBufferSize(
            FREQUENZA_RISPOSTA,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        if (minimo <= 0) {
            promise.reject("E_AUDIO", "Il dispositivo non accetta la riproduzione a 24 kHz")
            return
        }

        // Prima di creare la traccia: il modo del telefono va cambiato adesso,
        // perché il microfono si apre dopo e la cancellazione dell'eco legge
        // il modo quando nasce la sessione, non dopo.
        apriSessioneVoce()

        val track = try {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        // Voce di una conversazione, non musica: è questo che
                        // mette la riproduzione dentro il riferimento della
                        // cancellazione dell'eco.
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(FREQUENZA_RISPOSTA)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                // A flusso: si scrive mentre arriva, invece di consegnare un
                // suono già completo.
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(minimo * 4)
                .build()
        } catch (e: Exception) {
            chiudiSessioneVoce()
            promise.reject("E_AUDIO", e.message, e)
            return
        }

        altoparlante = track
        track.play()
        promise.resolve(true)
    }

    /**
     * Mette il telefono in modo conversazione e manda la voce dove si sente.
     *
     * Il modo è quello che lega microfono e altoparlante in un'unica sessione,
     * ed è la condizione perché la cancellazione dell'eco abbia qualcosa da
     * sottrarre. Le altre due righe rimediano a quello che il modo si porta
     * dietro: l'uscita, che altrimenti sarebbe l'auricolare come in una
     * telefonata, e il volume, che diventa quello delle chiamate e su un
     * telefono che non telefona mai può essere rimasto al minimo.
     *
     * Le cuffie non si scavalcano: si forza l'altoparlante solo se quello che
     * c'è è l'auricolare interno, cioè quando nessuno ha scelto niente.
     */
    @Suppress("DEPRECATION")
    private fun apriSessioneVoce() {
        val gestore = try {
            gestoreAudio
        } catch (e: Exception) {
            return
        }

        try {
            if (modoPrecedente == null) modoPrecedente = gestore.mode
            gestore.mode = AudioManager.MODE_IN_COMMUNICATION
        } catch (e: Exception) {
            // Il telefono non lascia cambiare il modo: la conversazione
            // funziona comunque, l'eco la si gestisce dal lato JavaScript.
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val attuale = gestore.communicationDevice
                if (attuale == null || attuale.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                    val altoparlanteInterno = gestore.availableCommunicationDevices
                        .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
                    if (altoparlanteInterno != null) {
                        uscitaForzata = gestore.setCommunicationDevice(altoparlanteInterno)
                    }
                }
            } else if (!gestore.isWiredHeadsetOn && !gestore.isBluetoothA2dpOn) {
                gestore.isSpeakerphoneOn = true
                uscitaForzata = true
            }
        } catch (e: Exception) {
            // Uscita lasciata come sta.
        }

        try {
            val massimo = gestore.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
            val ora = gestore.getStreamVolume(AudioManager.STREAM_VOICE_CALL)
            if (massimo > 0 && ora < massimo * 7 / 10) {
                volumePrecedente = ora
                gestore.setStreamVolume(AudioManager.STREAM_VOICE_CALL, massimo * 8 / 10, 0)
            }
        } catch (e: Exception) {
            // Volume lasciato come sta.
        }
    }

    /** Rimette il telefono come lo si era trovato. */
    @Suppress("DEPRECATION")
    private fun chiudiSessioneVoce() {
        val gestore = try {
            gestoreAudio
        } catch (e: Exception) {
            return
        }

        try {
            volumePrecedente?.let {
                gestore.setStreamVolume(AudioManager.STREAM_VOICE_CALL, it, 0)
            }
        } catch (e: Exception) {
            // Volume non ripristinabile.
        }
        volumePrecedente = null

        try {
            if (uscitaForzata) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    gestore.clearCommunicationDevice()
                } else {
                    gestore.isSpeakerphoneOn = false
                }
            }
        } catch (e: Exception) {
            // Uscita non ripristinabile.
        }
        uscitaForzata = false

        try {
            modoPrecedente?.let { gestore.mode = it }
        } catch (e: Exception) {
            // Modo non ripristinabile.
        }
        modoPrecedente = null
    }

    @ReactMethod
    fun playChunk(base64: String) {
        val track = altoparlante ?: return
        val mio = generazione

        // La scrittura blocca finché c'è posto nel buffer: va fatta fuori dal
        // thread di JavaScript, altrimenti l'interfaccia si impunta.
        codaRiproduzione.execute {
            if (mio != generazione) return@execute
            try {
                val dati = Base64.decode(base64, Base64.NO_WRAP)
                var scritti = 0
                while (scritti < dati.size) {
                    // Fra una fetta e l'altra: se nel frattempo è stato
                    // interrotto, il resto di questo pezzo non si sente.
                    if (mio != generazione) return@execute
                    val quanti = minOf(FETTA_BYTE, dati.size - scritti)
                    val fatti = track.write(dati, scritti, quanti)
                    if (fatti <= 0) return@execute
                    scritti += fatti
                }
            } catch (e: Exception) {
                // Traccia chiusa nel frattempo: il pezzo si scarta.
            }
        }
    }

    /** Zittisce subito quello che sta uscendo: serve quando lo si interrompe. */
    @ReactMethod
    fun flushPlayback() {
        // Prima si invalidano i pezzi in attesa, poi si svuota la traccia:
        // nell'ordine inverso quelli in coda rientrerebbero subito dopo.
        generazione++

        val track = altoparlante ?: return
        try {
            track.pause()
            track.flush()
            track.play()
        } catch (e: Exception) {
            // Traccia non in uno stato valido: non c'è niente da svuotare.
        }
    }

    @ReactMethod
    fun stopPlayback() {
        generazione++
        val track = altoparlante
        altoparlante = null
        chiudiSessioneVoce()
        if (track == null) return
        try {
            track.pause()
            track.flush()
            track.stop()
        } catch (e: Exception) {
            // Già fermo.
        }
        track.release()
    }

    /**
     * Com'è fatto l'audio di questo telefono, adesso.
     *
     * Serve a non indovinare. Tre problemi di questo progetto sono rimasti
     * aperti per giorni perché l'app falliva in silenzio, e si sono chiusi
     * appena ha cominciato a dire il motivo: se la cancellazione dell'eco su
     * un telefono non c'è o non si accende, questa è la riga che lo dice,
     * invece di farlo dedurre da come suona.
     */
    @ReactMethod
    fun statoAudio(promise: Promise) {
        val mappa = Arguments.createMap()

        try {
            mappa.putBoolean("ecoDisponibile", AcousticEchoCanceler.isAvailable())
            mappa.putBoolean("ecoAttiva", eco?.enabled == true)
            mappa.putBoolean("rumoreDisponibile", NoiseSuppressor.isAvailable())
            mappa.putBoolean("rumoreAttivo", rumore?.enabled == true)

            val gestore = gestoreAudio
            mappa.putInt("modo", gestore.mode)
            mappa.putBoolean("comunicazione", gestore.mode == AudioManager.MODE_IN_COMMUNICATION)
            mappa.putInt("volume", gestore.getStreamVolume(AudioManager.STREAM_VOICE_CALL))
            mappa.putInt("volumeMassimo", gestore.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL))
            mappa.putInt(
                "uscita",
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    gestore.communicationDevice?.type ?: -1
                } else {
                    -1
                }
            )
        } catch (e: Exception) {
            mappa.putString("errore", e.message ?: "sconosciuto")
        }

        promise.resolve(mappa)
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Double) {
    }

    private fun emetti(evento: String, dato: String) {
        if (!contesto.hasActiveReactInstance()) return
        try {
            contesto
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(evento, dato)
        } catch (e: Exception) {
            // JavaScript non è in ascolto: il pezzo si perde, ed è giusto così.
        }
    }
}
