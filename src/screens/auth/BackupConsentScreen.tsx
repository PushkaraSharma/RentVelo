import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cloud, ShieldCheck } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import Button from '../../components/common/Button';
import { RootState } from '../../redux/store';
import { linkGoogleAccount, resolveBackupConsent, setRestorePending } from '../../redux/authSlice';
import { initGoogleAuth, requestDriveScopes, signInWithGoogle } from '../../services/googleAuthService';
import { isLocalDatabaseEmpty, probeCloudBackup } from '../../services/backupService';
import { setAutoBackupEnabled, setCloudBackupOptedIn } from '../../services/backupFlags';
import { AnalyticsEvents, trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

export default function BackupConsentScreen() {
    const dispatch = useDispatch();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const { isGoogleLinked, googleEmail, user } = useSelector((state: RootState) => state.auth);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        initGoogleAuth();
    }, []);

    const finishWithoutRestore = (enableAutoSync: boolean) => {
        if (enableAutoSync) {
            setAutoBackupEnabled(true);
        }
        dispatch(setRestorePending(false));
        dispatch(resolveBackupConsent());
    };

    const handleEnable = async () => {
        setLoading(true);
        try {
            let email = googleEmail || user?.email || '';

            if (__DEV__ && !isGoogleLinked) {
                dispatch(linkGoogleAccount({ email: email || 'dev@rentvelo.app', name: user?.name }));
                setCloudBackupOptedIn(true);
                trackEvent(AnalyticsEvents.CLOUD_BACKUP_CONSENT, { enabled: true, method: 'dev' });
                finishWithoutRestore(true);
                return;
            }

            if (!isGoogleLinked) {
                const googleUser = await signInWithGoogle();
                if (!googleUser) {
                    showToast({ type: 'error', title: 'Sign-in needed', message: 'Google Drive is required to save a cloud backup.' });
                    return;
                }
                email = googleUser.email;
                const granted = await requestDriveScopes();
                if (!granted) {
                    showToast({ type: 'warning', title: 'Permission required', message: 'Drive access is needed to back up your data.' });
                    return;
                }
                dispatch(linkGoogleAccount({ email: googleUser.email, name: googleUser.name, photoUrl: googleUser.photo }));
            } else {
                const granted = await requestDriveScopes();
                if (!granted) {
                    showToast({ type: 'warning', title: 'Permission required', message: 'Drive access is needed to back up your data.' });
                    return;
                }
            }

            setCloudBackupOptedIn(true);
            trackEvent(AnalyticsEvents.CLOUD_BACKUP_CONSENT, { enabled: true });

            const probe = await probeCloudBackup();
            if (probe.hasBackup && isLocalDatabaseEmpty()) {
                trackEvent(AnalyticsEvents.RESTORE_OFFERED_ON_LOGIN);
                dispatch(setRestorePending(true));
                dispatch(resolveBackupConsent());
                return;
            }

            finishWithoutRestore(true);
        } catch (error) {
            console.error('Backup consent failed:', error);
            showToast({
                type: 'error',
                title: 'Could not connect Drive',
                message: 'Try again, or skip and enable backup later from the dashboard.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        setCloudBackupOptedIn(false);
        setAutoBackupEnabled(false);
        trackEvent(AnalyticsEvents.CLOUD_BACKUP_CONSENT, { enabled: false });
        finishWithoutRestore(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <Cloud size={40} color={theme.colors.accent} />
                </View>
                <Text style={styles.title}>Protect your data</Text>
                <Text style={styles.body}>
                    Save a cloud backup to Google Drive so you can recover on a new phone or if this phone is lost.
                </Text>

                <View style={styles.points}>
                    <View style={styles.pointRow}>
                        <ShieldCheck size={18} color={theme.colors.success} />
                        <Text style={styles.pointText}>Backups stay in hidden Drive app data — they will not appear in My Drive.</Text>
                    </View>
                    <View style={styles.pointRow}>
                        <ShieldCheck size={18} color={theme.colors.success} />
                        <Text style={styles.pointText}>
                            Use the same Google account on a new phone to restore.
                            {Platform.OS === 'ios' ? ' Apple Sign-In is only for your identity, not the backup.' : ''}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Enable Google Drive backup"
                    onPress={handleEnable}
                    loading={loading}
                    disabled={loading}
                />
                <Button
                    title="Not now"
                    onPress={handleSkip}
                    variant="ghost"
                    disabled={loading}
                    style={styles.skipBtn}
                />
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.xl,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    title: {
        fontSize: 28,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.m,
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    points: {
        width: '100%',
        gap: theme.spacing.m,
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.m,
    },
    pointText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.textSecondary,
    },
    footer: {
        paddingBottom: theme.spacing.l,
    },
    skipBtn: {
        marginTop: theme.spacing.s,
    },
});
