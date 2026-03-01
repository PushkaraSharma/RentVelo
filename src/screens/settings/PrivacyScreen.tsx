import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { Shield, Lock, Eye, EyeOff, FileText } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Toggle from '../../components/common/Toggle';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

export default function PrivacyScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const [appLockEnabled, setAppLockEnabled] = useState(false);
    const [privacyModeEnabled, setPrivacyModeEnabled] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        try {
            const lock = storage.getString('@app_lock_enabled');
            const privacy = storage.getString('@privacy_mode_enabled');
            if (lock === 'true') setAppLockEnabled(true);
            if (privacy === 'true') setPrivacyModeEnabled(true);
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const toggleAppLock = async (value: boolean) => {
        try {
            if (value) {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();

                if (!hasHardware || !isEnrolled) {
                    showToast({
                        type: 'error',
                        title: 'Unsupported',
                        message: 'Biometric authentication is not supported or not set up.'
                    });
                    return;
                }

                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Authenticate to enable App Lock',
                    cancelLabel: 'Cancel',
                    disableDeviceFallback: false,
                });

                if (result.success) {
                    setAppLockEnabled(true);
                    storage.set('@app_lock_enabled', 'true');
                }
            } else {
                setAppLockEnabled(false);
                storage.set('@app_lock_enabled', 'false');
            }
        } catch (e) {
            console.error('Failed to toggle App Lock', e);
        }
    };

    const togglePrivacyMode = (value: boolean) => {
        setPrivacyModeEnabled(value);
        storage.set('@privacy_mode_enabled', String(value));
    };

    const openLink = (url: string) => async () => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                showToast({ type: 'error', title: 'Error', message: `Don't know how to open this URL: ${url}` });
            }
        } catch (error) {
            console.error('An error occurred opening the link:', error);
            showToast({ type: 'error', title: 'Error', message: 'An unexpected error occurred opening the link.' });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Security & Privacy" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Security</Text>
                    <View style={styles.card}>
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Lock size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>App Lock (Biometric)</Text>
                                    <Text style={styles.itemSubLabel}>Secure your app with FaceID/Fingerprint</Text>
                                </View>
                            </View>
                            <Toggle value={appLockEnabled} onValueChange={toggleAppLock} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <EyeOff size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>Privacy Mode</Text>
                                    <Text style={styles.itemSubLabel}>Hide amounts on Dashboard</Text>
                                </View>
                            </View>
                            <Toggle value={privacyModeEnabled} onValueChange={togglePrivacyMode} />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Privacy</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={openLink('https://rentvelo.indieroots.in/privacy-policy/')}>
                            <View style={styles.itemLeft}>
                                <Shield size={20} color="#10B981" />
                                <View>
                                    <Text style={styles.itemLabel}>Privacy Policy</Text>
                                    <Text style={styles.itemSubLabel}>How we handle your data</Text>
                                </View>
                            </View>
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item} onPress={openLink('https://rentvelo.indieroots.in/terms/')}>
                            <View style={styles.itemLeft}>
                                <FileText size={20} color="#F59E0B" />
                                <View>
                                    <Text style={styles.itemLabel}>Terms of Service</Text>
                                    <Text style={styles.itemSubLabel}>Usage guidelines</Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.l,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.m,
        marginLeft: theme.spacing.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
        flex: 1,
    },
    itemLabel: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    itemSubLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border + '50',
    },
});
