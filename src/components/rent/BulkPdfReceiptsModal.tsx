import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronDown, FileText } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import RentModalSheet from './RentModalSheet';
import PickerBottomSheet from '../common/PickerBottomSheet';
import { useAppTheme } from '../../theme/ThemeContext';
import { useToast } from '../../hooks/useToast';
import { generateBulkReceiptHTML, BulkReceiptMode, BulkReceiptItem } from '../../utils/bulkReceiptTemplate';

interface BulkPdfReceiptsModalProps {
    visible: boolean;
    onClose: () => void;
    bills: any[];
    property: any;
    period: { start: string; end: string; days: number };
}

const TYPE_OPTIONS: { label: string; value: BulkReceiptMode }[] = [
    { label: 'All', value: 'all' },
    { label: 'Only Rent Receipts', value: 'rent' },
    { label: 'Only Reminder Receipts', value: 'reminder' },
];

const isRentReceiptRow = (row: any) => {
    const status = row.bill?.status;
    return (row.bill?.paid_amount || 0) > 0 || status === 'partial' || status === 'paid' || status === 'overpaid';
};

const isReminderRow = (row: any) => {
    const status = row.bill?.status;
    return status === 'pending' && (row.bill?.paid_amount || 0) <= 0;
};

const getTypeLabel = (type: BulkReceiptMode) => TYPE_OPTIONS.find(option => option.value === type)?.label || 'All';

