import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Toggle from '../../../components/common/Toggle';
import { ArrowLeft, Camera, Building, Layers, User, Phone, Mail, MapPin, Calendar } from 'lucide-react-native';
import Header from '../../../components/common/Header';
import * as ImagePicker from 'expo-image-picker';
import { createProperty, updateProperty, getPropertyById } from '../../../db';
import SuccessModal from '../../../components/common/SuccessModal';
import { PROPERTY_TYPES, AMENITIES, RENT_PAYMENT_TYPES } from '../../../utils/Constants';


export default function AddPropertyScreen({ navigation, route }: any) {
    const propertyId = route?.params?.propertyId;
    const isEditMode = !!propertyId;
    const [image, setImage] = useState<string | null>(null);
    const [propertyType, setPropertyType] = useState('house');
    const [isMultiUnit, setIsMultiUnit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);

    // Form State
    const [propertyName, setPropertyName] = useState('');
    const [address, setAddress] = useState('');
    const [buildDate, setBuildDate] = useState('');
    const [totalFloors, setTotalFloors] = useState('');
    const [totalUnits, setTotalUnits] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [rentPaymentType, setRentPaymentType] = useState('previous_month');
    const [customAmenity, setCustomAmenity] = useState('');

    React.useEffect(() => {
        if (isEditMode) {
            loadPropertyData();
        }
    }, [propertyId]);

    const loadPropertyData = async () => {
        try {
            const data = await getPropertyById(propertyId);
            if (data) {
                setPropertyName(data.name);
                setAddress(data.address);
                setPropertyType(data.type);
                setIsMultiUnit(data.is_multi_unit ?? false);
                setImage(data.image_uri || null);
                setSelectedAmenities(data.amenities ? JSON.parse(data.amenities) : []);
                setOwnerName(data.owner_name || '');
                setPhone(data.owner_phone || '');
                if (data.rent_payment_type) {
                    setRentPaymentType(data.rent_payment_type);
                }
            }
        } catch (error) {
            console.error('Error loading property:', error);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const toggleAmenity = (id: string) => {
        if (selectedAmenities.includes(id)) {
            setSelectedAmenities(selectedAmenities.filter(item => item !== id));
        } else {
            setSelectedAmenities([...selectedAmenities, id]);
        }
    };

    const addCustomAmenity = () => {
        if (customAmenity.trim()) {
            setSelectedAmenities([...selectedAmenities, customAmenity.trim()]);
            setCustomAmenity('');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!propertyName.trim()) {
            Alert.alert('Error', 'Please enter property name');
            return;
        }
        if (!address.trim()) {
            Alert.alert('Error', 'Please enter property address');
            return;
        }

        setLoading(true);
        try {
            const propertyData: any = {
                name: propertyName,
                address: address,
                type: propertyType as any,
                image_uri: image || undefined,
                amenities: JSON.stringify(selectedAmenities),
                is_multi_unit: isMultiUnit,
                owner_name: ownerName || undefined,
                owner_phone: phone || undefined,
                rent_payment_type: rentPaymentType,
            };

            if (isEditMode) {
                await updateProperty(propertyId, propertyData);
                Alert.alert('Success', 'Property updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                const newId = await createProperty(propertyData);
                setCreatedPropertyId(newId);
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error saving property:', error);
            Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} property. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Header title={isEditMode ? 'Update Property' : 'Create New Property'} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Image Upload */}
                    <Pressable style={styles.imageUpload} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.uploadedImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <View style={styles.cameraIconBg}>
                                    <Camera size={24} color={theme.colors.accent} />
                                </View>
                                <Text style={styles.uploadText}>Add Building Photo</Text>
                                <Text style={styles.uploadSubtext}>Upload a clear image of your property</Text>
                                <View style={styles.uploadBtn}>
                                    <Text style={styles.uploadBtnText}>UPLOAD PHOTO</Text>
                                </View>
                            </View>
                        )}
                    </Pressable>

                    {/* Property Type */}
                    <Text style={styles.sectionTitle}>Property Type</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeScrollContent}
                        style={styles.typeScroll}
                    >
                        {PROPERTY_TYPES.map((type) => (
                            <Pressable
                                key={type.id}
                                style={[
                                    styles.typeCard,
                                    propertyType === type.id && styles.activeTypeCard,
                                ]}
                                onPress={() => {
                                    setPropertyType(type.id);
                                    // Auto-toggle multi-room based on type
                                    if (['building', 'pg'].includes(type.id)) {
                                        setIsMultiUnit(true);
                                    } else if (['house', 'shop', 'flat'].includes(type.id)) {
                                        setIsMultiUnit(false);
                                    }
                                }}
                            >
                                <type.icon
                                    size={20}
                                    color={propertyType === type.id ? '#FFFFFF' : theme.colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.typeText,
                                        propertyType === type.id && styles.activeTypeText,
                                    ]}
                                >
                                    {type.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Multi-room Toggle */}
                    <View style={styles.toggleCard}>
                        <View style={styles.toggleIconBg}>
                            <Layers size={20} color={theme.colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleTitle}>Multi-room Property?</Text>
                            <Text style={styles.toggleSubtitle}>Enable for multiple rooms</Text>
                        </View>
                        <Toggle value={isMultiUnit} onValueChange={setIsMultiUnit} />
                    </View>

                    {/* Property Name & Address */}
                    <Input
                        label="PROPERTY NAME"
                        placeholder="e.g. Sunshine Apartments"
                        value={propertyName}
                        onChangeText={setPropertyName}
                    />
                    <Input
                        label="ADDRESS"
                        placeholder="Full address"
                        value={address}
                        onChangeText={setAddress}
                        icon={<MapPin size={20} color={theme.colors.textSecondary} />}
                    />

                    {/* Build Date */}
                    <Input
                        label="BUILD DATE (Optional)"
                        placeholder="e.g. 2020 or Jan 2020"
                        value={buildDate}
                        onChangeText={setBuildDate}
                        icon={<Calendar size={20} color={theme.colors.textSecondary} />}
                    />

                    {/* Basic Info */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: isMultiUnit ? theme.spacing.m : 0 }}>
                            <Input
                                label="TOTAL FLOORS"
                                placeholder="e.g. 3"
                                value={totalFloors}
                                onChangeText={setTotalFloors}
                                keyboardType="numeric"
                            />
                        </View>
                        {isMultiUnit && (
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="TOTAL UNITS"
                                    placeholder="e.g. 12"
                                    value={totalUnits}
                                    onChangeText={setTotalUnits}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}
                    </View>

                    {/* Rent Payment Type */}
                    <Text style={styles.sectionTitle}>Take Rent Of</Text>
                    <View style={styles.rentTypeContainer}>
                        {RENT_PAYMENT_TYPES.map((type) => (
                            <Pressable
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
                            </Pressable>
                        ))}
                    </View>

                    {/* Owner Details */}
                    <Text style={styles.sectionTitle}>Owner Details</Text>
                    <Input
                        placeholder="Full Name"
                        value={ownerName}
                        onChangeText={setOwnerName}
                        icon={<User size={20} color={theme.colors.textSecondary} />}
                    />
                    <Input
                        placeholder="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        icon={<Phone size={20} color={theme.colors.textSecondary} />}
                    />
                    <Input
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        icon={<Mail size={20} color={theme.colors.textSecondary} />}
                    />

                    {/* Amenities */}
                    <View style={styles.amenitiesHeader}>
                        <Text style={styles.sectionTitle}>Amenities</Text>
                        <Pressable onPress={() => {
                            Alert.prompt(
                                'Add Custom Amenity',
                                'Enter amenity name',
                                (text) => {
                                    if (text && text.trim()) {
                                        setSelectedAmenities([...selectedAmenities, text.trim()]);
                                    }
                                }
                            );
                        }}>
                            <Text style={styles.addCustom}>+ ADD CUSTOM</Text>
                        </Pressable>
                    </View>

                    <View style={styles.amenitiesGrid}>
                        {AMENITIES.map((item) => {
                            const isSelected = selectedAmenities.includes(item.id);
                            return (
                                <Pressable
                                    key={item.id}
                                    style={[
                                        styles.amenityCard,
                                        isSelected && styles.activeAmenityCard,
                                    ]}
                                    onPress={() => toggleAmenity(item.id)}
                                >
                                    <item.icon
                                        size={24}
                                        color={isSelected ? theme.colors.accent : theme.colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.amenityText,
                                            isSelected && styles.activeAmenityText,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Button
                        title={isEditMode ? "Save Changes" : "Create Property"}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                        icon={<ArrowLeft size={20} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <SuccessModal
                visible={showSuccessModal}
                title="🎉 Property Created!"
                subtitle="What would you like to do next?"
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
                actions={[
                    ...(isMultiUnit ? [{
                        id: 'add-unit',
                        title: 'Add Room',
                        subtitle: 'Add rooms to this property',
                        icon: Building,
                        onPress: () => {
                            setShowSuccessModal(false);
                            navigation.replace('AddUnit', { propertyId: createdPropertyId });
                        }
                    }] : [{
                        id: 'add-tenant',
                        title: 'Add Tenant',
                        subtitle: 'Register a tenant for this property',
                        icon: User,
                        onPress: () => {
                            setShowSuccessModal(false);
                            navigation.replace('AddTenant', { propertyId: createdPropertyId });
                        }
                    }])
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
        padding: theme.spacing.m,
    },
    imageUpload: {
        height: 200,
        backgroundColor: theme.colors.surface, // Changed from #EFF6FF to surface for cleaner look, outline can be dashed
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.accentLight, // Light blue border
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
        overflow: 'hidden',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    cameraIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
        ...theme.shadows.small
    },
    uploadText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4
    },
    uploadSubtext: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m
    },
    uploadBtn: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.s,
        borderRadius: theme.borderRadius.m
    },
    uploadBtnText: {
        color: '#FFFFFF',
        fontWeight: theme.typography.bold,
        fontSize: 12
    },
    sectionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    typeRow: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    typeCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeTypeCard: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    typeText: {
        marginLeft: theme.spacing.s,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
    },
    activeTypeText: {
        color: '#FFFFFF',
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleIconBg: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    toggleTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    toggleSubtitle: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
    },
    amenitiesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m
    },
    addCustom: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        letterSpacing: 0.5
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    amenityCard: {
        width: '22%', // Roughly 4 items per row
        aspectRatio: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeAmenityCard: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accentLight
    },
    amenityText: {
        fontSize: 10,
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.xs,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    activeAmenityText: {
        color: theme.colors.accent
    },
    submitBtn: {
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.colors.accent
    },
    typeScroll: {
        marginBottom: theme.spacing.l,
    },
    typeScrollContent: {
        gap: theme.spacing.m,
        paddingRight: theme.spacing.m,
    },
    rentTypeContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.l,
        overflow: 'hidden',
    },
    rentTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    rentTypeBtnActive: {
        backgroundColor: theme.colors.accentLight,
    },
    rentTypeText: {
        flex: 1,
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
        marginLeft: theme.spacing.m,
    },
    rentTypeTextActive: {
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: theme.typography.xl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.m,
    },
    modalButtonTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    modalButtonSubtitle: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
    },
    modalButtonSecondary: {
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        borderColor: theme.colors.accent,
    },
    modalButtonSecondaryText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
        textAlign: 'center',
    },
});
