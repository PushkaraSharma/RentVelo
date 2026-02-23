import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    Platform
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Trash2, AlertTriangle, X } from 'lucide-react-native';
import Button from './Button';

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) => {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark, variant);

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <Trash2 size={32} color={theme.colors.danger} />;
            case 'warning':
                return <AlertTriangle size={32} color={theme.colors.warning} />;
            default:
                return <AlertTriangle size={32} color={theme.colors.accent} />;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            {getIcon()}
                        </View>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    <View style={styles.actions}>
                        <Button
                            title={cancelText}
                            onPress={onClose}
                            variant="outline"
                            style={styles.actionBtn}
                            disabled={loading}
                        />
                        <Button
                            title={confirmText}
                            onPress={onConfirm}
                            variant="primary"
                            style={StyleSheet.flatten([
                                styles.actionBtn,
                                variant === 'danger' ? { backgroundColor: theme.colors.danger } : {}
                            ])}
                            loading={loading}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const getStyles = (theme: any, isDark: boolean, variant: string) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    dismissArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingHorizontal: 24,
        alignItems: 'center'
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        marginTop: 12,
        marginBottom: 24
    },
    header: {
        paddingTop: 24,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative'
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: variant === 'danger' ? (isDark ? '#EF444420' : '#FEE2E2') : (isDark ? '#F59E0B20' : '#FFFBEB'),
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: 4
    },
    body: {
        alignItems: 'center',
        marginBottom: 32
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    actionBtn: {
        flex: 1
    }
});

export default ConfirmationModal;
