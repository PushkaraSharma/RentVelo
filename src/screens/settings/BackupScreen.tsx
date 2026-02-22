import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { Database, Cloud, HardDrive, RotateCcw, CloudUpload, CheckCircle2 } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { linkGoogleAccount, unlinkGoogleAccount } from '../../redux/authSlice';
import { initGoogleAuth, signInWithGoogle, signOutGoogle, isSignedIn } from '../../services/googleAuthService';
import { performLocalBackup, backupToGoogleDrive, restoreFromGoogleDrive } from '../../services/backupService';
import { storage } from '../../utils/storage';

export default function BackupScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { isGoogleLinked, googleEmail } = useSelector((state: RootState) => state.auth);

    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [lastSync, setLastSync] = useState<string>('Never');

    useEffect(() => {
        initGoogleAuth();
        loadLastSync();
    }, []);

    const loadLastSync = () => {
        const time = storage.getString('@last_backup_time');
        if (time) setLastSync(new Date(time).toLocaleString());
    };

    const updateLastSync = () => {
        const now = new Date().toISOString();
        storage.set('@last_backup_time', now);
        setLastSync(new Date(now).toLocaleString());
    };

    const handleLocalBackup = async () => {
        setBackingUp(true);
        const result = await performLocalBackup();
        setBackingUp(false);
        if (result) {
            updateLastSync();
            Alert.alert('Success', `Local backup saved to:\n${result}`);
        } else {
            Alert.alert('Error', 'Failed to create local backup.');
        }
    };

    const handleGoogleToggle = async () => {
        if (isGoogleLinked) {
            Alert.alert(
                'Disconnect Google Drive',
                'Are you sure you want to disconnect? Auto-backups will stop.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Disconnect', style: 'destructive', onPress: async () => {
                            await signOutGoogle();
                            dispatch(unlinkGoogleAccount());
                        }
                    }
                ]
            );
        } else {
            try {
                const user = await signInWithGoogle();
                if (user) {
                    dispatch(linkGoogleAccount(user.email));
                    Alert.alert('Success', 'Google account linked successfully!');
                }
            } catch (error) {
                Alert.alert('Sign-In Error', 'Could not link Google account.');
            }
        }
    };

    const handleGoogleBackup = async () => {
        if (!isGoogleLinked) {
            Alert.alert('Not Linked', 'Please connect your Google account first.');
            return;
        }
        setBackingUp(true);
        const success = await backupToGoogleDrive();
        setBackingUp(false);
        if (success) {
            updateLastSync();
            Alert.alert('Success', 'Backup uploaded to Google Drive.');
        } else {
            Alert.alert('Error', 'Failed to upload backup to Drive.');
        }
    };

    const handleRestore = async () => {
        if (!isGoogleLinked) {
            Alert.alert('Not Linked', 'Please connect your Google account to restore from Drive.');
            return;
        }
        Alert.alert(
            'Restore Data',
            'This will overwrite all current data. Are you sure you want to proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore', style: 'destructive', onPress: async () => {
                        setRestoring(true);
                        const success = await restoreFromGoogleDrive();
                        setRestoring(false);
                        if (success) {
                            Alert.alert('Success', 'Data restored successfully. Please restart the app for changes to take effect.');
                        } else {
                            Alert.alert('Restore Failed', 'Could not restore data from Google Drive.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Data Backup & Sync" />

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
                        <Pressable style={styles.item} onPress={handleLocalBackup} disabled={backingUp || restoring}>
                            <View style={styles.itemLeft}>
                                <HardDrive size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>Local Backup</Text>
                                    <Text style={styles.itemSubLabel}>Save a copy to your phone</Text>
                                </View>
                            </View>
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable style={styles.item} onPress={handleGoogleToggle} disabled={backingUp || restoring}>
                            <View style={styles.itemLeft}>
                                <Cloud size={20} color={isGoogleLinked ? theme.colors.success : "#6366F1"} />
                                <View>
                                    <Text style={styles.itemLabel}>Google Drive Sync</Text>
                                    <Text style={styles.itemSubLabel}>
                                        {isGoogleLinked ? `Linked as ${googleEmail}` : 'Connect to Google for auto-backups'}
                                    </Text>
                                </View>
                            </View>
                            {isGoogleLinked ? (
                                <CheckCircle2 size={20} color={theme.colors.success} />
                            ) : (
                                <View style={styles.badge}><Text style={styles.badgeText}>LINK</Text></View>
                            )}
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Restore</Text>
                    <View style={styles.card}>
                        <Pressable style={styles.item} onPress={handleRestore} disabled={backingUp || restoring}>
                            <View style={styles.itemLeft}>
                                <RotateCcw size={20} color={theme.colors.textPrimary} />
                                <View>
                                    <Text style={styles.itemLabel}>Restore Data</Text>
                                    <Text style={styles.itemSubLabel}>Import data from Google Drive</Text>
                                </View>
                            </View>
                            {restoring && <ActivityIndicator size="small" color={theme.colors.accent} />}
                        </Pressable>
                    </View>
                </View>

                <View style={styles.lastBackup}>
                    <Database size={14} color={theme.colors.textTertiary} />
                    <Text style={styles.lastBackupText}>Last Backup: {lastSync}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
});
