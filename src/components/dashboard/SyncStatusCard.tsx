import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Cloud, CloudOff, AlertTriangle, ChevronRight, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import { RootState } from '../../redux/store';
import {
    dismissSyncBanner,
    getLastBackupError,
    getLastBackupTime,
    isAutoBackupEnabled,
    isSyncBannerDismissed,
    setAutoBackupEnabled,
    setCloudBackupOptedIn,
} from '../../services/backupFlags';
import { verifyDrivePermissions } from '../../services/backupService';
import { AnalyticsEvents, trackEvent } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

const STALE_MS = 48 * 60 * 60 * 1000;

type CardState = 'hidden' | 'enable' | 'ok' | 'warning';

const formatRelative = (iso: string | null) => {
    if (!iso) return 'Never synced';
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return 'Never synced';
    const delta = Date.now() - then;
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
};

interface SyncStatusCardProps {
    navigation: any;
}

export default function SyncStatusCard({ navigation }: SyncStatusCardProps) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const { isGoogleLinked } = useSelector((state: RootState) => state.auth);
    const [state, setState] = useState<CardState>('hidden');
    const [subtitle, setSubtitle] = useState('');

    const refresh = useCallback(() => {
        const autoOn = isAutoBackupEnabled();
        const last = getLastBackupTime();
        const error = getLastBackupError();
        const lastMs = last ? Date.now() - new Date(last).getTime() : Number.POSITIVE_INFINITY;
        const stale = lastMs > STALE_MS;

        if (!autoOn || !isGoogleLinked) {
            if (isSyncBannerDismissed()) {
                setState('hidden');
                return;
            }
            setState('enable');
            setSubtitle('Turn on auto-sync so you do not lose rent records if this phone is lost.');
            return;
        }

        if (error || stale) {
            setState('warning');
            setSubtitle(error === 'blocked_empty_local'
                ? 'Cloud backup looks richer than this phone. Restore instead of overwriting.'
                : stale
                    ? `Last synced ${formatRelative(last)}. Sync may be stuck.`
                    : `Last sync failed. ${formatRelative(last)}.`);
            return;
        }

        setState('ok');
        setSubtitle(`Last synced ${formatRelative(last)} · Google Drive`);
    }, [isGoogleLinked]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handleEnable = async () => {
        if (!isGoogleLinked) {
            navigation.navigate('Backup');
            return;
        }
        const hasPerms = await verifyDrivePermissions();
        if (!hasPerms) {
            showToast({
                type: 'error',
                title: 'Drive access needed',
                message: 'Reconnect Google Drive on the backup screen.',
            });
            navigation.navigate('Backup');
            return;
        }
        setAutoBackupEnabled(true);
        setCloudBackupOptedIn(true);
        trackEvent(AnalyticsEvents.AUTO_BACKUP_TOGGLED, { enabled: true, source: 'dashboard' });
        showToast({ type: 'success', title: 'Auto-sync on', message: 'RentVelo will back up after you change data.' });
        refresh();
    };

    if (state === 'hidden') return null;

    if (state === 'ok') {
        return (
            <Pressable style={styles.compact} onPress={() => navigation.navigate('Backup')}>
                <Cloud size={16} color={theme.colors.success} />
                <Text style={styles.compactText}>{subtitle}</Text>
                <ChevronRight size={16} color={theme.colors.textTertiary} />
            </Pressable>
        );
    }

    const isWarning = state === 'warning';
    const Icon = isWarning ? AlertTriangle : CloudOff;

    return (
        <View style={[styles.card, isWarning && styles.cardWarning]}>
            <View style={styles.header}>
                <View style={[styles.iconWrap, isWarning && styles.iconWrapWarning]}>
                    <Icon size={18} color={isWarning ? theme.colors.warning : theme.colors.accent} />
                </View>
                <View style={styles.copy}>
                    <Text style={styles.title}>{isWarning ? 'Backup needs attention' : 'Protect your data'}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                {!isWarning && (
                    <Pressable
                        onPress={() => {
                            dismissSyncBanner();
                            setState('hidden');
                        }}
                        hitSlop={8}
                    >
                        <X size={16} color={theme.colors.textTertiary} />
                    </Pressable>
                )}
            </View>
            <Pressable
                style={styles.cta}
                onPress={isWarning ? () => navigation.navigate('Backup') : handleEnable}
            >
                <Text style={styles.ctaText}>{isWarning ? 'Open backup' : 'Enable auto-sync'}</Text>
            </Pressable>
        </View>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    compact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.l,
        paddingVertical: 4,
    },
    compactText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.accent + '40',
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    cardWarning: {
        borderColor: theme.colors.warning + '55',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.m,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapWarning: {
        backgroundColor: isDark ? '#F59E0B20' : '#FFFBEB',
    },
    copy: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: theme.colors.textSecondary,
    },
    cta: {
        marginTop: theme.spacing.m,
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: theme.typography.bold,
        fontSize: 13,
    },
});
