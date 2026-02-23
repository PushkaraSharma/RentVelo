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
import { useAppTheme } from '../../../theme/ThemeContext';
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
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import { getPropertyById, getUnitsByPropertyId, getActiveTenantByPropertyId, deleteProperty } from '../../../db';

const { width } = Dimensions.get('window');

export default function PropertyOperationsScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;
    const [property, setProperty] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [activeTenant, setActiveTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

            // Auto-repair legacy single-unit properties
            let finalUnits = unitsData;
            if (propData && propData.is_multi_unit === false && unitsData.length === 0) {
                const { createUnit, updateTenant } = await import('../../../db');
                const unitData = {
                    property_id: propertyId,
                    name: 'Main Property',
                    rent_amount: 0,
                    rent_cycle: 'monthly',
                };
                const newUnitId = await createUnit(unitData as any);
                finalUnits = [...unitsData, { id: newUnitId, ...unitData }];

                if (tenantData && !tenantData.unit_id) {
                    await updateTenant(tenantData.id, { unit_id: newUnitId });
                }
            }

            setProperty(propData);
            setUnits(finalUnits);
            setActiveTenant(tenantData);
        } catch (error) {
            console.error('Error loading property data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteProperty(propertyId);
            setShowDeleteModal(false);
            navigation.goBack();
            Alert.alert('Success', 'Property deleted successfully');
        } catch (error) {
            console.error('Error deleting property:', error);
            Alert.alert('Error', 'Failed to delete property. Make sure it has no active rooms/tenants.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return null;

    const opButtons = [
        {
            id: 'rent',
            label: 'Take Rent',
            icon: Wallet,
            color: theme.colors.success,
            bg: isDark ? '#10B98120' : '#ECFDF5',
            onPress: () => navigation.navigate('TakeRent', { propertyId })
        },
        {
            id: 'rooms',
            label: property?.is_multi_unit ? 'Rooms' : 'Tenant',
            icon: property?.is_multi_unit ? DoorOpen : Users,
            color: theme.colors.accent,
            bg: isDark ? '#6366F120' : '#EEF2FF',
            onPress: () => {
                if (property?.is_multi_unit) {
                    navigation.navigate('RoomsList', { propertyId });
                } else {
                    if (units.length > 0) {
                        navigation.navigate('RoomDetails', { propertyId, unitId: units[0].id, initialTab: 'tenants' });
                    } else {
                        // Fallback just in case
                        navigation.navigate('AddTenant', { propertyId });
                    }
                }
            }
        },
        {
            id: 'settings',
            label: 'Update Property',
            icon: Settings,
            color: theme.colors.textSecondary,
            bg: isDark ? '#6B728020' : '#F3F4F6',
            onPress: () => navigation.navigate('AddProperty', { propertyId })
        },
        {
            id: 'receipt',
            label: 'Rent Receipt',
            icon: Receipt,
            color: '#8B5CF6',
            bg: isDark ? '#8B5CF620' : '#F3E8FF',
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
                    <Pressable onPress={() => setShowDeleteModal(true)} style={styles.deleteBtn}>
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
                    { backgroundColor: occupiedCount === 0 ? (isDark ? '#EF444420' : '#FEF2F2') : (property?.is_multi_unit && occupiedCount < units.length) ? (isDark ? '#F59E0B20' : '#FFFBEB') : (isDark ? '#10B98120' : '#ECFDF5') }
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

            <ConfirmationModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Property"
                message={`Are you sure you want to delete ${property?.name}? This will delete all rooms and data associated with it. This action cannot be undone.`}
                loading={isDeleting}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
        backgroundColor: theme.colors.surface,
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
        borderColor: theme.colors.border
    },
    statusText: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
    },
    mainCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
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
        backgroundColor: theme.colors.surface,
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
