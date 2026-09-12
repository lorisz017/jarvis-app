package com.az11k.jarvisapp.overlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.min
import kotlin.math.sin

/**
 * La bolla che resta sopra le altre applicazioni.
 *
 * È disegnata a mano invece che con un'immagine per due motivi: deve avere lo
 * stesso anello del radar che sta al centro dell'app, e deve cambiare aspetto
 * a seconda di cosa J.A.R.V.I.S. sta facendo, cosa che un'icona ferma non può
 * fare.
 */
class OverlayBubbleView(context: Context) : View(context) {

    companion object {
        const val STATE_IDLE = "idle"
        const val STATE_LISTENING = "listening"
        const val STATE_THINKING = "thinking"
        const val STATE_SPEAKING = "speaking"

        // Gli stessi colori della palette HUD in mainStyles.jsx
        private val CYAN = Color.parseColor("#00d9ff")
        private val GREEN = Color.parseColor("#00ff9d")
        private val AMBER = Color.parseColor("#ffb300")
        private val BACKGROUND = Color.parseColor("#04070d")
    }

    private var state = STATE_IDLE
    private val avvio = System.currentTimeMillis()

    private val fondo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val anello = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
    }
    private val braccio = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val nucleo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val arco = RectF()

    fun setBubbleState(nuovo: String) {
        if (nuovo == state) return
        state = nuovo
        invalidate()
    }

    private fun coloreStato(): Int = when (state) {
        STATE_LISTENING -> GREEN
        STATE_THINKING -> AMBER
        else -> CYAN
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val larghezza = width.toFloat()
        val altezza = height.toFloat()
        val cx = larghezza / 2f
        val cy = altezza / 2f
        // Un po' di margine sul bordo, così l'anello non viene tagliato
        val raggio = min(larghezza, altezza) / 2f - larghezza * 0.09f
        if (raggio <= 0f) return

        val colore = coloreStato()
        val t = (System.currentTimeMillis() - avvio) / 1000f

        fondo.color = BACKGROUND
        fondo.alpha = 235
        canvas.drawCircle(cx, cy, raggio, fondo)

        anello.color = colore
        anello.alpha = 80
        anello.strokeWidth = larghezza * 0.035f
        canvas.drawCircle(cx, cy, raggio, anello)

        // Il braccio gira sempre, ma accelera mentre il modello sta pensando:
        // da fuori si capisce che sta lavorando senza aprire l'app.
        val velocita = if (state == STATE_THINKING) 320f else 85f
        arco.set(cx - raggio, cy - raggio, cx + raggio, cy + raggio)
        braccio.color = colore
        braccio.alpha = 255
        braccio.strokeWidth = larghezza * 0.05f
        canvas.drawArc(arco, (t * velocita) % 360f, 72f, false, braccio)

        // Il nucleo pulsa mentre ascolta o mentre parla, resta fermo altrimenti
        val pulsazione = when (state) {
            STATE_LISTENING, STATE_SPEAKING -> 0.30f + 0.13f * sin(t * 6.0).toFloat()
            else -> 0.27f
        }
        nucleo.color = colore
        nucleo.alpha = 225
        canvas.drawCircle(cx, cy, raggio * pulsazione, nucleo)

        // Si richiama da sola: finché la bolla è sullo schermo l'animazione va
        postInvalidateOnAnimation()
    }
}
