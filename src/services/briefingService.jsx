import {getWeatherByCity, getTodayEvents} from './deviceActions';

function greetingForHour(hour) {
    if (hour < 5) return 'Buonanotte';
    if (hour < 13) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
}

function describeEvents(events) {
    if (!events.length) return 'Non ha impegni in calendario per oggi.';

    if (events.length === 1) {
        return `Ha un impegno oggi: ${events[0].title} alle ${events[0].time}.`;
    }

    const list = events.map((e) => `${e.title} alle ${e.time}`).join(', ');
    return `Ha ${events.length} impegni oggi: ${list}.`;
}

// Riepilogo letto all'apertura dell'app: saluto in base all'ora, meteo della
// città impostata e impegni del giorno. Ogni pezzo è indipendente: se il
// meteo o il calendario non rispondono, il briefing viene comunque dato con
// quello che è riuscito a recuperare.
export async function buildBriefing(homeCity) {
    const now = new Date();
    const time = now.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'});

    const parts = [`${greetingForHour(now.getHours())}, Signore. Sono le ${time}.`];

    const [weather, events] = await Promise.all([
        getWeatherByCity(homeCity).catch(() => null),
        getTodayEvents().catch(() => null),
    ]);

    if (weather) {
        // getWeatherByCity restituisce già una frase rivolta all'utente:
        // qui serve solo la parte informativa, senza ripetere il saluto.
        parts.push(weather.replace(/^Signore,\s*/i, '').replace(/^./, (c) => c.toUpperCase()));
    }

    if (events) {
        parts.push(describeEvents(events));
    }

    return parts.join(' ');
}
