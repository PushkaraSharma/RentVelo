import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { theme } from '../../theme';
import { CURRENCY } from '../../utils/Constants';
import { ChevronRight } from 'lucide-react-native';
import { updateBill, recalculateBill } from '../../db';
import RentModalSheet from './RentModalSheet';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface TransactionInfoModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
    period: { start: string; end: string; days: number };
}

export default function TransactionInfoModal({ visible, onClose, bill, unit, period }: TransactionInfoModalProps) {
    const [rentAmount, setRentAmount] = useState('');
    const [balanceType, setBalanceType] = useState<'balance' | 'advance'>('balance');
    const [balanceAmount, setBalanceAmount] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const formatDate = (d: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    useEffect(() => {
        if (visible && bill) {
            setRentAmount(bill.rent_amount?.toString() || '0');
            const prevBal = bill.previous_balance ?? 0;
            if (prevBal < 0) {
                setBalanceType('advance');
                setBalanceAmount(Math.abs(prevBal).toString());
            } else {
                setBalanceType('balance');
                setBalanceAmount(prevBal.toString());
            }
            // Initialize dates from bill's month/year
            setStartDate(new Date(bill.year, bill.month - 1, 1));
            setEndDate(new Date(bill.year, bill.month, 0));
        }
    }, [visible, bill]);

    const handleSave = async () => {
        const rent = parseFloat(rentAmount) || 0;
        const bal = parseFloat(balanceAmount) || 0;
        const previousBalance = balanceType === 'advance' ? -bal : bal;

        await updateBill(bill.id, {
            rent_amount: rent,
            previous_balance: previousBalance,
        });
        await recalculateBill(bill.id);
        onClose();
    };

    if (!bill) return null;

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Transaction Info"
            subtitle={unit?.name}
            actionLabel="Okay"
            onAction={handleSave}
        >
            {/* Rent Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rent</Text>

                {/* Date Range */}
                <View style={styles.dateRow}>
                    <Pressable style={styles.dateChip} onPress={() => setShowStartPicker(true)}>
                        <Text style={styles.dateLabel}>Start Date</Text>
                        <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
                    </Pressable>
                    <View style={styles.daysLabel}>
                        <Text style={styles.daysText}>{Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} Days</Text>
                        <ChevronRight size={16} color={theme.colors.textTertiary} />
                    </View>
                    <Pressable style={styles.dateChip} onPress={() => setShowEndPicker(true)}>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
                    </Pressable>
                </View>

                <DateTimePickerModal
                    isVisible={showStartPicker}
                    mode="date"
                    date={startDate}
                    onConfirm={(date) => { setShowStartPicker(false); setStartDate(date); }}
                    onCancel={() => setShowStartPicker(false)}
                />
                <DateTimePickerModal
                    isVisible={showEndPicker}
                    mode="date"
                    date={endDate}
                    onConfirm={(date) => { setShowEndPicker(false); setEndDate(date); }}
                    onCancel={() => setShowEndPicker(false)}
                />

                {/* Rent Amount */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rent For this Month</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.currencyLabel}>{CURRENCY}</Text>
                        <TextInput
                            style={styles.input}
                            value={rentAmount}
                            onChangeText={setRentAmount}
                            keyboardType="numeric"
                        />
                    </View>
                    <Text style={styles.inputHint}>
                        Rent Per Month: {CURRENCY}{unit?.rent_amount?.toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>

            {/* Balance / Advance Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Balance / Advance</Text>
                <View style={styles.typeRow}>
                    <Pressable
                        style={[styles.typeBtn, balanceType === 'balance' && styles.typeBtnActive]}
                        onPress={() => setBalanceType('balance')}
                    >
                        <View style={[styles.radio, balanceType === 'balance' && styles.radioActive]}>
                            {balanceType === 'balance' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.typeBtnLabel}>+ Prev Balance</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.typeBtn, balanceType === 'advance' && styles.typeBtnActiveGreen]}
                        onPress={() => setBalanceType('advance')}
                    >
                        <View style={[styles.radio, balanceType === 'advance' && styles.radioActiveGreen]}>
                            {balanceType === 'advance' && <View style={[styles.radioInner, { backgroundColor: theme.colors.success }]} />}
                        </View>
                        <Text style={styles.typeBtnLabel}>− Prev Advance</Text>
                    </Pressable>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.currencyLabel}>{CURRENCY}</Text>
                        <TextInput
                            style={styles.input}
                            value={balanceAmount}
                            onChangeText={setBalanceAmount}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
            </View>
        </RentModalSheet>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
    },
    dateChip: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme.colors.accentLight,
        borderRadius: 12,
        paddingVertical: 8,
    },
    dateLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    daysLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    daysText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    inputGroup: {
        marginBottom: theme.spacing.s,
    },
    inputLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        padding: 0,
    },
    currencyLabel: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginRight: 4,
    },
    inputHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    typeRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.m,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    typeBtnActive: {
        borderColor: theme.colors.warning,
        backgroundColor: theme.colors.warningLight,
    },
    typeBtnActiveGreen: {
        borderColor: theme.colors.success,
        backgroundColor: theme.colors.successLight,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: {
        borderColor: theme.colors.warning,
    },
    radioActiveGreen: {
        borderColor: theme.colors.success,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.warning,
    },
    typeBtnLabel: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
});
