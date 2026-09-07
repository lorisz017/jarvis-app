import * as Speech from 'expo-speech';

export const speakJarvisResponse = async ({
                                              text,
                                              selectedVoiceId,
                                              availableVoices,
                                              scrollRef,
                                              setDisplayedText,
                                              setSelectedVoiceId,
                                              englishVoiceId,
                                              russianVoiceId,
                                          }) => {
    if (!text) return;

    // L'assistente ora parla sempre in italiano: niente più euristica
    // per distinguere inglese/russo, che con l'italiano non era affidabile
    // (molte frasi italiane senza accenti venivano lette come inglese).
    const language = 'it-IT';

    const voiceToUse =
        selectedVoiceId ||
        availableVoices.find((v) => v.language === language)?.identifier ||
        russianVoiceId;

    setSelectedVoiceId(russianVoiceId);

    Speech.speak(text, {
        language,
        voice: voiceToUse,
        rate: 0.9,
        pitch: 1.1,
        onStart: () => setDisplayedText(''),
        onBoundary: ({ charIndex, charLength }) => {
            setDisplayedText(text.substring(0, charIndex + charLength));
            scrollRef?.current?.scrollToEnd({ animated: true });
        },
        onDone: () => {
            setDisplayedText(text);
            scrollRef?.current?.scrollToEnd({ animated: true });
        },
        onError: (e) => {
            console.error('TTS error:', e);
            setDisplayedText(text);
        },
    });
};
