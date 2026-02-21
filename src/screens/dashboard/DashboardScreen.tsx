import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, SafeAreaView } from 'react-native';
import { theme } from '../../theme';
import { Settings, Bell } from 'lucide-react-native';
import FinancialSummary from '../../components/dashboard/FinancialSummary';
import PendingAlert from '../../components/dashboard/PendingAlert';
import ActionList from '../../components/dashboard/ActionList';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { getFinancialSummary } from '../../db';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen({ navigation }: any) {
    const user = useSelector((state: RootState) => state.auth.user);
    const [financialData, setFinancialData] = useState({ expected: 0, collected: 0 });

    const loadDashboardData = async () => {
        try {
            const summary = await getFinancialSummary();
            setFinancialData(summary);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    // Mock Data for now (will be replaced with real data later)
    const pendingData = {
        amount: financialData.expected - financialData.collected,
        tenantCount: 0 // Will be calculated from database
    };

    const actionItems: Array<{ id: string; name: string; room: string; daysOverdue: number }> = [
        // Will be populated from database
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={styles.greeting}>WELCOME BACK</Text>
                            <Text style={styles.username}>{user?.name || 'Command Center'}</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <Pressable style={styles.iconBtn}>
                            <Bell size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>
                </View>

                <FinancialSummary
                    expected={financialData.expected}
                    collected={financialData.collected}
                    onPress={() => (navigation as any).navigate('Payments')}
                />

                {/* Pending Alert */}
                <PendingAlert
                    amount={pendingData.amount}
                    tenantCount={pendingData.tenantCount}
                    onSendReminders={() => console.log('Send Reminders')}
                />

                {/* Action Required */}
                <ActionList
                    items={actionItems}
                    onCollect={(id) => console.log('Collect', id)}
                />

                {/* Occupancy Insight (Simplified for now) */}
                <View style={styles.occupancyCard}>
                    <Text style={styles.sectionTitle}>Occupancy Insight</Text>
                    <View style={styles.occupancyRow}>
                        {/* Circle Chart Placeholder */}
                        <View style={styles.chartPlaceholder}>
                            <Text style={styles.chartText}>80%</Text>
                            <Text style={styles.chartSubtext}>FULL</Text>
                        </View>

                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
                                <View>
                                    <Text style={styles.legendLabel}>OCCUPIED</Text>
                                    <Text style={styles.legendValue}>40 Rooms</Text>
                                </View>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: theme.colors.border }]} />
                                <View>
                                    <Text style={styles.legendLabel}>VACANT</Text>
                                    <Text style={styles.legendValue}>10 Rooms</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.s
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.s,
        borderWidth: 2,
        borderColor: theme.colors.surface
    },
    avatarText: {
        color: theme.colors.primaryForeground,
        fontWeight: 'bold',
        fontSize: theme.typography.m
    },
    greeting: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    username: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    headerActions: {
        flexDirection: 'row'
    },
    iconBtn: {
        marginLeft: theme.spacing.l
    },
    occupancyCard: {
        marginBottom: theme.spacing.xl
    },
    sectionTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m
    },
    occupancyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        ...theme.shadows.small
    },
    chartPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 8,
        borderColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.xl
    },
    chartText: {
        fontSize: theme.typography.xl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    chartSubtext: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary
    },
    legend: {
        flex: 1,
        justifyContent: 'space-around',
        height: 100
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: theme.spacing.m
    },
    legendLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2
    },
    legendValue: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    }
});
