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

export default function App() {
  const { success, error } = useMigrations(db, migrations);

  if (!success && !error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={{ marginTop: 20, color: theme.colors.textSecondary }}>Initializing database...</Text>
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
          <RootNavigator />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}
