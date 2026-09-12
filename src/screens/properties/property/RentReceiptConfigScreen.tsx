import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import {
    Plus,
    CreditCard,
    Check,
    DoorOpen,
    BedDouble,
    ChevronRight,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getAllPaymentAccounts,
    getPropertyById,
    getUnitsByPropertyId,
    setPropertyDefaultPaymentAccount,
    assignPaymentAccountToUnits,
    PaymentAccount,
} from '../../../db';
import { useToast } from '../../../hooks/useToast';

const WALLET_LABELS: Record<string, string> = {
    google_pay: 'Google Pay',
    paytm: 'Paytm',
    phonepe: 'PhonePe',
    amazon_pay: 'Amazon Pay',
    other: 'Wallet',
};

const maskAccountNumber = (value?: string | null) => {
    if (!value) return null;
    const digits = String(value).replace(/\s/g, '');
    if (digits.length <= 4) return digits;
    return `•••• ${digits.slice(-4)}`;
};

const accountSummaryLine = (account: PaymentAccount): string => {
    if (account.bank_name || account.bank_acc_number) {
        const parts = [account.bank_name, maskAccountNumber(account.bank_acc_number)].filter(Boolean);
        return parts.join(' · ');
    }
    if (account.upi_id) return `UPI: ${account.upi_id}`;
    if (account.wallet_phone) {
        const wallet = WALLET_LABELS[account.wallet_type || ''] || 'Wallet';
        return `${wallet}: ${account.wallet_phone}`;
    }
    return 'No payout details yet';
};

