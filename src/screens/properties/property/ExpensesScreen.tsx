import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, Image,
    TextInput, FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../theme/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Toggle from '../../../components/common/Toggle';
import RentModalSheet from '../../../components/rent/RentModalSheet';
import PickerBottomSheet from '../../../components/common/PickerBottomSheet';
import ImagePickerModal from '../../../components/common/ImagePickerModal';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import {
    getPropertyById, getUnitsByPropertyId,
    createExpense, getExpensesByPropertyMonth, deleteExpense,
} from '../../../db';
import { CURRENCY } from '../../../utils/Constants';
import { useToast } from '../../../hooks/useToast';
import {
    Plus, Trash2, ChevronDown, Camera, CreditCard, CalendarDays, Tag
} from 'lucide-react-native';
import { requestCameraPermission, requestLibraryPermission, launchCamera, launchLibrary } from '../../../utils/ImagePickerUtil';
import { saveImageToPermanentStorage, getFullImageUri } from '../../../services/imageService';
import { hapticsSelection, hapticsMedium, hapticsError } from '../../../utils/haptics';

const EXPENSE_CATEGORIES = [
    'Wifi', 'Internet', 'Food/meals', 'Invertor/Generator', 'Cable/Dish',
    'Cameras', 'Laundry', 'Water Bill', 'Plumbing charges', 'Water Heater',
    'AC', 'Light', 'Bulb etc', 'Repair/Fixes', 'Furnishing', 'House cleaning',
    'Car/Bike Parking', 'Yearly Maintenance', 'Property Tax',
    'Gas cylinder', 'Monthly Maintenance', 'Electricity Bill', 'Gas Bill', 'Other'
];

