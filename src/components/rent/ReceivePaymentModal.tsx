import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { Banknote, CreditCard, Building2, Landmark, Camera, Check } from 'lucide-react-native';
import { addPaymentToBill } from '../../db/billService';
import { syncNotificationSchedules } from '../../services/pushNotificationService';
import { handleImageSelection } from '../../utils/ImagePickerUtil';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import RentModalSheet from './RentModalSheet';
import { hapticsSelection, hapticsMedium, hapticsError } from '../../utils/haptics';

interface ReceivePaymentModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: '#10B981' },
    { id: 'upi', label: 'UPI', icon: CreditCard, color: '#8B5CF6' },
    { id: 'bank_transfer', label: 'Bank', icon: Landmark, color: '#3B82F6' },
    { id: 'cheque', label: 'Cheque', icon: Building2, color: '#F59E0B' },
];

export default function ReceivePaymentModal({ visible, onClose, bill, unit }: ReceivePaymentModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [remarks, setRemarks] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const currentBalance = bill?.balance ?? 0;

    const handleAddPayment = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            hapticsError();
            return;
        }

        setLoading(true);
        try {
            await addPaymentToBill(bill.id, {
                amount: amt,
                payment_method: method as any,
                payment_date: paymentDate,
                notes: remarks || undefined,
                photo_uri: photoUri || undefined,
                property_id: bill.property_id,
                tenant_id: bill.tenant_id,
                unit_id: bill.unit_id,
            });

            await syncNotificationSchedules();
            hapticsMedium();
            setAmount('');
            setRemarks('');
            setPhotoUri(null);
            setPaymentDate(new Date());
            onClose();
        } catch (err: any) {
            hapticsError();
            console.error('Error adding payment:', err);
        } finally {
            setLoading(false);
        }
    };

    const pickPhoto = () => {
        handleImageSelection((uri) => setPhotoUri(uri), {
            allowsEditing: true,
            quality: 0.8,
        });
    };

    const formatDate = (d: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear().toString().slice(-2)}`;
    };

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Receive Payment"
            subtitle={unit?.name}
            actionLabel="Add Amount"
            onAction={handleAddPayment}
            actionDisabled={loading}
        >
            {/* Amount */}
            <Text style={styles.label}>Amount & Balance</Text>
            <View style={styles.amountRow}>
                <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="Amount Paid"
                    placeholderTextColor={theme.colors.textTertiary}
                />
            </View>

            {/* Payment Method */}
            <View style={styles.methodRow}>
                {PAYMENT_METHODS.map(m => (
                    <Pressable
                        key={m.id}
                        style={[styles.methodChip, method === m.id && { backgroundColor: m.color + '15', borderColor: m.color }]}
                        onPress={() => { hapticsSelection(); setMethod(m.id); }}
                    >
                        <m.icon size={16} color={method === m.id ? m.color : theme.colors.textTertiary} />
                        <Text style={[styles.methodText, method === m.id && { color: m.color }]}>{m.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Balance Info */}
            <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>
                    Current Balance: {CURRENCY}{currentBalance.toLocaleString('en-IN')}
                </Text>
            </View>

            {/* Remarks & Extra */}
            <Text style={styles.label}>Remarks & Extra</Text>
            <View style={styles.extrasRow}>
                <Pressable style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{formatDate(paymentDate)}</Text>
                </Pressable>
                <Pressable style={styles.photoChip} onPress={pickPhoto}>
                    <Camera size={16} color={theme.colors.accent} />
                    <Text style={styles.photoText}>{photoUri ? 'Photo Added' : 'Add Photo'}</Text>
                    {photoUri && <Check size={16} color={theme.colors.accent} />}
                </Pressable>
            </View>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={paymentDate}
                onConfirm={(date) => { setShowDatePicker(false); setPaymentDate(date); }}
                onCancel={() => setShowDatePicker(false)}
            />

            <TextInput
                style={styles.remarksInput}
                value={remarks}
                onChangeText={(text) => setRemarks(text.slice(0, 50))}
                placeholder="Remarks"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={50}
            />
            <Text style={styles.charCount}>{remarks.length}/50</Text>
        </RentModalSheet>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    amountRow: {
        marginBottom: theme.spacing.m,
    },
    amountInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    methodRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.m,
    },
    methodChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    methodText: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
    },
    balanceInfo: {
        backgroundColor: theme.colors.dangerLight,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.l,
        alignItems: 'center',
    },
    balanceInfoText: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.danger,
    },
    extrasRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: theme.spacing.s,
    },
    dateChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
    },
    dateText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    photoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
    },
    photoText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    remarksInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 12,
        fontSize: 14,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 4,
        marginBottom: theme.spacing.m,
    },
});
