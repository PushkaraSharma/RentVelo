import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toggle from '../../components/common/Toggle';
import SuccessModal from '../../components/common/SuccessModal';
import PickerBottomSheet from '../../components/common/PickerBottomSheet';
import { ArrowLeft, UserPlus, FileText, Upload, Calendar, X, Mail, MapPin, Briefcase, Users, Phone, Contact2, User, Building, Check } from 'lucide-react-native';
import { createTenant } from '../../db';
import { CURRENCY, TITLES, PROFESSIONS, GUEST_COUNTS, LEASE_TYPES, RENT_CYCLE_OPTIONS, FURNISHING_TYPES } from '../../utils/Constants';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';

export default function AddTenantScreen({ navigation, route }: any) {
    const unitId = route?.params?.unitId;
    const propertyId = route?.params?.propertyId;
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Pickers visibility
    const [showProfessionPicker, setShowProfessionPicker] = useState(false);
    const [showGuestPicker, setShowGuestPicker] = useState(false);

    // Personal Info
    const [title, setTitle] = useState('Mr.');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [primaryPhone, setPrimaryPhone] = useState('');
    const [profession, setProfession] = useState('');
    const [guestCount, setGuestCount] = useState('');

    // Address & Work
    const [nativeAddress, setNativeAddress] = useState('');
    const [workAddress, setWorkAddress] = useState('');

    // Deposit & Lease
    const [depositAmount, setDepositAmount] = useState('');
    const [includeInBill, setIncludeInBill] = useState(true);
    const [leaseType, setLeaseType] = useState<'monthly' | 'yearly'>('monthly');
    const [moveInDate, setMoveInDate] = useState(new Date());

    // Additional Info (Emergency Contact)
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    // Documents
    const [aadhaarUri, setAadhaarUri] = useState<string | null>(null);
    const [panUri, setPanUri] = useState<string | null>(null);

    const importFromContacts = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
            });

            if (data.length > 0) {
                // For a real app, you'd show a contact picker here. 
                // For now, we'll just show the first contact as a demo or use a simpler picker
                Alert.alert('Contacts', 'Contact picker would open here. Selecting the first one for demo.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            const contact = data[0];
                            if (contact.name) setFullName(contact.name);
                            if (contact.phoneNumbers?.[0]) setPrimaryPhone(contact.phoneNumbers[0].number || '');
                            if (contact.emails?.[0]) setEmail(contact.emails[0].email || '');
                        }
                    }
                ]);
            }
        } else {
            Alert.alert('Permission Denied', 'Please allow contact access to use this feature.');
        }
    };

    const pickDocument = async (type: 'aadhaar' | 'pan') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (type === 'aadhaar') setAadhaarUri(result.assets[0].uri);
            else setPanUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter tenant name');
            return;
        }
        if (!primaryPhone.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return;
        }

        setLoading(true);
        try {
            await createTenant({
                property_id: propertyId,
                unit_id: unitId || null,
                name: `${title} ${fullName}`,
                phone: primaryPhone,
                email: email || null,
                profession: profession || null,
                guest_count: guestCount || null,
                work_address: workAddress || null,
                emergency_contact_name: emergencyName || null,
                emergency_contact_phone: emergencyPhone || null,
                lease_type: leaseType,
                security_deposit: depositAmount ? parseFloat(depositAmount) : 0,
                status: 'active',
                move_in_date: moveInDate,
            });

            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error creating tenant:', error);
            Alert.alert('Error', 'Failed to register tenant. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Register New Tenant</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Personal Info */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
                        <Pressable onPress={importFromContacts} style={styles.importBtn}>
                            <Contact2 size={16} color={theme.colors.accent} />
                            <Text style={styles.importBtnText}>Import Contact</Text>
                        </Pressable>
                    </View>

                    <View style={styles.section}>
                        {/* Title Segment */}
                        <Text style={styles.inputLabel}>Title</Text>
                        <View style={styles.furnishingContainer}>
                            {TITLES.map((type) => (
                                <Pressable
                                    key={type.id}
                                    style={[
                                        styles.furnishingBtn,
                                        type.id === title && styles.furnishingBtnActive
                                    ]}
                                    onPress={() => setTitle(type.id)}
                                >
                                    <Text style={[
                                        styles.furnishingText,
                                        type.id === title && styles.furnishingTextActive
                                    ]}>{type.label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Input
                            label="Full Name"
                            placeholder="e.g. John Doe"
                            value={fullName}
                            onChangeText={setFullName}
                            icon={<User size={20} color={theme.colors.textTertiary} />}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                <Text style={styles.inputLabel}>Profession</Text>
                                <Pressable style={styles.pickerTrigger} onPress={() => setShowProfessionPicker(true)}>
                                    <Text numberOfLines={1} style={[styles.pickerTriggerText, !profession && { color: theme.colors.textTertiary }]}>
                                        {profession || 'Select'}
                                    </Text>
                                    <Briefcase size={16} color={theme.colors.accent} />
                                </Pressable>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>No. of People</Text>
                                <Pressable style={styles.pickerTrigger} onPress={() => setShowGuestPicker(true)}>
                                    <Text style={[styles.pickerTriggerText, !guestCount && { color: theme.colors.textTertiary }]}>
                                        {guestCount || 'Select'}
                                    </Text>
                                    <Users size={16} color={theme.colors.accent} />
                                </Pressable>
                            </View>
                        </View>

                        <Input
                            label="Email Address (Optional)"
                            placeholder="e.g. john@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon={<Mail size={20} color={theme.colors.textTertiary} />}
                        />
                    </View>

                    {/* Contact & Address */}
                    <Text style={styles.sectionLabel}>CONTACT & ADDRESS</Text>
                    <View style={styles.section}>
                        <Input
                            label="Phone Number"
                            placeholder="+91 00000 00000"
                            value={primaryPhone}
                            onChangeText={setPrimaryPhone}
                            keyboardType="phone-pad"
                            icon={<Phone size={20} color={theme.colors.textTertiary} />}
                        />

                        <Input
                            label="Work Address (Optional)"
                            placeholder="Company name or office address"
                            value={workAddress}
                            onChangeText={setWorkAddress}
                            icon={<Building size={20} color={theme.colors.textTertiary} />}
                        />

                        <Input
                            label="Permanent Address"
                            placeholder="Enter native place address"
                            value={nativeAddress}
                            onChangeText={setNativeAddress}
                            multiline
                            numberOfLines={2}
                            icon={<MapPin size={20} color={theme.colors.textTertiary} />}
                        />
                    </View>

                    {/* Lease & Money */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>LEASE & DEPOSIT</Text>
                        <View style={styles.section}>
                            <Input
                                label="Security Deposit Amount"
                                placeholder={`${CURRENCY} 0.00`}
                                value={depositAmount}
                                onChangeText={setDepositAmount}
                                keyboardType="numeric"
                            />

                            <Pressable style={styles.checkboxRow} onPress={() => setIncludeInBill(!includeInBill)}>
                                <View style={[styles.checkbox, includeInBill && styles.checkboxActive]}>
                                    {includeInBill && <Check size={14} color="#FFF" />}
                                </View>
                                <Text style={styles.checkboxLabel}>Include in first receipt automatically</Text>
                            </Pressable>

                            <Text style={[styles.inputLabel, { marginTop: theme.spacing.m }]}>Lease Term</Text>
                            {/* <Pressable
                                                        key={type.id}
                                                        style={[
                                                            styles.rentTypeBtn,
                                                            rentPaymentType === type.id && styles.rentTypeBtnActive
                                                        ]}
                                                        onPress={() => setRentPaymentType(type.id)}
                                                    >
                                                        <View style={[styles.radio, rentPaymentType === type.id && styles.radioActive]}>
                                                            {rentPaymentType === type.id && <View style={styles.radioInner} />}
                                                        </View>
                                                        <Text style={[
                                                            styles.rentTypeText,
                                                            rentPaymentType === type.id && styles.rentTypeTextActive
                                                        ]}>
                                                            {type.label}
                                                        </Text>
                                                    </Pressable> */}
                            <View style={styles.leaseOptionContainer}>
                                {LEASE_TYPES.map((option: any, index: number) => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.leaseOption,
                                            index !== LEASE_TYPES.length - 1 && styles.borderBottom,
                                            leaseType === option.id && styles.leaseOptionActive
                                        ]}
                                        onPress={() => setLeaseType(option.id as 'monthly' | 'yearly')}
                                    >
                                        <View style={[styles.radio, leaseType === option.id && styles.radioActive]}>
                                            {leaseType === option.id && <View style={styles.radioInner} />}
                                        </View>

                                        <Text style={[styles.optionTitle, leaseType === option.id && styles.leaseTextActive]}>{option.label}</Text>


                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                    {/* Additional Info */}
                    <Text style={styles.sectionLabel}>ADDITIONAL INFO</Text>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                <Input
                                    label="Emergency Contact Name"
                                    placeholder="e.g. Father/Partner"
                                    value={emergencyName}
                                    onChangeText={setEmergencyName}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Emergency Phone"
                                    placeholder="Ph. No."
                                    value={emergencyPhone}
                                    onChangeText={setEmergencyPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Document Vault */}
                    <Text style={styles.sectionLabel}>DOCUMENT VAULT</Text>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                <Text style={styles.docLabel}>AADHAAR CARD</Text>
                                <Pressable style={styles.uploadBox} onPress={() => pickDocument('aadhaar')}>
                                    {aadhaarUri ? (
                                        <Image source={{ uri: aadhaarUri }} style={styles.docImg} />
                                    ) : (
                                        <>
                                            <Upload size={20} color={theme.colors.accent} />
                                            <Text style={styles.uploadText}>Upload</Text>
                                        </>
                                    )}
                                    {aadhaarUri && (
                                        <Pressable style={styles.removeDoc} onPress={() => setAadhaarUri(null)}>
                                            <X size={12} color="#FFF" />
                                        </Pressable>
                                    )}
                                </Pressable>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docLabel}>PAN CARD</Text>
                                <Pressable style={styles.uploadBox} onPress={() => pickDocument('pan')}>
                                    {panUri ? (
                                        <Image source={{ uri: panUri }} style={styles.docImg} />
                                    ) : (
                                        <>
                                            <Upload size={20} color={theme.colors.accent} />
                                            <Text style={styles.uploadText}>Upload</Text>
                                        </>
                                    )}
                                    {panUri && (
                                        <Pressable style={styles.removeDoc} onPress={() => setPanUri(null)}>
                                            <X size={12} color="#FFF" />
                                        </Pressable>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <Button
                        title="Create Tenant & Generate Contract"
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                        icon={<UserPlus size={20} color="#FFF" />}
                    />

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Pickers */}
            <PickerBottomSheet
                visible={showProfessionPicker}
                onClose={() => setShowProfessionPicker(false)}
                title="Select Profession"
                options={PROFESSIONS}
                selectedValue={profession}
                onSelect={setProfession}
            />

            <PickerBottomSheet
                visible={showGuestPicker}
                onClose={() => setShowGuestPicker(false)}
                title="Number of People"
                options={GUEST_COUNTS}
                selectedValue={guestCount}
                onSelect={setGuestCount}
            />

            {/* Success Modal */}
            <SuccessModal
                visible={showSuccessModal}
                title="🎉 Tenant Registered!"
                subtitle="Tenant has been added to the room successfully."
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
                actions={[
                    {
                        id: 'view-contract',
                        title: 'View Rent Contract',
                        subtitle: 'Preview or share the generated agreement',
                        icon: FileText,
                        onPress: () => {
                            setShowSuccessModal(false);
                            // navigation logic for contract
                        }
                    }
                ]}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
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
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.m
    },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 6,
        borderRadius: 20
    },
    importBtnText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
    },
    section: {
        marginBottom: theme.spacing.m
    },
    titleSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: 4,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: theme.borderRadius.m
    },
    segmentBtnActive: {
        backgroundColor: '#FFFFFF',
        ...theme.shadows.small
    },
    segmentText: {
        fontSize: theme.typography.s,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary
    },
    segmentTextActive: {
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
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
        maxWidth: '80%',
    },
    row: {
        flexDirection: 'row',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        marginRight: theme.spacing.m,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxActive: {
        backgroundColor: theme.colors.accent
    },
    checkboxLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        flex: 1
    },
    leaseOptionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        marginTop: theme.spacing.s
    },
    leaseOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    optionTitle: {
        flex: 1,
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.m,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center'
    },
    radioActive: {
        borderColor: theme.colors.accent,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.accent
    },
    docLabel: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    uploadBox: {
        height: 120,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative'
    },
    docImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    uploadText: {
        fontSize: 10,
        color: theme.colors.accent,
        marginTop: 6,
        fontWeight: theme.typography.bold
    },
    removeDoc: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    submitBtn: {
        backgroundColor: theme.colors.accent,
        marginTop: theme.spacing.xl,
        marginBottom: 40
    },
    furnishingContainer: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.m
    },
    furnishingBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        backgroundColor: theme.colors.surface
    },
    furnishingBtnActive: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accentLight
    },
    furnishingText: {
        fontSize: theme.typography.s,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium
    },
    furnishingTextActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
    },
    leaseOptionActive: {
        backgroundColor: theme.colors.accentLight,
    },
    leaseTextActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
    }
});
