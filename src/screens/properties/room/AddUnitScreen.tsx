import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Toggle from '../../../components/common/Toggle';
import SuccessModal from '../../../components/common/SuccessModal';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import { Zap, Droplets, Camera, Trash2, Plus, User, Info, Layout } from 'lucide-react-native';
import Header from '../../../components/common/Header';
import { createUnit, updateUnit, getUnitById, syncPendingBillsWithUnitSettings, createPGRoom, updatePGRoom, getBedsForRoom } from '../../../db';
import { requestCameraPermission, requestLibraryPermission, launchCamera, launchLibrary } from '../../../utils/ImagePickerUtil';
import { RENT_CYCLE_OPTIONS, METER_TYPES, ROOM_TYPES, FURNISHING_TYPES } from '../../../utils/Constants';
import { saveImageToPermanentStorage, getFullImageUri } from '../../../services/imageService';
import { useToast } from '../../../hooks/useToast';
import ImagePickerModal from '../../../components/common/ImagePickerModal';
import PromptModal from '../../../components/common/PromptModal';

export default function AddUnitScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;
    const unitId = route?.params?.unitId;
    const propertyType = route?.params?.propertyType;
    const roomGroupParam = route?.params?.roomGroup; // For edit PG room mode
    const isPG = propertyType === 'pg';
    const isEditMode = !!unitId;
    const isEditPGRoom = isPG && !!roomGroupParam && !unitId;
    const isEditBed = isEditMode && isPG; // Editing a single PG bed
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdUnitId, setCreatedUnitId] = useState<number | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Basic Information
    const [roomName, setRoomName] = useState('');
    const [roomType, setRoomType] = useState('');
    const [remarks, setRemarks] = useState('');
    const [rentAmount, setRentAmount] = useState('');
    const [rentCycle, setRentCycle] = useState<'first_of_month' | 'relative'>('first_of_month');

    // Utilities - Electricity
    const [electricityEnabled, setElectricityEnabled] = useState(false);
    const [electricityType, setElectricityType] = useState('Metered');
    const [electricityValue, setElectricityValue] = useState(''); // Rate or Fixed Amount
    const [initialElectricityReading, setInitialElectricityReading] = useState('');
    const [electricityDefaultUnits, setElectricityDefaultUnits] = useState('');

    // Utilities - Water
    const [waterEnabled, setWaterEnabled] = useState(false);
    const [waterType, setWaterType] = useState('Fixed');
    const [waterValue, setWaterValue] = useState(''); // Rate or Fixed Amount
    const [initialWaterReading, setInitialWaterReading] = useState('');
    const [waterDefaultUnits, setWaterDefaultUnits] = useState('');

    // Facilities & Additional Info
    const [floor, setFloor] = useState('');
    const [furnishing, setFurnishing] = useState<'none' | 'semi' | 'full'>('none');
    const [roomSize, setRoomSize] = useState('');
    const [customAmenities, setCustomAmenities] = useState<string[]>([]);

    // Pickers visibility
    const [showRoomTypePicker, setShowRoomTypePicker] = useState(false);

    // Photos
    const [images, setImages] = useState<string[]>([]);

    // Custom UI Modals State
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showAmenityPrompt, setShowAmenityPrompt] = useState(false);

    // PG-specific state
    const [bedCount, setBedCount] = useState('2');
    const [bedRents, setBedRents] = useState<string[]>(['', '']);
    const [sameRent, setSameRent] = useState(true);

    React.useEffect(() => {
        if (isEditMode) {
            loadUnitData();
        } else if (isEditPGRoom) {
            loadPGRoomData();
        }
    }, [unitId, roomGroupParam]);

    const loadPGRoomData = async () => {
        try {
            const beds = await getBedsForRoom(propertyId, roomGroupParam);
            if (beds.length === 0) return;

            const firstBed = beds[0];
            setRoomName(roomGroupParam);
            setFloor(firstBed.floor || '');
            setFurnishing(firstBed.furnishing_type as any || 'none');
            setBedCount(beds.length.toString());

            // Check if all rents are the same
            const rents = beds.map(b => b.rent_amount.toString());
            const allSame = rents.every(r => r === rents[0]);
            setSameRent(allSame);
            if (allSame) {
                setRentAmount(rents[0]);
            }
            setBedRents(rents);

            // Electricity
            if (firstBed.electricity_rate || firstBed.electricity_fixed_amount || firstBed.initial_electricity_reading) {
                setElectricityEnabled(true);
                if (firstBed.electricity_rate) {
                    setElectricityType('Metered');
                    setElectricityValue(firstBed.electricity_rate.toString());
                    setInitialElectricityReading(firstBed.initial_electricity_reading?.toString() || '');
                    setElectricityDefaultUnits(firstBed.electricity_default_units?.toString() || '');
                } else if (firstBed.electricity_fixed_amount) {
                    setElectricityType('Fixed');
                    setElectricityValue(firstBed.electricity_fixed_amount.toString());
                } else {
                    setElectricityType('Free');
                }
            }

            // Water
            if (firstBed.water_rate || firstBed.water_fixed_amount || firstBed.initial_water_reading) {
                setWaterEnabled(true);
                if (firstBed.water_rate) {
                    setWaterType('Metered');
                    setWaterValue(firstBed.water_rate.toString());
                    setInitialWaterReading(firstBed.initial_water_reading?.toString() || '');
                    setWaterDefaultUnits(firstBed.water_default_units?.toString() || '');
                } else if (firstBed.water_fixed_amount) {
                    setWaterType('Fixed');
                    setWaterValue(firstBed.water_fixed_amount.toString());
                } else {
                    setWaterType('Free');
                }
            }
        } catch (error) {
            console.error('Error loading PG room:', error);
        }
    };

    const loadUnitData = async () => {
        try {
            const data = await getUnitById(unitId);
            if (data) {
                setRoomName(data.name);
                setRoomType(data.type || '');
                setRemarks(data.remarks || '');
                setRentAmount(data.rent_amount.toString());
                setRentCycle(data.rent_cycle as any);
                setFloor(data.floor || '');
                setFurnishing(data.furnishing_type as any);
                setRoomSize(data.size?.toString() || '');
                setCustomAmenities(data.custom_amenities ? JSON.parse(data.custom_amenities) : []);
                setImages(data.images ? JSON.parse(data.images) : []);

                // Electricity
                if (data.electricity_rate || data.electricity_fixed_amount || data.initial_electricity_reading) {
                    setElectricityEnabled(true);
                    if (data.electricity_rate) {
                        setElectricityType('Metered');
                        setElectricityValue(data.electricity_rate.toString());
                        setInitialElectricityReading(data.initial_electricity_reading?.toString() || '');
                        setElectricityDefaultUnits(data.electricity_default_units?.toString() || '');
                    } else if (data.electricity_fixed_amount) {
                        setElectricityType('Fixed');
                        setElectricityValue(data.electricity_fixed_amount.toString());
                    } else {
                        setElectricityType('Free');
                    }
                }

                // Water
                if (data.water_rate || data.water_fixed_amount || data.initial_water_reading) {
                    setWaterEnabled(true);
                    if (data.water_rate) {
                        setWaterType('Metered');
                        setWaterValue(data.water_rate.toString());
                        setInitialWaterReading(data.initial_water_reading?.toString() || '');
                        setWaterDefaultUnits(data.water_default_units?.toString() || '');
                    } else if (data.water_fixed_amount) {
                        setWaterType('Fixed');
                        setWaterValue(data.water_fixed_amount.toString());
                    } else {
                        setWaterType('Free');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading room:', error);
        }
    };

    const handleSelectCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            showToast({ type: 'warning', title: 'Permission Required', message: 'Sorry, we need camera permissions to make this work!' });
            return;
        }
        const uri = await launchCamera({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (uri) setImages(prev => [...prev, uri]);
    };

    const handleSelectGallery = async () => {
        const hasPermission = await requestLibraryPermission();
        if (!hasPermission) {
            showToast({ type: 'warning', title: 'Permission Required', message: 'Sorry, we need gallery permissions to make this work!' });
            return;
        }
        const uri = await launchLibrary({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (uri) setImages(prev => [...prev, uri]);
    };

    const pickImage = () => {
        setShowImagePicker(true);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const addCustomAmenity = () => {
        setShowAmenityPrompt(true);
    };

    const removeAmenity = (index: number) => {
        const newAmenities = [...customAmenities];
        newAmenities.splice(index, 1);
        setCustomAmenities(newAmenities);
    };

    // Removal of old showRoomTypePicker function
    // We will use state showRoomTypePicker to control the BottomSheet


    const handleSubmit = async () => {
        if (!roomName.trim()) {
            showToast({ type: 'error', title: 'Error', message: isPG && !isEditMode ? 'Please enter room name' : 'Please enter room name' });
            return;
        }

        // PG mode validation (create or edit PG room)
        if (isPG && !isEditMode) {
            const count = parseInt(bedCount);
            if (!count || count < 1 || count > 20) {
                showToast({ type: 'error', title: 'Error', message: 'Please enter a valid bed count (1-20)' });
                return;
            }
            if (sameRent) {
                if (!rentAmount || parseFloat(rentAmount) <= 0) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter valid rent amount' });
                    return;
                }
            } else {
                for (let i = 0; i < count; i++) {
                    if (!bedRents[i] || parseFloat(bedRents[i]) <= 0) {
                        showToast({ type: 'error', title: 'Error', message: `Please enter valid rent for Bed ${i + 1}` });
                        return;
                    }
                }
            }
        } else if (!isEditPGRoom) {
            if (!rentAmount || parseFloat(rentAmount) <= 0) {
                showToast({ type: 'error', title: 'Error', message: 'Please enter valid rent amount' });
                return;
            }
        }

        if (electricityEnabled) {
            if (electricityType === 'Metered') {
                if (!electricityValue || parseFloat(electricityValue) <= 0) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Electricity Rate per Unit' });
                    return;
                }
                if (!initialElectricityReading || isNaN(parseFloat(initialElectricityReading))) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Initial Electricity Meter Reading' });
                    return;
                }
            } else if (electricityType === 'Fixed') {
                if (!electricityValue || parseFloat(electricityValue) <= 0) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Fixed Electricity Amount' });
                    return;
                }
            }
        }

        if (waterEnabled) {
            if (waterType === 'Metered') {
                if (!waterValue || parseFloat(waterValue) <= 0) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Water Rate per Unit' });
                    return;
                }
                if (!initialWaterReading || isNaN(parseFloat(initialWaterReading))) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Initial Water Meter Reading' });
                    return;
                }
            } else if (waterType === 'Fixed') {
                if (!waterValue || parseFloat(waterValue) <= 0) {
                    showToast({ type: 'error', title: 'Error', message: 'Please enter a valid Fixed Water Amount' });
                    return;
                }
            }
        }

        setLoading(true);
        try {
            // Process images to permanent storage
            const finalImages = await Promise.all(
                images.map(async (uri) => {
                    if (uri && uri.startsWith('file://')) {
                        const permanentPath = await saveImageToPermanentStorage(uri);
                        return permanentPath || uri;
                    }
                    return uri;
                })
            );

            const unitData: any = {
                property_id: propertyId,
                name: roomName,
                type: roomType || null,
                remarks: remarks || null,
                rent_amount: parseFloat(rentAmount),
                rent_cycle: rentCycle,
                floor: floor || null,
                furnishing_type: furnishing,
                size: roomSize ? parseFloat(roomSize) : null,
                custom_amenities: customAmenities.length > 0 ? JSON.stringify(customAmenities) : null,
                images: finalImages.length > 0 ? JSON.stringify(finalImages) : null,
                is_metered: (electricityEnabled && electricityType === 'Metered') || (waterEnabled && waterType === 'Metered'),
                electricity_rate: electricityEnabled && electricityType === 'Metered' ? parseFloat(electricityValue) : null,
                electricity_fixed_amount: electricityEnabled && electricityType === 'Fixed' ? parseFloat(electricityValue) : null,
                initial_electricity_reading: electricityEnabled && electricityType === 'Metered' ? parseFloat(initialElectricityReading) : null,
                electricity_default_units: electricityEnabled && electricityType === 'Metered' && electricityDefaultUnits ? parseFloat(electricityDefaultUnits) : null,
                water_rate: waterEnabled && waterType === 'Metered' ? parseFloat(waterValue) : null,
                water_fixed_amount: waterEnabled && waterType === 'Fixed' ? parseFloat(waterValue) : null,
                initial_water_reading: waterEnabled && waterType === 'Metered' ? parseFloat(initialWaterReading) : null,
                water_default_units: waterEnabled && waterType === 'Metered' && waterDefaultUnits ? parseFloat(waterDefaultUnits) : null,
            };

            if (isEditMode) {
                await updateUnit(unitId, unitData);
                await syncPendingBillsWithUnitSettings(unitId);
                showToast({ type: 'success', title: 'Success', message: 'Room details updated successfully' });
                navigation.goBack();
            } else if (isEditPGRoom) {
                // Edit PG Room mode: update existing room group
                const count = parseInt(bedCount);
                const rents = sameRent
                    ? Array(count).fill(parseFloat(rentAmount))
                    : bedRents.slice(0, count).map(r => parseFloat(r));

                await updatePGRoom(propertyId, roomGroupParam, {
                    propertyId,
                    roomName: roomName.trim(),
                    floor: floor || undefined,
                    bedCount: count,
                    bedRents: rents,
                    electricityRate: unitData.electricity_rate,
                    electricityFixedAmount: unitData.electricity_fixed_amount,
                    initialElectricityReading: unitData.initial_electricity_reading,
                    electricityDefaultUnits: unitData.electricity_default_units,
                    waterRate: unitData.water_rate,
                    waterFixedAmount: unitData.water_fixed_amount,
                    initialWaterReading: unitData.initial_water_reading,
                    waterDefaultUnits: unitData.water_default_units,
                    furnishingType: unitData.furnishing_type,
                });

                // Sync all beds in this room group to update existing bills
                const beds = await getBedsForRoom(propertyId, roomName.trim());
                for (const bed of beds) {
                    await syncPendingBillsWithUnitSettings(bed.id);
                }

                showToast({ type: 'success', title: 'Success', message: 'Room updated successfully' });
                navigation.goBack();
            } else if (isPG) {
                // PG mode: create room with multiple beds
                const count = parseInt(bedCount);
                const rents = sameRent
                    ? Array(count).fill(parseFloat(rentAmount))
                    : bedRents.slice(0, count).map(r => parseFloat(r));

                await createPGRoom({
                    propertyId,
                    roomName: roomName.trim(),
                    floor: floor || undefined,
                    bedCount: count,
                    bedRents: rents,
                    electricityRate: unitData.electricity_rate,
                    electricityFixedAmount: unitData.electricity_fixed_amount,
                    initialElectricityReading: unitData.initial_electricity_reading,
                    electricityDefaultUnits: unitData.electricity_default_units,
                    waterRate: unitData.water_rate,
                    waterFixedAmount: unitData.water_fixed_amount,
                    initialWaterReading: unitData.initial_water_reading,
                    waterDefaultUnits: unitData.water_default_units,
                    furnishingType: unitData.furnishing_type,
                });
                setShowSuccessModal(true);
            } else {
                const newId = await createUnit(unitData);
                setCreatedUnitId(newId);
                setShowSuccessModal(true);
            }
        } catch (error: any) {
            console.error('Error saving room:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: error?.message || `Failed to ${isEditMode ? 'update' : 'create'} room. Please try again.`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Header title={isEditBed ? 'Update Bed Details' : isEditMode ? 'Update Room' : isEditPGRoom ? 'Edit PG Room' : (isPG ? 'Add PG Room' : 'Add Room Details')} />

                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >

                    {/* Basic Information */}
                    <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
                    <View style={styles.section}>
                        <Input
                            label={isEditBed ? 'Bed Name' : isPG && !isEditMode ? 'Room Name' : 'Room Name / Room No.'}
                            placeholder={isEditBed ? 'e.g. Bed 1' : isPG ? 'e.g. Room A, Room 101' : 'e.g. Room 101 or Flat A-202'}
                            value={roomName}
                            onChangeText={setRoomName}
                        />

                        {!isEditBed && (
                            <>
                                <Text style={styles.inputLabel}>Room Type</Text>
                                <Pressable style={styles.pickerContainer} onPress={() => setShowRoomTypePicker(true)}>
                                    <Text style={[styles.pickerText, !roomType && { color: theme.colors.textTertiary }]}>
                                        {roomType || 'Select Room Type (e.g. 2 BHK)'}
                                    </Text>
                                    <Layout size={18} color={theme.colors.accent} />
                                </Pressable>
                            </>
                        )}

                        {/* Rent — for PG create mode, show bed config instead */}
                        {isPG && !isEditMode ? (
                            <View>
                                <Input
                                    label="Number of Beds"
                                    placeholder="e.g. 3"
                                    value={bedCount}
                                    onChangeText={(val) => {
                                        setBedCount(val);
                                        const count = parseInt(val) || 0;
                                        setBedRents(prev => {
                                            const next = [...prev];
                                            while (next.length < count) next.push('');
                                            return next.slice(0, Math.max(count, 1));
                                        });
                                    }}
                                    keyboardType="numeric"
                                />

                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.s }}>
                                    <Text style={styles.inputLabel}>Same Rent for All Beds?</Text>
                                    <Toggle value={sameRent} onValueChange={() => setSameRent(!sameRent)} />
                                </View>

                                {sameRent ? (
                                    <Input
                                        label="Rent per Bed"
                                        placeholder="e.g. 5000"
                                        value={rentAmount}
                                        onChangeText={setRentAmount}
                                        keyboardType="numeric"
                                    />
                                ) : (
                                    Array.from({ length: parseInt(bedCount) || 0 }).map((_, i) => (
                                        <Input
                                            key={i}
                                            label={`Bed ${i + 1} Rent`}
                                            placeholder="e.g. 5000"
                                            value={bedRents[i] || ''}
                                            onChangeText={(val) => {
                                                const updated = [...bedRents];
                                                updated[i] = val;
                                                setBedRents(updated);
                                            }}
                                            keyboardType="numeric"
                                        />
                                    ))
                                )}
                            </View>
                        ) : (
                            <Input
                                label="Rent Amount"
                                placeholder="e.g. 12000"
                                value={rentAmount}
                                onChangeText={setRentAmount}
                                keyboardType="numeric"
                            />
                        )}


                        <Input
                            label="Remarks (Optional)"
                            placeholder="e.g. Garden facing, recently painted"
                            value={remarks}
                            onChangeText={setRemarks}
                            multiline
                            numberOfLines={2}
                        />
                    </View>

                    {/* Rent Cycle — hide for PG bed edit */}
                    {!isEditBed && (
                        <>
                            <Text style={styles.sectionLabel}>RENT CALCULATION</Text>
                            <View style={styles.cardContainer}>
                                {RENT_CYCLE_OPTIONS.map((option, index) => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.rentOption,
                                            index !== RENT_CYCLE_OPTIONS.length - 1 && styles.borderBottom
                                        ]}
                                        onPress={() => setRentCycle(option.id as 'first_of_month' | 'relative')}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.optionTitle}>{option.label}</Text>
                                            <Text style={styles.optionDesc}>{option.description}</Text>
                                        </View>
                                        <View style={[styles.radio, rentCycle === option.id && styles.radioActive]}>
                                            {rentCycle === option.id && <View style={styles.radioInner} />}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Utilities — hide for PG bed edit (utilities are room-level) */}
                    {!isEditBed && (
                        <>
                            <Text style={styles.sectionLabel}>UTILITIES & BILLING</Text>

                            {/* Electricity Card */}
                            <View style={styles.utilityCard}>
                                <View style={styles.utilityHeader}>
                                    <View style={[styles.iconBg, { backgroundColor: '#F3E8FF' }]}>
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
                                    <View style={[styles.iconBg, { backgroundColor: '#E0F2FE' }]}>
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
                                                    <>
                                                        <Input
                                                            label="Initial Meter Reading"
                                                            placeholder="e.g. 520.0"
                                                            value={initialWaterReading}
                                                            onChangeText={setInitialWaterReading}
                                                            keyboardType="numeric"
                                                        />
                                                        <Input
                                                            label="Default Minimum Units (Optional)"
                                                            placeholder="e.g. 3"
                                                            value={waterDefaultUnits}
                                                            onChangeText={setWaterDefaultUnits}
                                                            keyboardType="numeric"
                                                        />
                                                    </>
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </>
                    )}

                    {/* Facilities & Additional Info — hide for PG bed edit */}
                    {!isEditBed && (
                        <>
                            <Text style={styles.sectionLabel}>FACILITIES & ADDITIONAL INFO</Text>
                            <View style={styles.section}>
                                <Input
                                    label="Floor Number"
                                    placeholder="e.g. 2nd Floor"
                                    value={floor}
                                    onChangeText={setFloor}
                                />

                                <Text style={styles.inputLabel}>Furnishing Status</Text>
                                <View style={styles.furnishingContainer}>
                                    {FURNISHING_TYPES.map((type) => (
                                        <Pressable
                                            key={type.id}
                                            style={[
                                                styles.furnishingBtn,
                                                furnishing === type.id && styles.furnishingBtnActive
                                            ]}
                                            onPress={() => setFurnishing(type.id as any)}
                                        >
                                            <Text style={[
                                                styles.furnishingText,
                                                furnishing === type.id && styles.furnishingTextActive
                                            ]}>{type.label}</Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Input
                                    label="Room Size (Sq. Ft.)"
                                    placeholder="e.g. 1200"
                                    value={roomSize}
                                    onChangeText={setRoomSize}
                                    keyboardType="numeric"
                                />

                                <View style={styles.amenitiesHeader}>
                                    <Text style={styles.inputLabel}>Custom Amenities</Text>
                                    <Pressable onPress={addCustomAmenity} style={styles.addAmenityBtn}>
                                        <Plus size={16} color={theme.colors.accent} />
                                        <Text style={styles.addAmenityText}>ADD</Text>
                                    </Pressable>
                                </View>

                                <View style={styles.amenitiesList}>
                                    {customAmenities.map((amenity, index) => (
                                        <View key={index} style={styles.amenityBadge}>
                                            <Text style={styles.amenityBadgeText}>{amenity}</Text>
                                            <Pressable onPress={() => removeAmenity(index)}>
                                                <Trash2 size={14} color={theme.colors.textSecondary} />
                                            </Pressable>
                                        </View>
                                    ))}
                                    {customAmenities.length === 0 && (
                                        <Text style={styles.emptyText}>No custom amenities added</Text>
                                    )}
                                </View>
                            </View>

                            {/* Photos */}
                            <Text style={styles.sectionLabel}>ROOM PHOTOS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                                <Pressable style={styles.addPhotoBox} onPress={pickImage}>
                                    <Camera size={24} color={theme.colors.textSecondary} />
                                    <Text style={styles.addPhotoText}>Add Photo</Text>
                                </Pressable>

                                {images.map((uri, index) => (
                                    <View key={index} style={styles.photoWrapper}>
                                        <Image source={{ uri: getFullImageUri(uri) || uri }} style={styles.bottomPhoto} />
                                        <Pressable style={styles.removePhotoBtn} onPress={() => removeImage(index)}>
                                            <Trash2 size={12} color="#FFF" />
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Submit Button */}
                    <Button
                        title={(isEditMode || isEditPGRoom) ? "Save Changes" : "Create Room"}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitBtn}
                    />

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Pickers */}
            <PickerBottomSheet
                visible={showRoomTypePicker}
                onClose={() => setShowRoomTypePicker(false)}
                title="Select Room Type"
                options={ROOM_TYPES}
                selectedValue={roomType}
                onSelect={setRoomType}
            />

            {/* Success Modal */}
            <SuccessModal
                visible={showSuccessModal}
                title="🎉 Room Created!"
                subtitle="Room has been added successfully. What's next?"
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.goBack();
                }}
                actions={[
                    {
                        id: 'add-tenant',
                        title: 'Add Tenant',
                        subtitle: 'Assign a tenant to this room now',
                        icon: User,
                        onPress: () => {
                            setShowSuccessModal(false);
                            navigation.replace('AddTenant', { propertyId, unitId: createdUnitId });
                        }
                    },
                    {
                        id: 'add-another',
                        title: 'Add Another Room',
                        subtitle: 'Quickly add more rooms to this property',
                        icon: Plus,
                        onPress: () => {
                            setShowSuccessModal(false);
                            // Reset state for another rooms
                            setRoomName('');
                            setRoomType('');
                            setRemarks('');
                            setRentAmount('');
                            setFloor('');
                            setImages([]);
                            setCustomAmenities([]);
                            setElectricityValue('');
                            setInitialElectricityReading('');
                            setElectricityDefaultUnits('');
                            setWaterValue('');
                            setInitialWaterReading('');
                            setWaterDefaultUnits('');
                            setElectricityType('Metered');
                            setWaterType('Fixed');
                            setElectricityEnabled(true);
                            setWaterEnabled(false);
                            setRentCycle('first_of_month');
                            setFurnishing('none');
                            setRoomSize('');

                            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                        }
                    }
                ]}
            />

            <ImagePickerModal
                visible={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelectCamera={handleSelectCamera}
                onSelectGallery={handleSelectGallery}
            />

            <PromptModal
                visible={showAmenityPrompt}
                onClose={() => setShowAmenityPrompt(false)}
                onSubmit={(text) => {
                    if (text && text.trim()) {
                        setCustomAmenities([...customAmenities, text.trim()]);
                    }
                }}
                title="Add Amenity"
                message="Enter amenity name (e.g. Attached Balcony)"
                placeholder="e.g. Attached Balcony"
            />
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
        marginBottom: theme.spacing.m
    },
    inputLabel: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        fontWeight: theme.typography.medium,
    },
    pickerContainer: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    pickerText: {
        flex: 1,
        paddingRight: 4,
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary
    },
    cardContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.l,
        overflow: 'hidden'
    },
    rentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    optionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    optionDesc: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary
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
    iconBg: {
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
    furnishingContainer: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.m
    },
    furnishingBtn: {
        flex: 1,
        paddingVertical: theme.spacing.m,
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
    amenitiesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.s
    },
    addAmenityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addAmenityText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
    },
    amenitiesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.m
    },
    amenityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 8
    },
    amenityBadgeText: {
        fontSize: 12,
        color: theme.colors.textPrimary
    },
    emptyText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: 'italic'
    },
    submitBtn: {
        backgroundColor: theme.colors.accent,
        marginTop: theme.spacing.l,
        marginBottom: 40
    },
    photoRow: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        paddingBottom: theme.spacing.m
    },
    addPhotoBox: {
        width: 120,
        height: 120,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    addPhotoText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.s
    },
    photoWrapper: {
        position: 'relative'
    },
    bottomPhoto: {
        width: 120,
        height: 120,
        borderRadius: theme.borderRadius.l
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
