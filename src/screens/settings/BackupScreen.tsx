import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cloud, HardDrive, RotateCcw, CloudUpload, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import Header from '../../components/common/Header';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Toggle from '../../components/common/Toggle';
import { RootState } from '../../redux/store';
import { linkGoogleAccount, unlinkGoogleAccount } from '../../redux/authSlice';
import { initGoogleAuth, signInWithGoogle, signOutGoogle, requestDriveScopes } from '../../services/googleAuthService';
import {
    BackupMeta,
    backupToGoogleDrive,
    formatBackupSummary,
    getCloudBackupMeta,
    getLocalBackupMeta,
    performLocalBackup,
    restoreFromGoogleDrive,
    restoreFromLocalBackup,
    shouldBlockUpload,
    verifyDrivePermissions,
} from '../../services/backupService';
import { finalizeSuccessfulRestore } from '../../services/backupRestore';
import {
    getLastBackupTime,
    isAutoBackupEnabled,
    setAutoBackupEnabled,
    setCloudBackupOptedIn,
} from '../../services/backupFlags';
import { trackEvent, AnalyticsEvents, setEnrichedUserProperties } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

export default function BackupScreen() {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const dispatch = useDispatch();
    const { isGoogleLinked, googleEmail } = useSelector((state: RootState) => state.auth);

    const [backingUp, setBackingUp] = useState<'local' | 'google' | null>(null);
    const [restoring, setRestoring] = useState<'local' | 'google' | 'previous' | null>(null);
    const [lastSync, setLastSync] = useState<string>('Never');
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [localMeta, setLocalMeta] = useState<BackupMeta | null>(null);
    const [cloudMeta, setCloudMeta] = useState<BackupMeta | null>(null);
    const [prevMeta, setPrevMeta] = useState<BackupMeta | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showPrevRestoreModal, setShowPrevRestoreModal] = useState(false);
    const [showLocalRestoreModal, setShowLocalRestoreModal] = useState(false);

    const busy = !!backingUp || !!restoring;

    const refreshStatus = useCallback(async () => {
        const time = getLastBackupTime();
        setLastSync(time ? new Date(time).toLocaleString() : 'Never');
        setAutoEnabled(isAutoBackupEnabled());
        setLocalMeta(getLocalBackupMeta());
        if (!isGoogleLinked) {
            setCloudMeta(null);
            setPrevMeta(null);
            return;
        }
        try {
            const [current, previous] = await Promise.all([
                getCloudBackupMeta('current'),
                getCloudBackupMeta('previous'),
            ]);
            setCloudMeta(current);
            setPrevMeta(previous);
        } catch {
            setCloudMeta(null);
            setPrevMeta(null);
        }
    }, [isGoogleLinked]);

    useFocusEffect(
        useCallback(() => {
            initGoogleAuth();
            refreshStatus();
        }, [refreshStatus])
    );

    const connectDrive = async (): Promise<boolean> => {
        try {
            const user = await signInWithGoogle();
            if (!user) return false;
            const granted = await requestDriveScopes();
            if (!granted) {
                showToast({ type: 'warning', title: 'Permission required', message: 'Drive access is required for backups.' });
                return false;
            }
            dispatch(linkGoogleAccount({ email: user.email, name: user.name, photoUrl: user.photo }));
            setCloudBackupOptedIn(true);
            return true;
        } catch {
            showToast({ type: 'error', title: 'Sign-in error', message: 'Could not link Google account.' });
            return false;
        }
    };

    const toggleAutoBackup = async (value: boolean) => {
        if (value && !isGoogleLinked) {
            const linked = await connectDrive();
            if (!linked) return;
        }
        if (value) {
            const hasPerms = await verifyDrivePermissions();
            if (!hasPerms) {
                showToast({
                    type: 'error',
                    title: 'Permissions missing',
                    message: 'Drive access missing. Disconnect and reconnect your Google account.',
                });
                return;
            }
        }
        setAutoEnabled(value);
        setAutoBackupEnabled(value);
        setCloudBackupOptedIn(value || isGoogleLinked);
        trackEvent(AnalyticsEvents.AUTO_BACKUP_TOGGLED, { enabled: value });
    };

    const handleGoogleToggle = async () => {
        if (isGoogleLinked) {
            setShowDisconnectModal(true);
            return;
        }
        const linked = await connectDrive();
        if (linked) {
            showToast({ type: 'success', title: 'Connected', message: 'Google Drive is ready for backups.' });
            refreshStatus();
        }
    };

    const runCloudBackup = async (force: boolean) => {
        setBackingUp('google');
        const result = await backupToGoogleDrive({ force });
        setBackingUp(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_CREATED, { method: 'google_drive' });
            setEnrichedUserProperties({ hasBackup: true });
            showToast({ type: 'success', title: 'Backed up', message: 'This phone was uploaded to Google Drive.' });
            refreshStatus();
            return;
        }
        if (result.error === 'blocked_empty_local') {
            trackEvent(AnalyticsEvents.BACKUP_BLOCKED_EMPTY_LOCAL);
            showToast({
                type: 'error',
                title: 'Backup blocked',
                message: 'This phone looks emptier than your Drive backup. Restore from Drive instead of overwriting it.',
            });
            return;
        }
        if (result.error === 'insufficient_permissions') {
            const linked = await connectDrive();
            if (linked) {
                runCloudBackup(force);
            }
            return;
        }
        const messages: Record<string, string> = {
            zip_failed: 'Failed to compress your data. Check storage space.',
            not_signed_in: 'Please connect Google Drive first.',
        };
        showToast({
            type: 'error',
            title: 'Upload failed',
            message: messages[result.error || ''] || 'Failed to upload backup to Drive.',
        });
    };

    const handleBackupPress = () => {
        if (!isGoogleLinked) {
            connectDrive().then((linked) => {
                if (linked) setShowBackupModal(true);
            });
            return;
        }
        setShowBackupModal(true);
    };

    const confirmBackup = () => {
        setShowBackupModal(false);
        const blocked = localMeta && shouldBlockUpload(localMeta, cloudMeta);
        runCloudBackup(!!blocked);
    };

    const runRestore = async (generation: 'current' | 'previous') => {
        setRestoring(generation === 'previous' ? 'previous' : 'google');
        const result = await restoreFromGoogleDrive(generation);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: generation });
            await finalizeSuccessfulRestore(dispatch);
            return;
        }
        setRestoring(null);
        if (result.error === 'no_backup_found' || result.error === 'no_previous_backup') {
            showToast({
                type: 'error',
                title: 'No backup found',
                message: `Signed in as ${googleEmail || 'this Google account'}. Backups live in hidden Drive app data — they will not appear in My Drive.`,
            });
            return;
        }
        showToast({
            type: 'error',
            title: 'Restore failed',
            message: result.error === 'invalid_backup'
                ? 'The backup file is missing a database. Your phone was not changed.'
                : 'Could not restore data from Google Drive.',
        });
    };

    const handleLocalBackup = async () => {
        setBackingUp('local');
        const result = await performLocalBackup();
        setBackingUp(null);
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_CREATED, { method: 'local' });
            showToast({ type: 'success', title: 'Saved', message: 'Local backup saved on this phone.' });
        } else {
            showToast({ type: 'error', title: 'Error', message: 'Failed to create local backup.' });
        }
    };

    const confirmLocalRestore = async () => {
        setShowLocalRestoreModal(false);
        setRestoring('local');
        const result = await restoreFromLocalBackup();
        if (result.success) {
            trackEvent(AnalyticsEvents.BACKUP_RESTORED, { source: 'local' });
            await finalizeSuccessfulRestore(dispatch);
            return;
        }
        setRestoring(null);
        showToast({
            type: 'error',
            title: 'Restore failed',
            message: result.error === 'no_local_backup_found'
                ? 'No local backup file was found on this phone.'
                : 'Could not restore data from the local backup.',
        });
    };

    const confirmDisconnect = async () => {
        setShowDisconnectModal(false);
        await signOutGoogle();
        dispatch(unlinkGoogleAccount());
        setAutoBackupEnabled(false);
        setAutoEnabled(false);
        setCloudBackupOptedIn(false);
        setCloudMeta(null);
        setPrevMeta(null);
    };

    const backupWouldBlock = !!(localMeta && shouldBlockUpload(localMeta, cloudMeta));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Data Backup & Sync" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Pressable style={styles.item} onPress={handleGoogleToggle} disabled={busy}>
                        <View style={styles.itemLeft}>
                            <Cloud size={20} color={isGoogleLinked ? theme.colors.success : theme.colors.accent} />
                            <View style={styles.itemCopy}>
                                <Text style={styles.itemLabel}>Google Drive</Text>
                                <Text style={styles.itemSubLabel}>
                                    {isGoogleLinked
                                        ? `Connected as ${googleEmail}`
                                        : 'Connect Drive to back up and restore'}
                                </Text>
                            </View>
                        </View>
                        {isGoogleLinked ? (
                            <CheckCircle2 size={20} color={theme.colors.success} />
                        ) : (
                            <View style={styles.badge}><Text style={styles.badgeText}>CONNECT</Text></View>
                        )}
                    </Pressable>

                    {isGoogleLinked && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.metaBlock}>
                                <Text style={styles.metaLabel}>Last synced</Text>
                                <Text style={styles.metaValue}>{lastSync}</Text>
                                {cloudMeta && (
                                    <Text style={styles.metaDetail}>{formatBackupSummary(cloudMeta)}</Text>
                                )}
                                <Text style={styles.hiddenHint}>
                                    Backups are stored in hidden Drive app data. They will not appear in My Drive.
                                </Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.item}>
                                <View style={styles.itemLeft}>
                                    <CloudUpload size={20} color={theme.colors.accent} />
                                    <View style={styles.itemCopy}>
                                        <Text style={styles.itemLabel}>Auto-sync</Text>
                                        <Text style={styles.itemSubLabel}>
                                            Uploads after you change data, when you leave the app
                                        </Text>
                                    </View>
                                </View>
                                <Toggle value={autoEnabled} onValueChange={toggleAutoBackup} />
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.section}>
                    <Pressable
                        style={[styles.actionBtn, styles.restoreBtn]}
                        onPress={() => {
                            if (!isGoogleLinked) {
                                showToast({ type: 'info', title: 'Connect Drive', message: 'Connect Google Drive to restore a cloud backup.' });
                                return;
                            }
                            setShowRestoreModal(true);
                        }}
                        disabled={busy}
                    >
                        {restoring === 'google' ? (
                            <ActivityIndicator color={theme.colors.accent} />
                        ) : (
                            <RotateCcw size={20} color={theme.colors.accent} />
                        )}
                        <View style={styles.itemCopy}>
                            <Text style={styles.itemLabel}>Restore from Google Drive</Text>
                            <Text style={styles.itemSubLabel}>Replace this phone with your cloud backup</Text>
                        </View>
                    </Pressable>

                    <Pressable style={[styles.actionBtn, styles.backupBtn]} onPress={handleBackupPress} disabled={busy}>
                        {backingUp === 'google' ? (
                            <ActivityIndicator color={theme.colors.textPrimary} />
                        ) : (
                            <CloudUpload size={20} color={theme.colors.textPrimary} />
                        )}
                        <View style={styles.itemCopy}>
                            <Text style={styles.itemLabel}>Back up this phone</Text>
                            <Text style={styles.itemSubLabel}>Replace the Drive backup with data on this phone</Text>
                        </View>
                    </Pressable>
                </View>

                <Pressable style={styles.advancedToggle} onPress={() => setAdvancedOpen((open) => !open)}>
                    <Text style={styles.advancedLabel}>Advanced on this phone</Text>
                    {advancedOpen ? (
                        <ChevronUp size={18} color={theme.colors.textTertiary} />
                    ) : (
                        <ChevronDown size={18} color={theme.colors.textTertiary} />
                    )}
                </Pressable>

                {advancedOpen && (
                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={handleLocalBackup} disabled={busy}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.textSecondary} />
                                <View style={styles.itemCopy}>
                                    <Text style={styles.itemLabel}>Save a local copy</Text>
                                    <Text style={styles.itemSubLabel}>Stays on this phone only</Text>
                                </View>
                            </View>
                            {backingUp === 'local' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item} onPress={() => setShowLocalRestoreModal(true)} disabled={busy}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.textSecondary} />
                                <View style={styles.itemCopy}>
                                    <Text style={styles.itemLabel}>Restore local copy</Text>
                                    <Text style={styles.itemSubLabel}>Overwrite this phone from the on-device file</Text>
                                </View>
                            </View>
                            {restoring === 'local' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                        </Pressable>
                        {prevMeta && (
                            <>
                                <View style={styles.divider} />
                                <Pressable style={styles.item} onPress={() => setShowPrevRestoreModal(true)} disabled={busy}>
                                    <View style={styles.itemLeft}>
                                        <RotateCcw size={20} color={theme.colors.textSecondary} />
                                        <View style={styles.itemCopy}>
                                            <Text style={styles.itemLabel}>Restore previous Drive backup</Text>
                                            <Text style={styles.itemSubLabel}>{formatBackupSummary(prevMeta)}</Text>
                                        </View>
                                    </View>
                                    {restoring === 'previous' && <ActivityIndicator size="small" color={theme.colors.accent} />}
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </ScrollView>

            <ConfirmationModal
                visible={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                onConfirm={confirmDisconnect}
                title="Disconnect Google Drive"
                message="Auto-sync will stop. Existing Drive backups are kept unless you delete your account."
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />

            <ConfirmationModal
                visible={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                onConfirm={confirmBackup}
                title={backupWouldBlock ? 'This would overwrite a richer backup' : 'Replace cloud backup?'}
                message={
                    backupWouldBlock
                        ? `Drive has ${cloudMeta ? formatBackupSummary(cloudMeta) : 'an existing backup'}. This phone has ${localMeta ? formatBackupSummary(localMeta) : 'less data'}. Replace anyway? A previous copy will be kept.`
                        : `This replaces your Google Drive backup${cloudMeta ? ` (${formatBackupSummary(cloudMeta)})` : ''} with this phone${localMeta ? ` (${formatBackupSummary(localMeta)})` : ''}.`
                }
                confirmText={backupWouldBlock ? 'Replace anyway' : 'Back up this phone'}
                cancelText="Cancel"
                variant={backupWouldBlock ? 'danger' : 'warning'}
                loading={backingUp === 'google'}
            />

            <ConfirmationModal
                visible={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                onConfirm={() => {
                    setShowRestoreModal(false);
                    runRestore('current');
                }}
                title="Restore from Drive"
                message={`This replaces everything on this phone with the Drive backup${cloudMeta ? ` (${formatBackupSummary(cloudMeta)})` : ''}.`}
                confirmText="Restore"
                cancelText="Cancel"
                variant="warning"
                loading={restoring === 'google'}
            />

            <ConfirmationModal
                visible={showPrevRestoreModal}
                onClose={() => setShowPrevRestoreModal(false)}
                onConfirm={() => {
                    setShowPrevRestoreModal(false);
                    runRestore('previous');
                }}
                title="Restore previous backup"
                message={`This replaces this phone with the previous Drive backup${prevMeta ? ` (${formatBackupSummary(prevMeta)})` : ''}.`}
                confirmText="Restore previous"
                cancelText="Cancel"
                variant="warning"
                loading={restoring === 'previous'}
            />

            <ConfirmationModal
                visible={showLocalRestoreModal}
                onClose={() => setShowLocalRestoreModal(false)}
                onConfirm={confirmLocalRestore}
                title="Restore local copy"
                message="This overwrites the data on this phone with the local backup file."
                confirmText="Restore"
                cancelText="Cancel"
                variant="warning"
                loading={restoring === 'local'}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.xxl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
        marginBottom: theme.spacing.l,
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
    itemCopy: {
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
    metaBlock: {
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.m,
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.textTertiary,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    metaValue: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginTop: 4,
    },
    metaDetail: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    hiddenHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        marginTop: 8,
        lineHeight: 18,
    },
    section: {
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
        padding: theme.spacing.m,
        borderRadius: 16,
        borderWidth: 1,
    },
    restoreBtn: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.accent + '55',
    },
    backupBtn: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    advancedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    advancedLabel: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
});
