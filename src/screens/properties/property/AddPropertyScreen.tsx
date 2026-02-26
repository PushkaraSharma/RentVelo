import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, Alert, KeyboardAvoidingView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Toggle from '../../../components/common/Toggle';
import { ArrowLeft, Camera, Building, Layers, User, Phone, Mail, MapPin, Calendar } from 'lucide-react-native';
import Header from '../../../components/common/Header';
import { handleImageSelection } from '../../../utils/ImagePickerUtil';
import { createProperty, updateProperty, getPropertyById, createUnit, updateUnit } from '../../../db';
import SuccessModal from '../../../components/common/SuccessModal';
import { PROPERTY_TYPES, AMENITIES, RENT_PAYMENT_TYPES, RENT_CYCLE_OPTIONS, METER_TYPES } from '../../../utils/Constants';
import { Zap, Droplets } from 'lucide-react-native';
import { saveImageToPermanentStorage, getFullImageUri } from '../../../services/imageService';


export default function AddPropertyScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;
    const isEditMode = !!propertyId;
    const [image, setImage] = useState<string | null>(null);
    const [propertyType, setPropertyType] = useState('house');
    const [isMultiUnit, setIsMultiUnit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);

    // Bulk Creation State
    const [bulkCreating, setBulkCreating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [currentBulkRoomName, setCurrentBulkRoomName] = useState('');

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
    const [penaltyGracePeriodDays, setPenaltyGracePeriodDays] = useState('');
    const [penaltyAmountPerDay, setPenaltyAmountPerDay] = useState('');
    const [waivePenaltyOnPartialPayment, setWaivePenaltyOnPartialPayment] = useState(false);

    // Single Unit Form State
    const [rentAmount, setRentAmount] = useState('');
    const [rentCycle, setRentCycle] = useState<'first_of_month' | 'relative'>('first_of_month');
    const [electricityEnabled, setElectricityEnabled] = useState(true);
    const [electricityType, setElectricityType] = useState('Metered');
    const [electricityValue, setElectricityValue] = useState('');
    const [initialElectricityReading, setInitialElectricityReading] = useState('');
    const [electricityDefaultUnits, setElectricityDefaultUnits] = useState('');
    const [waterEnabled, setWaterEnabled] = useState(false);
    const [waterType, setWaterType] = useState('Fixed');
    const [waterValue, setWaterValue] = useState('');
    const [initialWaterReading, setInitialWaterReading] = useState('');
    const [defaultUnitId, setDefaultUnitId] = useState<number | null>(null);

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
                setPenaltyGracePeriodDays(data.penalty_grace_period_days?.toString() || '');
                setPenaltyAmountPerDay(data.penalty_amount_per_day?.toString() || '');
                setWaivePenaltyOnPartialPayment(data.waive_penalty_on_partial_payment ?? false);

                // If it's a single unit and edit mode, load the unit details
                if (data.is_multi_unit === false && isEditMode) {
                    const { getUnitsByPropertyId } = await import('../../../db');
                    const units = await getUnitsByPropertyId(propertyId);
                    if (units.length > 0) {
                        const unit = units[0];
                        setDefaultUnitId(unit.id);
                        setRentAmount(unit.rent_amount?.toString() || '');
                        setRentCycle(unit.rent_cycle as any || 'first_of_month');

                        // Electricity
                        if (unit.electricity_rate || unit.electricity_fixed_amount || unit.initial_electricity_reading) {
                            setElectricityEnabled(true);
                            if (unit.electricity_rate) {
                                setElectricityType('Metered');
                                setElectricityValue(unit.electricity_rate.toString());
                                setInitialElectricityReading(unit.initial_electricity_reading?.toString() || '');
                                setElectricityDefaultUnits(unit.electricity_default_units?.toString() || '');
                            } else if (unit.electricity_fixed_amount) {
                                setElectricityType('Fixed');
                                setElectricityValue(unit.electricity_fixed_amount.toString());
                            } else {
                                setElectricityType('Free');
                            }
                        }

                        // Water
                        if (unit.water_rate || unit.water_fixed_amount || unit.initial_water_reading) {
                            setWaterEnabled(true);
                            if (unit.water_rate) {
                                setWaterType('Metered');
                                setWaterValue(unit.water_rate.toString());
                                setInitialWaterReading(unit.initial_water_reading?.toString() || '');
                            } else if (unit.water_fixed_amount) {
                                setWaterType('Fixed');
                                setWaterValue(unit.water_fixed_amount.toString());
                            } else {
                                setWaterType('Free');
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading property:', error);
        }
    };

    const pickImage = () => {
        handleImageSelection((uri) => setImage(uri), {
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
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

        if (!isMultiUnit) {
            if (!rentAmount || parseFloat(rentAmount) <= 0) {
                Alert.alert('Error', 'Please enter valid rent amount for single room property');
                return;
            }
        }

        setLoading(true);
        try {
            let finalImageUri = image;

            // If the image is a brand new local cache URI from ImagePicker, we compress and save it
            // before inserting. If it's already a relative path, we leave it.
            if (image && image.startsWith('file://')) {
                const permanentPath = await saveImageToPermanentStorage(image);
                if (permanentPath) {
                    finalImageUri = permanentPath;
                }
            }

            const propertyData: any = {
                name: propertyName,
                address: address,
                type: propertyType as any,
                image_uri: finalImageUri || undefined,
                amenities: JSON.stringify(selectedAmenities),
                is_multi_unit: isMultiUnit,
                owner_name: ownerName || undefined,
                owner_phone: phone || undefined,
                rent_payment_type: rentPaymentType,
                penalty_grace_period_days: penaltyGracePeriodDays ? parseInt(penaltyGracePeriodDays) : null,
                penalty_amount_per_day: penaltyAmountPerDay ? parseFloat(penaltyAmountPerDay) : null,
                waive_penalty_on_partial_payment: waivePenaltyOnPartialPayment,
            };

            if (isEditMode) {
                await updateProperty(propertyId, propertyData);

                if (!isMultiUnit && defaultUnitId) {
                    const unitData: any = {
                        rent_amount: parseFloat(rentAmount),
                        rent_cycle: rentCycle,
                        is_metered: (electricityEnabled && electricityType === 'Metered') || (waterEnabled && waterType === 'Metered'),
                        electricity_rate: electricityEnabled && electricityType === 'Metered' ? parseFloat(electricityValue) : null,
                        electricity_fixed_amount: electricityEnabled && electricityType === 'Fixed' ? parseFloat(electricityValue) : null,
                        initial_electricity_reading: electricityEnabled && electricityType === 'Metered' ? parseFloat(initialElectricityReading) : null,
                        electricity_default_units: electricityEnabled && electricityType === 'Metered' && electricityDefaultUnits ? parseFloat(electricityDefaultUnits) : null,
                        water_rate: waterEnabled && waterType === 'Metered' ? parseFloat(waterValue) : null,
                        water_fixed_amount: waterEnabled && waterType === 'Fixed' ? parseFloat(waterValue) : null,
                        initial_water_reading: waterEnabled && waterType === 'Metered' ? parseFloat(initialWaterReading) : null,
                    };
                    await updateUnit(defaultUnitId, unitData);
                }

                Alert.alert('Success', 'Property updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                const newId = await createProperty(propertyData);

                if (!isMultiUnit) {
                    // Create default unit automatically
                    const unitData: any = {
                        property_id: newId,
                        name: 'Main Property',
                        rent_amount: parseFloat(rentAmount),
                        rent_cycle: rentCycle,
                        is_metered: (electricityEnabled && electricityType === 'Metered') || (waterEnabled && waterType === 'Metered'),
                        electricity_rate: electricityEnabled && electricityType === 'Metered' ? parseFloat(electricityValue) : null,
                        electricity_fixed_amount: electricityEnabled && electricityType === 'Fixed' ? parseFloat(electricityValue) : null,
                        initial_electricity_reading: electricityEnabled && electricityType === 'Metered' ? parseFloat(initialElectricityReading) : null,
                        electricity_default_units: electricityEnabled && electricityType === 'Metered' && electricityDefaultUnits ? parseFloat(electricityDefaultUnits) : null,
                        water_rate: waterEnabled && waterType === 'Metered' ? parseFloat(waterValue) : null,
                        water_fixed_amount: waterEnabled && waterType === 'Fixed' ? parseFloat(waterValue) : null,
                        initial_water_reading: waterEnabled && waterType === 'Metered' ? parseFloat(initialWaterReading) : null,
                    };
                    await createUnit(unitData);
                }

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

    const handleBulkCreateRooms = async () => {
        if (!createdPropertyId || !totalUnits) return;

        setShowSuccessModal(false);
        setBulkCreating(true);
        const count = parseInt(totalUnits);
        const floors = parseInt(totalFloors) || 1;
        const unitsPerFloor = Math.ceil(count / floors);

        try {
            for (let i = 1; i <= count; i++) {
                const floorNum = Math.ceil(i / unitsPerFloor);
                const unitInFloor = i % unitsPerFloor === 0 ? unitsPerFloor : i % unitsPerFloor;

                let name = `Room ${i}`;
                if (propertyType === 'pg') {
                    name = `Bed ${i}`;
                } else if (floors > 1 || count > 5) {
                    // e.g. Flat 101, 102, 201...
                    name = `Flat ${floorNum}${unitInFloor.toString().padStart(2, '0')}`;
                }

                setCurrentBulkRoomName(name);
                setBulkProgress(i / count);

                await createUnit({
                    property_id: createdPropertyId,
                    name: name,
                    rent_amount: 0,
                    rent_cycle: 'first_of_month',
                    is_metered: true,
                    electricity_rate: 0,
                    water_fixed_amount: 0,
                    floor: floors > 1 ? `${floorNum}${floorNum === 1 ? 'st' : floorNum === 2 ? 'nd' : floorNum === 3 ? 'rd' : 'th'} Floor` : undefined,
                });

                // Small delay to let the UI breathe and show progress
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            Alert.alert('Success', `Successfully created ${count} rooms!`);
            navigation.goBack();
        } catch (error) {
            console.error('Bulk creation failed:', error);
            Alert.alert('Error', 'Failed to create all rooms. Some rooms may have been created.');
        } finally {
            setBulkCreating(false);
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
                            <Image source={{ uri: getFullImageUri(image) || image }} style={styles.uploadedImage} />
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

                    {/* Single Unit Details */}
                    {!isMultiUnit && (
                        <>
                            <Text style={styles.sectionTitle}>Room Details</Text>
                            <Input
                                label="Rent Amount"
                                placeholder="e.g. 12000"
                                value={rentAmount}
                                onChangeText={setRentAmount}
                                keyboardType="numeric"
                            />

                            <Text style={styles.sectionTitle}>Rent Calculation</Text>
                            <View style={styles.rentTypeContainer}>
                                {RENT_CYCLE_OPTIONS.map((option, index) => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.rentTypeBtn,
                                            index !== RENT_CYCLE_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                                            rentCycle === option.id && styles.rentTypeBtnActive
                                        ]}
                                        onPress={() => setRentCycle(option.id as 'first_of_month' | 'relative')}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rentTypeText}>{option.label}</Text>
                                            <Text style={[styles.rentTypeText, { fontSize: theme.typography.s, color: theme.colors.textSecondary }]}>{option.description}</Text>
                                        </View>
                                        <View style={[styles.radio, rentCycle === option.id && styles.radioActive]}>
                                            {rentCycle === option.id && <View style={styles.radioInner} />}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.sectionTitle}>Utilities</Text>

                            {/* Electricity Card */}
                            <View style={styles.utilityCard}>
                                <View style={styles.utilityHeader}>
                                    <View style={[styles.utilityIconBg, { backgroundColor: '#F3E8FF' }]}>
                                        <Zap size={20} color="#9333EA" />
                                    </View>
                                    <Text style={styles.utilityTitle}>Electricity</Text>
                                    <Toggle value={electricityEnabled} onValueChange={setElectricityEnabled} />
                                </View>

                                {electricityEnabled && (
                                    <>
                                        <View style={styles.segmentContainer}>
                                            {METER_TYPES.map((type) => (
                                                <Pressable
                                                    key={type}
                                                    style={[
                                                        styles.segmentParam,
                                                        electricityType === type && styles.segmentActive
                                                    ]}
                                                    onPress={() => {
                                                        setElectricityType(type);
                                                        setElectricityValue('');
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.segmentText,
                                                        electricityType === type && styles.segmentTextActive
                                                    ]}>{type}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                        {electricityType !== 'Free' && (
                                            <View style={{ marginTop: theme.spacing.m }}>
                                                <Input
                                                    label={electricityType === 'Metered' ? "Rate per Unit (₹)" : "Fixed Monthly Amount (₹)"}
                                                    placeholder={electricityType === 'Metered' ? "e.g. 8.5" : "e.g. 500"}
                                                    value={electricityValue}
                                                    onChangeText={setElectricityValue}
                                                    keyboardType="numeric"
                                                />
                                                {electricityType === 'Metered' && (
                                                    <>
                                                        <Input
                                                            label="Initial Meter Reading"
                                                            placeholder="e.g. 1045.5"
                                                            value={initialElectricityReading}
                                                            onChangeText={setInitialElectricityReading}
                                                            keyboardType="numeric"
                                                        />
                                                        <Input
                                                            label="Default Minimum Units (Optional)"
                                                            placeholder="e.g. 5"
                                                            value={electricityDefaultUnits}
                                                            onChangeText={setElectricityDefaultUnits}
                                                            keyboardType="numeric"
                                                        />
                                                    </>
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>

                            {/* Water Card */}
                            <View style={styles.utilityCard}>
                                <View style={styles.utilityHeader}>
                                    <View style={[styles.utilityIconBg, { backgroundColor: '#E0F2FE' }]}>
                                        <Droplets size={20} color="#0284C7" />
                                    </View>
                                    <Text style={styles.utilityTitle}>Water</Text>
                                    <Toggle value={waterEnabled} onValueChange={setWaterEnabled} />
                                </View>

                                {waterEnabled && (
                                    <>
                                        <View style={styles.segmentContainer}>
                                            {METER_TYPES.map((type) => (
                                                <Pressable
                                                    key={type}
                                                    style={[
                                                        styles.segmentParam,
                                                        waterType === type && styles.segmentActive
                                                    ]}
                                                    onPress={() => {
                                                        setWaterType(type);
                                                        setWaterValue('');
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.segmentText,
                                                        waterType === type && styles.segmentTextActive
                                                    ]}>{type}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                        {waterType !== 'Free' && (
                                            <View style={{ marginTop: theme.spacing.m }}>
                                                <Input
                                                    label={waterType === 'Metered' ? "Rate per Unit (₹)" : "Fixed Monthly Amount (₹)"}
                                                    placeholder={waterType === 'Metered' ? "e.g. 15" : "e.g. 200"}
                                                    value={waterValue}
                                                    onChangeText={setWaterValue}
                                                    keyboardType="numeric"
                                                />
                                                {waterType === 'Metered' && (
                                                    <Input
                                                        label="Initial Meter Reading"
                                                        placeholder="e.g. 520.0"
                                                        value={initialWaterReading}
                                                        onChangeText={setInitialWaterReading}
                                                        keyboardType="numeric"
                                                    />
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </>
                    )}

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

                    {/* Rent Penalties */}
                    <Text style={styles.sectionTitle}>Rent Penalties (Optional)</Text>
                    <View style={[styles.row, { alignItems: 'center', justifyContent: 'space-between' }]}>
                        <View style={{ flex: 1, marginRight: isMultiUnit ? theme.spacing.m : 0 }}>
                            <Input
                                label="PENALTY AFTER DAYS"
                                placeholder="e.g. 5 days"
                                value={penaltyGracePeriodDays}
                                onChangeText={setPenaltyGracePeriodDays}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Input
                                label="PENALTY AMOUNT"
                                placeholder="e.g. ₹50 per day"
                                value={penaltyAmountPerDay}
                                onChangeText={setPenaltyAmountPerDay}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={[styles.utilityHeader, { marginBottom: theme.spacing.m }]}>
                        <Text style={[{ flex: 1, color: theme.colors.textSecondary, fontSize: theme.typography.s, fontWeight: theme.typography.medium }]}>
                            No penalty if partial payment done
                        </Text>
                        <Toggle value={waivePenaltyOnPartialPayment} onValueChange={setWaivePenaltyOnPartialPayment} />
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
                        maxLength={10}
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
                    ...(isMultiUnit ? [
                        {
                            id: 'add-unit',
                            title: 'Add Room',
                            subtitle: 'Add rooms to this property',
                            icon: Building,
                            onPress: () => {
                                setShowSuccessModal(false);
                                navigation.replace('AddUnit', { propertyId: createdPropertyId });
                            }
                        },
                        {
                            id: 'bulk-units',
                            title: 'Add Default Rooms',
                            subtitle: `Quickly add ${totalUnits || 'all'} rooms with defaults`,
                            icon: Layers,
                            onPress: handleBulkCreateRooms
                        }
                    ] : [{
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

            {/* Bulk Creation Overlay */}
            <Modal visible={bulkCreating} transparent animationType="fade">
                <View style={styles.bulkOverlay}>
                    <View style={styles.bulkContent}>
                        <View style={styles.bulkIconBg}>
                            <Building size={40} color={theme.colors.accent} />
                        </View>
                        <Text style={styles.bulkTitle}>Generating Rooms...</Text>
                        <Text style={styles.bulkSubtitle}>Creating {currentBulkRoomName}</Text>

                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${bulkProgress * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(bulkProgress * 100)}% Complete</Text>

                        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
                    </View>
                </View>
            </Modal>
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
        backgroundColor: theme.colors.background,
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
        backgroundColor: isDark ? theme.colors.accent + '20' : theme.colors.accentLight,
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
    utilityCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m
    },
    utilityHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    utilityIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    utilityTitle: {
        flex: 1,
        fontSize: theme.typography.m,
        fontWeight: theme.typography.medium,
        color: theme.colors.textPrimary
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: isDark ? theme.colors.background : theme.colors.accentLight + '40',
        borderRadius: theme.borderRadius.m,
        padding: 4,
        marginTop: theme.spacing.m
    },
    segmentParam: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: theme.borderRadius.s
    },
    segmentActive: {
        backgroundColor: theme.colors.surface,
        ...theme.shadows.small
    },
    segmentText: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium
    },
    segmentTextActive: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold
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
    bulkOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    bulkContent: {
        width: '100%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    bulkIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    bulkTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    bulkSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    progressBarContainer: {
        width: '100%',
        height: 10,
        backgroundColor: theme.colors.border,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.accent,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.accent,
    },
});
