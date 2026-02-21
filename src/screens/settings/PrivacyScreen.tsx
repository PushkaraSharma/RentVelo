import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowLeft, Shield, Lock, Eye, EyeOff, FileText } from 'lucide-react-native';
import Toggle from '../../components/common/Toggle';

export default function PrivacyScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Security & Privacy</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Security</Text>
                    <View style={styles.card}>
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Lock size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>App Lock (Biometric)</Text>
                                    <Text style={styles.itemSubLabel}>Secure your app with FaceID/Fingerprint</Text>
                                </View>
                            </View>
                            <Toggle value={false} onValueChange={() => { }} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <EyeOff size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>Privacy Mode</Text>
                                    <Text style={styles.itemSubLabel}>Hide amounts on Dashboard</Text>
                                </View>
                            </View>
                            <Toggle value={true} onValueChange={() => { }} />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Privacy</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Shield size={20} color="#10B981" />
                                <View>
                                    <Text style={styles.itemLabel}>Privacy Policy</Text>
                                    <Text style={styles.itemSubLabel}>How we handle your data</Text>
                                </View>
                            </View>
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item}>
                            <View style={styles.itemLeft}>
                                <FileText size={20} color="#F59E0B" />
                                <View>
                                    <Text style={styles.itemLabel}>Terms of Service</Text>
                                    <Text style={styles.itemSubLabel}>Usage guidelines</Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.l,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.m,
        marginLeft: theme.spacing.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
        flex: 1,
    },
    itemLabel: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    itemSubLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border + '50',
    },
});
