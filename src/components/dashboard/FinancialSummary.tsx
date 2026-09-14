import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { CURRENCY } from '../../utils/Constants';

const { width } = Dimensions.get('window');

interface FinancialSummaryProps {
    expected: number;
    collected: number;
    onPressExpected?: () => void;
    onPressCollected?: () => void;
    isPrivacyMode?: boolean;
}

export default function FinancialSummary({ expected, collected, onPressExpected, onPressCollected, isPrivacyMode }: FinancialSummaryProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const progress = expected ? Math.min((collected / expected) * 100, 100) : 0;

    return (
        <View style={styles.container}>
            {/* Expected Card */}
            <Pressable style={styles.card} onPress={onPressExpected}>
                <Text style={styles.label}>EXPECTED</Text>
                <Text style={styles.amount}>
                    {isPrivacyMode ? `${CURRENCY} •••••` : `${CURRENCY}${expected.toLocaleString()}`}
                </Text>
                <View style={styles.badge}>
                    <TrendingUp size={12} color={theme.colors.accent} />
                    <Text style={styles.badgeText}>Monthly Target</Text>
                </View>
            </Pressable>

            <View style={styles.spacer} />

            {/* Collected Card */}
            <Pressable style={styles.card} onPress={onPressCollected}>
                <Text style={styles.label}>COLLECTED</Text>
                <Text style={styles.amount}>
                    {isPrivacyMode ? `${CURRENCY} •••••` : `${CURRENCY}${collected.toLocaleString()}`}
                </Text>
                <Text style={styles.progressLabel}>{Math.round(progress)}% Complete</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
            </Pressable>
        </View>

    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: theme.spacing.l,
    },
    spacer: {
        width: theme.spacing.m
    },
    card: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        ...theme.shadows.small,
    },
    label: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.bold,
        marginBottom: theme.spacing.xs,
        letterSpacing: 1
    },
    amount: {
        fontSize: theme.typography.xl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.s,
        alignSelf: 'flex-start'
    },
    badgeText: {
        fontSize: 10,
        color: theme.colors.accent,
        marginLeft: 4,
        fontWeight: theme.typography.semiBold
    },
    progressLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs
    },
    progressBarBg: {
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        width: '100%'
    },
    progressBarFill: {
        height: 4,
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
    }
});
