import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Calendar, Info, X } from 'lucide-react-native';
import Button from '../common/Button';
import Input from '../common/Input';
import DateTimePicker from '@react-native-community/datetimepicker';

interface RemoveTenantModalProps {
    visible: boolean;
    onClose: () => void;
    tenant: any;
    moveOutDate: Date;
    onDateChange: (date: Date) => void;
    refundAmount: string;
    onRefundAmountChange: (amount: string) => void;
    onSubmit: () => void;
}

const RemoveTenantModal: React.FC<RemoveTenantModalProps> = ({
    visible,
    onClose,
    tenant,
    moveOutDate,
    onDateChange,
    refundAmount,
    onRefundAmountChange,
    onSubmit
}) => {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [showDatePicker, setShowDatePicker] = React.useState(false);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.handle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Remove Tenant</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color={theme.colors.textPrimary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.statRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Security Deposit</Text>
                                    <Text style={styles.statValue}>₹ {tenant?.security_deposit || 0}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Balance Left</Text>
                                    <Text style={[styles.statValue, { color: (tenant?.balance_amount || 0) > 0 ? '#EF4444' : '#10B981' }]}>
                                        ₹ {tenant?.balance_amount || 0}
                                    </Text>
                                </View>
                            </View>

                            <Input
                                label="Return Amount (Refund)"
                                value={refundAmount}
                                onChangeText={onRefundAmountChange}
                                keyboardType="numeric"
                                placeholder="Enter amount to return"
                            />

                            <Text style={styles.inputLabel}>Move-out Date</Text>
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

                            <View style={styles.noteBox}>
                                <Info size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.noteText}>Even if removed, tenant details will be saved in past records.</Text>
                            </View>

                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancel"
                                    onPress={onClose}
                                    variant="outline"
                                    style={{ flex: 1, marginRight: 10 }}
                                />
                                <Button
                                    title="Remove"
                                    onPress={onSubmit}
                                    style={{ flex: 1, backgroundColor: '#EF4444' }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '90%',
        paddingHorizontal: theme.spacing.m
    },
    dismissArea: {
        flex: 1,
    },
    keyboardView: {
        width: '100%'
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: theme.spacing.s
    },
    closeBtn: {
        padding: 4
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20
    },
    statBox: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textPrimary
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8
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
    noteBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: theme.colors.background,
        padding: 12,
        borderRadius: 12,
        marginBottom: 20
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 18
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 10
    }
});

export default RemoveTenantModal;
