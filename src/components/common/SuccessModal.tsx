import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../../theme';
import { ArrowLeft, LucideIcon } from 'lucide-react-native';

export interface ModalAction {
    id: string;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    onPress: () => void;
    primary?: boolean;
}

interface SuccessModalProps {
    visible: boolean;
    title: string;
    subtitle?: string;
    actions: ModalAction[];
    onClose: () => void;
    secondaryActionLabel?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
    visible,
    title,
    subtitle,
    actions,
    onClose,
    secondaryActionLabel = "Done, Go Back"
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}

                    {actions.map((action) => (
                        <Pressable
                            key={action.id}
                            style={styles.modalButton}
                            onPress={action.onPress}
                        >
                            <action.icon size={24} color={theme.colors.accent} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalButtonTitle}>{action.title}</Text>
                                {action.subtitle && <Text style={styles.modalButtonSubtitle}>{action.subtitle}</Text>}
                            </View>
                            <ArrowLeft size={20} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                        </Pressable>
                    ))}

                    <Pressable
                        style={[styles.modalButton, styles.modalButtonSecondary]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonSecondaryText}>{secondaryActionLabel}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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

export default SuccessModal;
