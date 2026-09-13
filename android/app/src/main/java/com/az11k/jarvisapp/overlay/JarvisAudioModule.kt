package com.az11k.jarvisapp.overlay

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
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
 */
class JarvisAudioModule(private val contesto: ReactApplicationContext) :
    ReactContextBaseJavaModule(contesto) {

    companion object {
        private const val FREQUENZA_INVIO = 16000
        private const val FREQUENZA_RISPOSTA = 24000

        /** Circa un decimo di secondo di parlato per pezzo. */
        private const val CAMPIONI_PER_PEZZO = FREQUENZA_INVIO / 10
    }

    override fun getName(): String = "JarvisAudio"

    private var registratore: AudioRecord? = null
    private var inAscolto = false

    private var altoparlante: AudioTrack? = null
    private val codaRiproduzione = Executors.newSingleThreadExecutor()

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
        val record = registratore ?: return
        registratore = null
        try {
            if (record.recordingState == AudioRecord.RECORDSTATE_RECORDING) record.stop()
        } catch (e: Exception) {
            // Già fermo.
        }
        record.release()
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

        val track = try {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
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
            promise.reject("E_AUDIO", e.message, e)
            return
        }

        altoparlante = track
        track.play()
        promise.resolve(true)
    }

    @ReactMethod
    fun playChunk(base64: String) {
        val track = altoparlante ?: return
        // La scrittura blocca finché c'è posto nel buffer: va fatta fuori dal
        // thread di JavaScript, altrimenti l'interfaccia si impunta.
        codaRiproduzione.execute {
            try {
                val dati = Base64.decode(base64, Base64.NO_WRAP)
                track.write(dati, 0, dati.size)
            } catch (e: Exception) {
                // Traccia chiusa nel frattempo: il pezzo si scarta.
            }
        }
    }

    /** Zittisce subito quello che sta uscendo: serve quando lo si interrompe. */
    @ReactMethod
    fun flushPlayback() {
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
        val track = altoparlante ?: return
        altoparlante = null
        try {
            track.pause()
            track.flush()
            track.stop()
        } catch (e: Exception) {
            // Già fermo.
        }
        track.release()
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
