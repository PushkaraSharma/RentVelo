import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { theme } from '../../theme';
import { CURRENCY } from '../../utils/Constants';
import { Trash2, Zap } from 'lucide-react-native';
import { getBillExpenses, removeExpense } from '../../db';
import RentModalSheet from './RentModalSheet';

interface ExpenseListModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
}

export default function ExpenseListModal({ visible, onClose, bill, unit }: ExpenseListModalProps) {
    const [expenses, setExpenses] = useState<any[]>([]);

    useEffect(() => {
        if (visible && bill?.id) loadExpenses();
    }, [visible, bill?.id]);

    const loadExpenses = async () => {
        const data = await getBillExpenses(bill.id);
        setExpenses(data);
    };

    const handleDelete = async (expenseId: number) => {
        await removeExpense(expenseId);
        await loadExpenses();
    };

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Expenses"
            subtitle={unit?.name}
        >
            {/* Expense List */}
            {expenses.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No expenses added</Text>
                </View>
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <View style={[styles.expenseItem, item.amount < 0 && styles.discountItem]}>
                            <View style={styles.expenseLeft}>
                                <View style={[styles.expenseIcon, item.amount < 0 && styles.discountIcon]}>
                                    <Zap size={18} color={item.amount < 0 ? theme.colors.danger : theme.colors.accent} />
                                </View>
                                <View>
                                    <Text style={styles.expenseLabel}>{item.label}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.badge, item.is_recurring ? styles.recurBadge : styles.oneTimeBadge]}>
                                            <Text style={[styles.badgeText, item.is_recurring ? styles.recurBadgeText : styles.oneTimeBadgeText]}>
                                                {item.is_recurring ? 'Monthly' : 'One Time'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.expenseRight}>
                                <Text style={[styles.expenseAmount, item.amount < 0 && { color: theme.colors.danger }]}>
                                    {item.amount < 0 ? '−' : ''}{CURRENCY}{Math.abs(item.amount).toLocaleString('en-IN')}
                                </Text>
                                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                    <Trash2 size={18} color={theme.colors.danger} />
                                </Pressable>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerLabel}>Total Exp Added</Text>
                <Text style={styles.footerAmount}>{CURRENCY}{total.toLocaleString('en-IN')}</Text>
            </View>
        </RentModalSheet>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    discountItem: {
        backgroundColor: theme.colors.surface,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    expenseIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountIcon: {
        backgroundColor: theme.colors.dangerLight,
    },
    expenseLabel: {
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    badgeRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    recurBadge: {
        backgroundColor: theme.colors.accentLight,
    },
    oneTimeBadge: {
        backgroundColor: theme.colors.warningLight,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
    },
    recurBadgeText: {
        color: theme.colors.accent,
    },
    oneTimeBadgeText: {
        color: theme.colors.warning,
    },
    expenseRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    expenseAmount: {
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    deleteBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
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
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    footerAmount: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
});
