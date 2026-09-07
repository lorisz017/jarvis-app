export default {
  expo: {
    name: "JARVIS",
    slug: "project_jarvis",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      permissions: ["RECORD_AUDIO", "READ_CALENDAR", "WRITE_CALENDAR"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.az11k.jarvisapp",

      config: {
        manifest: {
          application: {
            "tools:replace": "android:appComponentFactory",
            "android:appComponentFactory": "androidx.core.app.CoreComponentFactory"
          }
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "304c6a73-d02e-4d7f-a088-000d4648f331"
      }
    },
    plugins: [
      "expo-asset",
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ]
    ]
  }
};
