import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { ChevronRight } from 'lucide-react-native';
import { CURRENCY } from '../../utils/Constants';

interface PendingAlertProps {
    amount: number;
    tenantCount: number;
    onSendReminders: () => void;
    isPrivacyMode?: boolean;
}

export default function PendingAlert({ amount, tenantCount, onSendReminders, isPrivacyMode }: PendingAlertProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.statusDot} />
                <Text style={styles.label}>PENDING AMOUNT</Text>
                <View style={{ flex: 1 }} />
                <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>HIGH PRIORITY</Text>
                </View>
            </View>

            <Text style={styles.amount}>
                {isPrivacyMode ? `${CURRENCY} •••••` : `${CURRENCY}${amount.toLocaleString()}`}
            </Text>
            <Text style={styles.description}>Outstanding from {tenantCount} tenants</Text>

            <View style={styles.actionRow}>
                <Pressable style={styles.button} onPress={onSendReminders}>
                    <Text style={styles.buttonText}>Send Reminders</Text>
                </Pressable>
                <Pressable style={styles.navButton} onPress={onSendReminders}>
                    <ChevronRight size={20} color={theme.colors.textPrimary} />
                </Pressable>
            </View>
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
        marginBottom: theme.spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.warning,
        marginRight: theme.spacing.s
    },
    label: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.semiBold,
        letterSpacing: 1
    },
    priorityBadge: {
        backgroundColor: theme.colors.warningLight,
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.warning + '30'
    },
    priorityText: {
        fontSize: 10,
        color: theme.colors.warning,
        fontWeight: theme.typography.bold
    },
    amount: {
        fontSize: 42,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        letterSpacing: -1
    },
    description: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.l,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    button: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    buttonText: {
        color: theme.colors.primaryForeground,
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
    },
    navButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    }
});
