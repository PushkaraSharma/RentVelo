import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Dimensions,
    Animated,
    Easing,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Header from '../../../components/common/Header';
import {
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    CalendarDays,
    Wallet,
    Droplets,
    Zap,
    CreditCard,
    Shield,
    Banknote,
    Smartphone
} from 'lucide-react-native';
import { format, subMonths, addMonths } from 'date-fns';
import MonthPickerModal from '../../../components/rent/MonthPickerModal';
import { getPropertyStatistics, PropertyStatistics } from '../../../db/paymentService';
import { hapticsMedium } from '../../../utils/haptics';
import AnimatedPieChart from '../../../components/statistics/AnimatedPieChart';

const { width } = Dimensions.get('window');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PropertyStatisticsScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const propertyId = route.params?.propertyId;

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [stats, setStats] = useState<PropertyStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    // Entrance animation
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.8))[0];

    useEffect(() => {
        if (!loading && stats) {
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
    }, [loading, stats, fadeAnim, scaleAnim]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getPropertyStatistics(
                propertyId,
                month,
                year
            );
            setStats(result);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [propertyId, month, year]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // User custom centerAction renders this now


    const goMonth = (dir: number) => {
        hapticsMedium();
        let newMonth = month + dir;
        let newYear = year;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setMonth(newMonth);
        setYear(newYear);
    };

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    if (loading && !stats) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Statistics" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header
                centerAction={
                    <View style={styles.monthSelector}>
                        <Pressable onPress={() => goMonth(-1)} style={styles.monthArrow}>
                            <ChevronLeft size={20} color={theme.colors.accent} />
                        </Pressable>
                        <Pressable onPress={() => setShowMonthPicker(true)} style={styles.monthLabel}>
                            <Text style={styles.monthText}>{MONTH_NAMES[month - 1]}</Text>
                            <Text style={styles.yearLabel}>{year}</Text>
                        </Pressable>
                        <Pressable onPress={() => goMonth(1)} style={styles.monthArrow}>
                            <ChevronRight size={20} color={theme.colors.accent} />
                        </Pressable>
                    </View>
                }
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.success }]}>
                        <Text style={styles.summaryLabel}>RECEIVED</Text>
                        <Text style={styles.summaryAmount}>{formatCurrency(stats?.summary?.totalReceived || 0)}</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.danger }]}>
                        <Text style={styles.summaryLabel}>BALANCE DUE</Text>
                        <Text style={styles.summaryAmount}>{formatCurrency(stats?.summary?.totalBalance || 0)}</Text>
                    </View>
                </View>

                {/* Graphical Representation (Income) */}
                <AnimatedPieChart
                    title="Income Distribution"
                    data={[
                        { value: stats?.breakdown?.totalRent || 0, color: theme.colors.accent, text: 'Rent' },
                        { value: stats?.breakdown?.totalElectric || 0, color: theme.colors.warning, text: 'Electric' },
                        { value: stats?.breakdown?.totalWater || 0, color: '#06B6D4', text: 'Water' }
                    ]}
                    fadeAnim={fadeAnim}
                    scaleAnim={scaleAnim}
                    centerSubLabel="Income"
                />

                {/* Detailed Breakdown Section */}
                <View style={styles.breakdownList}>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Wallet size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Rent Collected</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.breakdown?.totalRent || 0)}</Text>
                    </View>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Zap size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Electricity</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.breakdown?.totalElectric || 0)}</Text>
                    </View>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Droplets size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Water</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.breakdown?.totalWater || 0)}</Text>
                    </View>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <CreditCard size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Property Expenses</Text>
                        </View>
                        <Text style={[styles.listAmount, { color: theme.colors.danger }]}>-{formatCurrency(stats?.breakdown?.totalExpenses || 0)}</Text>
                    </View>
                    <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.listLeft}>
                            <Shield size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Active Deposits</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.breakdown?.totalDeposit || 0)}</Text>
                    </View>
                </View>

                {/* Graphical Representation (Payments) */}
                <AnimatedPieChart
                    title="Payment Methods"
                    data={[
                        { value: stats?.paymentMethods?.cash || 0, color: theme.colors.success, text: 'Cash' },
                        { value: stats?.paymentMethods?.upi || 0, color: theme.colors.accent, text: 'UPI' },
                        { value: stats?.paymentMethods?.bank_transfer || 0, color: theme.colors.warning, text: 'Bank' },
                        { value: stats?.paymentMethods?.other || 0, color: theme.colors.textSecondary, text: 'Other' }
                    ]}
                    fadeAnim={fadeAnim}
                    scaleAnim={scaleAnim}
                    centerSubLabel="Payment"
                />

                <View style={styles.breakdownList}>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Banknote size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Cash</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.paymentMethods?.cash || 0)}</Text>
                    </View>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Smartphone size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>UPI / Online</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.paymentMethods?.upi || 0)}</Text>
                    </View>
                    <View style={styles.listItem}>
                        <View style={styles.listLeft}>
                            <Wallet size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Bank Transfer</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.paymentMethods?.bank_transfer || 0)}</Text>
                    </View>
                    <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.listLeft}>
                            <CreditCard size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.listLabel}>Other</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(stats?.paymentMethods?.other || 0)}</Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <MonthPickerModal
                visible={showMonthPicker}
                month={month}
                year={year}
                onSelect={(m, y) => {
                    setMonth(m);
                    setYear(y);
                    setShowMonthPicker(false);
                }}
                onClose={() => setShowMonthPicker(false)}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.m,
    },
    monthArrow: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthLabel: {
        alignItems: 'center',
        minWidth: 100,
    },
    monthText: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    yearLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    content: {
        padding: theme.spacing.m,
        paddingBottom: 100,
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
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    breakdownList: {
        marginBottom: theme.spacing.xl,
        borderRadius: theme.borderRadius.l,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    listLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
    },
    listLabel: {
        fontSize: 14,
        fontWeight: theme.typography.medium,
        color: theme.colors.textPrimary,
    },
    listAmount: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    }
});
