import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Alert,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import {
    Edit3,
    User,
    Calendar,
    Phone,
    UserPlus,
    LogOut,
    MoveRight,
    Camera,
    Info,
    ChevronRight,
    Trash2,
    Check,
    X,
    FileText
} from 'lucide-react-native';
import Header from '../../../components/common/Header';
import {
    getUnitById,
    getPropertyById,
    getTenantsByUnitId,
    updateTenant,
    getAllProperties,
    getUnitsByPropertyId,
    deleteUnit
} from '../../../db';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import DateTimePicker from '@react-native-community/datetimepicker';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import RemoveTenantModal from '../../../components/modals/RemoveTenantModal';
import MoveTenantModal from '../../../components/modals/MoveTenantModal';
import RentLedgerModal from '../../../components/modals/RentLedgerModal';
import ConfirmationModal from '../../../components/common/ConfirmationModal';

export default function RoomDetailsScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const { propertyId, unitId, initialTab } = route.params;
    const [property, setProperty] = useState<any>(null);
    const [unit, setUnit] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'tenants'>(initialTab || 'info');
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);

    // Form states
    const [moveOutDate, setMoveOutDate] = useState(new Date());
    const [refundAmount, setRefundAmount] = useState('');

    // Move Tenant Form
    const [targetPropertyId, setTargetPropertyId] = useState<number | null>(null);
    const [targetUnitId, setTargetUnitId] = useState<number | null>(null);
    const [availableProperties, setAvailableProperties] = useState<any[]>([]);
    const [availableUnits, setAvailableUnits] = useState<any[]>([]);
    const [showPropertyPicker, setShowPropertyPicker] = useState(false);
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        try {
            const [propData, unitData, tenantsData] = await Promise.all([
                getPropertyById(propertyId),
                getUnitById(unitId),
                getTenantsByUnitId(unitId)
            ]);
            setProperty(propData);
            setUnit(unitData);
            setTenants(tenantsData);
        } catch (error) {
            console.error('Error loading room details:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [propertyId, unitId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const currentTenant = tenants.find(t => t.status === 'active');
    const pastTenants = tenants.filter(t => t.status !== 'active');

    const handleRemoveTenant = async () => {
        if (!selectedTenant) return;
        try {
            await updateTenant(selectedTenant.id, {
                status: 'inactive',
                move_out_date: moveOutDate,
                // In a real app, record the refund in payments/transaction log
            });
            setShowRemoveModal(false);
            loadData();
            Alert.alert('Success', 'Tenant moved out successfully.');
        } catch (error) {
            console.error('Error removing tenant:', error);
        }
    };

    const handleMoveTenant = async () => {
        if (!selectedTenant || !targetUnitId || !targetPropertyId) {
            Alert.alert('Error', 'Please select a destination room');
            return;
        }

        try {
            const { createTenant } = await import('../../../db');

            // 1. Mark current record as inactive (history)
            await updateTenant(selectedTenant.id, {
                status: 'inactive',
                move_out_date: moveOutDate,
                updated_at: new Date()
            });

            // 2. Check if target room is occupied
            const targetTenants = await getTenantsByUnitId(targetUnitId);
            const targetActiveTenant = targetTenants.find(t => t.status === 'active');

            if (targetActiveTenant) {
                // If target room occupied, move that tenant to this room (Swap)
                // First, mark target tenant as inactive in their room
                await updateTenant(targetActiveTenant.id, {
                    status: 'inactive',
                    move_out_date: moveOutDate,
                    updated_at: new Date()
                });

                // Then create new record for target tenant in CURRENT room
                await createTenant({
                    ...targetActiveTenant,
                    id: undefined, // Let db handle it
                    unit_id: unitId,
                    property_id: propertyId,
                    move_in_date: moveOutDate,
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date()
                } as any);
            }

            // 3. Create new record for selected tenant in TARGET room
            await createTenant({
                ...selectedTenant,
                id: undefined,
                unit_id: targetUnitId,
                property_id: targetPropertyId,
                move_in_date: moveOutDate,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            } as any);

            setShowMoveModal(false);
            navigation.goBack();
            Alert.alert('Success', 'Tenant moved successfully and history preserved.');
        } catch (error) {
            console.error('Error moving tenant:', error);
            Alert.alert('Error', 'Failed to move tenant');
        }
    };

    const loadPropertiesForMove = async () => {
        const props = await getAllProperties();
        setAvailableProperties(props);
        setTargetPropertyId(propertyId); // Default to current property
    };

    useEffect(() => {
        if (targetPropertyId) {
            getUnitsByPropertyId(targetPropertyId).then(units => {
                // Filter out current unit
                setAvailableUnits(units.filter(u => u.id !== unitId));
            });
        }
    }, [targetPropertyId]);

    const handleDeleteRoom = async () => {
        setIsDeleting(true);
        try {
            await deleteUnit(unitId);
            setShowDeleteModal(false);
            navigation.goBack();
            Alert.alert('Success', 'Room deleted successfully');
        } catch (error) {
            console.error('Error deleting room:', error);
            Alert.alert('Error', 'Failed to delete room. Make sure it has no active tenants.');
        } finally {
            setIsDeleting(false);
        }
    };

    const renderTenantCard = (tenant: any, isActive: boolean) => (
        <Pressable
            key={tenant.id}
            style={[styles.tenantCard, !isActive && styles.pastTenantCard]}
            onPress={() => {
                // Navigate to profile for both active and past tenants
                navigation.navigate('AddTenant', { tenantId: tenant.id, propertyId, unitId });
            }}
        >
            <View style={styles.tenantPhotoContainer}>
                {tenant.photo_uri ? (
                    <Image source={{ uri: tenant.photo_uri }} style={styles.tenantPhoto} />
                ) : (
                    <View style={styles.tenantPhotoPlaceholder}>
                        <User size={24} color={theme.colors.textTertiary} />
                    </View>
                )}
            </View>

            <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{tenant.name}</Text>
                <View style={styles.dateRow}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                        {new Date(tenant.move_in_date).toLocaleDateString()}
                        {tenant.move_out_date ? ` - ${new Date(tenant.move_out_date).toLocaleDateString()}` : ' - Present'}
                    </Text>
                </View>
                {isActive && (
                    <View style={styles.activeActions}>
                        <Pressable
                            style={[styles.actionChip, { backgroundColor: isDark ? '#EF444420' : '#FEE2E2' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                setSelectedTenant(tenant);
                                setRefundAmount(tenant.security_deposit?.toString() || '0');
                                setShowRemoveModal(true);
                            }}
                        >
                            <LogOut size={14} color="#EF4444" />
                            <Text style={[styles.actionChipText, { color: '#EF4444' }]}>Remove</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionChip, { backgroundColor: isDark ? '#0284C720' : '#E0F2FE' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                setSelectedTenant(tenant);
                                loadPropertiesForMove();
                                setShowMoveModal(true);
                            }}
                        >
                            <MoveRight size={14} color="#0284C7" />
                            <Text style={[styles.actionChipText, { color: '#0284C7' }]}>Move</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionChip, { backgroundColor: isDark ? '#7C3AED20' : '#F3E8FF' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                setShowLedgerModal(true);
                            }}
                        >
                            <FileText size={14} color="#7C3AED" />
                            <Text style={[styles.actionChipText, { color: '#7C3AED' }]}>Ledger</Text>
                        </Pressable>
                    </View>
                )}
            </View>
            <ChevronRight size={20} color={theme.colors.textTertiary} />
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <Header
                title={unit?.name || 'Room Details'}
                subTitle={property?.name}
                rightAction={
                    property?.is_multi_unit !== false ? (
                        <Pressable onPress={() => setShowDeleteModal(true)} style={{ padding: 4 }}>
                            <Trash2 size={24} color={theme.colors.danger} />
                        </Pressable>
                    ) : null
                }
            />

            {/* Tabs */}
            {property?.is_multi_unit !== false && (
                <View style={styles.tabContainer}>
                    <Pressable
                        style={[styles.tab, activeTab === 'info' && styles.activeTab]}
                        onPress={() => setActiveTab('info')}
                    >
                        <Info size={20} color={activeTab === 'info' ? theme.colors.accent : theme.colors.textTertiary} />
                        <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Room Info</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === 'tenants' && styles.activeTab]}
                        onPress={() => setActiveTab('tenants')}
                    >
                        <User size={20} color={activeTab === 'tenants' ? theme.colors.accent : theme.colors.textTertiary} />
                        <Text style={[styles.tabText, activeTab === 'tenants' && styles.activeTabText]}>Tenants</Text>
                    </Pressable>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {activeTab === 'info' && property?.is_multi_unit !== false ? (
                    <View style={styles.infoSection}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Details</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>Type</Text>
                                <Text style={styles.infoValue}>{unit?.type || 'Standard'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>Floor</Text>
                                <Text style={styles.infoValue}>{unit?.floor || 'N/A'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>Size</Text>
                                <Text style={styles.infoValue}>{unit?.size ? `${unit.size} Sq. Ft.` : 'N/A'}</Text>
                            </View>
                            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.infoKey}>Furnishing</Text>
                                <Text style={styles.infoValue}>{unit?.furnishing_type || 'None'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Rent & Billing</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>Monthly Rent</Text>
                                <Text style={[styles.infoValue, { color: theme.colors.accent, fontWeight: 'bold' }]}>₹ {unit?.rent_amount}</Text>
                            </View>
                            {unit?.is_metered && (
                                <>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Electricity Rate</Text>
                                        <Text style={styles.infoValue}>₹ {unit?.electricity_rate}/unit</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Initial Elec. Reading</Text>
                                        <Text style={styles.infoValue}>{unit?.initial_electricity_reading ?? 0}</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        <Button
                            title="Update Room Details"
                            onPress={() => navigation.navigate('AddUnit', { propertyId, unitId })}
                            variant='primary'
                            style={{ marginTop: 20 }}
                        />
                    </View>
                ) : (
                    <View style={styles.tenantsSection}>
                        {currentTenant ? (
                            <>
                                <Text style={styles.sectionLabel}>CURRENT TENANT</Text>
                                {renderTenantCard(currentTenant, true)}
                            </>
                        ) : (
                            <View style={styles.emptyTenantBox}>
                                <UserPlus size={48} color={theme.colors.textTertiary} />
                                <Text style={styles.emptyTenantText}>Room is currently empty</Text>
                                <Button
                                    title="Add New Tenant"
                                    onPress={() => navigation.navigate('AddTenant', { propertyId, unitId })}
                                    style={styles.addTenantBtn}
                                />
                            </View>
                        )}

                        {pastTenants.length > 0 && (
                            <>
                                <Text style={[styles.sectionLabel, { marginTop: 30 }]}>PAST TENANTS</Text>
                                {pastTenants.map(t => renderTenantCard(t, false))}
                            </>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            <RemoveTenantModal
                visible={showRemoveModal}
                onClose={() => setShowRemoveModal(false)}
                tenant={selectedTenant}
                moveOutDate={moveOutDate}
                onDateChange={setMoveOutDate}
                refundAmount={refundAmount}
                onRefundAmountChange={setRefundAmount}
                onSubmit={handleRemoveTenant}
            />

            <MoveTenantModal
                visible={showMoveModal}
                onClose={() => setShowMoveModal(false)}
                tenant={selectedTenant}
                moveOutDate={moveOutDate}
                onDateChange={setMoveOutDate}
                targetPropertyId={targetPropertyId}
                targetUnitId={targetUnitId}
                availableProperties={availableProperties}
                availableUnits={availableUnits}
                onPropertyPress={() => setShowPropertyPicker(true)}
                onUnitPress={() => setShowUnitPicker(true)}
                onSubmit={handleMoveTenant}
            />

            {/* Pickers */}

            <RentLedgerModal
                visible={showLedgerModal}
                onClose={() => setShowLedgerModal(false)}
                tenant={currentTenant}
                property={property}
                unit={unit}
                payments={[]}
            />

            <PickerBottomSheet
                visible={showPropertyPicker}
                onClose={() => setShowPropertyPicker(false)}
                title="Choose Property"
                options={availableProperties.map(p => ({ label: p.name, value: p.id.toString() }))}
                selectedValue={targetPropertyId?.toString()}
                onSelect={(val) => {
                    setTargetPropertyId(parseInt(val));
                    setTargetUnitId(null);
                }}
            />

            <PickerBottomSheet
                visible={showUnitPicker}
                onClose={() => setShowUnitPicker(false)}
                title="Target Room"
                options={availableUnits.map(u => ({
                    label: `${u.name} ${u.tenant_name ? `(${u.tenant_name})` : '(Vacant)'}`,
                    value: u.id.toString()
                }))}
                selectedValue={targetUnitId?.toString()}
                onSelect={(val) => setTargetUnitId(parseInt(val))}
            />

            <ConfirmationModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteRoom}
                title="Delete Room"
                message={`Are you sure you want to delete ${unit?.name}? This action cannot be undone.`}
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
        alignItems: 'center',
        paddingRight: theme.spacing.m,
        paddingBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: theme.spacing.s,
        marginRight: theme.spacing.s,
    },
    headerCenter: {
        flex: 1,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    editButton: {
        padding: theme.spacing.s,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.m,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        gap: 8
    },
    activeTab: {
        borderBottomColor: theme.colors.accent,
    },
    tabText: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium
    },
    activeTabText: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
    },
    infoSection: {
        flex: 1
    },
    tenantsSection: {
        flex: 1
    },
    content: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
        flexGrow: 1
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
        letterSpacing: 0.8
    },
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 8
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '40'
    },
    infoKey: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        flexShrink: 0,
        marginRight: 8,
    },
    infoValue: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
        flexShrink: 1,
        textAlign: 'right',
    },
    emptyTenantBox: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: 40,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed'
    },
    emptyTenantText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 15,
        marginBottom: 20
    },
    addTenantBtn: {
        width: '100%',
    },
    tenantCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small
    },
    pastTenantCard: {
        opacity: 0.8,
    },
    tenantPhotoContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.background,
        overflow: 'hidden',
        marginRight: theme.spacing.m
    },
    tenantPhoto: {
        width: '100%',
        height: '100%'
    },
    tenantPhotoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tenantInfo: {
        flex: 1
    },
    tenantName: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    dateText: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    activeActions: {
        flexDirection: 'row',
        gap: 8
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    actionChipText: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 10
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        padding: 20
    }
});
