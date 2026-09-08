# Stato delle funzioni — J.A.R.V.I.S. 2.0.0

Legenda:

- ✅ **Funziona** — provata sul telefono e confermata
- ⚠️ **Da riprovare** — corretta nel codice, ma non ancora verificata dopo la correzione
- ❌ **Non funziona** — provata e non funzionante
- ⏳ **Non testabile ora** — bloccata da qualcosa di esterno (quota, chiave mancante)

Ultimo aggiornamento: dopo la build della versione 2.0.0.

---

## Voce e testo

| Funzione | Come si usa | Stato |
|---|---|---|
| Comando vocale | Tocchi il radar e parli | ✅ |
| Comando scritto | Campo di testo in fondo | ✅ |
| Risposta parlata | Voce Gemini, con ripiego sulla voce di sistema | ✅ |
| Scelta della voce | Pill "VOCE" | ✅ |
| Spegnere la voce | Pulsante 🔊 in alto a destra | ✅ |
| Interrompere la voce mentre parla | 🔊, FERMA, o il microfono | ⚠️ si ferma, ma riattivandola non tornava a parlare — corretto |
| Registro attività scorrevole | Sotto il radar | ✅ |

## Informazioni

| Funzione | Come si usa | Stato |
|---|---|---|
| Riepilogo all'apertura | Automatico all'avvio | ✅ |
| Meteo | "Che tempo fa a Milano?" | ✅ |
| Ricerca sul web | "Chi ha vinto...", "Prezzo di..." | ⏳ limite di richieste Groq — alleggerita, da riprovare |

## Tempo e promemoria

| Funzione | Come si usa | Stato |
|---|---|---|
| Sveglia | "Svegliami alle 7 e 30" | ⚠️ la creava sempre fra 24 ore — corretto |
| Timer | "Timer di 10 minuti" | ⚠️ apriva l'Orologio senza impostare nulla — corretto |
| Promemoria | "Ricordami tra 20 minuti di..." | ✅ |
| Elenco promemoria | "Che promemoria ho?" | ✅ |
| Annullare i promemoria | "Cancella i promemoria" | ✅ |
| Evento in calendario | "Appuntamento domani alle 15 dal dentista" | ✅ |

## Telefono e app

| Funzione | Come si usa | Stato |
|---|---|---|
| Chiamate | "Chiama Marco" | ✅ |
| Messaggi WhatsApp | "Manda un whatsapp a Marco che arrivo" | ✅ |
| Navigazione | "Portami a Milano" | ✅ |
| Apertura app | "Apri Spotify" — una ventina di app note | ✅ |
| Fotocamera | "Apri la fotocamera" | ✅ |
| Telegram | "Apri Telegram" | ✅ |
| YouTube | "Cerca musica rilassante su YouTube" | ✅ |

## Sviluppo (GitHub)

| Funzione | Come si usa | Stato |
|---|---|---|
| Creare un repository | "Crea un repository chiamato..." | ⏳ manca `EXPO_PUBLIC_GITHUB_TOKEN_KEY` su expo.dev |
| Eliminare un repository | "Elimina il repository..." — con conferma | ⏳ come sopra |
| Ultimi commit | "Mostrami gli ultimi commit" | ⏳ come sopra |

## Interfaccia e sistema

| Funzione | Dove | Stato |
|---|---|---|
| Radar animato | Schermata principale | ✅ |
| Orologio e data | In alto a sinistra | ✅ |
| Monitor batteria | Sotto l'intestazione | ✅ |
| Pannello impostazioni | Pulsante ⋮ | ✅ |
| Cambio città del riepilogo | Impostazioni | ✅ |
| Riepilogo all'avvio on/off | Impostazioni | ✅ |
| Scheda Funzioni | Impostazioni | ✅ |
| Scheda Info e crediti | Impostazioni | ✅ |
| Memoria persistente | Automatica | ✅ |
| Pulisci chat | Pill "PULISCI" | ✅ |

---

## Da riprovare alla prossima build

1. **Sveglia** — deve finire all'orario richiesto, non fra 24 ore
2. **Timer** — deve partire davvero, non solo aprire l'Orologio
3. **Interruzione voce** — spegnere e **riaccendere**: deve tornare a parlare
4. **Ricerca web** — deve rispondere con dati reali, non con il messaggio di limite raggiunto

## Non ancora implementato

- **Parola di attivazione "Jarvis"** — ascolto continuo senza toccare lo schermo. Rimandata: è l'unica funzione non verificabile senza un dispositivo e rischia di destabilizzare il resto.
