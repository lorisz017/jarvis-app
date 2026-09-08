import {Linking} from 'react-native';
import * as Contacts from 'expo-contacts';

// Numero pronto per WhatsApp: solo cifre, con prefisso internazionale.
// I numeri italiani in rubrica sono spesso salvati senza prefisso, quindi
// se ne trova uno di 9-10 cifre senza prefisso gli antepone il 39.
function toInternationalNumber(rawNumber) {
    let digits = (rawNumber || '').replace(/\D/g, '');

    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length >= 9 && digits.length <= 10 && !digits.startsWith('39')) {
        digits = `39${digits}`;
    }

    return digits;
}

async function findContactNumber(name) {
    const {status} = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('permesso rubrica negato');
    }

    const {data} = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        name,
    });

    const search = (name || '').trim().toLowerCase();

    // getContactsAsync col filtro "name" può restituire più risultati: si
    // preferisce chi corrisponde esattamente, poi chi contiene il nome detto.
    const withNumbers = (data || []).filter((c) => c.phoneNumbers?.length);
    const contact =
        withNumbers.find((c) => (c.name || '').toLowerCase() === search) ||
        withNumbers.find((c) => (c.name || '').toLowerCase().includes(search)) ||
        withNumbers[0];

    if (!contact) {
        throw new Error(`nessun contatto trovato per "${name}"`);
    }

    const mobile =
        contact.phoneNumbers.find((p) => /mobile|cell/i.test(p.label || '')) || contact.phoneNumbers[0];

    return {contactName: contact.name, number: mobile.number};
}

export const callContact = async (name) => {
    const {contactName, number} = await findContactNumber(name);
    await Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
    return contactName;
};

export const sendWhatsAppToContact = async (name, message) => {
    const {contactName, number} = await findContactNumber(name);
    const phone = toInternationalNumber(number);

    await Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
    return contactName;
};
