import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';
import { LayoutDashboard, Users, Building2 } from 'lucide-react-native';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PlacesListScreen from '../screens/properties/PlacesListScreen';
import TenantsListScreen from '../screens/tenants/TenantsListScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 0,
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
                name="Tenants"
                component={TenantsListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Users size={size} color={color} />
                }}
            />
        </Tab.Navigator>
    );
}
