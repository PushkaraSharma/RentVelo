import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

export default function RentBillSkeleton() {
    const { theme, isDark } = useAppTheme();
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const styles = getStyles(theme, isDark, pulseAnim);

    return (
        <View style={styles.card}>
            {/* Top Row Skeleton */}
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <Animated.View style={styles.skeletonTitle} />
                    <Animated.View style={styles.skeletonSubtitle} />
                </View>
                <Animated.View style={styles.skeletonBadge} />
            </View>

            {/* Electricity Row Skeleton */}
            <View style={styles.electricityRow}>
                <Animated.View style={styles.skeletonLineShort} />
                <Animated.View style={styles.skeletonInput} />
                <Animated.View style={styles.skeletonPrice} />
            </View>

            {/* Rent Section Skeleton */}
            <View style={styles.rentSection}>
                <View style={styles.rentRow}>
                    <Animated.View style={styles.skeletonLineSmall} />
                    <Animated.View style={styles.skeletonPrice} />
                </View>
                <View style={styles.rentRow}>
                    <Animated.View style={styles.skeletonLineSmall} />
                    <Animated.View style={styles.skeletonPrice} />
                </View>
            </View>

            {/* Actions Row Skeleton */}
            <View style={styles.actionsRow}>
                <Animated.View style={styles.skeletonButton} />
                <Animated.View style={styles.skeletonButton} />
                <View style={{ flex: 1 }} />
                <View style={{ alignItems: 'flex-end' }}>
                    <Animated.View style={styles.skeletonLineTiny} />
                    <Animated.View style={styles.skeletonPriceLarge} />
                </View>
            </View>

            {/* Balance Row Skeleton */}
            <View style={styles.balanceRow}>
                <Animated.View style={styles.skeletonLineMedium} />
                <Animated.View style={styles.skeletonPriceLarge} />
            </View>

            {/* Swipe Track Skeleton */}
            <Animated.View style={styles.swipeTrack} />
        </View>
    );
}

const getStyles = (theme: any, isDark: boolean, pulseAnim: Animated.Value) => StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
    },
    skeletonTitle: {
        height: 18,
        width: '50%',
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    skeletonSubtitle: {
        height: 14,
        width: '40%',
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        marginTop: 6,
        opacity: pulseAnim as any,
    },
    skeletonBadge: {
        height: 44,
        width: 80,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 14,
        opacity: pulseAnim as any,
    },
    electricityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: theme.spacing.m,
        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
        borderRadius: 12,
        padding: theme.spacing.s,
    },
    skeletonLineShort: {
        height: 14,
        width: 60,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    skeletonInput: {
        height: 32,
        width: 70,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 8,
        opacity: pulseAnim as any,
    },
    skeletonPrice: {
        height: 16,
        width: 50,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    rentSection: {
        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
        borderRadius: 12,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    rentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    skeletonLineSmall: {
        height: 14,
        width: 80,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.s,
    },
    skeletonButton: {
        height: 32,
        width: 100,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 10,
        opacity: pulseAnim as any,
    },
    skeletonLineTiny: {
        height: 10,
        width: 40,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 2,
        marginBottom: 4,
        opacity: pulseAnim as any,
    },
    skeletonPriceLarge: {
        height: 22,
        width: 70,
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? '#374151' : '#FEE2E2',
        borderRadius: 12,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 12,
        marginBottom: theme.spacing.s,
    },
    skeletonLineMedium: {
        height: 16,
        width: 100,
        backgroundColor: isDark ? '#4B5563' : '#FCA5A5',
        borderRadius: 4,
        opacity: pulseAnim as any,
    },
    swipeTrack: {
        height: 50,
        borderRadius: 25,
        backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
        marginBottom: 6,
        opacity: pulseAnim as any,
    },
});
