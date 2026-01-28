import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Plus, Phone, Mail, ChevronRight } from 'lucide-react-native';
import { getAllTenants, Tenant } from '../../db';
import { useFocusEffect } from '@react-navigation/native';

export default function TenantsListScreen({ navigation }: any) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadTenants = async () => {
        try {
            const data = await getAllTenants();
            setTenants(data);
        } catch (error) {
            console.error('Error loading tenants:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadTenants();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTenants();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: Tenant }) => (
        <Pressable style={styles.card} onPress={() => console.log('View Tenant', item.id)}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.contactRow}>
                    <Phone size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.contactText}>{item.phone}</Text>
                </View>
                {item.email && (
                    <View style={styles.contactRow}>
                        <Mail size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.contactText}>{item.email}</Text>
                    </View>
                )}
                <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive]}>
                    <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.cardAction}>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tenants</Text>
            </View>

            <FlatList
                data={tenants}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || ''}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.accent]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tenants yet</Text>
                        <Text style={styles.emptySubtext}>Tap + to add your first tenant</Text>
                    </View>
                }
            />

            {/* Floating Action Button */}
            <Pressable
                style={styles.fab}
                onPress={() => navigation.navigate('AddTenant')}
            >
                <Plus size={32} color="#FFFFFF" />
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        backgroundColor: theme.colors.background,
    },
    headerTitle: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    listContent: {
        padding: theme.spacing.m,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        ...theme.shadows.small
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    avatarText: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: '#FFFFFF',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    contactText: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
        marginTop: 4,
    },
    statusActive: {
        backgroundColor: theme.colors.accentLight,
    },
    statusText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    cardAction: {
        paddingLeft: theme.spacing.m,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.medium,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
    },
});
