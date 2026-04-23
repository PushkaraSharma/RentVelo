import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    RefreshControl,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import {
    User,
    Calendar,
    Phone,
    Mail,
    Edit3,
    Briefcase,
    Users,
    Shield,
    Clock,
    IndianRupee,
    FileText,
    AlertCircle,
    ChevronRight,
    CheckCircle2,
    Clock4,
    Building,
    Receipt,
} from 'lucide-react-native';
import Header from '../../components/common/Header';
import {
    getTenantById,
    getPropertyById,
    getUnitById,
    getBillsByTenantId,
    getPaymentsByTenantId,
} from '../../db';
import { useFocusEffect } from '@react-navigation/native';
import { CURRENCY } from '../../utils/Constants';
import { getFullImageUri } from '../../services/imageService';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TenantDetailScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const { tenantId, propertyId, unitId } = route.params;

    const [tenant, setTenant] = useState<any>(null);
    const [property, setProperty] = useState<any>(null);
    const [unit, setUnit] = useState<any>(null);
    const [bills, setBills] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Image Preview
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');

    const isActive = tenant?.status === 'active';

    const loadData = async () => {
        try {
            const [tenantData, propData, unitData, billsData] = await Promise.all([
                getTenantById(tenantId),
                propertyId ? getPropertyById(propertyId) : null,
                unitId ? getUnitById(unitId) : null,
                getBillsByTenantId(tenantId),
            ]);
            setTenant(tenantData);
            setProperty(propData);
            setUnit(unitData);
            setBills(billsData);
        } catch (error) {
            console.error('Error loading tenant details:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [tenantId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatDate = (d: any) => {
        if (!d) return '—';
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')} ${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}`;
    };

    const getStayDuration = () => {
        if (!tenant?.move_in_date) return '—';
        const start = new Date(tenant.move_in_date);
        const end = tenant.move_out_date ? new Date(tenant.move_out_date) : new Date();
        const diffMs = end.getTime() - start.getTime();
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const months = Math.floor(totalDays / 30);
        const days = totalDays % 30;
        if (months > 0) return `${months}m ${days}d`;
        return `${days}d`;
    };

    // Aggregated stats from bills
    const totalPaid = bills.reduce((sum, b) => sum + (b.paid_amount ?? 0), 0);
    const totalOutstanding = bills.reduce((sum, b) => {
        const bal = b.balance ?? 0;
        return sum + (bal > 0 ? bal : 0);
    }, 0);

    const openPreview = (uri: string, title: string) => {
        setPreviewImageUri(getFullImageUri(uri) || uri);
        setPreviewTitle(title);
        setShowImagePreview(true);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
            case 'overpaid':
                return { bg: isDark ? '#10B98120' : '#ECFDF5', text: '#10B981', label: status === 'overpaid' ? 'Overpaid' : 'Paid' };
            case 'partial':
                return { bg: isDark ? '#F59E0B20' : '#FFFBEB', text: '#F59E0B', label: 'Partial' };
            default:
                return { bg: isDark ? '#EF444420' : '#FEF2F2', text: '#EF4444', label: 'Pending' };
        }
    };

    if (!tenant) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="Tenant Details"
                subTitle={property?.name}
                rightAction={
                    isActive ? (
                        <Pressable
                            onPress={() => navigation.navigate('AddTenant', { tenantId: tenant.id, propertyId, unitId })}
                            style={styles.editBtn}
                        >
                            <Edit3 size={20} color={theme.colors.accent} />
                        </Pressable>
                    ) : null
                }
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* ─── Tenant Info Card ─── */}
                <View style={styles.profileCard}>
                    <View style={styles.profileTop}>
                        <Pressable
                            onPress={() => tenant.photo_uri ? openPreview(tenant.photo_uri, 'Tenant Photo') : null}
                        >
                            {tenant.photo_uri ? (
                                <Image
                                    source={{ uri: getFullImageUri(tenant.photo_uri) || tenant.photo_uri }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={32} color={theme.colors.textTertiary} />
                                </View>
                            )}
                        </Pressable>
                        <View style={styles.profileInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.profileName} numberOfLines={1}>{tenant.name}</Text>
                                <View style={[styles.statusBadge, {
                                    backgroundColor: isActive
                                        ? (isDark ? '#10B98120' : '#ECFDF5')
                                        : (isDark ? '#6B728020' : '#F3F4F6')
                                }]}>
                                    <View style={[styles.statusDot, {
                                        backgroundColor: isActive ? '#10B981' : '#9CA3AF'
                                    }]} />
                                    <Text style={[styles.statusText, {
                                        color: isActive ? '#10B981' : '#9CA3AF'
                                    }]}>{isActive ? 'Active' : 'Past'}</Text>
                                </View>
                            </View>
                            {tenant.profession && (
                                <View style={styles.detailRow}>
                                    <Briefcase size={14} color={theme.colors.textTertiary} />
                                    <Text style={styles.detailText}>{tenant.profession}</Text>
                                </View>
                            )}
                            {unit && (
                                <View style={styles.detailRow}>
                                    <Building size={14} color={theme.colors.textTertiary} />
                                    <Text style={styles.detailText}>
                                        {unit.room_group ? `${unit.room_group} • ${unit.bed_number || unit.name}` : unit.name}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Quick Contact Actions */}
                    <View style={styles.contactActions}>
                        {tenant.phone ? (
                            <>
                                <Pressable
                                    style={styles.contactBtn}
                                    onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                                >
                                    <Phone size={16} color="#FFF" />
                                    <Text style={styles.contactBtnText}>Call</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.contactBtn, styles.whatsappBtn]}
                                    onPress={() => {
                                        const phone = tenant.phone.replace(/[^0-9]/g, '');
                                        const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
                                        Linking.openURL(`whatsapp://send?phone=${whatsappPhone}`);
                                    }}
                                >
                                    <Text style={{ fontSize: 15 }}>💬</Text>
                                    <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                                </Pressable>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* ─── Key Dates Card ─── */}
                <View style={styles.datesCard}>
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Move-in</Text>
                        <Text style={styles.dateValue}>{formatDate(tenant.move_in_date)}</Text>
                    </View>
                    <View style={[styles.dateItem, styles.dateBorder]}>
                        <Text style={styles.dateLabel}>Rent Start</Text>
                        <Text style={styles.dateValue}>{formatDate(tenant.rent_start_date)}</Text>
                    </View>
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>{tenant.move_out_date ? 'Move-out' : 'Duration'}</Text>
                        <Text style={styles.dateValue}>
                            {tenant.move_out_date ? formatDate(tenant.move_out_date) : getStayDuration()}
                        </Text>
                    </View>
                </View>

                {/* ─── Financial Stats ─── */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#10B98120' : '#ECFDF5' }]}>
                            <IndianRupee size={18} color="#10B981" />
                        </View>
                        <Text style={styles.statValue}>{CURRENCY}{totalPaid.toLocaleString('en-IN')}</Text>
                        <Text style={styles.statLabel}>Total Paid</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#EF444420' : '#FEF2F2' }]}>
                            <AlertCircle size={18} color="#EF4444" />
                        </View>
                        <Text style={styles.statValue}>{CURRENCY}{totalOutstanding.toLocaleString('en-IN')}</Text>
                        <Text style={styles.statLabel}>Outstanding</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#3B82F620' : '#EFF6FF' }]}>
                            <Receipt size={18} color="#3B82F6" />
                        </View>
                        <Text style={styles.statValue}>{bills.length}</Text>
                        <Text style={styles.statLabel}>Total Bills</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#8B5CF620' : '#F5F3FF' }]}>
                            <Shield size={18} color="#8B5CF6" />
                        </View>
                        <Text style={styles.statValue}>{CURRENCY}{(tenant.security_deposit ?? 0).toLocaleString('en-IN')}</Text>
                        <Text style={styles.statLabel}>Deposit</Text>
                    </View>
                </View>

                {/* ─── Lease Info ─── */}
                {tenant.lease_type && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Lease Details</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoKey}>Lease Type</Text>
                            <Text style={styles.infoValue}>
                                {tenant.lease_type === 'monthly' ? 'Monthly' : tenant.lease_type === 'yearly' ? 'Yearly' : 'Fixed Term'}
                            </Text>
                        </View>
                        {tenant.lease_type === 'fixed' && tenant.lease_end_date && (
                            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.infoKey}>Lease Expiry</Text>
                                <Text style={[styles.infoValue, {
                                    color: new Date(tenant.lease_end_date) < new Date() ? '#EF4444' : theme.colors.textPrimary
                                }]}>{formatDate(tenant.lease_end_date)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ─── Payment History ─── */}
                <View style={styles.sectionHeader}>
                    <FileText size={18} color={theme.colors.accent} />
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    <Text style={styles.sectionCount}>{bills.length}</Text>
                </View>

                {bills.length > 0 ? (
                    <View style={styles.billsList}>
                        {bills.map((bill, index) => {
                            const status = getStatusStyle(bill.status);
                            return (
                                <View key={bill.id || index} style={styles.billItem}>
                                    <View style={styles.billLeft}>
                                        <View style={[styles.billMonthBadge, {
                                            backgroundColor: isDark ? theme.colors.accentLight : '#EFF6FF'
                                        }]}>
                                            <Text style={styles.billMonthText}>
                                                {MONTH_NAMES[(bill.month ?? 1) - 1]}
                                            </Text>
                                            <Text style={styles.billYearText}>{bill.year}</Text>
                                        </View>
                                        <View style={styles.billDetails}>
                                            <Text style={styles.billAmount}>
                                                {CURRENCY}{(bill.total_amount ?? 0).toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={styles.billSubtext}>
                                                Paid: {CURRENCY}{(bill.paid_amount ?? 0).toLocaleString('en-IN')}
                                                {(bill.balance ?? 0) > 0 ? ` • Due: ${CURRENCY}${(bill.balance ?? 0).toLocaleString('en-IN')}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.billStatusBadge, { backgroundColor: status.bg }]}>
                                        <Text style={[styles.billStatusText, { color: status.text }]}>
                                            {status.label}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Receipt size={40} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No Bills Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Payment history will appear here once rent is collected.
                        </Text>
                    </View>
                )}

                {/* ─── Emergency Contact ─── */}
                {(tenant.emergency_contact_name || tenant.emergency_contact_phone) && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Emergency Contact</Text>
                        {tenant.emergency_contact_name && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>Name</Text>
                                <Text style={styles.infoValue}>{tenant.emergency_contact_name}</Text>
                            </View>
                        )}
                        {tenant.emergency_contact_phone && (
                            <Pressable
                                style={[styles.infoRow, { borderBottomWidth: 0 }]}
                                onPress={() => Linking.openURL(`tel:${tenant.emergency_contact_phone}`)}
                            >
                                <Text style={styles.infoKey}>Phone</Text>
                                <Text style={[styles.infoValue, { color: theme.colors.accent }]}>
                                    {tenant.emergency_contact_phone}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* ─── Additional Info ─── */}
                {(tenant.work_address || tenant.email || tenant.guest_count) && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Additional Info</Text>
                        {tenant.guest_count && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoKey}>No. of People</Text>
                                <Text style={styles.infoValue}>{tenant.guest_count}</Text>
                            </View>
                        )}
                        {tenant.work_address && (
                            <View style={[styles.infoRow, !tenant.email ? { borderBottomWidth: 0 } : {}]}>
                                <Text style={styles.infoKey}>Work Address</Text>
                                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                                    {tenant.work_address}
                                </Text>
                            </View>
                        )}
                        {tenant.email && (
                            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.infoKey}>Email</Text>
                                <Text style={[styles.infoValue, { color: theme.colors.accent }]}>{tenant.email}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ─── Document Vault ─── */}
                {(tenant.aadhaar_front_uri || tenant.aadhaar_back_uri || tenant.pan_uri) && (
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Documents</Text>
                        <View style={styles.docsGrid}>
                            {tenant.aadhaar_front_uri && (
                                <Pressable
                                    style={styles.docThumb}
                                    onPress={() => openPreview(tenant.aadhaar_front_uri, 'Aadhaar Front')}
                                >
                                    <Image
                                        source={{ uri: getFullImageUri(tenant.aadhaar_front_uri) || tenant.aadhaar_front_uri }}
                                        style={styles.docImage}
                                    />
                                    <Text style={styles.docLabel}>Aadhaar Front</Text>
                                </Pressable>
                            )}
                            {tenant.aadhaar_back_uri && (
                                <Pressable
                                    style={styles.docThumb}
                                    onPress={() => openPreview(tenant.aadhaar_back_uri, 'Aadhaar Back')}
                                >
                                    <Image
                                        source={{ uri: getFullImageUri(tenant.aadhaar_back_uri) || tenant.aadhaar_back_uri }}
                                        style={styles.docImage}
                                    />
                                    <Text style={styles.docLabel}>Aadhaar Back</Text>
                                </Pressable>
                            )}
                            {tenant.pan_uri && (
                                <Pressable
                                    style={styles.docThumb}
                                    onPress={() => openPreview(tenant.pan_uri, 'PAN Card')}
                                >
                                    <Image
                                        source={{ uri: getFullImageUri(tenant.pan_uri) || tenant.pan_uri }}
                                        style={styles.docImage}
                                    />
                                    <Text style={styles.docLabel}>PAN Card</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <ImagePreviewModal
                visible={showImagePreview}
                imageUri={previewImageUri}
                onClose={() => setShowImagePreview(false)}
                title={previewTitle}
            />
        </SafeAreaView>
    );
}


const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.m,
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Profile Card ──
    profileCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginRight: theme.spacing.m,
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    profileName: {
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        flexShrink: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: theme.typography.bold,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    detailText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    contactActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '60',
        paddingTop: theme.spacing.m,
        justifyContent: 'space-between',
    },
    contactBtn: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: theme.colors.accent,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.m,
    },
    contactBtnText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: '#FFF',
    },
    whatsappBtn: {
        backgroundColor: isDark ? '#25D36620' : '#DCFCE7',
        borderWidth: 1,
        borderColor: '#25D366',
    },

    // ── Dates Card ──
    datesCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dateItem: {
        flex: 1,
        alignItems: 'center',
    },
    dateBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.border + '60',
    },
    dateLabel: {
        fontSize: 11,
        fontWeight: theme.typography.medium,
        color: theme.colors.textTertiary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateValue: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },

    // ── Stats Grid ──
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: theme.spacing.m,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        fontWeight: theme.typography.medium,
    },

    // ── Info Cards ──
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '40',
    },
    infoKey: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        paddingRight: theme.spacing.s,
    },
    infoValue: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
        textAlign: 'right',
    },

    // ── Section Header ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.m,
        marginTop: theme.spacing.s,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        flex: 1,
    },
    sectionCount: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
    },

    // ── Bills List ──
    billsList: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        marginBottom: theme.spacing.m,
    },
    billItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '40',
    },
    billLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    billMonthBadge: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    billMonthText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    billYearText: {
        fontSize: 10,
        fontWeight: theme.typography.medium,
        color: theme.colors.textTertiary,
    },
    billDetails: {
        flex: 1,
    },
    billAmount: {
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    billSubtext: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    billStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    billStatusText: {
        fontSize: 11,
        fontWeight: theme.typography.bold,
    },

    // ── Empty State ──
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: 40,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        marginBottom: theme.spacing.m,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginTop: 15,
    },
    emptySubtitle: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },

    // ── Documents ──
    docsGrid: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    docThumb: {
        alignItems: 'center',
        gap: 6,
    },
    docImage: {
        width: 80,
        height: 56,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
    },
    docLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
});
