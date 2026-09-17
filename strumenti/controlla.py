"""Quello che la ricostruzione del pacchetto non prende.

`esbuild` compila anche un componente JSX che non esiste: `<Pippo/>` diventa
un riferimento a una variabile libera, e il vuoto si scopre solo quando la
schermata si apre — sul telefono, con l'app che si chiude. È già successo.

Due controlli, tutti e due statici:

1. ogni componente usato in JSX dev'essere importato o definito nel file;
2. ogni `styles.X` citato dev'esistere in `mainStyles.jsx`.

Si esegue con `python3 strumenti/controlla.py`; esce diverso da zero se
trova qualcosa, così si può mettere in un workflow.
"""
import glob
import re
import sys

# Nomi che JSX considera tag di sistema (minuscoli) o che arrivano da altro:
# qui interessano solo i componenti, cioè i nomi con l'iniziale maiuscola.
ATTESI = {'React', 'Fragment'}


def importati(sorgente):
    nomi = set(ATTESI)

    # import X from '...'   |   import X, {A, B} from '...'
    for m in re.finditer(r"^import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{([^}]*)\})?\s*from", sorgente, re.M):
        nomi.add(m.group(1))
        if m.group(2):
            nomi |= _nella_graffa(m.group(2))

    # import {A, B as C} from '...'
    for m in re.finditer(r"^import\s*\{([^}]*)\}\s*from", sorgente, re.M):
        nomi |= _nella_graffa(m.group(1))

    # import * as X from '...'
    for m in re.finditer(r"^import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from", sorgente, re.M):
        nomi.add(m.group(1))

    # definiti nel file: function X, const X =, class X
    for m in re.finditer(r"^\s*(?:export\s+)?(?:default\s+)?(?:function|class)\s+([A-Z][\w$]*)", sorgente, re.M):
        nomi.add(m.group(1))
    for m in re.finditer(r"^\s*(?:export\s+)?const\s+([A-Z][\w$]*)\s*=", sorgente, re.M):
        nomi.add(m.group(1))

    return nomi


def _nella_graffa(pezzo):
    fuori = set()
    for voce in pezzo.split(','):
        voce = voce.strip()
        if not voce:
            continue
        # "A as B": conta il nome con cui si usa
        fuori.add(voce.split(' as ')[-1].strip())
    return fuori


def usati(sorgente):
    # <Nome ...> e <Nome.Qualcosa ...>: solo l'iniziale maiuscola è un componente
    return {m.group(1) for m in re.finditer(r"<([A-Z][\w$]*)[\s/>.]", sorgente)}


def costanti_mancanti(percorso):
    """Nomi in maiuscolo usati in un file ma dichiarati da nessuna parte.

    Un identificatore che non esiste non è un errore di compilazione: è una
    variabile globale che al momento di leggerla non c'è, e l'app muore
    all'avvio. Succede scrivendo uno stile nuovo che usa un colore con un nome
    sbagliato, ed è invisibile fino all'apertura.
    """
    sorgente = open(percorso).read()

    dichiarati = set(re.findall(r'\bconst\s+([A-Z][A-Z0-9_]*)\s*=', sorgente))
    dichiarati |= _nella_graffa(' '.join(re.findall(r'import\s*\{([^}]*)\}', sorgente)))
    dichiarati |= {m.group(1) for m in re.finditer(r'^import\s+([A-Za-z_$][\w$]*)', sorgente, re.M)}
    # Nomi che arrivano dall'ambiente e non si dichiarano qui
    dichiarati |= {'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
                   'Date', 'Promise', 'Error', 'RegExp', 'Map', 'Set', 'NaN', 'Infinity'}

    # Commenti e stringhe fuori: "HUD" dentro una frase non è un nome da
    # cercare, e cercarlo vuol dire segnalare due righe di prosa a ogni giro.
    codice = re.sub(r'/\*.*?\*/', ' ', sorgente, flags=re.S)
    codice = re.sub(r'//[^\n]*', ' ', codice)
    codice = re.sub(r"'(?:\\.|[^'\\])*'", "''", codice)
    codice = re.sub(r'"(?:\\.|[^"\\])*"', '""', codice)
    codice = re.sub(r'`(?:\\.|[^`\\])*`', '``', codice)

    usati = set(re.findall(r'(?<![\w.])([A-Z][A-Z0-9_]{2,})(?![\w:])', codice))
    return sorted(usati - dichiarati)


def main():
    stili = set(re.findall(r'^\s{4}(\w+):\s*\{',
                           open('src/styles/mainStyles.jsx').read(), re.M))
    problemi = []

    for nome in costanti_mancanti('src/styles/mainStyles.jsx'):
        problemi.append(f'src/styles/mainStyles.jsx: {nome} non è dichiarato qui')

    for percorso in sorted(glob.glob('src/**/*.jsx', recursive=True)) + ['App.js', 'index.js']:
        try:
            sorgente = open(percorso).read()
        except FileNotFoundError:
            continue

        mancanti = usati(sorgente) - importati(sorgente)
        for nome in sorted(mancanti):
            problemi.append(f'{percorso}: <{nome}> non è importato né definito qui')

        for nome in sorted(set(re.findall(r'styles\.(\w+)', sorgente)) - stili):
            if percorso.endswith('mainStyles.jsx'):
                continue
            problemi.append(f'{percorso}: styles.{nome} non esiste in mainStyles.jsx')

    for riga in problemi:
        print(riga)
    print(f'\n{len(problemi)} problemi' if problemi else '\nnessun problema')
    return 1 if problemi else 0


if __name__ == '__main__':
    sys.exit(main())
