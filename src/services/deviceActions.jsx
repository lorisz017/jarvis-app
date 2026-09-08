import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as IntentLauncher from 'expo-intent-launcher';

// ============================================================
// SVEGLIA E TIMER NATIVI
// Aprono l'app Orologio del telefono (qualsiasi essa sia) e vi
// impostano davvero una sveglia o un timer — non un promemoria
// interno all'app. Solo Android: su iOS non esiste un
// equivalente pubblico per le app di terze parti.
//
// Si usa IntentLauncher e NON Linking.sendIntent di React
// Native: quest'ultimo manda ogni numero come Double, mentre
// l'app Orologio legge ora, minuti e durata con getIntExtra.
// Non trovando degli interi usava i valori di default, e da lì
// venivano la sveglia sempre all'ora corrente (cioè fra 24 ore)
// e il timer che si apriva vuoto. IntentLauncher converte i
// numeri in Int, che è quello che l'app Orologio si aspetta.
// ============================================================

// startActivityAsync si risolve quando l'app lanciata si chiude. Con SKIP_UI
// l'app Orologio si chiude da sola, ma se su qualche dispositivo restasse
// aperta la promessa non si risolverebbe mai e la conferma non arriverebbe:
// si attende un attimo, quanto basta a intercettare l'errore se l'app manca.
async function launchIntent(action, extra) {
    let launchError = null;

    const launch = IntentLauncher.startActivityAsync(action, {extra}).catch((error) => {
        launchError = error;
    });

    await Promise.race([launch, new Promise((resolve) => setTimeout(resolve, 1500))]);

    if (launchError) throw launchError;
}

export const setNativeAlarm = async (hour, minute, label) => {
    if (Platform.OS !== 'android') {
        throw new Error('Le sveglie native sono disponibili solo su Android');
    }

    await launchIntent('android.intent.action.SET_ALARM', {
        'android.intent.extra.alarm.HOUR': hour,
        'android.intent.extra.alarm.MINUTES': minute,
        'android.intent.extra.alarm.MESSAGE': label,
        'android.intent.extra.alarm.SKIP_UI': true,
    });
};

export const setNativeTimer = async (seconds, label) => {
    if (Platform.OS !== 'android') {
        throw new Error('I timer nativi sono disponibili solo su Android');
    }

    await launchIntent('android.intent.action.SET_TIMER', {
        'android.intent.extra.alarm.LENGTH': seconds,
        'android.intent.extra.alarm.MESSAGE': label,
        'android.intent.extra.alarm.SKIP_UI': true,
    });
};

// ============================================================
// METEO — Open-Meteo, gratuito, senza chiave API.
// Non chiede il permesso di posizione: geolocalizza il nome
// della città che l'utente pronuncia.
// ============================================================

const WEATHER_CODES = {
    0: 'cielo sereno', 1: 'prevalentemente sereno', 2: 'parzialmente nuvoloso',
    3: 'nuvoloso', 45: 'nebbia', 48: 'nebbia con brina',
    51: 'pioggerella leggera', 53: 'pioggerella moderata', 55: 'pioggerella intensa',
    61: 'pioggia leggera', 63: 'pioggia moderata', 65: 'pioggia intensa',
    71: 'nevicata leggera', 73: 'nevicata moderata', 75: 'nevicata intensa',
    80: 'rovesci leggeri', 81: 'rovesci moderati', 82: 'rovesci violenti',
    95: 'temporale', 96: 'temporale con grandine',
};

export const getWeatherByCity = async (city) => {
    const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it`
    );
    const geoData = await geoResponse.json();

    const place = geoData.results?.[0];
    if (!place) {
        throw new Error(`Città "${city}" non trovata`);
    }

    const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`
    );
    const weatherData = await weatherResponse.json();

    const temp = Math.round(weatherData.current?.temperature_2m);
    const code = weatherData.current?.weather_code;
    const description = WEATHER_CODES[code] || 'condizioni non determinate';

    return `Signore, a ${place.name} ci sono ${temp}°C, ${description}.`;
};

// ============================================================
// CALENDARIO — crea un evento vero sul calendario Android.
// Il "giorno" può essere: oggi, domani, oppure un giorno della
// settimana (lunedì...domenica) — prende la prossima occorrenza.
// ============================================================

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function resolveDayWord(dayWord) {
    const lower = dayWord.toLowerCase();
    const today = new Date();

    if (lower === 'oggi') return today;

    if (lower === 'domani') {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d;
    }

    const targetIndex = WEEKDAYS.findIndex(w => w === lower);
    if (targetIndex === -1) {
        throw new Error(`Non ho capito il giorno "${dayWord}"`);
    }

    const d = new Date(today);
    const todayIndex = today.getDay();
    let diff = targetIndex - todayIndex;
    if (diff <= 0) diff += 7; // prossima occorrenza, mai oggi stesso
    d.setDate(d.getDate() + diff);
    return d;
}

async function getDefaultCalendarId() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Permesso calendario negato');
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // Su Android preferiamo un calendario che accetta scritture,
    // di solito quello collegato all'account Google principale.
    const writable = calendars.find(c => c.allowsModifications) || calendars[0];

    if (!writable) {
        throw new Error('Nessun calendario disponibile sul dispositivo');
    }

    return writable.id;
}

// Impegni di oggi, usati dal briefing di apertura. Se il permesso non è
// ancora stato concesso restituisce una lista vuota invece di bloccare
// tutto il briefing.
export const getTodayEvents = async () => {
    const {status} = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return [];

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (!calendars.length) return [];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await Calendar.getEventsAsync(
        calendars.map((c) => c.id),
        startOfDay,
        endOfDay
    );

    return events
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .map((event) => ({
            title: event.title,
            time: new Date(event.startDate).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}),
        }));
};

export const createCalendarEvent = async (dayWord, hour, minute, title) => {
    const calendarId = await getDefaultCalendarId();
    const eventDate = resolveDayWord(dayWord);
    eventDate.setHours(hour, minute, 0, 0);

    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);

    await Calendar.createEventAsync(calendarId, {
        title,
        startDate: eventDate,
        endDate,
        timeZone: undefined, // usa il fuso orario del dispositivo
    });

    return eventDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
        + ' alle ' + eventDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};
