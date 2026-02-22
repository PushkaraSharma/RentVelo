import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Bell } from 'lucide-react-native';
import FinancialSummary from '../../components/dashboard/FinancialSummary';
import PendingAlert from '../../components/dashboard/PendingAlert';
import CollectionTrends from '../../components/dashboard/CollectionTrends';
import PropertyPickerModal from '../../components/dashboard/PropertyPickerModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { getDashboardData, DashboardData, getUnreadNotificationCount } from '../../db';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const user = useSelector((state: RootState) => state.auth.user);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPropertyPicker, setShowPropertyPicker] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadDashboardData = async () => {
        try {
            const [result, unreadCnt] = await Promise.all([
                getDashboardData(),
                getUnreadNotificationCount()
            ]);
            setData(result);
            setUnreadCount(unreadCnt);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    const occupancyPercent = data && data.totalRooms > 0
        ? Math.round((data.occupiedCount / data.totalRooms) * 100) : 0;

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
                        <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('NotificationsCenter')}>
                            <Bell size={24} color={theme.colors.textPrimary} />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                {loading || !data ? (
                    <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 60 }} />
                ) : (
                    <>
                        <FinancialSummary
                            expected={data.expected}
                            collected={data.collected}
                            onPress={() => (navigation as any).navigate('Payments')}
                        />

                        {/* Pending Alert */}
                        <PendingAlert
                            amount={data.pending}
                            tenantCount={data.pendingTenantCount}
                            onSendReminders={() => setShowPropertyPicker(true)}
                        />

                        {/* Collection Trends */}
                        <CollectionTrends trends={data.trends} />

                        {/* Occupancy Insight */}
                        <View style={styles.occupancyCard}>
                            <Text style={styles.sectionTitle}>Occupancy Insight</Text>
                            <View style={styles.occupancyRow}>
                                <View style={[
                                    styles.chartPlaceholder,
                                    { borderColor: occupancyPercent > 70 ? theme.colors.accent : theme.colors.warning }
                                ]}>
                                    <Text style={styles.chartText}>{occupancyPercent}%</Text>
                                    <Text style={styles.chartSubtext}>FULL</Text>
                                </View>

                                <View style={styles.legend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
                                        <View>
                                            <Text style={styles.legendLabel}>OCCUPIED</Text>
                                            <Text style={styles.legendValue}>{data.occupiedCount} Rooms</Text>
                                        </View>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: theme.colors.border }]} />
                                        <View>
                                            <Text style={styles.legendLabel}>VACANT</Text>
                                            <Text style={styles.legendValue}>{data.vacantCount} Rooms</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Property Picker Modal */}
            <PropertyPickerModal
                visible={showPropertyPicker}
                onClose={() => setShowPropertyPicker(false)}
                properties={data?.pendingProperties ?? []}
                onSelect={(propertyId) => {
                    navigation.navigate('TakeRent', { propertyId });
                }}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
        marginLeft: theme.spacing.l,
        position: 'relative'
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: theme.colors.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    occupancyCard: {
        marginBottom: theme.spacing.xl
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m
    },
    occupancyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small
    },
    chartPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 8,
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
