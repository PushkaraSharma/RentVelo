import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import {
    Camera,
    Building,
    CreditCard,
    Wallet,
    QrCode,
    PenTool,
    Trash2,
    X,
    Check,
    Upload,
    Smartphone
} from 'lucide-react-native';
import Header from '../../../components/common/Header';
import { getReceiptConfigByPropertyId, upsertReceiptConfig } from '../../../db';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system/legacy';

const WALLET_OPTIONS = [
    { label: 'Google Pay', value: 'google_pay' },
    { label: 'Paytm', value: 'paytm' },
    { label: 'PhonePe', value: 'phonepe' },
    { label: 'Amazon Pay', value: 'amazon_pay' },
    { label: 'Other', value: 'other' },
];

export default function RentReceiptConfigScreen({ navigation, route }: any) {
    const propertyId = route?.params?.propertyId;
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Logo
    const [logoUri, setLogoUri] = useState<string | null>(null);

    // Bank Details
    const [bankName, setBankName] = useState('');
    const [bankAccNumber, setBankAccNumber] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankAccHolder, setBankAccHolder] = useState('');

    // Wallet Details
    const [walletType, setWalletType] = useState('');
    const [walletPhone, setWalletPhone] = useState('');
    const [walletName, setWalletName] = useState('');

    // UPI
    const [upiId, setUpiId] = useState('');

    // Payment QR Code
    const [paymentQrUri, setPaymentQrUri] = useState<string | null>(null);

    // Signature
    const [signatureUri, setSignatureUri] = useState<string | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const signatureRef = useRef<any>(null);

    // Wallet Picker
    const [showWalletPicker, setShowWalletPicker] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadConfig();
        }, [propertyId])
    );

    const loadConfig = async () => {
        try {
            const config = await getReceiptConfigByPropertyId(propertyId);
            if (config) {
                setIsEditMode(true);
                setLogoUri(config.logo_uri || null);
                setBankName(config.bank_name || '');
                setBankAccNumber(config.bank_acc_number || '');
                setBankIfsc(config.bank_ifsc || '');
                setBankAccHolder(config.bank_acc_holder || '');
                setWalletType(config.wallet_type || '');
                setWalletPhone(config.wallet_phone || '');
                setWalletName(config.wallet_name || '');
                setUpiId(config.upi_id || '');
                setPaymentQrUri(config.payment_qr_uri || null);
                setSignatureUri(config.signature_uri || null);
            }
        } catch (error) {
            console.error('Error loading receipt config:', error);
        }
    };

    const pickImage = async (setter: (uri: string) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleSignatureSave = async (signature: string) => {
        try {
            // signature is a base64 data URI
            const filename = `signature_${propertyId}_${Date.now()}.png`;
            const filepath = `${FileSystem.documentDirectory}${filename}`;
            const base64Data = signature.replace('data:image/png;base64,', '');
            await FileSystem.writeAsStringAsync(filepath, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });
            setSignatureUri(filepath);
            setShowSignatureModal(false);
        } catch (error) {
            console.error('Error saving signature:', error);
            Alert.alert('Error', 'Failed to save signature');
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await upsertReceiptConfig(propertyId, {
                logo_uri: logoUri,
                bank_name: bankName || null,
                bank_acc_number: bankAccNumber || null,
                bank_ifsc: bankIfsc || null,
                bank_acc_holder: bankAccHolder || null,
                wallet_type: walletType || null,
                wallet_phone: walletPhone || null,
                wallet_name: walletName || null,
                upi_id: upiId || null,
                payment_qr_uri: paymentQrUri,
                signature_uri: signatureUri,
            });

            Alert.alert('Success', `Receipt details ${isEditMode ? 'updated' : 'saved'} successfully!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error saving receipt config:', error);
            Alert.alert('Error', 'Failed to save receipt configuration');
        } finally {
            setLoading(false);
        }
    };

    const signatureStyle = `.m-signature-pad--footer { display: none; margin: 0px; } .m-signature-pad { box-shadow: none; border: none; } body,html { width: 100%; height: 100%; }`;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Header
                    title={isEditMode ? 'Update Receipt Details' : 'Setup Rent Receipt'}
                />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* 1. Logo Upload */}
                    <Text style={styles.sectionLabel}>BUSINESS LOGO</Text>
                    <View style={styles.section}>
                        {logoUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                                <View style={styles.imageActions}>
                                    <Pressable
                                        style={styles.changeBtn}
                                        onPress={() => pickImage(setLogoUri)}
                                    >
                                        <Camera size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Change</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.removeBtn}
                                        onPress={() => setLogoUri(null)}
                                    >
                                        <Trash2 size={16} color={theme.colors.danger} />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.uploadBox} onPress={() => pickImage(setLogoUri)}>
                                <Upload size={28} color={theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Upload Logo</Text>
                                <Text style={styles.uploadSubtitle}>This will appear on rent receipts</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* 2. Bank Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <Building size={20} color={theme.colors.accent} />
                            <Text style={styles.sectionIconText}>BANK DETAILS</Text>
                        </View>
                        <Input
                            label="Bank Name"
                            placeholder="e.g. State Bank of India"
                            value={bankName}
                            onChangeText={setBankName}
                        />
                        <Input
                            label="Account Number"
                            placeholder="e.g. 1234567890"
                            value={bankAccNumber}
                            onChangeText={setBankAccNumber}
                            keyboardType="numeric"
                        />
                        <Input
                            label="IFSC Code"
                            placeholder="e.g. SBIN0001234"
                            value={bankIfsc}
                            onChangeText={setBankIfsc}
                            autoCapitalize="characters"
                        />
                        <Input
                            label="Account Holder Name"
                            placeholder="e.g. Pushkara Sharma"
                            value={bankAccHolder}
                            onChangeText={setBankAccHolder}
                        />
                    </View>

                    {/* 3. Wallet Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <Wallet size={20} color="#F59E0B" />
                            <Text style={styles.sectionIconText}>WALLET DETAILS</Text>
                        </View>

                        <Text style={styles.inputLabel}>Wallet Type</Text>
                        <Pressable style={styles.pickerTrigger} onPress={() => setShowWalletPicker(true)}>
                            <Text style={[styles.pickerTriggerText, !walletType && { color: theme.colors.textTertiary }]}>
                                {WALLET_OPTIONS.find(w => w.value === walletType)?.label || 'Select Wallet'}
                            </Text>
                            <Smartphone size={18} color={theme.colors.accent} />
                        </Pressable>

                        <Input
                            label="Wallet Phone Number"
                            placeholder="e.g. 9876543210"
                            value={walletPhone}
                            onChangeText={setWalletPhone}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                        <Input
                            label="Wallet Name (Display)"
                            placeholder="e.g. Pushkara Sharma"
                            value={walletName}
                            onChangeText={setWalletName}
                        />
                    </View>

                    {/* 4. UPI ID */}
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <CreditCard size={20} color="#6366F1" />
                            <Text style={styles.sectionIconText}>UPI DETAILS</Text>
                        </View>
                        <Input
                            label="UPI ID"
                            placeholder="e.g. name@upi or 9876543210@paytm"
                            value={upiId}
                            onChangeText={setUpiId}
                            autoCapitalize="none"
                        />
                    </View>

                    {/* 5. Payment QR Code */}
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <QrCode size={20} color="#10B981" />
                            <Text style={styles.sectionIconText}>PAYMENT QR CODE</Text>
                        </View>
                        {paymentQrUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: paymentQrUri }} style={styles.qrPreview} />
                                <View style={styles.imageActions}>
                                    <Pressable
                                        style={styles.changeBtn}
                                        onPress={() => pickImage(setPaymentQrUri)}
                                    >
                                        <Camera size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Change</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.removeBtn}
                                        onPress={() => setPaymentQrUri(null)}
                                    >
                                        <Trash2 size={16} color={theme.colors.danger} />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.uploadBox} onPress={() => pickImage(setPaymentQrUri)}>
                                <Upload size={28} color={theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Upload QR Code</Text>
                                <Text style={styles.uploadSubtitle}>Payment QR will be shown on receipts</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* 6. Signature / Watermark */}
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <PenTool size={20} color="#8B5CF6" />
                            <Text style={styles.sectionIconText}>SIGNATURE / WATERMARK</Text>
                        </View>
                        {signatureUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: signatureUri }} style={styles.signaturePreview} />
                                <View style={styles.imageActions}>
                                    <Pressable
                                        style={styles.changeBtn}
                                        onPress={() => setShowSignatureModal(true)}
                                    >
                                        <PenTool size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Redraw</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.removeBtn}
                                        onPress={() => setSignatureUri(null)}
                                    >
                                        <Trash2 size={16} color={theme.colors.danger} />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.uploadBox} onPress={() => setShowSignatureModal(true)}>
                                <PenTool size={28} color={theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Draw Signature</Text>
                                <Text style={styles.uploadSubtitle}>Sign with your finger to create a watermark</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Submit */}
                    <Button
                        title={isEditMode ? "Save Changes" : "Save Receipt Details"}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                        icon={<Check size={20} color="#FFF" />}
                    />

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Wallet Picker */}
            <PickerBottomSheet
                visible={showWalletPicker}
                onClose={() => setShowWalletPicker(false)}
                title="Select Wallet"
                options={WALLET_OPTIONS}
                selectedValue={walletType}
                onSelect={setWalletType}
            />

            {/* Signature Modal */}
            <Modal
                visible={showSignatureModal}
                animationType="slide"
                onRequestClose={() => setShowSignatureModal(false)}
            >
                <SafeAreaView style={styles.signatureContainer}>
                    <View style={styles.signatureHeader}>
                        <Pressable onPress={() => setShowSignatureModal(false)}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                        <Text style={styles.signatureTitle}>Draw Your Signature</Text>
                        <Pressable onPress={() => signatureRef.current?.clearSignature()}>
                            <Trash2 size={24} color={theme.colors.danger} />
                        </Pressable>
                    </View>
                    <View style={styles.signatureCanvasWrapper}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSignatureSave}
                            webStyle={signatureStyle}
                            backgroundColor="#FFF"
                            penColor="#000"
                        />
                    </View>
                    <View style={styles.signatureFooter}>
                        <Button
                            title="Clear"
                            onPress={() => signatureRef.current?.clearSignature()}
                            variant="outline"
                            style={{ flex: 1, marginRight: 10 }}
                        />
                        <Button
                            title="Save Signature"
                            onPress={() => signatureRef.current?.readSignature()}
                            style={{ flex: 1 }}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: theme.spacing.m,
        paddingBottom: theme.spacing.s,
    },
    backButton: {
        padding: theme.spacing.s,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    content: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: 40,
        backgroundColor: theme.colors.background,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
        letterSpacing: 0.8,
        marginTop: theme.spacing.m,
        textTransform: 'uppercase'
    },
    section: {
        marginBottom: theme.spacing.s,
    },
    sectionIcon: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: theme.spacing.m,
    },
    sectionIconText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    inputLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        fontWeight: theme.typography.medium,
    },
    pickerTrigger: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    pickerTriggerText: {
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
    },
    uploadBox: {
        width: '60%',
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        alignItems: 'center',
        backgroundColor: theme.colors.accentLight + '30',
    },
    uploadTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        marginTop: 10,
    },
    uploadSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        textAlign: 'center'
    },
    imagePreviewContainer: {
        alignItems: 'center',
    },
    logoPreview: {
        width: 120,
        height: 120,
        borderRadius: theme.borderRadius.l,
        resizeMode: 'contain',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    qrPreview: {
        width: 180,
        height: 180,
        borderRadius: theme.borderRadius.l,
        resizeMode: 'contain',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    signaturePreview: {
        width: '100%',
        height: 120,
        borderRadius: theme.borderRadius.l,
        resizeMode: 'contain',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    imageActions: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginTop: theme.spacing.m,
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 8,
        borderRadius: 20,
    },
    changeBtnText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 8,
        borderRadius: 20,
    },
    removeBtnText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.danger,
    },
    submitBtn: {
        backgroundColor: theme.colors.accent,
        marginTop: theme.spacing.l,
    },
    // Signature Modal
    signatureContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    signatureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    signatureTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    signatureCanvasWrapper: {
        flex: 1,
        margin: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: '#FFF',
    },
    signatureFooter: {
        flexDirection: 'row',
        padding: theme.spacing.m,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
});
