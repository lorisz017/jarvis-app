package com.az11k.jarvisapp.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.az11k.jarvisapp.MainActivity
import com.az11k.jarvisapp.R
import kotlin.math.abs

/**
 * Tiene la bolla sopra le altre applicazioni.
 *
 * È un servizio in primo piano (quello con la notifica fissa) non per capriccio:
 * è l'unico modo perché Android non chiuda il processo appena si esce dall'app,
 * ed è anche la condizione per poter usare il microfono da fuori.
 */
class JarvisOverlayService : Service() {

    companion object {
        private const val CHANNEL_ID = "jarvis_overlay"
        private const val NOTIFICATION_ID = 7311
        private const val SOGLIA_TRASCINAMENTO = 16
        private const val DURATA_PRESSIONE_LUNGA = 450L

        /** Chi ascolta i tocchi sulla bolla: lo imposta il modulo nativo. */
        var listener: OverlayListener? = null

        private var instance: JarvisOverlayService? = null

        /** Cambia l'aspetto della bolla, se è sullo schermo. */
        fun applyState(state: String) {
            val servizio = instance ?: return
            val bolla = servizio.bolla ?: return
            // invalidate() vuole il thread dell'interfaccia, e questa chiamata
            // arriva da JavaScript: si passa dalla coda della vista.
            bolla.post { bolla.setBubbleState(state) }
        }

        fun isRunning(): Boolean = instance != null

        /** Mostra o nasconde il cerchio, lasciando il servizio in piedi. */
        fun applyVisibility(visibile: Boolean) {
            val bolla = instance?.bolla ?: return
            bolla.post { bolla.visibility = if (visibile) View.VISIBLE else View.GONE }
        }
    }

    private var windowManager: WindowManager? = null
    private var bolla: OverlayBubbleView? = null
    private var params: WindowManager.LayoutParams? = null
    private var zonaRimozione: RemoveZoneView? = null
    private var paramsZona: WindowManager.LayoutParams? = null

    private var partenzaX = 0f
    private var partenzaY = 0f
    private var originaleX = 0
    private var originaleY = 0
    private var premutoDa = 0L
    private var trascinata = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        if (!vaiInPrimoPiano()) {
            // Non si è riusciti a diventare servizio in primo piano: si chiude
            // qui. Prima l'eccezione usciva da onCreate e portava giù l'app —
            // una bolla che non parte è un fastidio, un'app che crolla no.
            stopSelf()
            return
        }
        mostraBolla()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    override fun onDestroy() {
        nascondiZonaRimozione()
        val vista = bolla
        if (vista != null) {
            try {
                windowManager?.removeView(vista)
            } catch (e: Exception) {
                // La vista può essere già stata tolta: non c'è altro da fare.
            }
        }
        bolla = null
        params = null
        windowManager = null
        instance = null
        super.onDestroy()
    }

    /** Restituisce false se Android non ha accettato il servizio. */
    private fun vaiInPrimoPiano(): Boolean {
        val gestore = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val canale = NotificationChannel(
                CHANNEL_ID,
                "J.A.R.V.I.S. attivo",
                NotificationManager.IMPORTANCE_LOW
            )
            canale.setShowBadge(false)
            gestore.createNotificationChannel(canale)
        }

