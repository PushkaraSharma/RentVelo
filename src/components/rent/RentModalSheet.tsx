import React from 'react';
import {
    View, Text, StyleSheet, Pressable, Modal,
    KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RentModalSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** If true, content scrolls. Default true */
    scrollable?: boolean;
    /** If provided, renders a bottom action button */
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
}

/**
 * Shared bottom-sheet modal for the rent feature.
 * Accent-coloured header, safe area padding, keyboard avoiding.
 */
export default function RentModalSheet({
    visible, onClose, title, subtitle, children,
    scrollable = true, actionLabel, onAction, actionDisabled,
}: RentModalSheetProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType="slide">
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <Pressable style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]} onPress={e => e.stopPropagation()}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.headerTitle}>{title}</Text>
                                {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
                            </View>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#FFF" />
                            </Pressable>
                        </View>

                        {/* Body */}
                        {scrollable ? (
                            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {children}
                            </ScrollView>
                        ) : (
                            <View style={styles.body}>{children}</View>
                        )}

                        {/* Optional Action Button */}
                        {actionLabel && onAction && (
                            <Pressable
                                style={[styles.actionBtn, actionDisabled && { opacity: 0.5 }]}
                                onPress={onAction}
                                disabled={actionDisabled}
                            >
                                <Text style={styles.actionBtnText}>{actionLabel}</Text>
                            </Pressable>
                        )}
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        padding: theme.spacing.l,
    },
    actionBtn: {
        backgroundColor: theme.colors.primary,
        marginHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.s,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: theme.typography.bold,
        color: '#FFF',
        letterSpacing: 1,
    },
});
