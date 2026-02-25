import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Image, Linking } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { getFullImageUri } from '../../services/imageService';
import { X, Phone, Mail, MapPin, User, Calendar, Shield, ExternalLink, MessageCircle } from 'lucide-react-native';

interface RoomInfoModalProps {
    visible: boolean;
    onClose: () => void;
    tenant: any;
    unit: any;
    navigation: any;
    propertyId: number;
}

export default function RoomInfoModal({ visible, onClose, tenant, unit, navigation, propertyId }: RoomInfoModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    if (!tenant || !unit) return null;

    const formatDate = (d: any) => {
        if (!d) return '—';
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}, ${date.getFullYear().toString().slice(-2)} `;
    };

    const leaseEnd = tenant.lease_end_date ? formatDate(tenant.lease_end_date) : '∞';

    return (
        <Modal visible={visible} transparent animationType="slide">
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Room: {unit.name}</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    {/* Tenant Info Card */}
                    <View style={styles.tenantCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tenantName}>{tenant.name}</Text>
                            <Text style={styles.tenantAddress}>{tenant.work_address || 'No Address'}</Text>
                        </View>
                        <View style={styles.avatarContainer}>
                            {tenant.photo_uri ? (
                                <Image source={{ uri: getFullImageUri(tenant.photo_uri) || tenant.photo_uri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={28} color={theme.colors.textTertiary} />
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Deposit Amt</Text>
                            <Text style={styles.statValue}>{CURRENCY}{tenant.security_deposit ?? 0}</Text>
                        </View>
                        <View style={[styles.statItem, styles.statBorder]}>
                            <Text style={styles.statLabel}>Rent Started</Text>
                            <Text style={styles.statValue}>{formatDate(tenant.rent_start_date)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Leased Until</Text>
                            <Text style={styles.statValue}>{leaseEnd}</Text>
                        </View>
                    </View>

                    {/* Contact Details */}
                    <View style={styles.contactSection}>
                        <Text style={styles.sectionTitle}>Contact Details</Text>
                        {tenant.phone ? (
                            <View style={styles.contactRow}>
                                <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${tenant.phone} `)}>
                                    <Phone size={16} color="#FFF" />
                                    <Text style={styles.callBtnText}>Call</Text>
                                </Pressable>
                                <Text style={styles.phoneText}>{tenant.phone}</Text>
                                <Pressable
                                    style={styles.whatsappBtn}
                                    onPress={() => {
                                        const phone = tenant.phone.replace(/[^0-9]/g, '');
                                        const whatsappPhone = phone.startsWith('91') ? phone : `91${phone} `;
                                        Linking.openURL(`whatsapp://send?phone=${whatsappPhone}`);
                                    }}
                                >
                                    <Text style={styles.whatsappIcon}>💬</Text>
                                    <Text style={styles.whatsappText}>WhatsApp</Text>
                                </Pressable >
                            </View >
                        ) : null}
                        {
                            tenant.email ? (
                                <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${tenant.email}`)}>
                                    <Mail size={16} color={theme.colors.accent} />
                                    <Text style={styles.contactText}>{tenant.email}</Text>
                                </Pressable>
                            ) : null
                        }
                        {
                            !tenant.phone && !tenant.email && (
                                <Text style={styles.noContact}>No Contact Details Available</Text>
                            )
                        }
                    </View >

                    {/* Open Room Info */}
                    < Pressable
                        style={styles.openRoomBtn}
                        onPress={() => {
                            onClose();
                            navigation.navigate('RoomDetails', { propertyId, unitId: unit.id });
                        }}
                    >
                        <Text style={styles.openRoomText}>Open Room Info</Text>
                        <ExternalLink size={16} color="#FFF" />
                    </Pressable >

                    {/* Meter Info */}
                    {
                        unit.is_metered && unit.initial_electricity_reading !== null && (
                            <View style={styles.meterRow}>
                                <Text style={styles.meterText}>⚡ Meter No: {unit.initial_electricity_reading}</Text>
                            </View>
                        )
                    }
                </Pressable >
            </Pressable >
        </Modal >
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.l,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: theme.spacing.l,
        ...theme.shadows.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tenantCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    tenantName: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    tenantAddress: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    avatarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.m,
    },
    statValue: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginTop: 4,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    section: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
    },
    contactSection: {
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    callBtnText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: '#FFF',
    },
    phoneText: {
        flex: 1,
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    whatsappBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#25D36615',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#25D366',
    },
    whatsappIcon: {
        fontSize: 14,
    },
    whatsappText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: '#25D366',
    },
    contactText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    noContact: {
        fontSize: 13,
        color: theme.colors.warning,
        textAlign: 'center',
        paddingVertical: theme.spacing.m,
    },
    openRoomBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.accent,
        borderRadius: 16,
        paddingVertical: 14,
        marginBottom: theme.spacing.s,
    },
    openRoomText: {
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: '#FFF',
    },
    meterRow: {
        alignItems: 'center',
        paddingTop: theme.spacing.s,
    },
    meterText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
});
