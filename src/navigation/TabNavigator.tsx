import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/ThemeContext';
import { LayoutDashboard, Settings, Building2 } from 'lucide-react-native';
import { hapticsSelection } from '../utils/haptics';
import { Platform } from 'react-native';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PlacesListScreen from '../screens/properties/property/PlacesListScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const isAndroid = Platform.OS === 'android';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    paddingTop: 5,
                    ...(isAndroid ? {
                        paddingBottom: Math.max(insets.bottom, 10),
                        height: 55 + Math.max(insets.bottom, 10),
                    } : {}),
                    ...theme.shadows.medium,
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: theme.typography.xxs,
                    fontWeight: theme.typography.semiBold,
                }
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />
                }}
            />

            <Tab.Screen
                name="Properties"
                component={PlacesListScreen}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />
                }}
            />

            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                listeners={{ tabPress: () => hapticsSelection() }}
                options={{
                    tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}
