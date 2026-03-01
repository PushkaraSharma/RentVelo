import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Modal, Image, SafeAreaView } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import { Plus, Banknote, Trash2, Image as ImageIcon, X } from 'lucide-react-native';
import { getBillPayments, removePaymentFromBill } from '../../db';
import RentModalSheet from './RentModalSheet';
import { getFullImageUri } from '../../services/imageService';
import { syncNotificationSchedules } from '../../services/pushNotificationService';
import { useToast } from '../../hooks/useToast';
import ConfirmationModal from '../common/ConfirmationModal';

interface PaidAmountModalProps {
    visible: boolean;
    onClose: () => void;
    bill: any;
    unit: any;
    onAddPayment: () => void;
}

export default function PaidAmountModal({ visible, onClose, bill, unit, onAddPayment }: PaidAmountModalProps) {
    const { theme } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme);
    const [payments, setPayments] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (visible && bill?.id) loadPayments();
    }, [visible, bill?.id]);

    const loadPayments = async () => {
        const data = await getBillPayments(bill.id);
        setPayments(data);
    };

    const handleDelete = (paymentId: number) => {
        setPaymentToDelete(paymentId);
    };

    const confirmDelete = async () => {
        if (!paymentToDelete) return;
        try {
            await removePaymentFromBill(paymentToDelete);
            await syncNotificationSchedules();
            await loadPayments();
            showToast({ type: 'success', title: 'Deleted', message: 'Payment removed successfully.' });
        } catch (err) {
            console.error('Error deleting payment:', err);
            showToast({ type: 'error', title: 'Error', message: 'Failed to delete payment.' });
        } finally {
            setPaymentToDelete(null);
        }
    };

    const formatDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return `${date.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}, ${date.getFullYear().toString().slice(-2)} `;
    };

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = (bill?.total_amount ?? 0) - totalPaid;

    return (
        <>
            <RentModalSheet
                visible={visible}
                onClose={onClose}
                title="Paid Amount"
                subtitle={unit?.name}
            >
                {/* Payment List */}
                {payments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No payments recorded yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={payments}
                        keyExtractor={(item) => item.id.toString()}
                        scrollEnabled={false}
                        renderItem={({ item }) => {
                            const imageUrl = item.receipt_url ? item.receipt_url : getFullImageUri(item.photo_uri);
                            return (
                                <View style={styles.paymentItem}>
                                    <View style={styles.paymentIcon}>
                                        <Banknote size={20} color={theme.colors.success} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.paymentAmount}>
                                            {CURRENCY}{item.amount?.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={styles.paymentDate}>{formatDate(item.payment_date)}</Text>
                                    </View>

                                    <View style={styles.actionsRow}>
                                        {imageUrl && (
                                            <Pressable
                                                style={styles.imageBtn}
                                                onPress={() => setSelectedImage(imageUrl)}
                                            >
                                                <ImageIcon size={16} color={theme.colors.accent} />
                                                <Text style={styles.imageBtnText}>Receipt</Text>
                                            </Pressable>
                                        )}
                                        <Pressable
                                            style={styles.deleteBtn}
                                            onPress={() => handleDelete(item.id)}
                                        >
                                            <Trash2 size={16} color={theme.colors.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLabel}>
                            Total Amt Paid: {CURRENCY}{totalPaid.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.footerBalance, balance <= 0 && { color: theme.colors.success }]}>
                            Current Balance: {CURRENCY}{Math.abs(balance).toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <Pressable style={styles.addFab} onPress={onAddPayment}>
                        <Plus size={24} color="#FFF" />
                    </Pressable>
                </View>
                {/* Full Screen Image Viewer Modal */}
                <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                    <SafeAreaView style={styles.imageViewerContainer}>
                        <View style={styles.imageViewerHeader}>
                            <Pressable onPress={() => setSelectedImage(null)} style={styles.closeImageBtn}>
                                <X size={24} color="#FFF" />
                            </Pressable>
                        </View>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.fullScreenImage}
                                resizeMode="contain"
                            />
                        )}
                    </SafeAreaView>
                </Modal>
                <ConfirmationModal
                    visible={!!paymentToDelete}
                    onClose={() => setPaymentToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Payment"
                    message="Are you sure you want to remove this payment? The bill balance will be recalculated."
                    confirmText="Delete"
                    cancelText="Cancel"
                    variant="danger"
                />
            </RentModalSheet>
        </>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textTertiary,
    },
    paymentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.s,
        marginBottom: theme.spacing.s,
        gap: theme.spacing.m,
    },
    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.successLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    paymentDate: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.dangerLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 4,
    },
    imageBtnText: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.m,
    },
    footerLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    footerBalance: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.danger,
        marginTop: 2,
    },
    addFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.medium,
    },
    imageViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    imageViewerHeader: {
        alignItems: 'flex-end',
        padding: 16,
    },
    closeImageBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    fullScreenImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});
