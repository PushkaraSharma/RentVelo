import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Calendar, ChevronRight, X } from 'lucide-react-native';
import Button from '../common/Button';
import DateTimePicker from '@react-native-community/datetimepicker';

interface MoveTenantModalProps {
    visible: boolean;
    onClose: () => void;
    tenant: any;
    moveOutDate: Date;
    onDateChange: (date: Date) => void;
    targetPropertyId: number | null;
    targetUnitId: number | null;
    availableProperties: any[];
    availableUnits: any[];
    onPropertyPress: () => void;
    onUnitPress: () => void;
    onSubmit: () => void;
}

const MoveTenantModal: React.FC<MoveTenantModalProps> = ({
    visible,
    onClose,
    tenant,
    moveOutDate,
    onDateChange,
    targetPropertyId,
    targetUnitId,
    availableProperties,
    availableUnits,
    onPropertyPress,
    onUnitPress,
    onSubmit
}) => {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [showDatePicker, setShowDatePicker] = React.useState(false);

    if (!visible) return null;

    return (
        <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Move Tenant</Text>
                        <Pressable onPress={onClose}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    <Text style={styles.inputLabel}>Choose Property</Text>
                    <Pressable style={styles.pickerTrigger} onPress={onPropertyPress}>
                        <Text style={styles.pickerTriggerText}>
                            {availableProperties.find(p => p.id === targetPropertyId)?.name || 'Select Property'}
                        </Text>
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </Pressable>

                    <Text style={styles.inputLabel}>Target Room</Text>
                    <Pressable style={styles.pickerTrigger} onPress={onUnitPress}>
                        <Text style={styles.pickerTriggerText}>
                            {availableUnits.find(u => u.id === targetUnitId)?.name || 'Select Room'}
                        </Text>
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </Pressable>

                    <Text style={[styles.inputLabel, { marginTop: 15 }]}>Move Date</Text>
                    <Pressable style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                        <Calendar size={20} color={theme.colors.accent} />
                        <Text style={styles.datePickerText}>{moveOutDate.toLocaleDateString()}</Text>
                    </Pressable>

                    {showDatePicker && (
                        <DateTimePicker
                            value={moveOutDate}
                            mode="date"
                            onChange={(event: any, date?: Date) => {
                                setShowDatePicker(false);
                                if (date) onDateChange(date);
                            }}
                        />
                    )}

                    <View style={styles.modalActions}>
                        <Button
                            title="Cancel"
                            onPress={onClose}
                            variant="outline"
                            style={{ flex: 1, marginRight: 10 }}
                        />
                        <Button
                            title="Move Tenant"
                            onPress={onSubmit}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000
    },
    keyboardView: {
        width: '100%'
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        padding: theme.spacing.m,
        ...theme.shadows.medium
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 15
    },
    pickerTriggerText: {
        fontSize: 16,
        color: theme.colors.textPrimary
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.background,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20
    },
    datePickerText: {
        fontSize: 16,
        color: theme.colors.textPrimary
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 10
    }
});

export default MoveTenantModal;
