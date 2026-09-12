package com.az11k.jarvisapp.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.az11k.jarvisapp.MainActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/** Il ponte fra la bolla nativa e il resto dell'app, che è scritto in JavaScript. */
class JarvisOverlayModule(private val contesto: ReactApplicationContext) :
    ReactContextBaseJavaModule(contesto), OverlayListener {

    override fun getName(): String = "JarvisOverlay"

    @ReactMethod
    fun hasPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(contesto))
    }

    /**
     * Il permesso di disegnare sopra le altre app non si può concedere da una
     * finestra di sistema come gli altri: Android apre una sua schermata, e
     * l'utente deve attivarlo lì a mano.
     */
    @ReactMethod
    fun requestPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + contesto.packageName)
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            contesto.startActivity(intent)
        } catch (e: Exception) {
            // Su qualche dispositivo la schermata non esiste: senza permesso
            // la bolla semplicemente non parte, e l'app funziona come prima.
        }
    }

    @ReactMethod
    fun show(promise: Promise) {
        if (!Settings.canDrawOverlays(contesto)) {
            promise.resolve(false)
            return
        }

        JarvisOverlayService.listener = this

        val intent = Intent(contesto, JarvisOverlayService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                contesto.startForegroundService(intent)
            } else {
                contesto.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun hide() {
        try {
            contesto.stopService(Intent(contesto, JarvisOverlayService::class.java))
        } catch (e: Exception) {
            // Servizio già fermo.
        }
    }

    @ReactMethod
    fun isVisible(promise: Promise) {
        promise.resolve(JarvisOverlayService.isRunning())
    }

    @ReactMethod
    fun setVisible(visible: Boolean) {
        JarvisOverlayService.applyVisibility(visible)
    }

    /**
     * Riporta davanti l'app.
     *
     * Serve fra un'azione sul telefono e la successiva: impostare una sveglia
     * apre l'orologio, e da lì in poi l'app è dietro. Android impedisce a
     * un'app in secondo piano di aprire altre schermate, quindi la seconda
     * azione della catena veniva scartata senza dire niente. Il permesso di
     * sovrapposizione, quello della bolla, è anche l'eccezione che permette
     * questo rientro.
     */
    @ReactMethod
    fun bringAppToFront() {
        try {
            val intent = Intent(contesto, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            contesto.startActivity(intent)
        } catch (e: Exception) {
            // Senza il permesso di sovrapposizione Android può rifiutare:
            // la catena si interrompe, ma non succede niente di peggio.
        }
    }

    @ReactMethod
    fun setState(state: String) {
        JarvisOverlayService.applyState(state)
    }

    // Richiesti da NativeEventEmitter: senza, React Native avvisa a ogni ascolto.
    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Double) {
    }

    override fun onBubbleTap() {
        emetti("jarvisOverlayTap")
    }

    override fun onBubbleOpenApp() {
        emetti("jarvisOverlayOpenApp")
    }

    private fun emetti(evento: String) {
        if (!contesto.hasActiveReactInstance()) return
        try {
            contesto
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(evento, null)
        } catch (e: Exception) {
            // JavaScript non è in ascolto (app appena chiusa): nulla da fare.
        }
    }
}
