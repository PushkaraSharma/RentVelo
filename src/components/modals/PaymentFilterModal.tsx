import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { X, Check } from 'lucide-react-native';
import { hapticsSelection, hapticsMedium } from '../../utils/haptics';
import { getAllProperties } from '../../db';

export interface PaymentFilters {
    type: string | null;
    status: string | null;
    propertyId: number | null;
}

interface PaymentFilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: PaymentFilters;
    onApply: (filters: PaymentFilters) => void;
}

const PAYMENT_TYPES = [
    { label: 'All', value: null },
    { label: 'Rent', value: 'rent' },
    { label: 'Security Deposit', value: 'security_deposit' },
    { label: 'Maintenance', value: 'maintenance' }
];

const PAYMENT_STATUSES = [
    { label: 'All', value: null },
    { label: 'Success (Paid)', value: 'paid' },
    { label: 'Pending', value: 'pending' }
];

export default function PaymentFilterModal({
    visible,
    onClose,
    filters,
    onApply
}: PaymentFilterModalProps) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);

    const [localFilters, setLocalFilters] = useState<PaymentFilters>(filters);
    const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        if (visible) {
            setLocalFilters(filters);
            loadProperties();
        }
    }, [visible, filters]);

    const loadProperties = async () => {
        try {
            const props = await getAllProperties();
            setProperties([{ id: -1, name: 'All Properties' }, ...props]);
        } catch (error) {
            console.error('Error loading properties for filter:', error);
        }
    };

    const handleApply = () => {
        hapticsMedium();
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        hapticsMedium();
        setLocalFilters({ type: null, status: null, propertyId: null });
    };

    const renderOptionGroup = (
        title: string,
        options: { label: string; value: any }[],
        selectedValue: any,
        onSelect: (val: any) => void
    ) => (
        <View style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{title}</Text>
            <View style={styles.optionsRow}>
                {options.map((opt) => {
                    const isSelected = selectedValue === opt.value || (selectedValue === null && opt.value === -1);
                    return (
                        <Pressable
                            key={opt.value?.toString() || 'all'}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => {
                                hapticsSelection();
                                onSelect(opt.value === -1 ? null : opt.value);
                            }}
                        >
                            <Text
                                style={[styles.chipText, isSelected && styles.chipTextSelected]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.content} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Filter Payments</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {renderOptionGroup(
                            'Payment Type',
                            PAYMENT_TYPES,
                            localFilters.type,
                            (val) => setLocalFilters({ ...localFilters, type: val })
                        )}

                        {renderOptionGroup(
                            'Status',
                            PAYMENT_STATUSES,
                            localFilters.status,
                            (val) => setLocalFilters({ ...localFilters, status: val })
                        )}

                        {properties.length > 0 && renderOptionGroup(
                            'Property',
                            properties.map(p => ({ label: p.name, value: p.id })),
                            localFilters.propertyId,
                            (val) => setLocalFilters({ ...localFilters, propertyId: val })
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable style={styles.resetBtn} onPress={handleReset}>
                            <Text style={styles.resetBtnText}>Reset</Text>
                        </Pressable>
                        <Pressable style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Apply Filters</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: Dimensions.get('window').height * 0.85,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        padding: 4,
    },
    scroll: {
        // Horizontal padding moved to scrollContent to prevent clipping
    },
    scrollContent: {
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.m,
    },
    groupContainer: {
        marginBottom: theme.spacing.xl,
    },
    groupTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
        textTransform: 'uppercase',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
        alignItems: 'center', // Ensure consistent height alignment
    },
    chip: {
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        maxWidth: '100%', // Prevent overflow
        overflow: 'hidden', // Contain text and border
    },
    chipSelected: {
        borderColor: theme.colors.accent,
        backgroundColor: isDark ? theme.colors.accent + '20' : theme.colors.accentLight,
    },
    chipText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    chipTextSelected: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.l,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.m,
    },
    resetBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    resetBtnText: {
        fontSize: 16,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
    },
    applyBtn: {
        flex: 2,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.accent,
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: '#FFFFFF',
    },
});
