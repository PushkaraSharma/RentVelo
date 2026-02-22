import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, KeyboardAvoidingView, Platform, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toggle from '../../components/common/Toggle';
import SuccessModal from '../../components/common/SuccessModal';
import PickerBottomSheet from '../../components/common/PickerBottomSheet';
import RentLedgerModal from '../../components/modals/RentLedgerModal';
import { UserPlus, FileText, Upload, Calendar, X, Mail, MapPin, Briefcase, Users, Phone, Contact2, User, Building, Check, Camera, Edit3, Info, Edit2, Layout } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { createTenant, updateTenant, getTenantById, getPropertyById, getUnitById, Property, Unit, Tenant } from '../../db';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { CURRENCY, TITLES, PROFESSIONS, GUEST_COUNTS, LEASE_TYPES, RENT_CYCLE_OPTIONS, FURNISHING_TYPES, LEASE_PERIOD_UNITS } from '../../utils/Constants';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';

export default function AddTenantScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const unitId = route?.params?.unitId;
    const propertyId = route?.params?.propertyId;
    const tenantId = route?.params?.tenantId;
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalStatus, setOriginalStatus] = useState<'active' | 'inactive' | 'archived'>('active');
    const [originalPropertyId, setOriginalPropertyId] = useState<number | null>(null);
    const [originalUnitId, setOriginalUnitId] = useState<number | null>(null);

    // Pickers visibility
    const [showProfessionPicker, setShowProfessionPicker] = useState(false);
    const [showGuestPicker, setShowGuestPicker] = useState(false);

    // Ledger Data
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [currProperty, setCurrProperty] = useState<Property | null>(null);
    const [currUnit, setCurrUnit] = useState<Unit | null>(null);
    const [currTenant, setCurrTenant] = useState<Tenant | null>(null);
    const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);

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
    const [leaseType, setLeaseType] = useState<'monthly' | 'yearly' | 'fixed'>('monthly');
    const [moveInDate, setMoveInDate] = useState(new Date());
    const [rentStartDate, setRentStartDate] = useState(new Date());
    const [leaseStartDate, setLeaseStartDate] = useState(new Date());
    const [leasePeriodValue, setLeasePeriodValue] = useState('');
    const [leasePeriodUnit, setLeasePeriodUnit] = useState<'days' | 'months' | 'years'>('months');

    // Date Picker State
    const [showMoveInPicker, setShowMoveInPicker] = useState(false);
    const [showRentStartPicker, setShowRentStartPicker] = useState(false);
    const [showLeaseStartPicker, setShowLeaseStartPicker] = useState(false);

    // Photo
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Additional Info (Emergency Contact)
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    // Documents
    const [aadhaarFrontUri, setAadhaarFrontUri] = useState<string | null>(null);
    const [aadhaarBackUri, setAadhaarBackUri] = useState<string | null>(null);
    const [panUri, setPanUri] = useState<string | null>(null);
    React.useEffect(() => {
        if (tenantId) {
            setIsEditMode(true);
            loadTenantData();
        }
        loadPropertyAndUnit();
    }, [tenantId, propertyId, unitId]);

    const loadPropertyAndUnit = async () => {
        if (propertyId) {
            const prop = await getPropertyById(propertyId);
            setCurrProperty(prop);
        }
        if (unitId) {
            const u = await getUnitById(unitId);
            setCurrUnit(u);
        }
    };

    const loadTenantData = async () => {
        try {
            const { getTenantById } = await import('../../db');
            const tenant = await getTenantById(tenantId);
            if (tenant) {
                // Parse name (handle title)
                const nameParts = tenant.name.split(' ');
                if (TITLES.some(t => t.id === nameParts[0])) {
                    setTitle(nameParts[0]);
                    setFullName(nameParts.slice(1).join(' '));
                } else {
                    setFullName(tenant.name);
                }

                setEmail(tenant.email || '');
                setPrimaryPhone(tenant.phone);
                setProfession(tenant.profession || '');
                setGuestCount(tenant.guest_count || '');
                setWorkAddress(tenant.work_address || '');
                setDepositAmount(tenant.security_deposit?.toString() || '');
                setLeaseType(tenant.lease_type as any || 'monthly');
                if (tenant.move_in_date) setMoveInDate(new Date(tenant.move_in_date));
                if (tenant.rent_start_date) setRentStartDate(new Date(tenant.rent_start_date));
                if (tenant.lease_start_date) setLeaseStartDate(new Date(tenant.lease_start_date)); setEmergencyName(tenant.emergency_contact_name || '');
                setEmergencyPhone(tenant.emergency_contact_phone || '');
                setPhotoUri(tenant.photo_uri || null);
                setAadhaarFrontUri(tenant.aadhaar_front_uri || null);
                setAadhaarBackUri(tenant.aadhaar_back_uri || null);
                setPanUri(tenant.pan_uri || null);

                // Preserve existing stay info
                setOriginalStatus(tenant.status as any || 'active');
                setOriginalPropertyId(tenant.property_id);
                setOriginalUnitId(tenant.unit_id);
            }
        } catch (error) {
            console.error('Error loading tenant:', error);
        }
    };

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

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

    const pickDocument = async (type: 'aadhaar_front' | 'aadhaar_back' | 'pan') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (type === 'aadhaar_front') setAadhaarFrontUri(result.assets[0].uri);
            else if (type === 'aadhaar_back') setAadhaarBackUri(result.assets[0].uri);
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
            const tenantData = {
                property_id: isEditMode ? originalPropertyId : propertyId,
                unit_id: isEditMode ? originalUnitId : (unitId || null),
                name: `${title} ${fullName}`,
                phone: primaryPhone,
                email: email || null,
                profession: profession || null,
                guest_count: guestCount || null,
                work_address: workAddress || null,
                emergency_contact_name: emergencyName || null,
                emergency_contact_phone: emergencyPhone || null,
                lease_type: leaseType,
                lease_start_date: leaseType === 'fixed' ? leaseStartDate : null,
                lease_period_value: leaseType === 'fixed' ? parseInt(leasePeriodValue) : null,
                lease_period_unit: leaseType === 'fixed' ? leasePeriodUnit : null,
                lease_end_date: leaseType === 'fixed' ? calculateExpiry() : null,
                security_deposit: depositAmount ? parseFloat(depositAmount) : 0,
                status: isEditMode ? originalStatus : 'active' as any,
                move_in_date: moveInDate,
                rent_start_date: rentStartDate,
                photo_uri: photoUri,
                aadhaar_front_uri: aadhaarFrontUri,
                aadhaar_back_uri: aadhaarBackUri,
                pan_uri: panUri,
            };

            if (isEditMode) {
                await updateTenant(tenantId, tenantData);
                Alert.alert('Success', 'Tenant updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                const id = await createTenant(tenantData);
                setNewlyCreatedId(id);
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error saving tenant:', error);
            Alert.alert('Error', 'Failed to save tenant. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const calculateExpiry = () => {
        if (!leasePeriodValue || !leaseStartDate) return null;
        const date = new Date(leaseStartDate);
        const val = parseInt(leasePeriodValue);
        if (leasePeriodUnit === 'days') date.setDate(date.getDate() + val);
        else if (leasePeriodUnit === 'months') date.setMonth(date.getMonth() + val);
        else if (leasePeriodUnit === 'years') date.setFullYear(date.getFullYear() + val);
        return date;
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Header title={isEditMode ? 'Update Tenant' : 'Register New Tenant'} />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Photo Selection */}
                    <View style={styles.photoSection}>
                        <View>
                            <Pressable style={styles.photoContainer} onPress={pickPhoto}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.tenantPhoto} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Camera size={32} color={theme.colors.textTertiary} />
                                        <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                                    </View>
                                )}
                            </Pressable>
                            <View style={styles.photoEditIcon}>
                                <Edit2 size={16} color="#FFF" />
                            </View>
                        </View>
                    </View>

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
                            maxLength={10}
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

                    {/* Important Dates */}
                    <Text style={styles.sectionLabel}>IMPORTANT DATES</Text>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                <Text style={styles.inputLabel}>Move-in Date</Text>
                                <Pressable style={styles.pickerTrigger} onPress={() => setShowMoveInPicker(true)}>
                                    <Text style={styles.pickerTriggerText}>{moveInDate.toLocaleDateString()}</Text>
                                    <Calendar size={16} color={theme.colors.accent} />
                                </Pressable>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Rent Start Date</Text>
                                <Pressable style={styles.pickerTrigger} onPress={() => setShowRentStartPicker(true)}>
                                    <Text style={styles.pickerTriggerText}>{rentStartDate.toLocaleDateString()}</Text>
                                    <Calendar size={16} color={theme.colors.accent} />
                                </Pressable>
                            </View>
                        </View>
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

                            <Text style={[styles.inputLabel, { marginTop: theme.spacing.m }]}>Lease Type</Text>
                            <View style={styles.leaseOptionContainer}>
                                {LEASE_TYPES.map((option: any, index: number) => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.leaseOption,
                                            index !== LEASE_TYPES.length - 1 && styles.borderBottom,
                                            leaseType === option.id && styles.leaseOptionActive
                                        ]}
                                        onPress={() => setLeaseType(option.id as any)}
                                    >
                                        <View style={[styles.radio, leaseType === option.id && styles.radioActive]}>
                                            {leaseType === option.id && <View style={styles.radioInner} />}
                                        </View>

                                        <Text style={[styles.optionTitle, leaseType === option.id && styles.leaseTextActive]}>{option.label}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {leaseType === 'fixed' && (
                                <View style={styles.fixedLeaseContainer}>
                                    <Input
                                        label="Lease Start Date"
                                        value={leaseStartDate.toLocaleDateString()}
                                        editable={false}
                                        icon={<Calendar size={20} color={theme.colors.accent} />}
                                        onPress={() => setShowLeaseStartPicker(true)}
                                    />

                                    <Text style={styles.inputLabel}>Lease Period</Text>
                                    <View style={styles.periodRow}>
                                        <TextInput
                                            style={styles.periodInput}
                                            placeholder="Number"
                                            value={leasePeriodValue}
                                            onChangeText={setLeasePeriodValue}
                                            keyboardType="numeric"
                                        />
                                        <View style={styles.unitSelector}>
                                            {LEASE_PERIOD_UNITS.map(unit => (
                                                <Pressable
                                                    key={unit.id}
                                                    style={[styles.unitBtn, leasePeriodUnit === unit.id && styles.unitBtnActive]}
                                                    onPress={() => setLeasePeriodUnit(unit.id as any)}
                                                >
                                                    <Text style={[styles.unitBtnText, leasePeriodUnit === unit.id && styles.unitBtnTextActive]}>
                                                        {unit.label}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>

                                    {leasePeriodValue && (
                                        <View style={styles.expiryNote}>
                                            <Info size={16} color={theme.colors.accent} />
                                            <Text style={styles.expiryText}>
                                                Lease expires on: <Text style={{ fontWeight: 'bold' }}>{calculateExpiry()?.toLocaleDateString()}</Text>
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
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
                                <Text style={styles.docLabel}>AADHAAR FRONT</Text>
                                <Pressable style={styles.uploadBox} onPress={() => pickDocument('aadhaar_front')}>
                                    {aadhaarFrontUri ? (
                                        <Image source={{ uri: aadhaarFrontUri }} style={styles.docImg} />
                                    ) : (
                                        <>
                                            <Upload size={20} color={theme.colors.accent} />
                                            <Text style={styles.uploadText}>Upload</Text>
                                        </>
                                    )}
                                    {aadhaarFrontUri && (
                                        <Pressable style={styles.removeDoc} onPress={() => setAadhaarFrontUri(null)}>
                                            <X size={12} color="#FFF" />
                                        </Pressable>
                                    )}
                                </Pressable>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docLabel}>AADHAAR BACK</Text>
                                <Pressable style={styles.uploadBox} onPress={() => pickDocument('aadhaar_back')}>
                                    {aadhaarBackUri ? (
                                        <Image source={{ uri: aadhaarBackUri }} style={styles.docImg} />
                                    ) : (
                                        <>
                                            <Upload size={20} color={theme.colors.accent} />
                                            <Text style={styles.uploadText}>Upload</Text>
                                        </>
                                    )}
                                    {aadhaarBackUri && (
                                        <Pressable style={styles.removeDoc} onPress={() => setAadhaarBackUri(null)}>
                                            <X size={12} color="#FFF" />
                                        </Pressable>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                        <View style={[styles.row, { marginTop: theme.spacing.m }]}>
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
                        title={isEditMode ? "Save Changes" : "Create Tenant"}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                        icon={isEditMode ? <Check size={20} color="#FFF" /> : <UserPlus size={20} color="#FFF" />}
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

            {/* Date Pickers */}
            <DateTimePickerModal
                isVisible={showMoveInPicker}
                mode="date"
                date={moveInDate}
                onConfirm={(date) => { setShowMoveInPicker(false); setMoveInDate(date); }}
                onCancel={() => setShowMoveInPicker(false)}
            />
            <DateTimePickerModal
                isVisible={showRentStartPicker}
                mode="date"
                date={rentStartDate}
                onConfirm={(date) => { setShowRentStartPicker(false); setRentStartDate(date); }}
                onCancel={() => setShowRentStartPicker(false)}
            />
            <DateTimePickerModal
                isVisible={showLeaseStartPicker}
                mode="date"
                date={leaseStartDate}
                onConfirm={(date) => { setShowLeaseStartPicker(false); setLeaseStartDate(date); }}
                onCancel={() => setShowLeaseStartPicker(false)}
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
                        onPress: async () => {
                            const id = isEditMode ? tenantId : newlyCreatedId;
                            if (id) {
                                const tenant = await getTenantById(id);
                                if (tenant) {
                                    setCurrTenant(tenant);
                                    setShowSuccessModal(false);
                                    setShowLedgerModal(true);
                                }
                            }
                        }
                    }
                ]}
            />

            {currProperty && currUnit && (
                <RentLedgerModal
                    visible={showLedgerModal}
                    onClose={() => {
                        setShowLedgerModal(false);
                        navigation.goBack(); // Return after generating/closing ledger modal from success screen
                    }}
                    tenant={currTenant}
                    property={currProperty}
                    unit={currUnit}
                    payments={[]} // New tenant has no payments yet
                />
            )}
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
        marginBottom: theme.spacing.xs,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
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
        backgroundColor: theme.colors.surface,
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
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    checkboxLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium
    },
    leaseOptionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden'
    },
    leaseOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        gap: theme.spacing.m
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    optionTitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium
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
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    uploadBox: {
        height: 100,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
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
        marginTop: 4,
        fontWeight: theme.typography.bold
    },
    removeDoc: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    submitBtn: {
        backgroundColor: theme.colors.accent,
        marginTop: theme.spacing.l,
        marginBottom: 40
    },
    furnishingContainer: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.m
    },
    furnishingBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        backgroundColor: theme.colors.surface
    },
    furnishingBtnActive: {
        borderColor: theme.colors.accent,
        backgroundColor: isDark ? theme.colors.accent + '30' : theme.colors.accentLight
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
        backgroundColor: theme.colors.accentLight + '20',
    },
    leaseTextActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
    },
    photoSection: {
        alignItems: 'center',
        marginVertical: theme.spacing.m
    },
    photoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    tenantPhoto: {
        width: '100%',
        height: '100%'
    },
    photoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    photoPlaceholderText: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        marginTop: 4
    },
    photoEditIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.accent,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.surface,
    },
    fixedLeaseContainer: {
        marginTop: theme.spacing.l,
        padding: theme.spacing.m,
        backgroundColor: isDark ? theme.colors.background : theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    periodRow: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m
    },
    periodInput: {
        flex: 1,
        height: 50,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.m,
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary
    },
    unitSelector: {
        flex: 2,
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    unitBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.s
    },
    unitBtnActive: {
        backgroundColor: theme.colors.surface,
        ...theme.shadows.small
    },
    unitBtnText: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    unitBtnTextActive: {
        color: theme.colors.accent,
        fontWeight: 'bold'
    },
    expiryNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: theme.spacing.m,
        padding: 10,
        backgroundColor: theme.colors.accentLight,
        borderRadius: 8
    },
    expiryText: {
        fontSize: 13,
        color: theme.colors.textPrimary
    }
});
