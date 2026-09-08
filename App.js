import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import Home from "./src/screens/Home";
import {useEffect, useState} from "react";
import * as Notifications from "expo-notifications";
import * as Calendar from "expo-calendar";
import AccessDenied from "./src/components/AccessDenied";
import * as Speech from 'expo-speech';


export default function App() {
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        (async () => {
            setUnlocked(true);
        })();

        // Chiede subito all'avvio i permessi che servono all'app, invece di
        // farlo comparire più tardi durante l'uso (microfono è già gestito
        // a parte in useVoiceSetup, quando si apre la schermata principale).
        Notifications.requestPermissionsAsync();
        Calendar.requestCalendarPermissionsAsync();

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        const subscription = Notifications.addNotificationReceivedListener(notification => {
            const message = notification.request.content.body;
            if (message) {
                Speech.speak(message, {
                    language: "it-IT",
                    rate: 0.9,
                    pitch: 1.0,
                });
            }
        });

        return () => subscription.remove();
    }, []);


    return (
        <SafeAreaProvider>
            <SafeAreaView style={{flex: 1}}>
                {unlocked ? <Home/> : <AccessDenied/>}
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
