import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import {
    Camera,
    Building,
    CreditCard,
    Wallet,
    QrCode,
    PenTool,
    Trash2,
    Check,
    Upload,
    Smartphone
} from 'lucide-react-native';
import Header from '../../../components/common/Header';
import {
    getPaymentAccountById,
    createPaymentAccount,
    updatePaymentAccount,
    deletePaymentAccount,
    getPropertyById,
    setPropertyDefaultPaymentAccount,
} from '../../../db';
import { useFocusEffect } from '@react-navigation/native';
import { useImagePicker } from '../../../hooks/useImagePicker';
import ImagePickerModal from '../../../components/common/ImagePickerModal';
import SignatureModal from '../../../components/common/SignatureModal';
import ImagePreviewModal from '../../../components/common/ImagePreviewModal';
import { saveImageToPermanentStorage, getFullImageUri } from '../../../services/imageService';
import { useToast } from '../../../hooks/useToast';

const WALLET_OPTIONS = [
    { label: 'Google Pay', value: 'google_pay' },
    { label: 'Paytm', value: 'paytm' },
    { label: 'PhonePe', value: 'phonepe' },
    { label: 'Amazon Pay', value: 'amazon_pay' },
    { label: 'Other', value: 'other' },
];

export default function PaymentAccountEditorScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;
    const accountId = route?.params?.accountId;
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(!!accountId);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [accountName, setAccountName] = useState('');
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [bankName, setBankName] = useState('');
    const [bankAccNumber, setBankAccNumber] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankAccHolder, setBankAccHolder] = useState('');
    const [walletType, setWalletType] = useState('');
    const [walletPhone, setWalletPhone] = useState('');
    const [walletName, setWalletName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [paymentQrUri, setPaymentQrUri] = useState<string | null>(null);
    const [signatureUri, setSignatureUri] = useState<string | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showWalletPicker, setShowWalletPicker] = useState(false);
    const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [previewImageTitle, setPreviewImageTitle] = useState('');
    const [previewEditAction, setPreviewEditAction] = useState<(() => void) | undefined>(undefined);
    const [previewDeleteAction, setPreviewDeleteAction] = useState<(() => void) | undefined>(undefined);

    const {
        visible: showImagePicker,
        openPicker,
        closePicker: closeImagePicker,
        handleCamera,
        handleGallery
    } = useImagePicker();

    useFocusEffect(
        useCallback(() => {
            loadAccount();
        }, [accountId])
    );

    const loadAccount = async () => {
        try {
            if (!accountId) return;
            const account = await getPaymentAccountById(accountId);
            if (account) {
                setIsEditMode(true);
                setAccountName(account.name || '');
                setLogoUri(account.logo_uri || null);
                setBankName(account.bank_name || '');
                setBankAccNumber(account.bank_acc_number || '');
                setBankIfsc(account.bank_ifsc || '');
                setBankAccHolder(account.bank_acc_holder || '');
                setWalletType(account.wallet_type || '');
                setWalletPhone(account.wallet_phone || '');
                setWalletName(account.wallet_name || '');
                setUpiId(account.upi_id || '');
                setPaymentQrUri(account.payment_qr_uri || null);
                setSignatureUri(account.signature_uri || null);
            }
        } catch (error) {
            console.error('Error loading payment account:', error);
        }
    };

    const pickLogo = () => openPicker({ allowsEditing: true, quality: 0.8 }, setLogoUri);
    const pickQrCode = () => openPicker({ allowsEditing: true, quality: 0.8 }, setPaymentQrUri);

    const openPreview = (uri: string, title: string, editFn: () => void, deleteFn: () => void) => {
        setPreviewImageUri(getFullImageUri(uri) || uri);
        setPreviewImageTitle(title);
        setPreviewEditAction(() => editFn);
        setPreviewDeleteAction(() => deleteFn);
        setShowImagePreview(true);
    };

    const handleSignatureSave = (filepath: string) => {
        setSignatureUri(filepath);
        setShowSignatureModal(false);
    };

    const handleSubmit = async () => {
        const trimmedName = accountName.trim();
        if (!trimmedName) {
            showToast({ type: 'error', title: 'Name required', message: 'Please enter a name for this payment account.' });
            return;
        }

        setLoading(true);
        try {
            const processImage = async (uri: string | null) => {
                if (uri && uri.startsWith('file://')) {
                    const permanentPath = await saveImageToPermanentStorage(uri);
                    return permanentPath || uri;
                }
                return uri;
            };

            const payload = {
                name: trimmedName,
                logo_uri: await processImage(logoUri),
                bank_name: bankName || null,
                bank_acc_number: bankAccNumber || null,
                bank_ifsc: bankIfsc || null,
                bank_acc_holder: bankAccHolder || null,
                wallet_type: walletType || null,
                wallet_phone: walletPhone || null,
                wallet_name: walletName || null,
                upi_id: upiId || null,
                payment_qr_uri: await processImage(paymentQrUri),
                signature_uri: signatureUri,
            };

            if (accountId) {
                await updatePaymentAccount(accountId, payload);
            } else {
                const newId = await createPaymentAccount(payload);
                if (propertyId) {
                    const property = await getPropertyById(propertyId);
                    if (property && !property.default_payment_account_id) {
                        await setPropertyDefaultPaymentAccount(propertyId, newId);
                    }
                }
            }

            showToast({
                type: 'success',
                title: 'Success',
                message: `Payment account ${accountId ? 'updated' : 'saved'} successfully!`
            });
            navigation.goBack();
        } catch (error) {
            console.error('Error saving payment account:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to save payment account' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!accountId) return;
        setDeleting(true);
        try {
            const result = await deletePaymentAccount(accountId);
            if (!result.success) {
                showToast({ type: 'error', title: 'Cannot delete', message: result.reason || 'This account is still in use.' });
                return;
            }
            showToast({ type: 'success', title: 'Deleted', message: 'Payment account removed.' });
            navigation.goBack();
        } catch (error) {
            console.error('Error deleting payment account:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to delete payment account' });
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Header
                    title={isEditMode ? 'Update Payment Account' : 'New Payment Account'}
                    rightAction={isEditMode ? (
                        <Pressable onPress={() => setShowDeleteModal(true)} hitSlop={8}>
                            <Trash2 size={20} color={theme.colors.danger} />
                        </Pressable>
                    ) : undefined}
                />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <CreditCard size={20} color={theme.colors.accent} />
                            <Text style={styles.sectionIconText}>ACCOUNT NAME</Text>
                        </View>
                        <Input
                            label="Name"
                            placeholder="e.g. HDFC Personal"
                            value={accountName}
                            onChangeText={setAccountName}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>BUSINESS LOGO</Text>
                    <View style={styles.section}>
                        {logoUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Pressable onPress={() => openPreview(logoUri, 'Business Logo', pickLogo, () => setLogoUri(null))}>
                                    <Image source={{ uri: getFullImageUri(logoUri) || logoUri }} style={styles.logoPreview} />
                                </Pressable>
                                <View style={styles.imageActions}>
                                    <Pressable style={styles.changeBtn} onPress={pickLogo}>
                                        <Camera size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Change</Text>
                                    </Pressable>
                                    <Pressable style={styles.removeBtn} onPress={() => setLogoUri(null)}>
                                        <Trash2 size={16} color={theme.colors.danger} />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.uploadBox} onPress={pickLogo}>
                                <Upload size={28} color={theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Upload Logo</Text>
                                <Text style={styles.uploadSubtitle}>This will appear on rent receipts</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <Building size={20} color={theme.colors.accent} />
                            <Text style={styles.sectionIconText}>BANK DETAILS</Text>
                        </View>
                        <Input label="Bank Name" placeholder="e.g. State Bank of India" value={bankName} onChangeText={setBankName} />
                        <Input label="Account Number" placeholder="e.g. 1234567890" value={bankAccNumber} onChangeText={setBankAccNumber} keyboardType="numeric" />
                        <Input label="IFSC Code" placeholder="e.g. SBIN0001234" value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />
                        <Input label="Account Holder Name" placeholder="e.g. Adam" value={bankAccHolder} onChangeText={setBankAccHolder} />
                    </View>

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
                        <Input label="Wallet Phone Number" placeholder="e.g. 9876543210" value={walletPhone} onChangeText={setWalletPhone} keyboardType="phone-pad" maxLength={10} />
                        <Input label="Wallet Name (Display)" placeholder="e.g. Adam" value={walletName} onChangeText={setWalletName} />
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <CreditCard size={20} color="#6366F1" />
                            <Text style={styles.sectionIconText}>UPI DETAILS</Text>
                        </View>
                        <Input label="UPI ID" placeholder="e.g. name@upi or 9876543210@paytm" value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <QrCode size={20} color="#10B981" />
                            <Text style={styles.sectionIconText}>PAYMENT QR CODE</Text>
                        </View>
                        {paymentQrUri ? (
                            <View style={styles.imagePreviewContainer}>
                                <Pressable onPress={() => openPreview(paymentQrUri, 'Payment QR Code', pickQrCode, () => setPaymentQrUri(null))}>
                                    <Image source={{ uri: getFullImageUri(paymentQrUri) || paymentQrUri }} style={styles.qrPreview} />
                                </Pressable>
                                <View style={styles.imageActions}>
                                    <Pressable style={styles.changeBtn} onPress={pickQrCode}>
                                        <Camera size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Change</Text>
                                    </Pressable>
                                    <Pressable style={styles.removeBtn} onPress={() => setPaymentQrUri(null)}>
                                        <Trash2 size={16} color={theme.colors.danger} />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.uploadBox} onPress={pickQrCode}>
                                <Upload size={28} color={theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Upload QR Code</Text>
                                <Text style={styles.uploadSubtitle}>Payment QR will be shown on receipts</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionIcon}>
                            <PenTool size={20} color="#8B5CF6" />
                            <Text style={styles.sectionIconText}>SIGNATURE / WATERMARK</Text>
                        </View>
                        {signatureUri ? (
                            <View>
                                <Pressable onPress={() => openPreview(signatureUri, 'Authorized Signatory', () => setShowSignatureModal(true), () => setSignatureUri(null))}>
                                    <Image source={{ uri: getFullImageUri(signatureUri) || signatureUri }} style={styles.signaturePreview} />
                                </Pressable>
                                <View style={styles.imageActions}>
                                    <Pressable style={styles.changeBtn} onPress={() => setShowSignatureModal(true)}>
                                        <PenTool size={16} color={theme.colors.accent} />
                                        <Text style={styles.changeBtnText}>Redraw</Text>
                                    </Pressable>
                                    <Pressable style={styles.removeBtn} onPress={() => setSignatureUri(null)}>
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

                    <Button
                        title={isEditMode ? 'Save Changes' : 'Save Payment Account'}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                        icon={<Check size={20} color="#FFF" />}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            <PickerBottomSheet
                visible={showWalletPicker}
                onClose={() => setShowWalletPicker(false)}
                title="Select Wallet"
                options={WALLET_OPTIONS}
                selectedValue={walletType}
                onSelect={setWalletType}
            />

            <SignatureModal
                visible={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onSave={handleSignatureSave}
                propertyId={accountId || propertyId || 'new'}
            />

            <ImagePickerModal
                visible={showImagePicker}
                onClose={closeImagePicker}
                onSelectCamera={handleCamera}
                onSelectGallery={handleGallery}
            />

            <ImagePreviewModal
                visible={showImagePreview}
                imageUri={previewImageUri}
                onClose={() => setShowImagePreview(false)}
                title={previewImageTitle}
                onEdit={() => { setShowImagePreview(false); previewEditAction?.(); }}
                onDelete={() => { setShowImagePreview(false); previewDeleteAction?.(); }}
            />

            <ConfirmationModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete payment account?"
                message="This account will be removed everywhere. Rooms and properties using it must be reassigned first."
                confirmText="Delete"
                loading={deleting}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        flex: 1,
        paddingRight: 4,
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
    },
    uploadBox: {
        width: '100%',
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
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
        backgroundColor: isDark ? theme.colors.accent + '20' : theme.colors.accentLight,
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
        backgroundColor: isDark ? '#EF444420' : '#FEF2F2',
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
});
