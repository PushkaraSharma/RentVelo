import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../../components/common/Button';
import {
    Wallet,
    DoorOpen,
    Bell,
    Settings,
    ChevronRight,
    TrendingUp,
    Users,
    UserPlus,
    Plus,
    FileText,
    MapPin,
    Trash2,
    Receipt
} from 'lucide-react-native';
import Header from '../../../components/common/Header';
import { getPropertyById, getUnitsByPropertyId, getActiveTenantByPropertyId, deleteProperty } from '../../../db';

const { width } = Dimensions.get('window');

export default function PropertyOperationsScreen({ navigation, route }: any) {
    const propertyId = route?.params?.propertyId;
    const [property, setProperty] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [activeTenant, setActiveTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [propertyId])
    );

    const loadData = async () => {
        try {
            const [propData, unitsData, tenantData] = await Promise.all([
                getPropertyById(propertyId),
                getUnitsByPropertyId(propertyId),
                getActiveTenantByPropertyId(propertyId)
            ]);
            setProperty(propData);
            setUnits(unitsData);
            setActiveTenant(tenantData);
        } catch (error) {
            console.error('Error loading property data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Property',
            'Are you sure you want to delete this property?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteProperty(propertyId);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    if (loading) return null;

    const opButtons = [
        {
            id: 'rent',
            label: 'Take Rent',
            icon: Wallet,
            color: '#10B981',
            bg: '#ECFDF5',
            onPress: () => navigation.navigate('TakeRent', { propertyId })
        },
        {
            id: 'rooms',
            label: property?.is_multi_unit ? 'Rooms' : 'Tenant',
            icon: property?.is_multi_unit ? DoorOpen : Users,
            color: '#6366F1',
            bg: '#EEF2FF',
            onPress: () => {
                if (property?.is_multi_unit) {
                    navigation.navigate('RoomsList', { propertyId });
                } else if (activeTenant) {
                    navigation.navigate('AddTenant', { tenantId: activeTenant.id, propertyId });
                } else {
                    navigation.navigate('AddTenant', { propertyId });
                }
            }
        },
        {
            id: 'notifs',
            label: 'Notifications',
            icon: Bell,
            color: '#F59E0B',
            bg: '#FFFBEB',
            onPress: () => Alert.alert('Coming Soon', 'Automated rent reminders are being prepared!')
        },
        {
            id: 'settings',
            label: 'Update Property',
            icon: Settings,
            color: '#6B7280',
            bg: '#F3F4F6',
            onPress: () => navigation.navigate('AddProperty', { propertyId })
        },
        {
            id: 'receipt',
            label: 'Rent Receipt',
            icon: Receipt,
            color: '#8B5CF6',
            bg: '#F3E8FF',
            onPress: () => navigation.navigate('RentReceiptConfig', { propertyId })
        }
    ];

    const occupiedCount = property?.is_multi_unit
        ? units.filter(u => u.is_occupied).length
        : (activeTenant ? 1 : 0);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Header
                title="Manage Property"
                rightAction={
                    <Pressable onPress={handleDelete} style={styles.deleteBtn}>
                        <Trash2 size={24} color={theme.colors.danger} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroCard}>
                    {property?.image_uri ? (
                        <Image source={{ uri: property.image_uri }} style={styles.heroImg} />
                    ) : (
                        <View style={[styles.heroImg, styles.placeholderHero]}>
                            <FileText size={48} color={theme.colors.accent} />
                        </View>
                    )}
                    <View style={styles.heroOverlay}>
                        <Text style={styles.propName}>{property?.name}</Text>
                        <View style={styles.locationRow}>
                            <MapPin size={14} color="#FFF" />
                            <Text style={styles.propAddress} numberOfLines={1}>{property?.address}</Text>
                        </View>
                    </View>
                </View>

                {/* Status Summary Banner */}
                <View style={[
                    styles.statusBanner,
                    { backgroundColor: occupiedCount === 0 ? '#FEF2F2' : (property?.is_multi_unit && occupiedCount < units.length) ? '#FFFBEB' : '#ECFDF5' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: occupiedCount === 0 ? theme.colors.danger : (property?.is_multi_unit && occupiedCount < units.length) ? theme.colors.warning : theme.colors.success }
                    ]}>
                        {property?.is_multi_unit
                            ? `${occupiedCount} out of ${units.length} rooms are occupied`
                            : (activeTenant ? 'Currently Occupied' : 'Currently Vacant')}
                    </Text>
                </View>

                {/* Operations Grid */}
                <Text style={styles.sectionTitle}>Operations</Text>
                <View style={styles.opsGrid}>
                    {opButtons.map((btn) => (
                        <Pressable key={btn.id} style={styles.opItem} onPress={btn.onPress}>
                            <View style={[styles.opIcon, { backgroundColor: btn.bg }]}>
                                <btn.icon size={28} color={btn.color} />
                            </View>
                            <Text style={styles.opLabel}>{btn.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Dynamic Content: Tenant or Room Summary
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {property?.is_multi_unit ? 'Room Management' : 'Tenant Details'}
                    </Text>
                </View>

                {!property?.is_multi_unit ? (
                    activeTenant ? (
                        <Pressable style={styles.mainCard}>
                            <View style={styles.avatar}>
                                <Users size={24} color={theme.colors.accent} />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardInfoTitle}>{activeTenant.name}</Text>
                                <Text style={styles.cardInfoSub}>{activeTenant.phone}</Text>
                            </View>
                            <ChevronRight size={20} color={theme.colors.textTertiary} />
                        </Pressable>
                    ) : (
                        <Pressable
                            style={styles.emptyActionCard}
                            onPress={() => navigation.navigate('AddTenant', { propertyId })}
                        >
                            <UserPlus size={32} color={theme.colors.accent} />
                            <Text style={styles.emptyActionTitle}>Register Tenant</Text>
                            <Text style={styles.emptyActionSub}>This house/shop is currently vacant</Text>
                        </Pressable>
                    )
                ) : (
                    <Pressable
                        style={styles.mainCard}
                        onPress={() => navigation.navigate('RoomsList', { propertyId })}
                    >
                        <DoorOpen size={24} color={theme.colors.accent} />
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardInfoTitle}>View All Rooms</Text>
                            <Text style={styles.cardInfoSub}>{units.length} rooms registered in this building</Text>
                        </View>
                        <ChevronRight size={20} color={theme.colors.textTertiary} />
                    </Pressable>
                )} */}

                {/* <View style={{ height: 40 }} /> */}
            </ScrollView>
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
        paddingRight: theme.spacing.s,
    },
    backButton: {
        padding: theme.spacing.s,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    deleteBtn: {
        padding: theme.spacing.s
    },
    content: {
        padding: theme.spacing.m,
    },
    heroCard: {
        height: 180,
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        marginBottom: theme.spacing.l,
        position: 'relative',
        ...theme.shadows.medium
    },
    heroImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    placeholderHero: {
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.m,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    propName: {
        fontSize: theme.typography.xl,
        fontWeight: theme.typography.bold,
        color: '#FFF',
        marginBottom: 4
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    propAddress: {
        fontSize: theme.typography.s,
        color: '#E5E7EB',
        marginLeft: 4,
        flex: 1
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        marginTop: theme.spacing.m
    },
    sectionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m
    },
    opsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m
    },
    opItem: {
        width: (width - (theme.spacing.m * 3)) / 2,
        backgroundColor: '#FFF',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small
    },
    opIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    opLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    addBtn: {
        width: 200
    },
    statusBanner: {
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    statusText: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
    },
    mainCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    cardInfo: {
        flex: 1
    },
    cardInfoTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    cardInfoSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2
    },
    emptyActionCard: {
        backgroundColor: '#FFF',
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderStyle: 'dashed',
    },
    emptyActionTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        marginTop: theme.spacing.m
    },
    emptyActionSub: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4
    }
});
