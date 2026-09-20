import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Cloud, X } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useAppTheme } from '../../theme/ThemeContext';
import { RootState } from '../../redux/store';
import { BACKUP_KEYS } from '../../services/backupService';
import { storage } from '../../utils/storage';

const NUDGE_REAPPEAR_MS = 3 * 24 * 60 * 60 * 1000;

interface BackupNudgeCardProps {
    navigation: any;
}

export default function BackupNudgeCard({ navigation }: BackupNudgeCardProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const isGoogleLinked = useSelector((state: RootState) => state.auth.isGoogleLinked);
    const [dismissedAt, setDismissedAt] = useState<string | undefined>(
        () => storage.getString(BACKUP_KEYS.NUDGE_DISMISSED)
    );

    const shouldShow = useMemo(() => {
        if (isGoogleLinked) return false;
        if (!dismissedAt) return true;
        const ts = new Date(dismissedAt).getTime();
        if (Number.isNaN(ts)) return true;
        return Date.now() - ts >= NUDGE_REAPPEAR_MS;
    }, [isGoogleLinked, dismissedAt]);

    if (!shouldShow) return null;

    const handleDismiss = () => {
        const now = new Date().toISOString();
        storage.set(BACKUP_KEYS.NUDGE_DISMISSED, now);
        setDismissedAt(now);
    };

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <Cloud size={16} color={theme.colors.accent} />
                <Text style={styles.label}>PROTECT YOUR DATA</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={handleDismiss} hitSlop={12} accessibilityLabel="Dismiss backup reminder">
                    <X size={18} color={theme.colors.textTertiary} />
                </Pressable>
            </View>
            <Text style={styles.title}>Enable Drive backup</Text>
            <Text style={styles.description}>
                Link Google Drive so backups work if you switch phones.
            </Text>
            <Pressable style={styles.button} onPress={() => navigation.navigate('Backup')}>
                <Text style={styles.buttonText}>Enable Drive backup</Text>
            </Pressable>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    label: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.semiBold,
        letterSpacing: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: theme.spacing.m,
    },
    button: {
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.m,
        paddingVertical: theme.spacing.s,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: theme.typography.semiBold,
        fontSize: 14,
    },
});
