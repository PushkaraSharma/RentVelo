import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { View, ActivityIndicator, Text } from 'react-native';
import { store } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { db, migrations } from './src/db/database';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { theme } from './src/theme';
import { ThemeProvider } from './src/theme/ThemeContext';
import * as Updates from 'expo-updates';
import AppLockWrapper from './src/components/AppLockWrapper';
import AutoBackupHandler from './src/components/AutoBackupHandler';
import { syncNotificationSchedules } from './src/services/pushNotificationService';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './src/navigation/RootNavigator';

export default function App() {
  const { success, error } = useMigrations(db, migrations);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    async function initBackgroundSchedules() {
      // Run eagerly on boot to keep OS triggers in sync with DB state
      await syncNotificationSchedules();
    }

    // Set up a listener for when the user taps deeply into the app from a notification
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.route && navigationRef.isReady()) {
        // Use the global navigation ref to route the user gracefully
        // Cast via any to bypass strict TS checking on the global ref for dynamic routes
        (navigationRef as any).navigate(data.route, { propertyId: data.propertyId });
      }
    });

    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          setIsUpdating(true);
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.error(`Error fetching latest Expo update: ${e}`);
      }
    }

    if (!__DEV__) {
      onFetchUpdateAsync();
    }

    // Attempt DB/Notification sync if not updating
    initBackgroundSchedules();

    return () => {
      subscription.remove();
    };
  }, []);

  if (!success && !error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={{ marginTop: 20, color: theme.colors.textSecondary }}>Initializing database...</Text>
      </View>
    );
  }

  if (isUpdating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 20, color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Updating App...</Text>
        <Text style={{ marginTop: 10, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>
          Please wait while we download the latest features and improvements.
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>Database Error</Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AutoBackupHandler />
          <AppLockWrapper>
            <RootNavigator />
          </AppLockWrapper>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}
