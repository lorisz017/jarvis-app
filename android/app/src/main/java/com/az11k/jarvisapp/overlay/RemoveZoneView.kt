package com.az11k.jarvisapp.overlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

/**
 * La linguetta "RIMUOVI" che compare in basso mentre si trascina la bolla.
 *
 * Si illumina quando la bolla le arriva sopra, così si capisce che lasciando
 * la presa lì la bolla se ne va — è il modo in cui funzionano tutte le app
 * con la bolla, e quindi quello che uno si aspetta.
 */
class RemoveZoneView(context: Context) : View(context) {

    companion object {
        private val CYAN = Color.parseColor("#00d9ff")
        private val RED = Color.parseColor("#ff2d55")
        private val BACKGROUND = Color.parseColor("#04070d")
    }

    private var attiva = false

    private val fondo = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val bordo = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val testo = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
    }

    private val riquadro = RectF()

    fun setAttiva(nuova: Boolean) {
        if (nuova == attiva) return
        attiva = nuova
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val larghezza = width.toFloat()
        val altezza = height.toFloat()
        if (larghezza <= 0f || altezza <= 0f) return

        val colore = if (attiva) RED else CYAN
        val margine = altezza * 0.12f
        riquadro.set(margine, margine, larghezza - margine, altezza - margine)
        val raggio = riquadro.height() / 2f

        fondo.color = BACKGROUND
        fondo.alpha = if (attiva) 245 else 215
        canvas.drawRoundRect(riquadro, raggio, raggio, fondo)

        bordo.color = colore
        bordo.alpha = if (attiva) 255 else 140
        bordo.strokeWidth = altezza * 0.045f
        canvas.drawRoundRect(riquadro, raggio, raggio, bordo)

        testo.color = colore
        testo.alpha = 255
        testo.textSize = altezza * 0.30f
        // Il testo si centra sulla linea di base, non sul bordo superiore:
        // senza questa correzione resterebbe visibilmente troppo in basso.
        val centroTesto = riquadro.centerY() - (testo.descent() + testo.ascent()) / 2f
        canvas.drawText("✕  RIMUOVI", riquadro.centerX(), centroTesto, testo)
    }
}
