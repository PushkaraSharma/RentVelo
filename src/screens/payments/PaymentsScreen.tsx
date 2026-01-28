import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, Filter, ArrowLeft } from 'lucide-react-native';

const TRANSACTIONS = [
    { id: '1', title: 'Rent - Room 101', date: 'Today, 10:23 AM', amount: 12500, type: 'credit', status: 'Success' },
    { id: '2', title: 'Rent - Villa A', date: 'Yesterday', amount: 45000, type: 'credit', status: 'Success' },
    { id: '3', title: 'Maintenance - Lift', date: 'Jul 12', amount: 2500, type: 'debit', status: 'Success' },
    { id: '4', title: 'Rent - Flat 4B', date: 'Jul 10', amount: 18000, type: 'credit', status: 'Pending' },
];

export default function PaymentsScreen({ navigation }: any) {
    const [filter, setFilter] = useState('All');

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'credit' ? '#DCFCE7' : '#FEE2E2' }]}>
                {item.type === 'credit' ? (
                    <ArrowDownLeft size={20} color={theme.colors.success} />
                ) : (
                    <ArrowUpRight size={20} color={theme.colors.danger} />
                )}
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.cardRight}>
                <Text style={[styles.amount, { color: item.type === 'credit' ? theme.colors.success : theme.colors.textPrimary }]}>
                    {item.type === 'credit' ? '+' : '-'} ₹{item.amount.toLocaleString()}
                </Text>
                <Text style={[styles.status, { color: item.status === 'Pending' ? theme.colors.warning : theme.colors.textSecondary }]}>
                    {item.status}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Payments</Text>
                <Pressable style={styles.filterBtn}>
                    <Filter size={20} color={theme.colors.textPrimary} />
                </Pressable>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TOTAL COLLECTED (JUL)</Text>
                    <Text style={styles.summaryAmount}>₹ 75,500</Text>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>

            <FlatList
                data={TRANSACTIONS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        paddingRight: theme.spacing.m,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    filterBtn: {
        padding: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    summaryContainer: {
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.l
    },
    summaryCard: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        ...theme.shadows.medium
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: theme.typography.bold,
        marginBottom: 8,
        letterSpacing: 1
    },
    summaryAmount: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: theme.typography.bold
    },
    listHeader: {
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s
    },
    sectionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    listContent: {
        padding: theme.spacing.m
    },
    card: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    cardBody: {
        flex: 1
    },
    title: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.medium,
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    date: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    cardRight: {
        alignItems: 'flex-end'
    },
    amount: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        marginBottom: 2
    },
    status: {
        fontSize: 10,
        fontWeight: theme.typography.medium
    },
    backButton: {
        padding: theme.spacing.s,
    },
});
