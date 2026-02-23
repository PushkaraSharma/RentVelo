import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { storage } from '../utils/storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { theme } from '../theme';
import { Lock } from 'lucide-react-native';
import Button from './common/Button';

interface AppLockWrapperProps {
    children: React.ReactNode;
}

export default function AppLockWrapper({ children }: AppLockWrapperProps) {
    const [isLocked, setIsLocked] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkAppLock();
    }, []);

    const checkAppLock = async () => {
        try {
            const lockEnabled = storage.getString('@app_lock_enabled');
            if (lockEnabled === 'true') {
                setIsLocked(true);
                authenticate();
            } else {
                setIsLocked(false);
                setIsChecking(false);
            }
        } catch (error) {
            console.error('Error checking app lock status:', error);
            setIsChecking(false);
        }
    };

    const authenticate = async () => {
        console.log("here")
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Unlock RentVelo',
                    fallbackLabel: 'Use Passcode',
                });

                if (result.success) {
                    setIsLocked(false);
                }
            } else {
                // If biometrics become unavailable, unlock safely or fallback.
                setIsLocked(false);
            }
        } catch (error) {
            console.error('Authentication error:', error);
        } finally {
            setIsChecking(false);
        }
    };

    if (isChecking) {
        return <View style={styles.container} />; // Or a splash screen
    }

    if (isLocked) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Lock color={theme.colors.primary} size={64} style={styles.icon} />
                    <Text style={styles.title}>App Locked</Text>
                    <Text style={styles.subtitle}>Please authenticate to access RentVelo</Text>

                    <Button
                        title="Unlock"
                        onPress={authenticate}
                        style={styles.button}
                    />
                </View>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 24,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    button: {
        width: 200,
    }
});
