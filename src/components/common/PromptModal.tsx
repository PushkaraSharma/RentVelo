import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Pressable
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import Button from './Button';

interface PromptModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    submitText?: string;
    cancelText?: string;
}

const PromptModal: React.FC<PromptModalProps> = ({
    visible,
    onClose,
    onSubmit,
    title,
    message,
    placeholder = 'Enter value...',
    defaultValue = '',
    submitText = 'Add',
    cancelText = 'Cancel'
}) => {
    const { theme, isDark } = useAppTheme();
    const [text, setText] = useState(defaultValue);
    const styles = getStyles(theme, isDark);

    useEffect(() => {
        if (visible) {
            setText(defaultValue);
        }
    }, [visible, defaultValue]);

    const handleSubmit = () => {
        onSubmit(text);
        setText('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={styles.content}>
                    <Text style={styles.title}>{title}</Text>
                    {message && <Text style={styles.message}>{message}</Text>}

                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={text}
                        onChangeText={setText}
                        autoFocus
                        autoCapitalize="words"
                        selectionColor={theme.colors.accent}
                    />

                    <View style={styles.actions}>
                        <Button
                            title={cancelText}
                            variant="outline"
                            onPress={onClose}
                            style={styles.btn}
                        />
                        <Button
                            title={submitText}
                            onPress={handleSubmit}
                            style={styles.btn}
                            disabled={!text.trim()}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: theme.spacing.l,
    },
    dismissArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        width: '100%',
        ...theme.shadows.medium,
    },
    title: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
    },
    message: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
    },
    input: {
        backgroundColor: isDark ? theme.colors.background : '#F3F4F6',
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        color: theme.colors.textPrimary,
        fontSize: theme.typography.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.l,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.m,
    },
    btn: {
        flex: 1,
    },
});

export default PromptModal;
