import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function initNotifications() {
    if (!Device.isDevice) return;

    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const {status} = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('❌ Notifiche non consentite');
        return;
    }

    console.log('✅ Permessi per le notifiche ottenuti');

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Expo Push Token:', token);
}

export async function scheduleReminder(message, seconds) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Promemoria J.A.R.V.I.S.",
            body: `Signore, ${message}`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
            type: 'timeInterval',
            seconds,
            repeats: false,
        },
    });
}

export async function cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🛑 Tutti i promemoria sono stati annullati');
}

export function parseSecondsFromPhrase(text) {
    const secondMatch = text.match(/tra (\d+)\s?second[oi]/i);
    const minMatch = text.match(/tra (\d+)\s?minut[oi]/i);
    const hourMatch = text.match(/tra (\d+)\s?or[ae]/i);

    if (secondMatch) return parseInt(secondMatch[1], 10);
    if (minMatch) return parseInt(minMatch[1], 10) * 60;
    if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;

    return null;
}

export function parseReminderDetails(text) {
    const timeRegex = /tra (\d+)\s?(second[oi]|minut[oi]|or[ae])/i;
    const timeMatch = text.match(timeRegex);

    if (!timeMatch) return null;

    const number = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2].toLowerCase();
    let seconds;

    if (unit.startsWith('second')) {
        seconds = number;
    } else if (unit.startsWith('minut')) {
        seconds = number * 60;
    } else if (unit.startsWith('or')) {
        seconds = number * 3600;
    } else {
        return null;
    }

    // Estrae il testo del promemoria
    const reminderText = text
        .replace(/ricorda(mi)?/i, '')
        .replace(timeRegex, '')
        .replace(/tra.*/i, '')
        .trim()
        .replace(/^di\s+/i, '')
        .trim() || 'un impegno';

    return {reminderText, seconds};
}
