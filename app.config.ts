import { ExpoConfig, ConfigContext } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = process.env.APP_VARIANT === 'development';
  const appName = isDev ? "RentVelo (Dev)" : "RentVelo";
  const appIdentifier = isDev ? "com.indieroots.rentVelo.dev" : "com.indieroots.rentVelo";

  return {
    "name": appName,
    "slug": "rentvelo",
    "version": "0.0.2",
    "orientation": "portrait",
    "icon": "./assets/app-icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": appIdentifier,
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",

    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/app-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": appIdentifier,
      "permissions": [
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT"
      ],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    "web": {
      "favicon": "./assets/app-icon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/app-icon.png",
          "color": "#3B82F6"
        }
      ],
      "expo-sqlite",
      "expo-web-browser",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-google-signin/google-signin",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow $(PRODUCT_NAME) to use Face ID."
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/app-icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#FFFFFF",
          "dark": {
            "image": "./assets/app-icon-dark.png",
            "backgroundColor": "#020617"
          }
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            podfileProperties: {
              use_modular_headers: "true",
              "ios.deploymentTarget": "15.5",
            },
            forceStaticLinking: [
              "RNFBApp",
              "RNFBAnalytics",
              "RNFBCrashlytics",
              "RNFBPerf",
            ],
          },
        },
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/auth"
    ],
    "extra": {
      "eas": {
        "projectId": "c8a7eae9-aeb2-451d-82a9-96da5d1e627e"
      }
    },
    "owner": "pushkara11",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/c8a7eae9-aeb2-451d-82a9-96da5d1e627e"
    }
  };
};