import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { Plus, Minus, ChevronDown, Wallet } from 'lucide-react-native';
import { addExpenseToBill, recalculateBill } from '../../db';
import Toggle from '../common/Toggle';
import PickerBottomSheet from '../common/PickerBottomSheet';
import RentModalSheet from './RentModalSheet';

interface ExpenseActionsModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
}

const EXPENSE_CATEGORIES = [
    'Wifi', 'Internet', 'Food/meals', 'Invertor/Generator', 'Cable/Dish',
    'Cameras', 'Laundry', 'Water Bill', 'Plumbing charges', 'Water Heater',
    'AC', 'Light', 'Bulb etc', 'Repair/Fixes', 'Furnishing', 'House cleaning',
    'Car/Bike Parking', 'Yearly Maintainance', 'Property Tax', 'Late Fees',
    'Penalty/Fine', 'Other', 'Gas cylinder', 'Monthly Maintainance', 'Electricity Bill', 'Gas Bill'
];

export default function ExpenseActionsModal({ visible, onClose, bill, unit }: ExpenseActionsModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [actionType, setActionType] = useState<'add' | 'remove'>('add');
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const handleSubmit = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;

        const finalAmount = actionType === 'remove' ? -amt : amt;

        let finalLabel = '';
        if (actionType === 'add') {
            const category = label || 'Custom Expense';
            finalLabel = remarks ? `${category} - ${remarks}` : category;
        } else {
            finalLabel = remarks || 'Discount';
        }

        await addExpenseToBill(bill.id, {
            label: finalLabel,
            amount: finalAmount,
            is_recurring: isRecurring,
        });

        await recalculateBill(bill.id);
        setLabel('');
        setRemarks('');
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

            {/* Category Selector for Add Expense */}
            {actionType === 'add' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category / Purpose</Text>
                    <Pressable
                        style={styles.dropdownInput}
                        onPress={() => setShowCategoryPicker(true)}
                    >
                        <Text style={[styles.dropdownText, !label && { color: theme.colors.textTertiary }]}>
                            {label || 'Select Category'}
                        </Text>
                        <ChevronDown size={20} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>
            )}

            {/* Label */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Remarks</Text>
                <TextInput
                    style={styles.input}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder={'Enter remarks'}
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

            <PickerBottomSheet
                visible={showCategoryPicker}
                onClose={() => setShowCategoryPicker(false)}
                title="Select Category"
                options={EXPENSE_CATEGORIES}
                selectedValue={label}
                onSelect={(cat) => setLabel(cat)}
            />
        </RentModalSheet>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
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
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
});
