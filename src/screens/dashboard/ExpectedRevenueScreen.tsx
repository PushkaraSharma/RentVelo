import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Animated, Easing } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import Header from '../../components/common/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExpectedRevenueBreakdown, ExpectedRevenueBreakdown } from '../../db';
import { useFocusEffect } from '@react-navigation/native';
import { CURRENCY } from '../../utils/Constants';
import { Building2, Users, AlertTriangle, ChevronRight, Wallet, Zap, Clock, Banknote } from 'lucide-react-native';
import AnimatedPieChart from '../../components/statistics/AnimatedPieChart';

const { width } = Dimensions.get('window');

export default function ExpectedRevenueScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(theme, isDark);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ExpectedRevenueBreakdown | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const result = await getExpectedRevenueBreakdown(now.getMonth() + 1, now.getFullYear());
            setData(result);
        } catch (error) {
            console.error('Error loading expected revenue breakdown:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Entrance animation
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.8))[0];

    useEffect(() => {
        if (!loading && data) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
        }
    }, [loading, data, fadeAnim, scaleAnim]);

    if (loading || !data) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Header title="Expected Revenue" onBack={() => navigation.goBack()} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
            </View>
        );
    }

    const { composition, totalExpected, properties, highRiskTenants } = data;

    const compositionItems = [
        { label: 'Room Rent', value: composition.rent, color: '#0EA5E9', icon: <Building2 size={20} color="#0EA5E9" /> },
        { label: 'Utilities (Elec/Water)', value: composition.utilities, color: '#F59E0B', icon: <Zap size={20} color="#F59E0B" /> },
        { label: 'Previous Unpaid Balance', value: composition.pastDues, color: '#EF4444', icon: <Clock size={20} color="#EF4444" /> },
        { label: 'Other Charges', value: composition.otherExpenses, color: '#8B5CF6', icon: <Banknote size={20} color="#8B5CF6" /> },
    ].filter(d => d.value > 0);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Expected Revenue" onBack={() => navigation.goBack()} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.accent }]}>
                        <Text style={styles.summaryLabel}>TOTAL EXPECTED REVENUE</Text>
                        <Text style={styles.summaryAmount}>{CURRENCY}{Math.round(totalExpected).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Composition Breakdown */}
                <AnimatedPieChart
                    title="Composition Breakdown"
                    data={[
                        { value: composition.rent, color: '#0EA5E9', text: 'Rent' },
                        { value: composition.utilities, color: '#F59E0B', text: 'Utilities' },
                        { value: composition.pastDues, color: '#EF4444', text: 'Past Dues' },
                        { value: composition.otherExpenses, color: '#8B5CF6', text: 'Other' },
                    ]}
                    fadeAnim={fadeAnim}
                    scaleAnim={scaleAnim}
                    centerSubLabel="Revenue"
                />

                <View style={styles.breakdownList}>
                    {compositionItems.map((item, index) => (
                        <View key={index} style={[styles.listItem, index === compositionItems.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.listLeft}>
                                {item.icon}
                                <Text style={styles.listLabel}>{item.label}</Text>
                            </View>
                            <Text style={styles.listAmount}>{CURRENCY}{Math.round(item.value).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* High Dues Section */}
                {highRiskTenants.length > 0 && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <AlertTriangle size={20} color="#EF4444" />
                            <Text style={[styles.sectionTitle, { color: '#EF4444', marginBottom: 0, marginLeft: 8 }]}>Pending from Previous Months</Text>
                        </View>
                        <Text style={styles.sectionSub}>Top tenants with unpaid dues from earlier periods</Text>

                        {highRiskTenants.map((tenant, idx) => (
                            <View key={idx} style={styles.riskItem}>
                                <View style={styles.riskInfo}>
                                    <Text style={styles.riskName}>{tenant.tenantName}</Text>
                                    <Text style={styles.riskSub}>{tenant.propertyName} • {tenant.unitName}</Text>
                                </View>
                                <View style={styles.riskValueWrapper}>
                                    <Text style={styles.riskValue}>{CURRENCY}{tenant.pastDues.toLocaleString()}</Text>
                                    <Text style={styles.riskLabel}>Balance Due</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Property Breakdown */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Breakdown by Property</Text>
                    {properties.map((prop, idx) => {
                        const collectedPercent = prop.expectedAmount > 0
                            ? Math.min((prop.collectedAmount / prop.expectedAmount) * 100, 100)
                            : 0;

                        return (
                            <Pressable
                                key={idx}
                                style={styles.propertyItem}
                                onPress={() => navigation.navigate('TakeRent', { propertyId: prop.id })}
                            >
                                <View style={styles.propHeader}>
                                    <View style={styles.propMain}>
                                        <Building2 size={18} color={theme.colors.accent} />
                                        <Text style={styles.propName}>{prop.name}</Text>
                                    </View>
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                </View>

                                <View style={styles.propStats}>
                                    <View style={styles.propStatItem}>
                                        <Text style={styles.propStatValue}>{CURRENCY}{prop.expectedAmount.toLocaleString()}</Text>
                                        <Text style={styles.propStatLabel}>Target</Text>
                                    </View>
                                    <View style={styles.propStatItem}>
                                        <Text style={[styles.propStatValue, { color: theme.colors.success }]}>{CURRENCY}{prop.collectedAmount.toLocaleString()}</Text>
                                        <Text style={styles.propStatLabel}>Collected</Text>
                                    </View>
                                    <View style={styles.propStatItem}>
                                        <View style={styles.tenantRow}>
                                            <Users size={12} color={theme.colors.textSecondary} />
                                            <Text style={styles.propStatValue}> {prop.activeTenants}</Text>
                                        </View>
                                        <Text style={styles.propStatLabel}>Tenants</Text>
                                    </View>
                                </View>

                                <View style={styles.progressBarWrapper}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${collectedPercent}%` }]} />
                                    </View>
                                    <Text style={styles.progressPct}>{Math.round(collectedPercent)}%</Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: theme.spacing.m,
        paddingBottom: 40,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.l,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderLeftWidth: 3,
        ...theme.shadows.small,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    sectionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.m,
        ...theme.shadows.small,
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#F0F0F0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    sectionSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    breakdownList: {
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    listLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    listLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    listAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    riskItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    riskInfo: {
        flex: 1,
    },
    riskName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    riskSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    riskValueWrapper: {
        alignItems: 'flex-end',
    },
    riskValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    riskLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    propertyItem: {
        backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    propHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    propMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    propName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    propStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    propStatItem: {
        flex: 1,
    },
    propStatValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    propStatLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    tenantRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 3,
    },
    progressPct: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        width: 30,
        textAlign: 'right',
        flex: 0.15
    }
});
