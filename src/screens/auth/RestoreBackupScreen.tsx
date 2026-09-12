import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw, Cloud } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import Button from '../../components/common/Button';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { RootState } from '../../redux/store';
import { setRestorePending } from '../../redux/authSlice';
import {
    BackupMeta,
    formatBackupSummary,
    probeCloudBackup,
    restoreFromGoogleDrive,
} from '../../services/backupService';
import { finalizeSuccessfulRestore } from '../../services/backupRestore';
import { AnalyticsEvents, trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

export default function RestoreBackupScreen() {
    const dispatch = useDispatch();
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const googleEmail = useSelector((state: RootState) => state.auth.googleEmail);
    const [meta, setMeta] = useState<BackupMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(false);
    const [showFreshConfirm, setShowFreshConfirm] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const probe = await probeCloudBackup();
                if (mounted) setMeta(probe.current);
            } catch (error) {
                console.error('Failed to load cloud backup details:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const handleRestore = async () => {
        setRestoring(true);
        const result = await restoreFromGoogleDrive('current');
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: 'login_offer' });
            await finalizeSuccessfulRestore(dispatch);
            return;
        }

        setRestoring(false);
        let message = 'Could not restore this backup. Try again, or start fresh — your cloud copy will stay.';
        if (result.error === 'no_backup_found') {
            message = `No backup found for ${googleEmail || 'this Google account'}. Backups live in hidden Drive app data and will not appear in My Drive.`;
        } else if (result.error === 'insufficient_permissions') {
            message = 'Drive access is missing. Reconnect Google Drive and try again.';
        } else if (result.error === 'invalid_backup') {
            message = 'The backup file is missing a database. Your phone was not changed.';
        }
        showToast({ type: 'error', title: 'Restore failed', message });
    };

    const confirmStartFresh = () => {
        setShowFreshConfirm(false);
        dispatch(setRestorePending(false));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconBox}>
                    <RotateCcw size={36} color={theme.colors.accent} />
                </View>
                <Text style={styles.title}>Restore this backup?</Text>
                <Text style={styles.body}>
                    We found a RentVelo backup on Google Drive{googleEmail ? ` for ${googleEmail}` : ''}. Restore it before adding anything on this phone.
                </Text>

                <View style={styles.card}>
                    <Cloud size={20} color={theme.colors.accent} />
                    {loading ? (
                        <ActivityIndicator color={theme.colors.accent} />
                    ) : (
                        <View style={styles.cardText}>
                            <Text style={styles.cardLabel}>Cloud backup</Text>
                            <Text style={styles.cardValue}>
                                {meta ? formatBackupSummary(meta) : 'Backup found, details unavailable'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Restore this backup"
                    onPress={handleRestore}
                    loading={restoring}
                    disabled={restoring || loading}
                />
                <Button
                    title="Start fresh"
                    onPress={() => setShowFreshConfirm(true)}
                    variant="outline"
                    disabled={restoring}
                    style={styles.secondary}
                />
            </View>

            <ConfirmationModal
                visible={showFreshConfirm}
                onClose={() => setShowFreshConfirm(false)}
                onConfirm={confirmStartFresh}
                title="Keep the cloud copy"
                message="This phone will start empty. Your existing Google Drive backup will not be overwritten until you later choose Back up this phone."
                confirmText="Start fresh"
                cancelText="Cancel"
                variant="warning"
            />
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
    },
    iconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
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
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.l,
    },
    cardText: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        fontWeight: theme.typography.bold,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        lineHeight: 22,
    },
    footer: {
        paddingBottom: theme.spacing.l,
    },
    secondary: {
        marginTop: theme.spacing.m,
    },
});
