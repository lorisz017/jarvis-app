package com.az11k.jarvisapp.overlay

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
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
 */
class JarvisAudioModule(private val contesto: ReactApplicationContext) :
    ReactContextBaseJavaModule(contesto) {

    companion object {
        private const val FREQUENZA_INVIO = 16000
        private const val FREQUENZA_RISPOSTA = 24000

        /** Circa un decimo di secondo di parlato per pezzo. */
        private const val CAMPIONI_PER_PEZZO = FREQUENZA_INVIO / 10

        /**
         * Quanto si scrive per volta verso l'altoparlante: 40 millesimi di
         * secondo. `write` blocca finché c'è posto, e scrivere un pezzo intero
         * terrebbe il thread fermo dentro la chiamata proprio mentre arriva
         * un'interruzione. A fette il controllo torna molto più spesso, e
         * quello che non serve più si butta invece di uscire in ritardo.
         */
        private const val BYTE_PER_FETTA = FREQUENZA_RISPOSTA * 2 / 25
    }

    override fun getName(): String = "JarvisAudio"

    private var registratore: AudioRecord? = null
    private var inAscolto = false

    // Serve solo a **raccontare** com'è messo il telefono, in Impostazioni →
    // Info. Non cambia niente: il modo audio lo decide il resto dell'app.
    private val gestoreAudio: AudioManager? by lazy {
        contesto.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    private var altoparlante: AudioTrack? = null
    private val codaRiproduzione = Executors.newSingleThreadExecutor()

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

    private fun nomeDelModo(modo: Int): String = when (modo) {
        AudioManager.MODE_NORMAL -> "normale"
        AudioManager.MODE_IN_COMMUNICATION -> "conversazione"
        AudioManager.MODE_IN_CALL -> "telefonata"
        AudioManager.MODE_RINGTONE -> "suoneria"
        else -> "altro ($modo)"
    }

    /**
     * Com'è messo il telefono adesso, per la scheda Info.
     *
     * Si limita a guardare: microfono e altoparlante accesi o no, in che modo
     * audio sta il telefono e a che volume. Serve a rispondere da lontano a
     * domande che da qui non si possono verificare, senza toccare niente.
     */
    @ReactMethod
    fun diagnosticaAudio(promise: Promise) {
        val mappa = Arguments.createMap()
        val gestore = gestoreAudio
        mappa.putBoolean("microfonoAcceso", inAscolto)
        mappa.putBoolean("altoparlanteAcceso", altoparlante != null)
        mappa.putString("modo", if (gestore == null) "sconosciuto" else nomeDelModo(gestore.mode))
        try {
            mappa.putInt("volume", gestore?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: -1)
            mappa.putInt("volumeMassimo", gestore?.getStreamMaxVolume(AudioManager.STREAM_MUSIC) ?: -1)
        } catch (e: Exception) {
            mappa.putInt("volume", -1)
            mappa.putInt("volumeMassimo", -1)
        }
        promise.resolve(mappa)
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
        val mio = generazione

        // La scrittura blocca finché c'è posto nel buffer: va fatta fuori dal
        // thread di JavaScript, altrimenti l'interfaccia si impunta.
        codaRiproduzione.execute {
            if (mio != generazione) return@execute
            try {
                val dati = Base64.decode(base64, Base64.NO_WRAP)
                var scritti = 0
                while (scritti < dati.size) {
                    // Fra una fetta e l'altra si ricontrolla: se nel frattempo
                    // è arrivata un'interruzione, il resto di questo pezzo non
                    // va più suonato.
                    if (mio != generazione) return@execute
                    val quanti = minOf(BYTE_PER_FETTA, dati.size - scritti)
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
        // Lo svuotamento va fatto **sullo stesso thread che scrive**. Farlo da
        // fuori mentre una scrittura è in corso è una corsa: il pezzo già
        // consegnato esce lo stesso, ma dopo, e quello che si sente sono
        // parole vecchie sopra le nuove. Qui non serve aspettare: la
        // generazione è già cambiata, quindi tutto ciò che è in coda si
        // scarta da sé e questo compito parte quasi subito.
        codaRiproduzione.execute {
            try {
                track.pause()
                track.flush()
                track.play()
            } catch (e: Exception) {
                // Traccia non in uno stato valido: non c'è niente da svuotare.
            }
        }
    }

    @ReactMethod
    fun stopPlayback() {
        generazione++
        val track = altoparlante ?: return
        altoparlante = null
        // Come per lo svuotamento, e qui è anche una questione di sicurezza:
        // rilasciare la traccia mentre un'altra parte del programma ci sta
        // ancora scrivendo dentro non è un difetto dell'audio, è un modo di
        // far cadere l'app.
        codaRiproduzione.execute {
            try {
                track.pause()
                track.flush()
                track.stop()
            } catch (e: Exception) {
                // Già fermo.
            }
            try {
                track.release()
            } catch (e: Exception) {
                // Già rilasciata.
            }
        }
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
