import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Sparkles, Check, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WhatsNewModalProps {
    visible: boolean;
    onClose: () => void;
    version: string;
    features: string[];
}

export default function WhatsNewModal({ visible, onClose, version, features }: WhatsNewModalProps) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <SafeAreaView style={styles.safeArea}>
                    <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
                            <X size={20} color={theme.colors.textSecondary} />
                        </Pressable>

                        <View style={styles.header}>
                            <View style={styles.iconBg}>
                                <Sparkles size={28} color={isDark ? '#FFF' : theme.colors.accent} />
                            </View>
                            <Text style={styles.title}>What's New</Text>
                            <Text style={styles.subtitle}>Version {version}</Text>
                        </View>

                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={styles.scrollContentContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.description}>
                                We've made some improvements to make your property management experience even better.
                            </Text>

                            <View style={styles.featuresList}>
                                {features.map((feature, index) => (
                                    <View key={index} style={styles.featureItem}>
                                        <View style={styles.checkIconBg}>
                                            <Check size={16} color="#FFF" />
                                        </View>
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </Pressable>
                </SafeAreaView>
            </Pressable>
        </Modal>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeArea: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        ...theme.shadows.medium,
    },
    closeBtn: {
        position: 'absolute',
        top: theme.spacing.m,
        right: theme.spacing.m,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
    },
    iconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: isDark ? theme.colors.accent : theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    title: {
        fontSize: 24,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.accent,
        fontWeight: theme.typography.semiBold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        flexGrow: 0,
    },
    scrollContentContainer: {
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
    },
    description: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.l,
    },
    featuresList: {
        gap: theme.spacing.m,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.s,
        borderRadius: 16,
    },
    checkIconBg: {
        backgroundColor: theme.colors.accent,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
        marginTop: 2,
    },
    featureText: {
        flex: 1,
        fontSize: theme.typography.s,
        color: theme.colors.textPrimary,
        lineHeight: 22,
    },
});
