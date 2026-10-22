const { withAppDelegate } = require('@expo/config-plugins');

// @react-native-firebase/app 23 looks for factory.startReactNative() and skips
// Expo SDK 58's scene-based AppDelegate, so the native app is never configured.
function withFirebaseConfigure(config) {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('import FirebaseCore')) {
      contents = contents.replace(/import Expo\r?\n/, 'import Expo\nimport FirebaseCore\n');
    }
    if (!contents.includes('FirebaseApp.configure()')) {
      contents = contents.replace(
        'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        'FirebaseApp.configure()\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withFirebaseConfigure;