        val apri = Intent(this, MainActivity::class.java)
        apri.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val tocco = PendingIntent.getActivity(
            this, 0, apri,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notifica: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("J.A.R.V.I.S.")
            .setContentText("In ascolto anche fuori dall'app")
            .setSmallIcon(R.drawable.ic_jarvis_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(tocco)
            .build()

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return try {
                startForeground(NOTIFICATION_ID, notifica)
                true
            } catch (e: Exception) {
                false
            }
        }

        // Il tipo "microfono" è quello che serve per poter parlare alla bolla
        // da fuori, ma Android lo concede solo se l'app è ancora in primo
        // piano nel momento in cui il servizio parte. Se lo rifiuta si ripiega
        // su un tipo generico: la bolla resta, si perde solo il microfono da
        // fuori, e nessuno se ne va per terra.
        return try {
            startForeground(
                NOTIFICATION_ID,
                notifica,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
            true
        } catch (primo: Exception) {
            try {
                startForeground(
                    NOTIFICATION_ID,
                    notifica,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                )
                true
            } catch (secondo: Exception) {
                false
            }
        }
    }

    private fun mostraBolla() {
        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val densita = resources.displayMetrics.density
        val lato = (densita * 62).toInt()

        val tipo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val lp = WindowManager.LayoutParams(
            lato,
            lato,
            tipo,
            // Non prende il fuoco: la tastiera e i tocchi delle altre app
            // continuano a funzionare normalmente.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.TOP or Gravity.START
        lp.x = resources.displayMetrics.widthPixels - lato - (densita * 8).toInt()
        lp.y = (resources.displayMetrics.heightPixels * 0.35).toInt()
        params = lp

        val vista = OverlayBubbleView(this)
        vista.setOnTouchListener { _, evento -> gestisciTocco(evento) }
        // Nasce nascosta: il servizio parte mentre l'app è ancora aperta (è
        // l'unico momento in cui Android lo lascia partire col microfono), ma
        // il cerchio deve comparire solo quando si esce.
        vista.visibility = View.GONE
        bolla = vista

        try {
            wm.addView(vista, lp)
        } catch (e: Exception) {
            // Senza il permesso di sovrapposizione Android rifiuta la vista:
            // il servizio si chiude invece di restare lì a fare niente.
            bolla = null
            stopSelf()
        }
    }

    private fun gestisciTocco(evento: MotionEvent): Boolean {
        val lp = params ?: return false
        val vista = bolla ?: return false
        val soglia = resources.displayMetrics.density * SOGLIA_TRASCINAMENTO

        when (evento.action) {
            MotionEvent.ACTION_DOWN -> {
                partenzaX = evento.rawX
                partenzaY = evento.rawY
                originaleX = lp.x
                originaleY = lp.y
                premutoDa = SystemClock.uptimeMillis()
                trascinata = false
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = evento.rawX - partenzaX
                val dy = evento.rawY - partenzaY
                if (abs(dx) > soglia || abs(dy) > soglia) {
                    if (!trascinata) mostraZonaRimozione()
                    trascinata = true
                }
                lp.x = originaleX + dx.toInt()
                lp.y = originaleY + dy.toInt()
                try {
                    windowManager?.updateViewLayout(vista, lp)
                } catch (e: Exception) {
                    // Vista non più agganciata: il trascinamento finisce qui.
                }
                if (trascinata) zonaRimozione?.setAttiva(sopraLaZona(vista))
                return true
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (trascinata) {
                    val daRimuovere = sopraLaZona(vista)
                    nascondiZonaRimozione()
                    if (daRimuovere) {
                        // Lasciata sulla linguetta: la bolla se ne va, e
                        // l'interruttore nelle impostazioni si spegne da solo
                        // perché resti in pari con quello che si vede.
                        listener?.onBubbleRemoved()
                        stopSelf()
                        return true
                    }
                    accostaAlBordo(vista, lp)
                } else if (SystemClock.uptimeMillis() - premutoDa >= DURATA_PRESSIONE_LUNGA) {
                    apriApp()
                } else {
                    listener?.onBubbleTap()
                }
                return true
            }
        }

        return false
    }

    /** Dopo il trascinamento la bolla si appoggia al bordo più vicino. */
    private fun accostaAlBordo(vista: OverlayBubbleView, lp: WindowManager.LayoutParams) {
        val larghezzaSchermo = resources.displayMetrics.widthPixels
        val altezzaSchermo = resources.displayMetrics.heightPixels
        val margine = (resources.displayMetrics.density * 8).toInt()

        lp.x = if (lp.x + vista.width / 2 < larghezzaSchermo / 2) {
            margine
        } else {
            larghezzaSchermo - vista.width - margine
        }
        lp.y = lp.y.coerceIn(margine, altezzaSchermo - vista.height - margine)

        try {
            windowManager?.updateViewLayout(vista, lp)
        } catch (e: Exception) {
            // Come sopra: se la vista non c'è più non serve riposizionarla.
        }
    }

    /** Compare in basso quando il trascinamento comincia davvero. */
    private fun mostraZonaRimozione() {
        if (zonaRimozione != null) return
        val wm = windowManager ?: return

        val densita = resources.displayMetrics.density
        val larghezza = (densita * 200).toInt()
        val altezza = (densita * 64).toInt()

        val tipo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val lp = WindowManager.LayoutParams(
            larghezza,
            altezza,
            tipo,
            // Non intercetta i tocchi: il dito sta trascinando la bolla, e la
            // linguetta deve solo farsi vedere.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        lp.y = (densita * 48).toInt()
        paramsZona = lp

        val vista = RemoveZoneView(this)
        zonaRimozione = vista

        try {
            wm.addView(vista, lp)
        } catch (e: Exception) {
            zonaRimozione = null
            paramsZona = null
        }
    }

    private fun nascondiZonaRimozione() {
        val vista = zonaRimozione ?: return
        try {
            windowManager?.removeView(vista)
        } catch (e: Exception) {
            // Già tolta.
        }
        zonaRimozione = null
        paramsZona = null
    }

    /**
     * Vero se il centro della bolla si trova sopra la linguetta.
     *
     * Le posizioni si chiedono alle viste stesse invece di ricavarle dai
     * parametri della finestra: la bolla è ancorata in alto a sinistra e la
     * linguetta in basso al centro, e mettere in relazione due ancoraggi
     * diversi voleva dire sbagliare di quanto misurano barra di stato e barra
     * di navigazione — per questo bisognava mirare più in basso del disegno.
     */
    private fun sopraLaZona(vista: OverlayBubbleView): Boolean {
        val zona = zonaRimozione ?: return false
        if (zona.width == 0 || zona.height == 0) return false

        val posizioneZona = IntArray(2)
        val posizioneBolla = IntArray(2)
        zona.getLocationOnScreen(posizioneZona)
        vista.getLocationOnScreen(posizioneBolla)

        // Un po' di tolleranza attorno: prendere la mira col dito mentre si
        // trascina è più difficile di quanto sembri.
        val margine = resources.displayMetrics.density * 28

        val centroX = posizioneBolla[0] + vista.width / 2f
        val centroY = posizioneBolla[1] + vista.height / 2f

        return centroX >= posizioneZona[0] - margine &&
            centroX <= posizioneZona[0] + zona.width + margine &&
            centroY >= posizioneZona[1] - margine &&
            centroY <= posizioneZona[1] + zona.height + margine
    }

    /** Usato anche dal modulo, fra un'azione sul telefono e la successiva. */
    fun apriApp() {
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
        listener?.onBubbleOpenApp()
    }
}
