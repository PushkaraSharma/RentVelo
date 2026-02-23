import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { X, Check, ChevronDown, ChevronUp, Share2 } from 'lucide-react-native';
import Button from '../common/Button';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { generateRentLedgerHTML } from '../../utils/rentLedgerTemplate';
import { getReceiptConfigByPropertyId, getPropertyById } from '../../db';

interface RentLedgerModalProps {
    visible: boolean;
    onClose: () => void;
    tenant: any;
    property: any;
    unit: any;
    payments?: any[];
}

export default function RentLedgerModal({
    visible,
    onClose,
    tenant,
    property,
    unit,
    payments = [],
}: RentLedgerModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    // Options state
    const [includeIdProof, setIncludeIdProof] = useState(true);
    const [includeTransactions, setIncludeTransactions] = useState(true);
    const [transactionOrder, setTransactionOrder] = useState<'asc' | 'desc'>('asc');
    const [includeAmenities, setIncludeAmenities] = useState(true);
    const [includeTerms, setIncludeTerms] = useState(true);
    const [includeSignature, setIncludeSignature] = useState(true);
    const [generating, setGenerating] = useState(false);

    if (!visible) return null;

    const CheckboxRow = ({ label, value, onToggle, children }: any) => (
        <View style={styles.checkboxContainer}>
            <Pressable style={styles.checkboxRow} onPress={onToggle}>
                <View style={[styles.checkbox, value && styles.checkboxActive]}>
                    {value && <Check size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>{label}</Text>
            </Pressable>
            {children}
        </View>
    );

    const RadioOption = ({ label, selected, onPress }: any) => (
        <Pressable style={styles.radioRow} onPress={onPress}>
            <View style={[styles.radio, selected && styles.radioActive]}>
                {selected && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.radioLabel, selected && styles.radioLabelActive]}>{label}</Text>
        </Pressable>
    );

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            // Fetch receipt config for this property
            const receiptConfig = await getReceiptConfigByPropertyId(property.id);

            const options = {
                includeIdProof,
                includeTransactions,
                transactionOrder,
                includeAmenities,
                includeTerms,
                includeSignature,
            };

            const html = generateRentLedgerHTML({
                property,
                unit,
                tenant,
                payments,
                receiptConfig,
                options,
            });

            // Generate PDF
            const { uri } = await Print.printToFileAsync({ html });

            // Share PDF
            await shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Share Rent Ledger',
                UTI: 'com.adobe.pdf',
            });

            onClose();
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate rent ledger PDF');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Rent Ledger</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        {/* Included (always on) */}
                        <Text style={styles.sectionLabel}>Included</Text>
                        <View style={styles.includedRow}>
                            <View style={styles.includedChip}>
                                <Check size={14} color={theme.colors.accent} />
                                <Text style={styles.includedText}>Room & Owner Details</Text>
                            </View>
                            <View style={styles.includedChip}>
                                <Check size={14} color={theme.colors.accent} />
                                <Text style={styles.includedText}>Tenant & Dates Details</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Optional */}
                        <Text style={styles.sectionLabel}>Optional</Text>

                        <CheckboxRow
                            label="Tenant ID-Proof [ Images & PDF Only ]"
                            value={includeIdProof}
                            onToggle={() => setIncludeIdProof(!includeIdProof)}
                        />

                        <CheckboxRow
                            label="Rent-Payment Transactions"
                            value={includeTransactions}
                            onToggle={() => setIncludeTransactions(!includeTransactions)}
                        >
                            {includeTransactions && (
                                <View style={styles.radioGroup}>
                                    <RadioOption
                                        label="Ascending Order"
                                        selected={transactionOrder === 'asc'}
                                        onPress={() => setTransactionOrder('asc')}
                                    />
                                    <RadioOption
                                        label="Descending Order"
                                        selected={transactionOrder === 'desc'}
                                        onPress={() => setTransactionOrder('desc')}
                                    />
                                </View>
                            )}
                        </CheckboxRow>

                        <CheckboxRow
                            label="Amenities & Facilities"
                            value={includeAmenities}
                            onToggle={() => setIncludeAmenities(!includeAmenities)}
                        />

                        <CheckboxRow
                            label="Terms & Conditions"
                            value={includeTerms}
                            onToggle={() => setIncludeTerms(!includeTerms)}
                        />

                        <CheckboxRow
                            label="Include Signature"
                            value={includeSignature}
                            onToggle={() => setIncludeSignature(!includeSignature)}
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Button
                            title="Generate"
                            onPress={handleGenerate}
                            loading={generating}
                            style={styles.generateBtn}
                            icon={<Share2 size={18} color="#FFF" />}
                        />
                        <Text style={styles.footerNote}>
                            Before generating, Make sure to save Everything
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    modalContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.m,
        paddingTop: theme.spacing.l
    },
    closeBtn: {
        padding: 4
    },
    title: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    body: {
        paddingHorizontal: theme.spacing.l,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        marginBottom: theme.spacing.m,
    },
    includedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    includedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    includedText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.m,
    },
    checkboxContainer: {
        marginBottom: theme.spacing.m,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxActive: {
        backgroundColor: theme.colors.accent,
    },
    checkboxLabel: {
        fontSize: 15,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
        flex: 1,
    },
    radioGroup: {
        flexDirection: 'row',
        gap: theme.spacing.l,
        marginLeft: 36,
        marginTop: 10,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    radioActive: {
        borderColor: theme.colors.accent,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.accent,
    },
    radioLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    radioLabelActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold,
    },
    footer: {
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
    },
    generateBtn: {
        backgroundColor: theme.colors.accent,
    },
    footerNote: {
        textAlign: 'center',
        color: theme.colors.accent,
        fontSize: 12,
        marginTop: 8,
        fontWeight: theme.typography.medium,
    },
});
