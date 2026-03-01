import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { updateBill, recalculateBill } from '../../db';
import RentModalSheet from './RentModalSheet';
import { trackEvent, AnalyticsEvents } from '../../services/analyticsService';

interface EditUtilityModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
    type: 'electricity' | 'water';
}

export default function EditUtilityModal({ visible, onClose, bill, unit, type }: EditUtilityModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [amount, setAmount] = useState('');

    const isElec = type === 'electricity';
    const label = isElec ? 'Electricity' : 'Water';

    useEffect(() => {
        if (visible && bill) {
            const currentAmt = isElec ? bill.electricity_amount : bill.water_amount;
            const unitFixedAmt = isElec ? unit?.electricity_fixed_amount : unit?.water_fixed_amount;
            setAmount(currentAmt?.toString() || unitFixedAmt?.toString() || '0');
        }
    }, [visible, bill, type]);

    const handleSave = async () => {
        const amt = parseFloat(amount) || 0;
        const updateData = isElec ? { electricity_amount: amt } : { water_amount: amt };

        await updateBill(bill.id, updateData);
        await recalculateBill(bill.id);
        trackEvent(AnalyticsEvents.METER_READING_SAVED, { type, mode: 'fixed' });
        onClose();
    };

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title={`Update ${label} Amount`}
            subtitle={`Room: ${unit?.name}`}
            actionLabel="Okay"
            onAction={handleSave}
            scrollable={false}
        >
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label} Amount for this Month</Text>
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
