import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { theme } from '../../theme';
import { CURRENCY } from '../../utils/Constants';
import { Plus, Banknote, Trash2 } from 'lucide-react-native';
import { getBillPayments, removePaymentFromBill } from '../../db';
import RentModalSheet from './RentModalSheet';

interface PaidAmountModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
    onAddPayment: () => void;
}

export default function PaidAmountModal({ visible, onClose, bill, unit, onAddPayment }: PaidAmountModalProps) {
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        if (visible && bill?.id) loadPayments();
    }, [visible, bill?.id]);

    const loadPayments = async () => {
        const data = await getBillPayments(bill.id);
        setPayments(data);
    };

    const handleDelete = async (paymentId: number) => {
        await removePaymentFromBill(paymentId);
        await loadPayments();
    };

    const formatDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return `${date.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}, ${date.getFullYear().toString().slice(-2)}`;
    };

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = (bill?.total_amount ?? 0) - totalPaid;

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Paid Amount"
            subtitle={unit?.name}
        >
            {/* Payment List */}
            {payments.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No payments recorded yet</Text>
                </View>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <View style={styles.paymentItem}>
                            <View style={styles.paymentIcon}>
                                <Banknote size={20} color={theme.colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.paymentAmount}>
                                    {CURRENCY}{item.amount?.toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.paymentDate}>{formatDate(item.payment_date)}</Text>
                            </View>
                            <Pressable
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(item.id)}
                            >
                                <Trash2 size={16} color={theme.colors.danger} />
                            </Pressable>
                        </View>
                    )}
                />
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerLabel}>
                        Total Amt Paid: {CURRENCY}{totalPaid.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.footerBalance, balance <= 0 && { color: theme.colors.success }]}>
                        Current Balance: {CURRENCY}{Math.abs(balance).toLocaleString('en-IN')}
                    </Text>
                </View>
                <Pressable style={styles.addFab} onPress={onAddPayment}>
                    <Plus size={24} color="#FFF" />
                </Pressable>
            </View>
        </RentModalSheet>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    paymentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
        gap: theme.spacing.m,
    },
    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.successLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    paymentDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.dangerLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.m,
    },
    footerLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    footerBalance: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.danger,
        marginTop: 2,
    },
    addFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.medium,
    },
});
