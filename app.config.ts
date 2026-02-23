import { ExpoConfig, ConfigContext } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => ({
  "name": "RentVelo",
  "slug": "rentvelo",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/app-icon.png",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.indieroots.rentVelo",
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",

  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/app-icon.png",
      "backgroundColor": "#ffffff"
    },
    "edgeToEdgeEnabled": true,
    "predictiveBackGestureEnabled": false,
    "package": "com.indieroots.rentVelo",
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
});