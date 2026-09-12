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
    }

    private var windowManager: WindowManager? = null
    private var bolla: OverlayBubbleView? = null
    private var params: WindowManager.LayoutParams? = null

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
        vaiInPrimoPiano()
        mostraBolla()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    override fun onDestroy() {
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

    private fun vaiInPrimoPiano() {
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notifica,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notifica)
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
                if (abs(dx) > soglia || abs(dy) > soglia) trascinata = true
                lp.x = originaleX + dx.toInt()
                lp.y = originaleY + dy.toInt()
                try {
                    windowManager?.updateViewLayout(vista, lp)
                } catch (e: Exception) {
                    // Vista non più agganciata: il trascinamento finisce qui.
                }
                return true
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (trascinata) {
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

    private fun apriApp() {
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
        listener?.onBubbleOpenApp()
    }
}
