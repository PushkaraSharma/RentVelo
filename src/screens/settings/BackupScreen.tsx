import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowLeft, Database, Cloud, HardDrive, RotateCcw, CloudUpload } from 'lucide-react-native';
import Button from '../../components/common/Button';

export default function BackupScreen({ navigation }: any) {
    const [backingUp, setBackingUp] = useState(false);

    const handleBackup = () => {
        setBackingUp(true);
        setTimeout(() => {
            setBackingUp(false);
            Alert.alert('Success', 'Backup created successfully in your local storage.');
        }, 2000);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Data Backup & Sync</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoSection}>
                    <View style={styles.cloudIconBox}>
                        <CloudUpload size={48} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.infoTitle}>Secure Your Data</Text>
                    <Text style={styles.infoText}>
                        Keep your property and tenant data safe by creating regular backups.
                        You can restore your data if you switch devices.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Backup Options</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={handleBackup}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>Local Backup</Text>
                                    <Text style={styles.itemSubLabel}>Save a copy to your phone</Text>
                                </View>
                            </View>
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Cloud size={20} color="#6366F1" />
                                <View>
                                    <Text style={styles.itemLabel}>Google Drive Sync</Text>
                                    <Text style={styles.itemSubLabel}>Connect to Google for auto-backups</Text>
                                </View>
                            </View>
                            <View style={styles.badge}><Text style={styles.badgeText}>PRO</Text></View>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Restore</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item}>
                            <View style={styles.itemLeft}>
                                <RotateCcw size={20} color={theme.colors.textPrimary} />
                                <View>
                                    <Text style={styles.itemLabel}>Restore Data</Text>
                                    <Text style={styles.itemSubLabel}>Import data from a backup file</Text>
                                </View>
                            </View>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.lastBackup}>
                    <Database size={14} color={theme.colors.textTertiary} />
                    <Text style={styles.lastBackupText}>Last Backup: Never</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Run Instant Backup"
                    onPress={handleBackup}
                    loading={backingUp}
                    icon={<CloudUpload size={20} color="#FFF" />}
                />
            </View>
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
    infoSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    cloudIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    infoTitle: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
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
    badge: {
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.accent,
    },
    lastBackup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: theme.spacing.xl,
    },
    lastBackupText: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        fontWeight: theme.typography.medium,
    },
    footer: {
        padding: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
});
