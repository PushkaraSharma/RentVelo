import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { updateBill, recalculateBill } from '../../db';
import RentModalSheet from './RentModalSheet';

interface EditElectricityModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
}

export default function EditElectricityModal({ visible, onClose, bill, unit }: EditElectricityModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (visible && bill) {
            setAmount(bill.electricity_amount?.toString() || unit?.electricity_fixed_amount?.toString() || '0');
        }
    }, [visible, bill]);

    const handleSave = async () => {
        const amt = parseFloat(amount) || 0;
        await updateBill(bill.id, { electricity_amount: amt });
        await recalculateBill(bill.id);
        onClose();
    };

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Update Electricity Amount"
            subtitle={`Room: ${unit?.name}`}
            actionLabel="Okay"
            onAction={handleSave}
            scrollable={false}
        >
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Electricity Amount for this Month</Text>
                <View style={styles.inputRow}>
                    <Text style={styles.currency}>{CURRENCY}</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        autoFocus
                    />
                </View>
            </View>
        </RentModalSheet>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    inputGroup: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    inputLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 24,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        padding: 0,
    },
    currency: {
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginRight: 4,
    },
});
