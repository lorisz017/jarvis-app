"""L'icona dell'app: l'interfaccia radar, la stessa che si vede aprendo
J.A.R.V.I.S. Disegnata a mano — qui non c'e' nessuna libreria di immagini —
con i bordi calcolati invece che campionati, cosi' restano netti a ogni
densita'. La luce si somma come luce vera: ogni elemento aggiunge il suo
contributo e alla fine si guarda quanto e' acceso il punto."""
import math, os, struct, zlib

# --- tavolozza -------------------------------------------------------------
BIANCO   = (216, 250, 255)   # il cuore, il punto piu' luminoso
CIANO    = (60, 232, 255)    # il colore dell'app
CIANO_CU = (140, 242, 255)   # cerchi principali, piu' vicini al bianco
BLU      = (44, 150, 220)    # reticolo e dettagli lontani
FONDO_C  = (7, 34, 56)       # centro dello sfondo, illuminato
FONDO_E  = (2, 5, 12)        # bordo dello sfondo, quasi nero

TAU = math.pi * 2


# --- scrittura del PNG -----------------------------------------------------
def png(percorso, larghezza, altezza, righe):
    grezzo = b''.join(
        b'\x00' + b''.join(struct.pack('BBBB', *p) for p in riga)
        for riga in righe
    )

    def blocco(tipo, dati):
        return (struct.pack('>I', len(dati)) + tipo + dati +
                struct.pack('>I', zlib.crc32(tipo + dati) & 0xffffffff))

    with open(percorso, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(blocco(b'IHDR', struct.pack('>IIBBBBB', larghezza, altezza, 8, 6, 0, 0, 0)))
        f.write(blocco(b'IDAT', zlib.compress(grezzo, 9)))
        f.write(blocco(b'IEND', b''))


def taglia(v, minimo=0.0, massimo=1.0):
    return minimo if v < minimo else massimo if v > massimo else v


# --- gli elementi del disegno ---------------------------------------------
# Ognuno e' una funzione (distanza dal centro, angolo) -> quanta luce accende.
# La sfumatura sui bordi si calcola in pixel: mezzo pixel dentro e mezzo
# fuori, che e' esattamente quello che farebbe un campionamento fine.

def arco(raggio, spessore, da=None, a=None, forza=1.0, colore=CIANO, aa=1.0):
    """Un anello, o una sua fetta se si danno gli angoli (in gradi)."""
    mezzo = spessore / 2.0
    if da is None:
        def f(d, ang):
            return (taglia((mezzo - abs(d - raggio)) / aa + 0.5) * forza, colore)
    else:
        a0 = math.radians(da) % TAU
        ampiezza = math.radians(a - da)

        def f(d, ang):
            cr = taglia((mezzo - abs(d - raggio)) / aa + 0.5)
            if cr <= 0:
                return (0.0, colore)
            t = (ang - a0) % TAU
            # distanza dall'estremo piu' vicino, misurata lungo l'arco
            if t <= ampiezza:
                dist = min(t, ampiezza - t) * d
                ca = taglia(dist / aa + 0.5)
            else:
                dist = min(t - ampiezza, TAU - t) * d
                ca = taglia(0.5 - dist / aa)
            return (cr * ca * forza, colore)
    return f


def sweep(raggio, spessore, da, a, forza=1.0, colore=CIANO, aa=1.0):
    """Il braccio che gira: pieno da una parte, si spegne dall'altra."""
    mezzo = spessore / 2.0
    a0 = math.radians(da) % TAU
    ampiezza = math.radians(a - da)

    def f(d, ang):
        cr = taglia((mezzo - abs(d - raggio)) / aa + 0.5)
        if cr <= 0:
            return (0.0, colore)
        t = (ang - a0) % TAU
        if t > ampiezza:
            dist = min(t - ampiezza, TAU - t) * d
            ca = taglia(0.5 - dist / aa)
            return (cr * ca * forza * 0.15, colore)
        # dalla coda alla testa la luce cresce
        q = t / ampiezza
        return (cr * forza * (0.12 + 0.88 * q * q), colore)
    return f


def tacche(raggio, lunghezza, spessore, quante, sfasamento=0.0,
           forza=1.0, colore=BLU, aa=1.0):
    """Le tacche della scala, tutt'intorno."""
    passo = TAU / quante
    mezzo = lunghezza / 2.0
    sf = math.radians(sfasamento)

    def f(d, ang):
        cr = taglia((mezzo - abs(d - raggio)) / aa + 0.5)
        if cr <= 0:
            return (0.0, colore)
        resto = ((ang - sf) % passo)
        delta = min(resto, passo - resto) * d      # distanza dalla tacca
        ca = taglia((spessore / 2.0 - delta) / aa + 0.5)
        return (cr * ca * forza, colore)
    return f


def reticolo(spessore, buco, estensione, forza=1.0, colore=BLU, aa=1.0):
    """La croce sottile che attraversa il quadro, interrotta sul cuore."""
    mezzo = spessore / 2.0

    def f(d, ang):
        if d > estensione:
            return (0.0, colore)
        # distanza dall'asse orizzontale e da quello verticale
        dy = abs(d * math.sin(ang))
        dx = abs(d * math.cos(ang))
        c = max(taglia((mezzo - dy) / aa + 0.5), taglia((mezzo - dx) / aa + 0.5))
        if c <= 0:
            return (0.0, colore)
        # si spegne dolcemente sul cuore e verso il bordo
        c *= taglia((d - buco) / (buco * 0.6))
        c *= taglia((estensione - d) / (estensione * 0.25))
        return (c * forza, colore)
    return f


def alone(raggio, forza=1.0, colore=CIANO):
    """Il bagliore del cuore: nessun bordo, solo luce che si spegne."""
    def f(d, ang):
        q = d / raggio
        if q >= 1.0:
            return (0.0, colore)
        v = 1.0 - q
        return (v * v * forza, colore)
    return f


def disco(raggio, forza=1.0, colore=BIANCO, aa=1.0):
    def f(d, ang):
        return (taglia((raggio - d) / aa + 0.5) * forza, colore)
    return f


# --- la composizione -------------------------------------------------------
def elementi(R, px):
    """R: raggio del disegno in pixel. px: quanti pixel vale una linea sottile.
    Sotto una certa misura i dettagli fini diventano sporcizia: si tolgono."""
    fine = R >= 34          # tacche e reticolo solo quando c'e' spazio
    sottile = max(R * 0.016, px)
    medio   = max(R * 0.030, px * 1.2)
    grosso  = max(R * 0.055, px * 1.6)

    e = []
    # il bagliore, sotto tutto: e' quello che rende l'icona accesa invece
    # che disegnata
    e.append(alone(R * 1.10, 0.60, (26, 132, 215)))
    e.append(alone(R * 0.58, 1.05, (95, 220, 255)))

    if fine:
        e.append(reticolo(max(R * 0.012, px * 0.8), R * 0.34, R * 1.06, 0.50, BLU))
        e.append(tacche(R * 0.985, R * 0.075, max(R * 0.014, px * 0.9), 36, 0, 0.50, BLU))
        e.append(tacche(R * 0.93, R * 0.10, max(R * 0.020, px), 4, 45, 0.55, CIANO))

    # anello esterno, spezzato: quattro archi lunghi con quattro varchi
    for da in (8, 98, 188, 278):
        e.append(arco(R * 0.93, medio, da, da + 74, 1.05, CIANO_CU))
    # un filo continuo appena fuori
    e.append(arco(R * 1.0, sottile, None, None, 0.55, BLU))
    # due frammenti corti piu' in la', per rompere la simmetria
    e.append(arco(R * 0.84, sottile, 132, 178, 0.75, CIANO))
    e.append(arco(R * 0.84, sottile, -26, 8, 0.75, CIANO))

    # anello di mezzo, spezzato in modo diverso: il quadro non e' simmetrico
    for da, a in ((-42, 70), (120, 196), (214, 298)):
        e.append(arco(R * 0.74, sottile * 1.3, da, a, 0.90, CIANO))

    # il braccio che gira, la firma dell'app
    e.append(sweep(R * 0.60, grosso, -78, 26, 1.35, CIANO_CU))
    e.append(arco(R * 0.46, sottile, 150, 250, 0.55, CIANO))

    # il cuore: bagliore, cerchio netto, nucleo bianco
    e.append(arco(R * 0.38, max(R * 0.010, px * 0.8), None, None, 0.40, CIANO))
    e.append(arco(R * 0.30, medio, None, None, 1.25, CIANO_CU))
    e.append(disco(R * 0.235, 0.50, (80, 215, 255)))
    e.append(disco(R * 0.115, 1.30, BIANCO))
    return e


def rendi(lato, fondo, colore_fisso=None, quota=0.33):
    """quota: il raggio del disegno rispetto al lato. Per le icone adattive
    l'area sicura e' il cerchio centrale, un terzo del lato."""
    c = lato / 2.0
    R = lato * quota
    pezzi = elementi(R, 1.0)
    raggio_fondo = lato * 0.72

    righe = []
    for py in range(lato):
        riga = []
        y = py + 0.5 - c
        for px_ in range(lato):
            x = px_ + 0.5 - c
            d = math.hypot(x, y)
            ang = math.atan2(y, x)

            luce = 0.0
            rr = gg = bb = 0.0
            for f in pezzi:
                v, col = f(d, ang)
                if v > 0:
                    luce += v
                    rr += col[0] * v
                    gg += col[1] * v
                    bb += col[2] * v

            if luce <= 0.0005:
                alfa, r, g, b = 0.0, 0, 0, 0
            else:
                r, g, b = rr / luce, gg / luce, bb / luce
                # la luce che si somma schiarisce il colore invece di spegnerlo
                if luce > 1.0:
                    k = min((luce - 1.0) * 0.5, 1.0)
                    r += (255 - r) * k
                    g += (255 - g) * k
                    b += (255 - b) * k
                alfa = taglia(luce)

            if colore_fisso:
                r, g, b = colore_fisso

            if fondo:
                q = taglia(d / raggio_fondo)
                q = q * q
                fr = FONDO_C[0] + (FONDO_E[0] - FONDO_C[0]) * q
                fg = FONDO_C[1] + (FONDO_E[1] - FONDO_C[1]) * q
                fb = FONDO_C[2] + (FONDO_E[2] - FONDO_C[2]) * q
                riga.append((round(fr + (r - fr) * alfa),
                             round(fg + (g - fg) * alfa),
                             round(fb + (b - fb) * alfa), 255))
            else:
                riga.append((round(taglia(r, 0, 255)), round(taglia(g, 0, 255)),
                             round(taglia(b, 0, 255)), round(alfa * 255)))
        righe.append(riga)
    return righe


def sfondo(lato):
    """Il fondo dell'icona adattiva: buio con il centro illuminato, cosi' il
    bagliore continua anche dove la figura non arriva."""
    c = lato / 2.0
    raggio = lato * 0.62
    righe = []
    for py in range(lato):
        riga = []
        y = py + 0.5 - c
        for px_ in range(lato):
            x = px_ + 0.5 - c
            q = taglia(math.hypot(x, y) / raggio)
            q = q * q
            riga.append((round(FONDO_C[0] + (FONDO_E[0] - FONDO_C[0]) * q),
                         round(FONDO_C[1] + (FONDO_E[1] - FONDO_C[1]) * q),
                         round(FONDO_C[2] + (FONDO_E[2] - FONDO_C[2]) * q), 255))
        righe.append(riga)
    return righe


if __name__ == '__main__':
    import sys
    BASE = 'android/app/src/main/res'
    DENSITA = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216),
               'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}

    if len(sys.argv) > 1 and sys.argv[1] == 'anteprima':
        lato = int(sys.argv[2]) if len(sys.argv) > 2 else 512
        png(sys.argv[3], lato, lato, rendi(lato, True, quota=0.40))
        print('anteprima pronta')
        raise SystemExit

    for nome, (legacy, adattivo) in DENSITA.items():
        cartella = f'{BASE}/mipmap-{nome}'
        os.makedirs(cartella, exist_ok=True)
        # icona intera per i telefoni che non conoscono quelle adattive:
        # niente maschera, quindi il disegno puo' occupare piu' spazio
        png(f'{cartella}/ic_launcher.png', legacy, legacy,
            rendi(legacy, True, quota=0.40))
        png(f'{cartella}/ic_launcher_background.png', adattivo, adattivo,
            sfondo(adattivo))
        png(f'{cartella}/ic_launcher_foreground.png', adattivo, adattivo,
            rendi(adattivo, False))
        png(f'{cartella}/ic_launcher_monochrome.png', adattivo, adattivo,
            rendi(adattivo, False, colore_fisso=(255, 255, 255)))
        print(f'{nome}: {legacy}px e {adattivo}px')
