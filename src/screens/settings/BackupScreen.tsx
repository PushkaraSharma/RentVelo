import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { Cloud, HardDrive, RotateCcw, CloudUpload, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { linkGoogleAccount, unlinkGoogleAccount } from '../../redux/authSlice';
import { initGoogleAuth, signInWithGoogle, signOutGoogle } from '../../services/googleAuthService';
import {
    applyDriveAccessGranted,
    BACKUP_KEYS,
    backupToGoogleDrive,
    completeRestoreFromDrive,
    ensureDriveAccess,
    formatBackupTime,
    getCachedDriveBackupTime,
    getDriveBackupInfo,
    onDriveDisconnected,
    performLocalBackup,
    reloadAppAfterRestore,
    restoreFromLocalBackup,
    setAutoBackupEnabled,
    verifyDrivePermissions,
} from '../../services/backupService';
import { storage } from '../../utils/storage';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Toggle from '../../components/common/Toggle';
import { AnalyticsEvents, setEnrichedUserProperties, trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';
import { useFocusEffect } from '@react-navigation/native';

export default function BackupScreen() {
    const { theme } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme);
    const dispatch = useDispatch();
    const { isGoogleLinked, googleEmail } = useSelector((state: RootState) => state.auth);

    const [backingUp, setBackingUp] = useState<'local' | 'google' | null>(null);
    const [restoring, setRestoring] = useState<'local' | 'google' | null>(null);
    const [linking, setLinking] = useState(false);
    const [lastDriveBackup, setLastDriveBackup] = useState<string>('Never');
    const [hasDriveBackup, setHasDriveBackup] = useState(false);
    const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);

    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showLocalRestoreModal, setShowLocalRestoreModal] = useState(false);

    const refreshStatus = useCallback(async () => {
        const autoBackupStr = storage.getString(BACKUP_KEYS.AUTO_ENABLED);
        setIsAutoBackupEnabled(autoBackupStr === 'true');
        setLastDriveBackup(formatBackupTime(getCachedDriveBackupTime()));

        if (!isGoogleLinked) {
            setHasDriveBackup(false);
            return;
        }
        try {
            const info = await getDriveBackupInfo();
            if (info) {
                setHasDriveBackup(true);
                setLastDriveBackup(formatBackupTime(info.modifiedTime || getCachedDriveBackupTime()));
            } else {
                setHasDriveBackup(false);
            }
        } catch {
            setLastDriveBackup(formatBackupTime(getCachedDriveBackupTime()));
        }
    }, [isGoogleLinked]);

    useFocusEffect(
        useCallback(() => {
            initGoogleAuth();
            refreshStatus();
        }, [refreshStatus])
    );

    const handleLocalBackup = async () => {
        setBackingUp('local');
        const result = await performLocalBackup();
        setBackingUp(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_CREATED, { method: 'local' });
            setEnrichedUserProperties({ hasBackup: true });
            showToast({ type: 'success', title: 'Success', message: 'Local backup saved on this phone.' });
        } else {
            const errorMsg = result.error === 'zip_failed'
                ? 'Failed to compress data. Check storage space.'
                : 'Failed to create local backup.';
            showToast({ type: 'error', title: 'Error', message: errorMsg });
        }
    };

    const toggleAutoBackup = async (value: boolean) => {
        if (!isGoogleLinked && value) {
            showToast({
                type: 'info',
                title: 'Link Required',
                message: 'Link Google Drive to enable auto backup.',
            });
            return;
        }

        if (value) {
            const hasPerms = await verifyDrivePermissions();
            if (!hasPerms) {
                showToast({
                    type: 'error',
                    title: 'Permissions Missing',
                    message: 'Drive access missing. Please disconnect and relink your account.',
                });
                return;
            }
        }

        setIsAutoBackupEnabled(value);
        trackEvent(AnalyticsEvents.AUTO_BACKUP_TOGGLED, { enabled: value });
        setAutoBackupEnabled(value);
    };

    const linkDrive = async (): Promise<boolean> => {
        try {
            setLinking(true);
            const user = await signInWithGoogle();
            if (!user) return false;
            const granted = await ensureDriveAccess();
            if (!granted) {
                showToast({ type: 'warning', title: 'Permission Required', message: 'Drive access is required for backups.' });
                return false;
            }
            applyDriveAccessGranted();
            dispatch(linkGoogleAccount({ email: user.email, name: user.name, photoUrl: user.photo }));
            setIsAutoBackupEnabled(true);
            showToast({ type: 'success', title: 'Success', message: 'Google Drive linked. Auto backup is on.' });
            return true;
        } catch {
            showToast({ type: 'error', title: 'Sign-In Error', message: 'Could not link Google account.' });
            return false;
        } finally {
            setLinking(false);
        }
    };

    const handleGoogleToggle = async () => {
        if (isGoogleLinked) {
            setShowDisconnectModal(true);
        } else {
            const ok = await linkDrive();
            if (ok) refreshStatus();
        }
    };

    const handleGoogleBackup = async () => {
        if (!isGoogleLinked) {
            const linked = await linkDrive();
            if (!linked) return;
        }
        setBackingUp('google');
        const result = await backupToGoogleDrive();
        setBackingUp(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_CREATED, { method: 'google_drive' });
            setEnrichedUserProperties({ hasBackup: true });
            await refreshStatus();
            showToast({ type: 'success', title: 'Success', message: 'Backup uploaded to Google Drive.' });
        } else {
            let errorMsg = 'Failed to upload backup to Drive.';
            if (result.error === 'insufficient_permissions') {
                errorMsg = 'Drive permissions missing. Please relink and grant app data access.';
            } else if (result.error === 'zip_failed') {
                errorMsg = 'Failed to compress database items.';
            } else if (result.error === 'not_signed_in') {
                errorMsg = 'Please sign in to Google Drive first.';
            }
            showToast({ type: 'error', title: 'Upload Failed', message: errorMsg });
        }
    };

    const handleRestore = async () => {
        if (!isGoogleLinked) {
            showToast({
                type: 'info',
                title: 'Not Linked',
                message: 'Please connect your Google account to restore from Drive.',
            });
            return;
        }
        setShowRestoreModal(true);
    };

    const confirmDisconnect = async () => {
        setShowDisconnectModal(false);
        await signOutGoogle();
        onDriveDisconnected();
        dispatch(unlinkGoogleAccount());
        setIsAutoBackupEnabled(false);
    };

    const confirmRestore = async () => {
        setShowRestoreModal(false);
        setRestoring('google');
        const result = await completeRestoreFromDrive();
        setRestoring(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: 'settings' });
            const reloaded = await reloadAppAfterRestore();
            if (!reloaded) {
                showToast({
                    type: 'success',
                    title: 'Restored',
                    message: 'Close and reopen RentVelo to load your Drive backup.',
                });
            }
        } else {
            let errorMsg = 'Could not restore data from Google Drive.';
            if (result.error === 'no_backup_found') {
                errorMsg = 'No backup file discovered on your Google Drive.';
            } else if (result.error === 'download_failed') {
                errorMsg = 'Failed to download backup file from Drive.';
            } else if (result.error === 'insufficient_permissions') {
                errorMsg = 'Drive permissions missing. Please relink account and grant file access.';
            }
            showToast({ type: 'error', title: 'Restore Failed', message: errorMsg });
        }
    };

    const confirmLocalRestore = async () => {
        setShowLocalRestoreModal(false);
        setRestoring('local');
        const result = await restoreFromLocalBackup();
        setRestoring(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: 'local' });
            const reloaded = await reloadAppAfterRestore();
            if (!reloaded) {
                showToast({
                    type: 'success',
                    title: 'Restored',
                    message: 'Close and reopen RentVelo to load your local backup.',
                });
            }
        } else {
            let errorMsg = 'Could not restore data from local backup.';
            if (result.error === 'no_local_backup_found') {
                errorMsg = 'No local backup file was found on this device.';
            }
            showToast({ type: 'error', title: 'Restore Failed', message: errorMsg });
        }
    };

    const busy = !!backingUp || !!restoring || linking;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Data Backup" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoSection}>
                    <View style={styles.cloudIconBox}>
                        <CloudUpload size={48} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.infoTitle}>Google Drive backup</Text>
                    <Text style={styles.infoText}>
                        Auto backup keeps rental data and photos in a private Drive app folder.
                        Restore replaces everything on this phone — it does not merge.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Google Drive</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={handleGoogleToggle} disabled={busy}>
                            <View style={styles.itemLeft}>
                                <Cloud size={20} color={isGoogleLinked ? theme.colors.success : '#6366F1'} />
                                <View style={styles.itemTextWrap}>
                                    <Text style={styles.itemLabel}>
                                        {isGoogleLinked ? 'Drive linked' : 'Link Google Drive'}
                                    </Text>
                                    <Text style={styles.itemSubLabel}>
                                        {isGoogleLinked ? `Linked as ${googleEmail}` : 'Required for cloud backup'}
                                    </Text>
                                </View>
                            </View>
                            {linking ? (
                                <ActivityIndicator size="small" color={theme.colors.accent} />
                            ) : isGoogleLinked ? (
                                <CheckCircle2 size={20} color={theme.colors.success} />
                            ) : (
                                <View style={styles.badge}><Text style={styles.badgeText}>LINK</Text></View>
                            )}
                        </Pressable>

                        {isGoogleLinked && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.item}>
                                    <View style={styles.itemLeft}>
                                        <CloudUpload size={20} color={theme.colors.accent} />
                                        <View style={styles.itemTextWrap}>
                                            <Text style={styles.itemLabel}>Enable auto backup</Text>
                                            <Text style={styles.itemSubLabel}>Uploads when data changes or at least every 6 hours</Text>
                                        </View>
                                    </View>
                                    <Toggle value={isAutoBackupEnabled} onValueChange={toggleAutoBackup} />
                                </View>
                                <View style={styles.divider} />
                                <Pressable style={styles.item} onPress={handleGoogleBackup} disabled={busy}>
                                    <View style={styles.itemLeft}>
                                        <CloudUpload size={20} color={theme.colors.accent} />
                                        <View style={styles.itemTextWrap}>
                                            <Text style={styles.itemLabel}>Backup now</Text>
                                            <Text style={styles.itemSubLabel}>Last backup: {lastDriveBackup}</Text>
                                        </View>
                                    </View>
                                    {backingUp === 'google' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                                </Pressable>
                                <View style={styles.divider} />
                                <Pressable style={styles.item} onPress={handleRestore} disabled={busy}>
                                    <View style={styles.itemLeft}>
                                        <RotateCcw size={20} color={theme.colors.textPrimary} />
                                        <View style={styles.itemTextWrap}>
                                            <Text style={styles.itemLabel}>Restore backup</Text>
                                            <Text style={styles.itemSubLabel}>
                                                {hasDriveBackup ? `Backup from ${lastDriveBackup}` : 'No backup found'}
                                            </Text>
                                        </View>
                                    </View>
                                    {restoring === 'google' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                                </Pressable>
                            </>
                        )}
                    </View>
                    {isGoogleLinked && (
                        <Pressable style={styles.disconnect} onPress={() => setShowDisconnectModal(true)}>
                            <Text style={styles.disconnectText}>Disconnect Google Drive</Text>
                        </Pressable>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.localHeader}>
                        <Text style={styles.sectionTitle}>This device</Text>

                    </View>

                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={handleLocalBackup} disabled={busy}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.accent} />
                                <View style={styles.itemTextWrap}>
                                    <Text style={styles.itemLabel}>Backup to phone</Text>
                                    <Text style={styles.itemSubLabel}>Additional copy stored only on this device</Text>
                                </View>
                            </View>
                            {backingUp === 'local' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item} onPress={() => setShowLocalRestoreModal(true)} disabled={busy}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.textPrimary} />
                                <View style={styles.itemTextWrap}>
                                    <Text style={styles.itemLabel}>Restore from phone</Text>
                                    <Text style={styles.itemSubLabel}>Overwrites current data with the local copy</Text>
                                </View>
                            </View>
                            {restoring === 'local' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <ConfirmationModal
                visible={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                onConfirm={confirmDisconnect}
                title="Disconnect Google Drive"
                message="Auto-backups will stop. Your existing Drive backup is not deleted."
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />

            <ConfirmationModal
                visible={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                onConfirm={confirmRestore}
                title="Restore backup"
                message={`This replaces all rental data and photos on this phone with the Drive backup from ${lastDriveBackup}. It does not merge.`}
                confirmText="Restore"
                cancelText="Cancel"
                variant="warning"
                loading={!!restoring}
            />

            <ConfirmationModal
                visible={showLocalRestoreModal}
                onClose={() => setShowLocalRestoreModal(false)}
                onConfirm={confirmLocalRestore}
                title="Restore from phone"
                message="This will overwrite your data with the local backup. It does not merge."
                confirmText="Restore"
                cancelText="Cancel"
                variant="warning"
                loading={!!restoring}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    cloudIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    infoTitle: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
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
    localHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: theme.spacing.s,
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
    itemTextWrap: {
        flex: 1,
        paddingRight: theme.spacing.s,
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
    badge: {
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.accent,
    },
    disconnect: {
        alignItems: 'center',
        marginTop: theme.spacing.m,
    },
    disconnectText: {
        fontSize: 13,
        color: theme.colors.danger,
        fontWeight: theme.typography.medium,
    },
});
