import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import {
    ArrowLeft,
    Plus,
    DoorOpen,
    UserPlus,
    ChevronRight,
    Edit3
} from 'lucide-react-native';
import { getUnitsByPropertyId, getPropertyById } from '../../db';
import { useFocusEffect } from '@react-navigation/native';

export default function RoomsListScreen({ navigation, route }: any) {
    const propertyId = route?.params?.propertyId;
    const [property, setProperty] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [propData, roomsData] = await Promise.all([
                getPropertyById(propertyId),
                getUnitsByPropertyId(propertyId)
            ]);
            setProperty(propData);
            setRooms(roomsData);
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

    const renderRoom = ({ item }: { item: any }) => (
        <Pressable
            style={styles.roomCard}
            onPress={() => navigation.navigate('AddUnit', { propertyId, unitId: item.id })}
        >
            <View style={styles.roomIcon}>
                <DoorOpen size={24} color={theme.colors.accent} />
            </View>

            <View style={styles.roomMainInfo}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomType}>{item.type || 'Standard Room'}</Text>
                <Text style={styles.roomRent}>₹ {item.rent_amount}/mo</Text>
            </View>

            <View style={styles.roomActionSide}>
                {item.is_occupied ? (
                    <View style={[styles.statusBadge, styles.occupiedBadge]}>
                        <Text style={styles.occupiedText}>Occupied</Text>
                    </View>
                ) : (
                    <Pressable
                        style={styles.assignBtn}
                        onPress={() => navigation.navigate('AddTenant', { propertyId, unitId: item.id })}
                    >
                        <UserPlus size={16} color="#FFF" />
                        <Text style={styles.assignBtnText}>Assign</Text>
                    </Pressable>
                )}
                <ChevronRight size={20} color={theme.colors.textTertiary} />
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Rooms</Text>
                    <Text style={styles.headerSubtitle}>{property?.name}</Text>
                </View>
                <Pressable
                    onPress={() => navigation.navigate('AddUnit', { propertyId })}
                    style={styles.addButton}
                >
                    <Plus size={24} color={theme.colors.accent} />
                </Pressable>
            </View>

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
                        <Pressable
                            style={styles.emptyAddBtn}
                            onPress={() => navigation.navigate('AddUnit', { propertyId })}
                        >
                            <Text style={styles.emptyAddBtnText}>Add First Room</Text>
                        </Pressable>
                    </View>
                }
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
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: theme.spacing.s,
        marginRight: theme.spacing.s,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: theme.typography.xs,
        color: theme.colors.textSecondary,
    },
    addButton: {
        padding: theme.spacing.s,
    },
    listContent: {
        padding: theme.spacing.m,
    },
    roomCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
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
    assignBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    assignBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: theme.typography.bold,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    occupiedBadge: {
        backgroundColor: '#ECFDF5',
    },
    occupiedText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: theme.typography.bold,
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
});
