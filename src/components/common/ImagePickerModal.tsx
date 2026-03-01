import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Platform
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';

interface ImagePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectCamera: () => void;
    onSelectGallery: () => void;
    title?: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    visible,
    onClose,
    onSelectCamera,
    onSelectGallery,
    title = 'Upload Photo'
}) => {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    <View style={styles.optionsArea}>
                        <Pressable
                            style={styles.option}
                            onPress={() => {
                                onSelectCamera();
                                onClose();
                            }}
                        >
                            <View style={[styles.iconBg, { backgroundColor: '#F3E8FF' }]}>
                                <Camera size={24} color="#9333EA" />
                            </View>
                            <Text style={styles.optionText}>Take Photo</Text>
                        </Pressable>

                        <Pressable
                            style={styles.option}
                            onPress={() => {
                                onSelectGallery();
                                onClose();
                            }}
                        >
                            <View style={[styles.iconBg, { backgroundColor: '#E0F2FE' }]}>
                                <ImageIcon size={24} color="#0284C7" />
                            </View>
                            <Text style={styles.optionText}>Choose from Gallery</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        padding: theme.spacing.s,
    },
    optionsArea: {
        padding: theme.spacing.m,
        flexDirection: 'row',
        gap: theme.spacing.m,
    },
    option: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    iconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    optionText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
});

export default ImagePickerModal;
