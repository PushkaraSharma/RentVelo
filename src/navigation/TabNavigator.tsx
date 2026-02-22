import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/ThemeContext';
import { LayoutDashboard, Settings, Building2 } from 'lucide-react-native';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PlacesListScreen from '../screens/properties/property/PlacesListScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { theme } = useAppTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    paddingTop: 5,
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
                options={{
                    tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />
                }}
            />

            <Tab.Screen
                name="Properties"
                component={PlacesListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />
                }}
            />

            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}
