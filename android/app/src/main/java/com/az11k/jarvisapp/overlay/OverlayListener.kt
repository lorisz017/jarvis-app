package com.az11k.jarvisapp.overlay

/** Come il servizio avvisa il resto dell'app di cosa è successo sulla bolla. */
interface OverlayListener {
    /** Tocco breve: si comincia (o si smette) di ascoltare. */
    fun onBubbleTap()

    /** Pressione lunga: l'app torna in primo piano. */
    fun onBubbleOpenApp()
}
