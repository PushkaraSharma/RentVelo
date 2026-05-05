import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import Header from '../../components/common/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExpectedRevenueBreakdown, ExpectedRevenueBreakdown } from '../../db';
import { useFocusEffect } from '@react-navigation/native';
import { CURRENCY } from '../../utils/Constants';
import { Building2, Users, AlertTriangle, ChevronRight, Wallet, Zap, Clock, Banknote } from 'lucide-react-native';

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
                
                {/* Grand Total Summary */}
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>TOTAL EXPECTED REVENUE</Text>
                    <Text style={styles.summaryValue}>{CURRENCY}{Math.round(totalExpected).toLocaleString()}</Text>
                    <View style={styles.summaryDivider} />
                </View>

                {/* Composition Breakdown */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Composition Breakdown</Text>
                    <View style={styles.compositionGrid}>
                        {compositionItems.map((item, index) => (
                            <View key={index} style={styles.compositionItem}>
                                <View style={[styles.compositionIcon, { backgroundColor: item.color + '15' }]}>
                                    {item.icon}
                                </View>
                                <View style={styles.compositionInfo}>
                                    <Text style={styles.compositionLabel}>{item.label}</Text>
                                    <Text style={styles.compositionValue}>{CURRENCY}{Math.round(item.value).toLocaleString()}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
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
    summaryHeader: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        letterSpacing: 1.2,
    },
    summaryValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: 8,
    },
    summaryDivider: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
        marginTop: 12,
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
    compositionGrid: {
        gap: 16,
    },
    compositionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    compositionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    compositionInfo: {
        flex: 1,
    },
    compositionLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    compositionValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginTop: 2,
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
    }
});