export default function RentReceiptConfigScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;

    const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
    const [property, setProperty] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
    const [showAssignPicker, setShowAssignPicker] = useState(false);
    const [assignTargetIds, setAssignTargetIds] = useState<number[]>([]);

    const defaultAccountId = property?.default_payment_account_id ?? null;
    const accountById = useMemo(() => {
        const map = new Map<number, PaymentAccount>();
        accounts.forEach((account) => map.set(account.id, account));
        return map;
    }, [accounts]);

    const loadData = async () => {
        try {
            const [accountRows, propData, unitRows] = await Promise.all([
                getAllPaymentAccounts(),
                getPropertyById(propertyId),
                getUnitsByPropertyId(propertyId),
            ]);
            setAccounts(accountRows);
            setProperty(propData);
            setUnits(unitRows);
        } catch (error) {
            console.error('Error loading rent receipt hub:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [propertyId])
    );

    const resolvedAccountName = (unit: any) => {
        if (unit.payment_account_id) {
            return accountById.get(unit.payment_account_id)?.name || 'Assigned account';
        }
        if (defaultAccountId) {
            const name = accountById.get(defaultAccountId)?.name || 'Default account';
            return `Default · ${name}`;
        }
        return 'No account';
    };

    const handleSetDefault = async (accountId: number) => {
        try {
            await setPropertyDefaultPaymentAccount(propertyId, accountId);
            setProperty((prev: any) => prev ? { ...prev, default_payment_account_id: accountId } : prev);
            showToast({ type: 'success', title: 'Default updated', message: 'Unmapped rooms will use this account.' });
        } catch (error) {
            console.error('Error setting default account:', error);
            showToast({ type: 'error', title: 'Error', message: 'Could not set default account.' });
        }
    };

    const toggleMultiSelect = () => {
        if (multiSelect) {
            setSelectedUnitIds([]);
            setMultiSelect(false);
        } else {
            setMultiSelect(true);
        }
    };

    const handleRoomPress = (unitId: number) => {
        if (multiSelect) {
            setSelectedUnitIds((prev) => (
                prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
            ));
            return;
        }
        openAssignPicker([unitId]);
    };

    const openAssignPicker = (unitIds: number[]) => {
        if (unitIds.length === 0) {
            showToast({ type: 'info', title: 'Select rooms', message: 'Select one or more rooms to assign an account.' });
            return;
        }
        setAssignTargetIds(unitIds);
        setShowAssignPicker(true);
    };

    const handleAssign = async (value: string) => {
        try {
            const accountId = value === 'default' ? null : Number(value);
            await assignPaymentAccountToUnits(assignTargetIds, accountId);
            setSelectedUnitIds([]);
            await loadData();
            showToast({
                type: 'success',
                title: 'Rooms updated',
                message: accountId ? 'Account assigned to selected rooms.' : 'Selected rooms now use the property default.',
            });
        } catch (error) {
            console.error('Error assigning account:', error);
            showToast({ type: 'error', title: 'Error', message: 'Could not assign payment account.' });
        }
    };

    const assignOptions = [
        { label: defaultAccountId
            ? `Use property default (${accountById.get(defaultAccountId)?.name || 'Default'})`
            : 'Use property default',
          value: 'default' },
        ...accounts.map((account) => ({ label: account.name, value: String(account.id) })),
    ];

    const isPG = property?.type === 'pg';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Header
                title="Rent Receipt"
                rightAction={
                    <Pressable
                        onPress={() => navigation.navigate('PaymentAccountEditor', { propertyId })}
                        hitSlop={8}
                    >
                        <Plus size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                }
            />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionLabel, styles.sectionPad]}>Payment accounts</Text>
                <Text style={styles.sectionHint}>
                    These accounts are shared across all properties. Edit once and reuse anywhere.
                </Text>

                {accounts.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CreditCard size={28} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No payment accounts yet</Text>
                        <Text style={styles.emptySubtitle}>Add bank, UPI, or wallet details to show on receipts.</Text>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsRow}
                    >
                        {accounts.map((account) => {
                            const isDefault = defaultAccountId === account.id;
                            return (
                                <View key={account.id} style={[styles.accountCard, isDefault && styles.accountCardDefault]}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
                                        {isDefault && (
                                            <View style={styles.defaultBadge}>
                                                <Text style={styles.defaultBadgeText}>Default</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.detailLine} numberOfLines={1}>
                                        {accountSummaryLine(account)}
                                    </Text>
                                    <View style={styles.cardActions}>
                                        <Pressable
                                            style={styles.cardAction}
                                            onPress={() => navigation.navigate('PaymentAccountEditor', { propertyId, accountId: account.id })}
                                        >
                                            <Text style={styles.cardActionText}>Show details</Text>
                                        </Pressable>
                                        {!isDefault && (
                                            <Pressable style={styles.cardAction} onPress={() => handleSetDefault(account.id)}>
                                                <Text style={styles.cardActionText}>Use as default</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                <View style={[styles.sectionHeader, { marginTop: theme.spacing.l }]}>
                    <Text style={styles.sectionLabel}>Assign to rooms</Text>
                    {units.length > 0 && (
                        <Pressable onPress={toggleMultiSelect}>
                            <Text style={styles.headerLink}>{multiSelect ? 'Done' : 'Select multiple'}</Text>
                        </Pressable>
                    )}
                </View>
                <Text style={styles.sectionHint}>
                    {multiSelect
                        ? 'Select rooms, then assign one account to all of them.'
                        : 'Tap a room to choose its payment account. Unmapped rooms use the default.'}
                </Text>

                {units.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <DoorOpen size={28} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No rooms in this property</Text>
                    </View>
                ) : (
                    units.map((unit) => {
                        const selected = selectedUnitIds.includes(unit.id);
                        return (
                            <Pressable
                                key={unit.id}
                                style={[styles.roomRow, multiSelect && selected && styles.roomRowSelected]}
                                onPress={() => handleRoomPress(unit.id)}
                            >
                                {multiSelect && (
                                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                                        {selected && <Check size={12} color="#FFF" />}
                                    </View>
                                )}
                                <View style={styles.roomIcon}>
                                    {isPG ? <BedDouble size={16} color={theme.colors.textSecondary} /> : <DoorOpen size={16} color={theme.colors.textSecondary} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.roomName}>{unit.name}</Text>
                                    <Text style={styles.roomAccount} numberOfLines={1}>{resolvedAccountName(unit)}</Text>
                                </View>
                                {!multiSelect && <ChevronRight size={18} color={theme.colors.textTertiary} />}
                            </Pressable>
                        );
                    })
                )}

                {multiSelect && selectedUnitIds.length > 0 && (
                    <Button
                        title={`Assign account to ${selectedUnitIds.length} room${selectedUnitIds.length === 1 ? '' : 's'}`}
                        onPress={() => openAssignPicker(selectedUnitIds)}
                        style={styles.assignBtn}
                    />
                )}
            </ScrollView>

            <PickerBottomSheet
                visible={showAssignPicker}
                onClose={() => setShowAssignPicker(false)}
                title="Assign payment account"
                options={assignOptions}
                onSelect={handleAssign}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingHorizontal: theme.spacing.m,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    sectionPad: {
        paddingHorizontal: theme.spacing.m,
    },
    sectionHint: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
        lineHeight: 18,
        paddingHorizontal: theme.spacing.m,
    },
    headerLink: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.m,
        marginHorizontal: theme.spacing.m,
        gap: 8,
    },
    emptyTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    emptySubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    cardsRow: {
        paddingHorizontal: theme.spacing.m,
        gap: 12,
        paddingBottom: 4,
    },
    accountCard: {
        width: 240,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    accountCardDefault: {
        borderColor: theme.colors.accent,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    accountName: {
        flex: 1,
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    defaultBadge: {
        backgroundColor: isDark ? theme.colors.accent + '20' : theme.colors.accentLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    defaultBadgeText: {
        fontSize: 11,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    detailLine: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginTop: theme.spacing.m,
        paddingTop: theme.spacing.s,
    },
    cardAction: {
        paddingVertical: 4,
    },
    cardActionText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    roomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 8,
        marginHorizontal: theme.spacing.m,
    },
    roomRowSelected: {
        borderColor: theme.colors.accent,
        backgroundColor: isDark ? theme.colors.accent + '14' : theme.colors.accentLight,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    roomIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roomName: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    roomAccount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    assignBtn: {
        marginTop: theme.spacing.m,
        marginHorizontal: theme.spacing.m,
        backgroundColor: theme.colors.accent,
    },
});
