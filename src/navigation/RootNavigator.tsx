import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

export const navigationRef = createNavigationContainerRef<any>();
import { RootState } from '../redux/store';

// Auth Screens
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Main Screens
import TabNavigator from './TabNavigator';
import AddPropertyScreen from '../screens/properties/property/AddPropertyScreen';
import AddUnitScreen from '../screens/properties/room/AddUnitScreen';
import AddTenantScreen from '../screens/tenants/AddTenantScreen';
import RentCalculatorScreen from '../screens/calculator/RentCalculatorScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import PropertyOperationsScreen from '../screens/properties/property/PropertyOperationsScreen';
import RoomsListScreen from '../screens/properties/room/RoomsListScreen';
import RoomDetailsScreen from '../screens/properties/room/RoomDetailsScreen';
import RentReceiptConfigScreen from '../screens/properties/property/RentReceiptConfigScreen';
import TermsEditorScreen from '../screens/settings/TermsEditorScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import BackupScreen from '../screens/settings/BackupScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';
import NotificationsCenterScreen from '../screens/notifications/NotificationsCenterScreen';
import TakeRentScreen from '../screens/rent/TakeRentScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    const { isAuthenticated, isOnboarded } = useSelector((state: RootState) => state.auth);

    return (
        <NavigationContainer ref={navigationRef}>
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
                        <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} />
                        <Stack.Screen name="PropertyOperations" component={PropertyOperationsScreen} />
                        <Stack.Screen name="RentCalculator" component={RentCalculatorScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="Payments" component={PaymentsScreen} />
                        <Stack.Screen name="RentReceiptConfig" component={RentReceiptConfigScreen} />
                        <Stack.Screen name="TermsEditor" component={TermsEditorScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="Privacy" component={PrivacyScreen} />
                        <Stack.Screen name="Backup" component={BackupScreen} />
                        <Stack.Screen name="About" component={AboutScreen} />
                        <Stack.Screen name="Notifications" component={NotificationsScreen} />
                        <Stack.Screen name="NotificationsCenter" component={NotificationsCenterScreen} />
                        <Stack.Screen name="TakeRent" component={TakeRentScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
