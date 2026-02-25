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
import { migrateOldImagesToPermanentStorage } from './src/services/imageMigrationService';

export default function App() {
  const { success, error } = useMigrations(db, migrations);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
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
  }, []);

  React.useEffect(() => {
    if (success) {
      // Run once on initial db success to fix any legacy temporary image URIs
      migrateOldImagesToPermanentStorage();
    }
  }, [success]);

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
