import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import {
    Database,
    Bell,
    ChevronRight,
    FileText,
    Share2,
} from 'lucide-react-native';
import { getDb } from '../../db';
import { generateRealUsageData } from '../../../tests/seedDatabase';
import { setEnrichedUserProperties } from '../../services/analyticsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PickerBottomSheet from '../../components/common/PickerBottomSheet';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import { getReceiptDefaultFormat, getReceiptDefaultAction, setReceiptDefaultFormat, setReceiptDefaultAction, ReceiptDefaultFormat, ReceiptDefaultAction } from '../../utils/storage';

export default function SettingsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme);

    const [showSeedModal, setShowSeedModal] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [receiptFormat, setLocalReceiptFormat] = useState<ReceiptDefaultFormat>(getReceiptDefaultFormat());
    const [receiptAction, setLocalReceiptAction] = useState<ReceiptDefaultAction>(getReceiptDefaultAction());
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);

    const handleSetFormat = (format: ReceiptDefaultFormat) => {
        setReceiptDefaultFormat(format);
        setLocalReceiptFormat(format);
        setEnrichedUserProperties({ receiptFormat: format });
        setShowFormatModal(false);
    };

    const handleSetAction = (action: ReceiptDefaultAction) => {
        setReceiptDefaultAction(action);
        setLocalReceiptAction(action);
        setShowActionModal(false);
    };

    const confirmSeed = () => {
        setShowSeedModal(false);
        setIsSeeding(true);
        setTimeout(async () => {
            try {
                const db = getDb();
                await generateRealUsageData(db);
                showToast({ type: 'success', title: 'Success', message: 'Database seeded successfully.' });
            } catch (error) {
                console.error('Error seeding DB:', error);
                showToast({ type: 'error', title: 'Error', message: 'Failed to seed database.' });
            } finally {
                setIsSeeding(false);
            }
        }, 100);
    };

    const SettingItem = ({ icon: Icon, label, onPress, right, color = theme.colors.textPrimary }: any) => (
        <Pressable style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <View style={styles.itemRight}>
                {right || <ChevronRight size={20} color={theme.colors.textTertiary} />}
            </View>
        </Pressable>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Preferences</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={FileText}
                            label="Receipt Format"
                            color="#3B82F6"
                            onPress={() => setShowFormatModal(true)}
                            right={<Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'right' }} numberOfLines={1}>{receiptFormat === 'ask' ? 'Ask Every Time' : receiptFormat === 'pdf' ? 'Always PDF' : 'Always Image'}</Text>}
                        />
                        {Platform.OS === 'android' && (
                            <SettingItem
                                icon={Share2}
                                label="Share Action"
                                color="#10B981"
                                onPress={() => setShowActionModal(true)}
                                right={<Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'right' }} numberOfLines={1}>{receiptAction === 'system' ? 'System Share' : 'WhatsApp Direct'}</Text>}
                            />
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={Bell}
                            label="Notifications"
                            color="#F59E0B"
                            onPress={() => navigation.navigate('Notifications')}
                        />
                        <SettingItem
                            icon={Database}
                            label="Data Backup"
                            color="#EC4899"
                            onPress={() => navigation.navigate('Backup')}
                        />
                        {__DEV__ && (
                            <SettingItem
                                icon={Database}
                                label={isSeeding ? "Seeding Database..." : "Seed Database (Dev)"}
                                color="#8B5CF6"
                                onPress={() => setShowSeedModal(true)}
                            />
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Documents</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={FileText}
                            label="Terms & Conditions"
                            color="#8B5CF6"
                            onPress={() => navigation.navigate('TermsEditor')}
                        />
                    </View>
                </View>
            </ScrollView>

            <ConfirmationModal
                visible={showSeedModal}
                onClose={() => setShowSeedModal(false)}
                onConfirm={confirmSeed}
                title="Seed Database"
                message="Are you sure you want to inject 1-year of test data into this environment?"
                confirmText="Seed Data"
                cancelText="Cancel"
                variant="danger"
            />
            <Modal visible={isSeeding} transparent={true} animationType="fade">
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loaderText}>Generating 1 Year of Realistic App Data...</Text>
                    <Text style={styles.loaderSubText}>This takes about 10-15 seconds.</Text>
                </View>
            </Modal>
            <PickerBottomSheet
                visible={showFormatModal}
                onClose={() => setShowFormatModal(false)}
                title="Default Receipt Format"
                selectedValue={receiptFormat}
                options={[
                    { label: 'Ask Every Time', value: 'ask' },
                    { label: 'Always Default to Image', value: 'image' },
                    { label: 'Always Default to PDF', value: 'pdf' }
                ]}
                onSelect={(val) => handleSetFormat(val as ReceiptDefaultFormat)}
            />
            <PickerBottomSheet
                visible={showActionModal}
                onClose={() => setShowActionModal(false)}
                title="Default Share Action"
                selectedValue={receiptAction}
                options={[
                    { label: 'System Default Picker', value: 'system' },
                    { label: 'Direct to WhatsApp', value: 'whatsapp' }
                ]}
                onSelect={(val) => handleSetAction(val as ReceiptDefaultAction)}
            />
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.l,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    section: {
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.l,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.m,
        marginLeft: theme.spacing.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
    },
    itemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
    },
    itemRight: {
        flexShrink: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingLeft: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    loaderOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    loaderSubText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
});
