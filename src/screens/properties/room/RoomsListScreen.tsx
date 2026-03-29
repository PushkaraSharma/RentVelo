import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import {
    Plus,
    DoorOpen,
    ChevronRight,
    ChevronDown,
    BedDouble,
    Edit3,
} from 'lucide-react-native';
import Header from '../../../components/common/Header';
import { getUnitsByPropertyId, getPropertyById, getUnitsGroupedByRoom } from '../../../db';
import { useFocusEffect } from '@react-navigation/native';
import { CURRENCY } from '../../../utils/Constants';


export default function RoomsListScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;
    const [property, setProperty] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [roomGroups, setRoomGroups] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

    const isPG = property?.type === 'pg';

    const loadData = async () => {
        try {
            const propData = await getPropertyById(propertyId);
            setProperty(propData);

            if (propData?.type === 'pg') {
                const grouped = await getUnitsGroupedByRoom(propertyId);
                setRoomGroups(grouped);
            } else {
                const roomsData = await getUnitsByPropertyId(propertyId);
                setRooms(roomsData);
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [propertyId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const toggleRoom = (roomName: string) => {
        setExpandedRooms(prev => {
            const next = new Set(prev);
            if (next.has(roomName)) {
                next.delete(roomName);
            } else {
                next.add(roomName);
            }
            return next;
        });
    };

    // Regular room card (for non-PG properties)
    const renderRoom = ({ item }: { item: any }) => (
        <Pressable
            style={styles.roomCard}
            onPress={() => navigation.navigate('RoomDetails', { propertyId, unitId: item.id })}
        >
            <View style={styles.roomIcon}>
                <DoorOpen size={24} color={theme.colors.accent} />
            </View>

            <View style={styles.roomMainInfo}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomType}>{item.type || 'Standard Room'}</Text>
                <Text style={styles.roomRent}>{CURRENCY} {item.rent_amount}/mo</Text>
            </View>

            <View style={styles.roomActionSide}>
                <View style={styles.tenantStatusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: item.is_occupied ? (isDark ? '#10B98120' : theme.colors.successLight) : (isDark ? '#EF444420' : theme.colors.dangerLight), }]}>
                        <Text style={[styles.occupiedText, { color: item.is_occupied ? theme.colors.success : theme.colors.danger, }]} numberOfLines={1}>{item.is_occupied ? item.tenant_name : "No tenant"}</Text>
                    </View>
                </View>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
            </View>
        </Pressable>
    );

    // PG room group card with expandable beds
    const renderPGRoomGroup = ({ item }: { item: any }) => {
        const isExpanded = expandedRooms.has(item.roomName);

        return (
            <View style={styles.pgRoomContainer}>
                {/* Room Header */}
                <Pressable style={styles.pgRoomHeader} onPress={() => toggleRoom(item.roomName)}>
                    <View style={styles.pgRoomIcon}>
                        <DoorOpen size={22} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>{item.roomName}</Text>
                        <Text style={styles.roomType}>{item.occupiedBeds}/{item.totalBeds} beds occupied</Text>
                    </View>
                    <View style={[styles.occupancyBadge, {
                        backgroundColor: item.occupiedBeds === item.totalBeds
                            ? (isDark ? '#10B98120' : theme.colors.successLight)
                            : item.occupiedBeds > 0
                                ? (isDark ? '#F59E0B20' : theme.colors.warningLight)
                                : (isDark ? '#EF444420' : theme.colors.dangerLight)
                    }]}>
                        <Text style={[styles.occupancyText, {
                            color: item.occupiedBeds === item.totalBeds
                                ? theme.colors.success
                                : item.occupiedBeds > 0
                                    ? theme.colors.warning
                                    : theme.colors.danger
                        }]}>
                            {item.occupiedBeds === item.totalBeds ? 'Full' : `${item.totalBeds - item.occupiedBeds} vacant`}
                        </Text>
                    </View>
                    <Pressable
                        style={{ padding: 6, marginLeft: 4 }}
                        onPress={() => navigation.navigate('AddUnit', { propertyId, propertyType: 'pg', roomGroup: item.roomName })}
                        hitSlop={8}
                    >
                        <Edit3 size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                    {isExpanded ? (
                        <ChevronDown size={20} color={theme.colors.textTertiary} style={{ marginLeft: 4 }} />
                    ) : (
                        <ChevronRight size={20} color={theme.colors.textTertiary} style={{ marginLeft: 4 }} />
                    )}
                </Pressable>

                {/* Expanded Beds */}
                {isExpanded && (
                    <View style={styles.bedsContainer}>
                        {item.beds.map((bed: any, index: number) => (
                            <Pressable
                                key={bed.id}
                                style={[styles.bedCard, index === item.beds.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={() => navigation.navigate('RoomDetails', { propertyId, unitId: bed.id })}
                            >
                                <View style={styles.bedIcon}>
                                    <BedDouble size={16} color={theme.colors.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bedName}>{bed.bed_number || bed.name}</Text>
                                    <Text style={styles.bedRent}>{CURRENCY} {bed.rent_amount}/mo</Text>
                                </View>
                                <View style={[styles.statusBadge, {
                                    backgroundColor: bed.is_occupied
                                        ? (isDark ? '#10B98120' : theme.colors.successLight)
                                        : (isDark ? '#EF444420' : theme.colors.dangerLight),
                                }]}>
                                    <Text style={[styles.occupiedText, {
                                        color: bed.is_occupied ? theme.colors.success : theme.colors.danger,
                                    }]} numberOfLines={1}>
                                        {bed.is_occupied ? bed.tenant_name : 'Vacant'}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={theme.colors.textTertiary} style={{ marginLeft: 4 }} />
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const handleAdd = () => {
        navigation.navigate('AddUnit', { propertyId, propertyType: property?.type });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title={isPG ? 'Rooms & Beds' : 'Rooms'} subTitle={property?.name} />
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                {isPG ? (
                    <FlatList
                        data={roomGroups}
                        renderItem={renderPGRoomGroup}
                        keyExtractor={item => item.roomName}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.accent]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <BedDouble size={64} color={theme.colors.textTertiary} />
                                <Text style={styles.emptyText}>No rooms added yet</Text>
                                <Pressable style={styles.emptyAddBtn} onPress={handleAdd}>
                                    <Text style={styles.emptyAddBtnText}>Add First Room</Text>
                                </Pressable>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={rooms}
                        renderItem={renderRoom}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.accent]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <DoorOpen size={64} color={theme.colors.textTertiary} />
                                <Text style={styles.emptyText}>No rooms added yet</Text>
                                <Pressable style={styles.emptyAddBtn} onPress={handleAdd}>
                                    <Text style={styles.emptyAddBtnText}>Add First Room</Text>
                                </Pressable>
                            </View>
                        }
                    />
                )}
                <Pressable style={styles.fab} onPress={handleAdd}>
                    <Plus size={32} color="#FFFFFF" />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    listContent: {
        padding: theme.spacing.m,
    },
    roomCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    roomIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    roomMainInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    roomType: {
        fontSize: theme.typography.xs,
        color: theme.colors.textSecondary,
        marginVertical: 2,
    },
    roomRent: {
        fontSize: theme.typography.s,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    roomActionSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
    },
    tenantStatusContainer: {
        alignItems: 'flex-end',
        maxWidth: 120,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    occupiedText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
    },
    // PG-specific styles
    pgRoomContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    pgRoomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    pgRoomIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    occupancyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    occupancyText: {
        fontSize: 11,
        fontWeight: theme.typography.bold,
    },
    bedsContainer: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
    },
    bedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.s,
    },
    bedIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bedName: {
        fontSize: theme.typography.s,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    bedRent: {
        fontSize: theme.typography.xs,
        color: theme.colors.accent,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    emptyAddBtn: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
    },
    emptyAddBtnText: {
        color: '#FFF',
        fontWeight: theme.typography.bold,
        fontSize: theme.typography.m,
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
});
