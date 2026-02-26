import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, Pressable, TextInput, ScrollView, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { useFocusEffect } from '@react-navigation/native';
import { generateBillsForProperty, getBillsForPropertyMonth, getPropertyById } from '../../db';
import MonthPickerModal from '../../components/rent/MonthPickerModal';
import RentBillCard from '../../components/rent/RentBillCard';
import RentBillSkeleton from '../../components/rent/RentBillSkeleton';
import { hapticsHeavy } from '../../utils/haptics';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

type FilterType = 'all' | 'paid' | 'partial' | 'pending' | 'vacant';

export default function TakeRentScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
    const propertyId = route?.params?.propertyId;
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>(route?.params?.initialFilter || 'all');
    const [bills, setBills] = useState<any[]>([]);
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setLoading(true);
        try {
            const prop = await getPropertyById(propertyId);
            setProperty(prop);

            // Generate missing bills, then fetch all
            await generateBillsForProperty(propertyId, month, year);
            const data = await getBillsForPropertyMonth(propertyId, month, year);
            setBills(data);
        } catch (error) {
            console.error('Error loading rent data:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [propertyId, month, year]);

    useFocusEffect(
        useCallback(() => {
            if (propertyId) loadData();
        }, [propertyId, month, year])
    );

    // Filtering
    const filteredBills = bills.filter(item => {
        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            const tenantName = item.tenant?.name?.toLowerCase() || '';
            const unitName = item.unit?.name?.toLowerCase() || '';
            if (!tenantName.includes(q) && !unitName.includes(q)) return false;
        }

        // Status filter
        if (filter === 'all') return true;
        if (filter === 'vacant') return item.isVacant;
        if (filter === 'paid') return item.bill?.status === 'paid' || item.bill?.status === 'overpaid';
        if (filter === 'partial') return item.bill?.status === 'partial';
        if (filter === 'pending') return item.bill?.status === 'pending';
        return true;
    });

    // Counts
    const counts = {
        all: bills.length,
        paid: bills.filter(b => b.bill?.status === 'paid' || b.bill?.status === 'overpaid').length,
        partial: bills.filter(b => b.bill?.status === 'partial').length,
        pending: bills.filter(b => b.bill?.status === 'pending').length,
        vacant: bills.filter(b => b.isVacant).length,
    };

    const goMonth = (dir: number) => {
        hapticsHeavy();
        setLoading(true); // Immediate loader feedback
        let newMonth = month + dir;
        let newYear = year;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setMonth(newMonth);
        setYear(newYear);
    };

    const filters: { key: FilterType; label: string }[] = [
        { key: 'all', label: `All: ${counts.all}` },
        { key: 'paid', label: `Paid: ${counts.paid}` },
        { key: 'partial', label: `Partial: ${counts.partial}` },
        { key: 'pending', label: `Pending: ${counts.pending}` },
        { key: 'vacant', label: `Vacant: ${counts.vacant}` },
    ];

    const rentPeriod = useMemo(() => {
        let pMonth = month;
        let pYear = year;

        if (property?.rent_payment_type === 'previous_month') {
            pMonth = month - 1;
            if (pMonth < 1) {
                pMonth = 12;
                pYear = year - 1;
            }
        }

        const startDate = new Date(pYear, pMonth - 1, 1);
        const endDate = new Date(pYear, pMonth, 0);
        const start = `${startDate.getDate()} ${MONTHS[pMonth - 1].substring(0, 3)}`;
        const end = `${endDate.getDate()} ${MONTHS[pMonth - 1].substring(0, 3)} ${pYear}`;
        return { start, end, days: endDate.getDate() };
    }, [month, year, property?.rent_payment_type]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header with Month Selector */}
            <Header
                centerAction={
                    <View style={styles.monthSelector}>
                        <Pressable onPress={() => goMonth(-1)} style={styles.monthArrow}>
                            <ChevronLeft size={20} color={theme.colors.accent} />
                        </Pressable>
                        <Pressable onPress={() => setShowMonthPicker(true)} style={styles.monthLabel}>
                            <Text style={styles.monthText}>{MONTHS[month - 1]}</Text>
                            <Text style={styles.yearLabel}>{year}</Text>
                        </Pressable>
                        <Pressable onPress={() => goMonth(1)} style={styles.monthArrow}>
                            <ChevronRight size={20} color={theme.colors.accent} />
                        </Pressable>
                    </View>
                }
            />

            {/* Bills List (search + filters scroll with it) */}
            <FlatList
                data={loading ? [1, 2, 3] : filteredBills}
                ListHeaderComponent={
                    <>
                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <Search size={18} color={theme.colors.textTertiary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search Rooms or Tenants..."
                                placeholderTextColor={theme.colors.textTertiary}
                                value={search}
                                onChangeText={setSearch}
                                editable={!loading}
                            />
                            {search.length > 0 && (
                                <Pressable onPress={() => setSearch('')}>
                                    <X size={18} color={theme.colors.textTertiary} />
                                </Pressable>
                            )}
                        </View>

                        {/* Filter Chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                            style={styles.filterScroll}
                        >
                            {filters.map(f => (
                                <Pressable
                                    key={f.key}
                                    style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                                    onPress={() => !loading && setFilter(f.key)}
                                >
                                    <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </>
                }
                renderItem={({ item }) => loading ? (
                    <RentBillSkeleton />
                ) : (
                    <RentBillCard
                        item={item}
                        period={rentPeriod}
                        onRefresh={loadData}
                        navigation={navigation}
                        propertyId={propertyId}
                        viewingMonth={month}
                        viewingYear={year}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => loading ? `skeleton-${index}` : `bill-${item.unit.id}`}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={loading ? null : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No rooms found</Text>
                        <Text style={styles.emptySubtitle}>
                            {search ? 'Try a different search term' : 'Add rooms to this property first'}
                        </Text>
                    </View>
                )}
            />

            {/* Month Picker Overlay */}
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
        </View>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.s,
        paddingVertical: theme.spacing.s,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Month Selector (inside header)
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

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.textPrimary,
        padding: 0,
    },

    // Filters
    filterScroll: {
        minHeight: 44,
        maxHeight: 44,
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    filterRow: {
        gap: theme.spacing.s,
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterChipActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },

    // List
    listContent: {
        padding: theme.spacing.m,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.m,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
});
