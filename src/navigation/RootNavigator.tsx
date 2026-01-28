import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

// Auth Screens
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Main Screens
import TabNavigator from './TabNavigator';
import AddPropertyScreen from '../screens/properties/AddPropertyScreen';
import AddUnitScreen from '../screens/properties/AddUnitScreen';
import AddTenantScreen from '../screens/tenants/AddTenantScreen';
import RentCalculatorScreen from '../screens/calculator/RentCalculatorScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import PropertyOperationsScreen from '../screens/properties/PropertyOperationsScreen';
import RoomsListScreen from '../screens/properties/RoomsListScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { isAuthenticated, isOnboarded } = useSelector((state: RootState) => state.auth);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isOnboarded ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : !isAuthenticated ? (
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={TabNavigator} />
                        <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
                        <Stack.Screen name="AddUnit" component={AddUnitScreen} />
                        <Stack.Screen name="AddTenant" component={AddTenantScreen} />
                        <Stack.Screen name="RoomsList" component={RoomsListScreen} />
                        <Stack.Screen name="PropertyOperations" component={PropertyOperationsScreen} />
                        <Stack.Screen name="RentCalculator" component={RentCalculatorScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="Payments" component={PaymentsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
