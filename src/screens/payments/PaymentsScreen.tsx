import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowUpRight, ArrowDownLeft, Filter, Calendar } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { getGlobalTransactions, GlobalTransaction } from '../../db/paymentService';
import { useFocusEffect } from '@react-navigation/native';

export default function PaymentsScreen({ navigation }: any) {
    const [transactions, setTransactions] = useState<GlobalTransaction[]>([]);
    const [totalCollected, setTotalCollected] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const data = await getGlobalTransactions();
            setTransactions(data.transactions);
            setTotalCollected(data.totalCollected);
        } catch (error) {
            console.error('Failed to load global transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const formatDate = (date: Date) => {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

        if (isToday) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isYesterday) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const renderItem = ({ item }: { item: GlobalTransaction }) => (
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
                <Text style={styles.date}>{formatDate(item.date)}</Text>
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

    const currentMonthName = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="Payments"
                rightAction={
                    <Pressable style={styles.filterBtn}>
                        <Filter size={20} color={theme.colors.textPrimary} />
                    </Pressable>
                }
            />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
            ) : (
                <>
                    {/* Summary Card */}
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>TOTAL COLLECTED ({currentMonthName})</Text>
                            <Text style={styles.summaryAmount}>₹ {totalCollected.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.listHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    </View>

                    {transactions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBox}>
                                <Calendar size={32} color={theme.colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                            <Text style={styles.emptyText}>When you log rent or other payments, they will appear here.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={transactions}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        marginTop: 40,
    },
    emptyIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.m,
    },
    emptyTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    emptyText: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
