import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { theme } from '../../theme';
import { CURRENCY } from '../../utils/Constants';
import { Plus, Minus, Wallet } from 'lucide-react-native';
import { addExpenseToBill, recalculateBill } from '../../db';
import Toggle from '../common/Toggle';
import RentModalSheet from './RentModalSheet';

interface ExpenseActionsModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
}

export default function ExpenseActionsModal({ visible, onClose, bill, unit }: ExpenseActionsModalProps) {
    const [actionType, setActionType] = useState<'add' | 'remove'>('add');
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);

    const handleSubmit = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;

        const finalAmount = actionType === 'remove' ? -amt : amt;

        await addExpenseToBill(bill.id, {
            label: label || (actionType === 'add' ? 'Custom Expense' : 'Discount'),
            amount: finalAmount,
            is_recurring: isRecurring,
        });

        await recalculateBill(bill.id);
        setLabel('');
        setAmount('');
        setIsRecurring(false);
        onClose();
    };

    if (!bill) return null;

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Expense Actions"
            subtitle={unit?.name}
            actionLabel={actionType === 'add' ? 'Add Expense' : 'Remove Expense'}
            onAction={handleSubmit}
        >
            {/* Add / Remove Toggle */}
            <View style={styles.toggleRow}>
                <Pressable
                    style={[styles.toggleBtn, actionType === 'add' && styles.toggleBtnActive]}
                    onPress={() => setActionType('add')}
                >
                    <Plus size={16} color={actionType === 'add' ? '#FFF' : theme.colors.textSecondary} />
                    <Text style={[styles.toggleText, actionType === 'add' && styles.toggleTextActive]}>Add</Text>
                </Pressable>
                <Pressable
                    style={[styles.toggleBtn, actionType === 'remove' && styles.toggleBtnRemove]}
                    onPress={() => setActionType('remove')}
                >
                    <Minus size={16} color={actionType === 'remove' ? '#FFF' : theme.colors.textSecondary} />
                    <Text style={[styles.toggleText, actionType === 'remove' && styles.toggleTextActive]}>Remove</Text>
                </Pressable>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.inputRow}>
                    <Text style={styles.currencyPrefix}>{CURRENCY}</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.colors.textTertiary}
                    />
                </View>
            </View>

            {/* Label */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Label</Text>
                <TextInput
                    style={styles.input}
                    value={label}
                    onChangeText={setLabel}
                    placeholder={actionType === 'add' ? 'Wi-Fi/Internet, Maintenance...' : 'Remove expense reason...'}
                    placeholderTextColor={theme.colors.textTertiary}
                />
            </View>

            {/* Recurring */}
            {actionType === 'add' && (
                <View style={styles.recurringRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.recurringLabel}>Recurring Expense</Text>
                        <Text style={styles.recurringHint}>Auto-add each month</Text>
                    </View>
                    <Toggle value={isRecurring} onValueChange={setIsRecurring} />
                </View>
            )}
        </RentModalSheet>
    );
}

const styles = StyleSheet.create({
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: theme.spacing.l,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    toggleBtnActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    toggleBtnRemove: {
        backgroundColor: theme.colors.danger,
        borderColor: theme.colors.danger,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
    },
    toggleTextActive: {
        color: '#FFF',
    },
    inputGroup: {
        marginBottom: theme.spacing.m,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginRight: 4,
    },
    amountInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        paddingVertical: 14,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        fontSize: 14,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    recurringRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    recurringLabel: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    recurringHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
});
