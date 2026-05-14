import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import {
    Building2, Users, IndianRupee, ChevronRight,
    Check
} from 'lucide-react-native';
import { storage } from '../../utils/storage';

interface SetupStep {
    id: string;
    label: string;
    description: string;
    icon: any;
    completed: boolean;
    action?: () => void;
}

interface GetStartedCardProps {
    navigation: any;
    propertyCount: number;
    tenantCount: number;
    hasPayments: boolean;
    onDismiss?: () => void;
}

const DISMISS_KEY = '@get_started_dismissed';

export default function GetStartedCard({
    navigation,
    propertyCount,
    tenantCount,
    hasPayments,
    onDismiss,
}: GetStartedCardProps) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);

    // Check if dismissed
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const val = storage.getString(DISMISS_KEY);
        if (val === 'true') setDismissed(true);
    }, []);

    const steps: SetupStep[] = [
        {
            id: 'property',
            label: 'Add a Property',
            description: 'Create your first property to manage',
            icon: Building2,
            completed: propertyCount > 0,
            action: () => navigation.navigate('AddProperty'),
        },
        {
            id: 'tenant',
            label: 'Add a Tenant',
            description: 'Register a tenant in your property',
            icon: Users,
            completed: tenantCount > 0,
            action: () => navigation.navigate('Properties'),
        },
        {
            id: 'rent',
            label: 'Collect Rent',
            description: 'Start collecting rent from tenants',
            icon: IndianRupee,
            completed: hasPayments,
            action: () => navigation.navigate('Properties'),
        },
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const allCompleted = completedCount === steps.length;
    const progressPercent = (completedCount / steps.length) * 100;

    // Auto-dismiss once all steps are done
    useEffect(() => {
        if (allCompleted && !dismissed) {
            storage.set(DISMISS_KEY, 'true');
            // Small delay for the user to see the completed state
            const timer = setTimeout(() => setDismissed(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [allCompleted]);

    if (dismissed) return null;

    // Find the next incomplete step
    const nextStep = steps.find(s => !s.completed);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>
                        {allCompleted ? '🎉 All Done!' : '🚀 Get Started'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {allCompleted
                            ? 'You\'ve completed all setup steps!'
                            : `${completedCount} of ${steps.length} steps completed`}
                    </Text>
                </View>
                {allCompleted && (
                    <Pressable
                        onPress={() => {
                            storage.set(DISMISS_KEY, 'true');
                            setDismissed(true);
                            onDismiss?.();
                        }}
                        style={styles.dismissBtn}
                    >
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </Pressable>
                )}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* Steps */}
            <View style={styles.stepsContainer}>
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isNext = nextStep?.id === step.id;

                    return (
                        <Pressable
                            key={step.id}
                            style={[
                                styles.stepRow,
                                isNext && styles.stepRowHighlight,
                                index < steps.length - 1 && styles.stepBorder,
                            ]}
                            onPress={step.completed ? undefined : step.action}
                            disabled={step.completed}
                        >
                            <View style={[
                                styles.stepIcon,
                                step.completed && styles.stepIconCompleted,
                                isNext && styles.stepIconActive,
                            ]}>
                                {step.completed ? (
                                    <Check size={18} color="#FFF" strokeWidth={3} />
                                ) : (
                                    <Icon size={18} color={isNext ? '#FFF' : theme.colors.textTertiary} strokeWidth={2} />
                                )}
                            </View>
                            <View style={styles.stepInfo}>
                                <Text style={[
                                    styles.stepLabel,
                                    step.completed && styles.stepLabelCompleted,
                                ]}>
                                    {step.label}
                                </Text>
                                {!step.completed && (
                                    <Text style={styles.stepDescription}>{step.description}</Text>
                                )}
                            </View>
                            {!step.completed && isNext && (
                                <ChevronRight size={18} color={theme.colors.accent} />
                            )}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.accent + '40',
        marginBottom: theme.spacing.xl,
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.m,
    },
    title: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    dismissBtn: {
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.xs,
        backgroundColor: theme.colors.accentLight,
        borderRadius: theme.borderRadius.m,
    },
    dismissText: {
        fontSize: 12,
        color: theme.colors.accent,
        fontWeight: theme.typography.bold,
    },
    // Progress
    progressTrack: {
        height: 3,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.l,
        borderRadius: 2,
        marginBottom: theme.spacing.m,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
    },
    // Steps
    stepsContainer: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.m,
        gap: theme.spacing.m,
    },
    stepRowHighlight: {
        backgroundColor: theme.colors.accentLight,
        marginHorizontal: -theme.spacing.l,
        paddingHorizontal: theme.spacing.l,
    },
    stepBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    stepIconCompleted: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    stepIconActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    stepInfo: {
        flex: 1,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    stepLabelCompleted: {
        color: theme.colors.textSecondary,
        textDecorationLine: 'line-through',
    },
    stepDescription: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        marginTop: 1,
    },
});