const { width } = Dimensions.get('window');
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ExpensesScreen({ navigation, route }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const propertyId = route?.params?.propertyId;

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [expenses, setExpenses] = useState<any[]>([]);
    const [property, setProperty] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);

    // Add Expense Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseType, setExpenseType] = useState('');
    const [expenseFrequency, setExpenseFrequency] = useState<'one_time' | 'monthly'>('one_time');
    const [expenseImage, setExpenseImage] = useState<string | null>(null);
    const [expenseRemarks, setExpenseRemarks] = useState('');
    const [distributeType, setDistributeType] = useState<'owner' | 'rooms'>('owner');
    const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [addLoading, setAddLoading] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [propertyId, month, year])
    );

    const loadData = async () => {
        try {
            // Load property and units first (less likely to fail)
            const propData = await getPropertyById(propertyId);
            setProperty(propData);

            const unitsData = await getUnitsByPropertyId(propertyId);
            setUnits(unitsData || []);

            // Load expenses (might fail if migration didn't run)
            try {
                const expData = await getExpensesByPropertyMonth(propertyId, month, year);
                setExpenses(expData || []);
            } catch (err) {
                console.error('Failed to load expenses table:', err);
                setExpenses([]);
            }
        } catch (error) {
            console.error('Error loading property/units:', error);
        }
    };

    const handleAddExpense = async () => {
        const amt = parseFloat(expenseAmount);
        if (isNaN(amt) || amt <= 0) {
            hapticsError();
            showToast({ type: 'error', title: 'Error', message: 'Please enter a valid amount' });
            return;
        }
        if (!expenseType) {
            hapticsError();
            showToast({ type: 'error', title: 'Error', message: 'Please select expense type' });
            return;
        }
        if (distributeType === 'rooms' && selectedUnitIds.length === 0) {
            hapticsError();
            showToast({ type: 'error', title: 'Error', message: 'Please select at least one room' });
            return;
        }

        setAddLoading(true);
        try {
            let finalImageUri = expenseImage;
            if (expenseImage && expenseImage.startsWith('file://')) {
                const permanentPath = await saveImageToPermanentStorage(expenseImage);
                if (permanentPath) finalImageUri = permanentPath;
            }

            await createExpense({
                property_id: propertyId,
                amount: amt,
                expense_type: expenseType,
                frequency: expenseFrequency,
                image_uri: finalImageUri || undefined,
                remarks: expenseRemarks || undefined,
                distribute_type: distributeType,
                distributed_unit_ids: distributeType === 'rooms' ? JSON.stringify(selectedUnitIds) : null,
                month,
                year,
            });

            hapticsMedium();
            showToast({ type: 'success', title: 'Added', message: 'Expense added successfully' });
            resetAddForm();
            setShowAddModal(false);
            loadData();
        } catch (error) {
            console.error('Error adding expense:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to add expense' });
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteExpense(deleteTarget);
            hapticsMedium();
            showToast({ type: 'success', title: 'Deleted', message: 'Expense removed' });
            setShowDeleteModal(false);
            setDeleteTarget(null);
            loadData();
        } catch (error) {
            console.error('Error deleting expense:', error);
            showToast({ type: 'error', title: 'Error', message: 'Failed to delete expense' });
        }
    };

    const resetAddForm = () => {
        setExpenseAmount('');
        setExpenseType('');
        setExpenseFrequency('one_time');
        setExpenseImage(null);
        setExpenseRemarks('');
        setDistributeType('owner');
        setSelectedUnitIds([]);
    };

    const toggleUnitSelection = (unitId: number) => {
        hapticsSelection();
        if (selectedUnitIds.includes(unitId)) {
            setSelectedUnitIds(selectedUnitIds.filter(id => id !== unitId));
        } else {
            setSelectedUnitIds([...selectedUnitIds, unitId]);
        }
    };

    const handleSelectCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;
        const uri = await launchCamera({ allowsEditing: true, quality: 0.7 });
        if (uri) setExpenseImage(uri);
    };

    const handleSelectGallery = async () => {
        const hasPermission = await requestLibraryPermission();
        if (!hasPermission) return;
        const uri = await launchLibrary({ allowsEditing: true, quality: 0.7 });
        if (uri) setExpenseImage(uri);
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const ownerExpenses = expenses.filter(e => e.distribute_type === 'owner').reduce((s, e) => s + e.amount, 0);
    const distributedExpenses = expenses.filter(e => e.distribute_type === 'rooms').reduce((s, e) => s + e.amount, 0);

    return (
        <SafeAreaView style={styles.container}>
            <Header
                title="Expenses"
                rightAction={
                    <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
                        <Plus size={22} color={theme.colors.accent} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Month/Year Label */}
                <Text style={styles.monthLabel}>
                    {MONTH_NAMES[month - 1]} {year}
                </Text>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.danger }]}>
                        <Text style={styles.summaryLabel}>TOTAL</Text>
                        <Text style={styles.summaryAmount}>{CURRENCY}{totalExpenses.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.warning }]}>
                        <Text style={styles.summaryLabel}>OWNER</Text>
                        <Text style={styles.summaryAmount}>{CURRENCY}{ownerExpenses.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.accent }]}>
                        <Text style={styles.summaryLabel}>ROOMS</Text>
                        <Text style={styles.summaryAmount}>{CURRENCY}{distributedExpenses.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Expense List */}
                {expenses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CreditCard size={48} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No expenses yet</Text>
                        <Text style={styles.emptySubtitle}>Tap + to add your first expense</Text>
                    </View>
                ) : (
                    expenses.map((expense) => {
                        const unitNames = expense.distributed_unit_ids
                            ? JSON.parse(expense.distributed_unit_ids).map((id: number) => {
                                const unit = units.find(u => u.id === id);
                                return unit?.name || `Room ${id}`;
                            }).join(', ')
                            : null;

                        return (
                            <Pressable
                                key={expense.id}
                                style={styles.expenseItem}
                                onLongPress={() => {
                                    setDeleteTarget(expense.id);
                                    setShowDeleteModal(true);
                                }}
                            >
                                <View style={styles.expenseLeft}>
                                    <View style={[styles.expenseIconBg, {
                                        backgroundColor: expense.distribute_type === 'rooms'
                                            ? (isDark ? '#6366F120' : '#EEF2FF')
                                            : (isDark ? '#F59E0B20' : '#FFFBEB')
                                    }]}>
                                        <Tag size={18} color={
                                            expense.distribute_type === 'rooms' ? theme.colors.accent : '#F59E0B'
                                        } />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.expenseType}>{expense.expense_type}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {expense.frequency === 'monthly' && (
                                                <View style={styles.recurringBadge}>
                                                    <Text style={styles.recurringBadgeText}>Monthly</Text>
                                                </View>
                                            )}
                                            <Text style={styles.expenseDistribute}>
                                                {expense.distribute_type === 'rooms' ? `Rooms: ${unitNames}` : 'Owner'}
                                            </Text>
                                        </View>
                                        {expense.remarks ? (
                                            <Text style={styles.expenseRemarks} numberOfLines={1}>{expense.remarks}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <Text style={styles.expenseAmount}>{CURRENCY}{expense.amount.toLocaleString()}</Text>
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>

            {/* Add Expense Modal */}
            <RentModalSheet
                visible={showAddModal}
                onClose={() => { setShowAddModal(false); resetAddForm(); }}
                title="Add Expense"
                subtitle={property?.name}
                actionLabel="Add Expense"
                onAction={handleAddExpense}
                actionDisabled={addLoading}
            >
                {/* Amount */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.currencyPrefix}>{CURRENCY}</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={expenseAmount}
                            onChangeText={setExpenseAmount}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.colors.textTertiary}
                        />
                    </View>
                </View>

                {/* Type/Category */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Type / Category</Text>
                    <Pressable
                        style={styles.dropdownInput}
                        onPress={() => setShowCategoryPicker(true)}
                    >
                        <Text style={[styles.dropdownText, !expenseType && { color: theme.colors.textTertiary }]}>
                            {expenseType || 'Select Category'}
                        </Text>
                        <ChevronDown size={20} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Frequency */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Frequency</Text>
                    <View style={styles.freqRow}>
                        <Pressable
                            style={[styles.freqBtn, expenseFrequency === 'one_time' && styles.freqBtnActive]}
                            onPress={() => { hapticsSelection(); setExpenseFrequency('one_time'); }}
                        >
                            <Text style={[styles.freqBtnText, expenseFrequency === 'one_time' && styles.freqBtnTextActive]}>
                                This Month
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.freqBtn, expenseFrequency === 'monthly' && styles.freqBtnActive]}
                            onPress={() => { hapticsSelection(); setExpenseFrequency('monthly'); }}
                        >
                            <Text style={[styles.freqBtnText, expenseFrequency === 'monthly' && styles.freqBtnTextActive]}>
                                Every Month
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Image */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Image (Optional)</Text>
                    <Pressable style={styles.imageBtn} onPress={() => setShowImagePicker(true)}>
                        {expenseImage ? (
                            <Image
                                source={{ uri: getFullImageUri(expenseImage) || expenseImage }}
                                style={styles.imagePreview}
                            />
                        ) : (
                            <>
                                <Camera size={20} color={theme.colors.textSecondary} />
                                <Text style={styles.imageBtnText}>Add Photo</Text>
                            </>
                        )}
                    </Pressable>
                </View>

                {/* Remarks */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Remarks</Text>
                    <TextInput
                        style={styles.input}
                        value={expenseRemarks}
                        onChangeText={setExpenseRemarks}
                        placeholder="Enter remarks (optional)"
                        placeholderTextColor={theme.colors.textTertiary}
                    />
                </View>

                {/* Distribute */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Distribute</Text>
                    <View style={styles.freqRow}>
                        <Pressable
                            style={[styles.freqBtn, distributeType === 'owner' && styles.freqBtnActive]}
                            onPress={() => { hapticsSelection(); setDistributeType('owner'); setSelectedUnitIds([]); }}
                        >
                            <Text style={[styles.freqBtnText, distributeType === 'owner' && styles.freqBtnTextActive]}>
                                Owner Only
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.freqBtn, distributeType === 'rooms' && styles.freqBtnActive]}
                            onPress={() => { hapticsSelection(); setDistributeType('rooms'); }}
                        >
                            <Text style={[styles.freqBtnText, distributeType === 'rooms' && styles.freqBtnTextActive]}>
                                Among Rooms
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Room Selection */}
                {distributeType === 'rooms' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Select Rooms</Text>
                        <View style={styles.roomGrid}>
                            {units.map((unit) => {
                                const isSelected = selectedUnitIds.includes(unit.id);
                                return (
                                    <Pressable
                                        key={unit.id}
                                        style={[styles.roomChip, isSelected && styles.roomChipActive]}
                                        onPress={() => toggleUnitSelection(unit.id)}
                                    >
                                        <Text style={[styles.roomChipText, isSelected && styles.roomChipTextActive]}>
                                            {unit.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {units.length > 1 && (
                            <Pressable
                                style={styles.selectAllBtn}
                                onPress={() => {
                                    hapticsSelection();
                                    if (selectedUnitIds.length === units.length) {
                                        setSelectedUnitIds([]);
                                    } else {
                                        setSelectedUnitIds(units.map(u => u.id));
                                    }
                                }}
                            >
                                <Text style={styles.selectAllText}>
                                    {selectedUnitIds.length === units.length ? 'Deselect All' : 'Select All'}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}

                <PickerBottomSheet
                    visible={showCategoryPicker}
                    onClose={() => setShowCategoryPicker(false)}
                    title="Select Category"
                    options={EXPENSE_CATEGORIES}
                    selectedValue={expenseType}
                    onSelect={(cat) => setExpenseType(cat)}
                />
            </RentModalSheet>

            {/* Image Picker Modal */}
            <ImagePickerModal
                visible={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelectCamera={handleSelectCamera}
                onSelectGallery={handleSelectGallery}
            />

            {/* Delete Confirmation */}
            <ConfirmationModal
                visible={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                onConfirm={handleDelete}
                title="Delete Expense"
                message="Are you sure you want to delete this expense?"
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
        padding: theme.spacing.m,
        paddingBottom: 40,
    },
    addBtn: {
        padding: theme.spacing.s,
    },
    monthLabel: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        marginBottom: theme.spacing.l,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderLeftWidth: 3,
        ...theme.shadows.small,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.m,
    },
    emptySubtitle: {
        fontSize: theme.typography.s,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    expenseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.m,
    },
    expenseIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    expenseType: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    expenseDistribute: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    expenseRemarks: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    expenseAmount: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.danger,
    },
    recurringBadge: {
        backgroundColor: isDark ? '#10B98130' : '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    recurringBadgeText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.success,
    },
    // Modal styles
    inputGroup: {
        marginBottom: theme.spacing.m,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginRight: 4,
    },
    amountInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        paddingVertical: 14,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        fontSize: 14,
        color: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dropdownText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
    },
    freqRow: {
        flexDirection: 'row',
        gap: 10,
    },
    freqBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    freqBtnActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    freqBtnText: {
        fontSize: 13,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
    },
    freqBtnTextActive: {
        color: '#FFF',
    },
    imageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    imageBtnText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    imagePreview: {
        width: '100%',
        height: 120,
        borderRadius: 12,
    },
    roomGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roomChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    roomChipActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    roomChipText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    roomChipTextActive: {
        color: '#FFF',
    },
    selectAllBtn: {
        marginTop: theme.spacing.s,
        alignSelf: 'flex-end',
    },
    selectAllText: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
    },
});
