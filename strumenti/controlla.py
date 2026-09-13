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


def main():
    stili = set(re.findall(r'^\s{4}(\w+):\s*\{',
                           open('src/styles/mainStyles.jsx').read(), re.M))
    problemi = []

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