export default function BulkPdfReceiptsModal({
    visible,
    onClose,
    bills,
    property,
    period,
}: BulkPdfReceiptsModalProps) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
    const [receiptType, setReceiptType] = useState<BulkReceiptMode>('all');
    const [selectedBillIds, setSelectedBillIds] = useState<Set<number>>(new Set());
    const [typePickerVisible, setTypePickerVisible] = useState(false);
    const [generating, setGenerating] = useState(false);

    const eligibleRooms = useMemo(() => {
        return bills.filter(row => row?.tenant && row?.bill?.id && !row.isVacant && !row.isNotMovedIn && !row.isLeaseExpired);
    }, [bills]);

    const getAutoSelectedIds = (type: BulkReceiptMode) => {
        return eligibleRooms
            .filter(row => {
                if (type === 'all') return true;
                if (type === 'rent') return isRentReceiptRow(row);
                return isReminderRow(row);
            })
            .map(row => row.bill.id);
    };

    useEffect(() => {
        if (visible) {
            setReceiptType('all');
            setSelectedBillIds(new Set(getAutoSelectedIds('all')));
        }
    }, [visible, eligibleRooms.length]);

    const handleTypeSelect = (value: string) => {
        const nextType = value as BulkReceiptMode;
        setReceiptType(nextType);
        setSelectedBillIds(new Set(getAutoSelectedIds(nextType)));
    };

    const toggleBill = (billId: number) => {
        setSelectedBillIds(prev => {
            const next = new Set(prev);
            if (next.has(billId)) {
                next.delete(billId);
            } else {
                next.add(billId);
            }
            return next;
        });
    };

    const selectedRows = useMemo(() => {
        return eligibleRooms.filter(row => selectedBillIds.has(row.bill.id));
    }, [eligibleRooms, selectedBillIds]);

    const makeDocumentItem = (row: any): BulkReceiptItem => {
        let documentType: BulkReceiptItem['documentType'] = 'receipt';
        if (receiptType === 'reminder') {
            documentType = 'reminder';
        } else if (receiptType === 'all') {
            documentType = isRentReceiptRow(row) ? 'receipt' : 'reminder';
        }

        return {
            unit: row.unit,
            tenant: row.tenant,
            bill: row.bill,
            documentType,
        };
    };

    const sharePdf = async (uri: string) => {
        let finalUri = uri;
        try {
            const monthLabel = period.end.split(' ').slice(1, 3).join('_') || 'Rent';
            const propertyName = (property?.name || 'Property').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/ /g, '_').replace(/_+/g, '_');
            const fileName = `${propertyName}_PDF_Receipts_${monthLabel}.pdf`;
            const renamedUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.copyAsync({ from: uri, to: renamedUri });
            finalUri = renamedUri;
        } catch (error) {
            console.warn('Failed to rename bulk receipts PDF:', error);
        }

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(finalUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'PDF Receipts',
                UTI: 'com.adobe.pdf',
            });
        } else {
            showToast({ type: 'info', title: 'PDF generated', message: 'Sharing is not available on this device.' });
        }
    };

    const handleGenerate = async () => {
        if (selectedRows.length === 0) {
            showToast({ type: 'error', title: 'No rooms selected', message: 'Select at least one room to generate PDF receipts.' });
            return;
        }

        setGenerating(true);
        try {
            const html = generateBulkReceiptHTML({
                property,
                items: selectedRows.map(makeDocumentItem),
                period,
            });
            const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
            setGenerating(false);
            onClose();
            showToast({ type: 'success', title: 'PDF ready', message: `${selectedRows.length} receipt${selectedRows.length === 1 ? '' : 's'} generated.` });
            setTimeout(() => {
                sharePdf(uri).catch(error => {
                    console.error('Bulk PDF receipts share error:', error);
                    showToast({ type: 'error', title: 'Share failed', message: 'PDF was generated, but sharing failed.' });
                });
            }, 150);
        } catch (error) {
            console.error('Bulk PDF receipts generation error:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to generate PDF receipts. Please try again.' });
            setGenerating(false);
        }
    };

    return (
        <RentModalSheet
            visible={visible}
            onClose={generating ? () => undefined : onClose}
            title="PDF Receipts"
            subtitle={`${selectedRows.length} of ${eligibleRooms.length} rooms selected`}
            actionLabel={generating ? 'Generating...' : 'Generate Bill'}
            onAction={handleGenerate}
            actionDisabled={eligibleRooms.length === 0 || generating}
        >
            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Select Type</Text>
                <Pressable style={styles.dropdown} onPress={() => setTypePickerVisible(true)} disabled={generating}>
                    <Text style={styles.dropdownText}>{getTypeLabel(receiptType)}</Text>
                    <ChevronDown size={18} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

            {eligibleRooms.length === 0 ? (
                <View style={styles.emptyState}>
                    <FileText size={28} color={theme.colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No occupied rooms</Text>
                    <Text style={styles.emptyText}>There are no occupied rooms with generated bills for this month.</Text>
                </View>
            ) : (
                <View style={styles.roomsList}>
                    {eligibleRooms.map(row => {
                        const selected = selectedBillIds.has(row.bill.id);

                        return (
                            <Pressable
                                key={row.bill.id}
                                style={[styles.roomItem, selected && styles.roomItemSelected]}
                                onPress={() => toggleBill(row.bill.id)}
                                disabled={generating}
                            >
                                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                    {selected && <Check size={12} color="#FFFFFF" />}
                                </View>
                                <Text style={[styles.roomName, selected && styles.roomNameSelected]} numberOfLines={1}>
                                    {row.unit?.name || 'Room'}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {generating && (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={styles.loadingText}>Creating printable PDF</Text>
                </View>
            )}

            <PickerBottomSheet
                visible={typePickerVisible}
                onClose={() => setTypePickerVisible(false)}
                title="Select Type"
                options={TYPE_OPTIONS}
                selectedValue={receiptType}
                onSelect={handleTypeSelect}
            />
        </RentModalSheet>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    field: {
        marginBottom: theme.spacing.m,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    dropdown: {
        height: 48,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: 15,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    roomsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '48%',
        minWidth: '31%',
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    roomItemSelected: {
        borderColor: theme.colors.accent,
        backgroundColor: isDark ? '#1E3A8A55' : theme.colors.accentLight,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
    },
    checkboxSelected: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accent,
    },
    roomName: {
        flex: 1,
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    roomNameSelected: {
        color: theme.colors.accent,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.m,
    },
    emptyTitle: {
        marginTop: theme.spacing.s,
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    emptyText: {
        marginTop: 4,
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    loadingRow: {
        marginTop: theme.spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.s,
    },
    loadingText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
});
