import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Plus, MapPin, Home, Building, Building2, ChevronRight, Store, Layers } from 'lucide-react-native';
import { getPropertiesWithStats, Property } from '../../db';
import { useFocusEffect } from '@react-navigation/native';

const getTypeIcon = (type: string, size: number = 15) => {
    switch (type) {
        case 'house': return <Home size={size} color={theme.colors.accent} />;
        case 'building': return <Building size={size} color={theme.colors.accent} />;
        case 'pg': return <Building2 size={size} color={theme.colors.accent} />;
        case 'shop': return <Store size={size} color={theme.colors.accent} />;
        case 'flat': return <Layers size={size} color={theme.colors.accent} />;
        default: return <Home size={size} color={theme.colors.accent} />;
    }
}

export default function PlacesListScreen({ navigation }: any) {
    const [properties, setProperties] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadProperties = async () => {
        try {
            const data = await getPropertiesWithStats();
            setProperties(data);
        } catch (error) {
            console.error('Error loading properties:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadProperties();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProperties();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: any }) => {
        // Calculate status color
        let statusColor = theme.colors.accent;
        let statusBg = theme.colors.accentLight;

        if (item.is_multi_unit) {
            if (item.occupiedCount === 0) {
                statusColor = theme.colors.danger;
                statusBg = '#FEF2F2';
            } else if (item.occupiedCount < item.totalRooms) {
                statusColor = theme.colors.warning;
                statusBg = '#FFFBEB';
            } else {
                statusColor = theme.colors.success;
                statusBg = '#ECFDF5';
            }
        } else {
            if (item.occupiedCount > 0) {
                statusColor = theme.colors.success;
                statusBg = '#ECFDF5';
            } else {
                statusColor = theme.colors.danger;
                statusBg = '#FEF2F2';
            }
        }

        return (
            <Pressable style={styles.card} onPress={() => navigation.navigate('PropertyOperations', { propertyId: item.id })}>
                {item.image_uri ? (
                    <Image source={{ uri: item.image_uri }} style={styles.cardImage} />
                ) : (
                    <View style={[styles.cardImage, styles.placeholderImage]}>
                        {getTypeIcon(item.type, 25)}
                    </View>
                )}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.typeBadge}>
                            {getTypeIcon(item.type)}
                            <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.locationRow}>
                        <MapPin size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                    </View>
                    <View style={[styles.statsRowCard, { backgroundColor: statusBg }]}>
                        <Text style={[styles.unitsText, { color: statusColor }]}>
                            {item.is_multi_unit
                                ? `${item.occupiedCount}/${item.totalRooms} Rooms Occupied`
                                : (item.occupiedCount > 0 ? 'Occupied' : 'Vacant')}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardAction}>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Properties</Text>
            </View>

            <FlatList
                data={properties}
                renderItem={renderItem}
                keyExtractor={item => item.id?.toString() || ''}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.accent]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No properties yet</Text>
                        <Text style={styles.emptySubtext}>Tap + to add your first property</Text>
                    </View>
                }
            />

            {/* Floating Action Button */}
            <Pressable
                style={styles.fab}
                onPress={() => navigation.navigate('AddProperty')}
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
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.small
    },
    cardImage: {
        width: 100,
        height: 100,
    },
    placeholderImage: {
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        padding: theme.spacing.m,
        justifyContent: 'center'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    cardTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 8
    },
    typeBadge: {
        flexDirection: 'row',
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        gap: 4
    },
    typeText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    cardAddress: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginLeft: 4
    },
    unitsText: {
        fontSize: 12,
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
    },
    statsRowCard: {
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start'
    },
    cardAction: {
        paddingRight: theme.spacing.m
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
