import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Share, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/authSlice';
import { RootState } from '../../redux/store';
import {
    LogOut,
    Settings,
    Database,
    User,
    Bell,
    ChevronRight,
    Moon,
    FileText,
    Shield,
    CircleUser,
    Share2,
    Trash2,
    AlertCircle,
    HelpCircle,
    Info
} from 'lucide-react-native';
import Toggle from '../../components/common/Toggle';
import { CHANGELOG } from '../../utils/Constants';
import { signOutGoogle } from '../../services/googleAuthService';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { getDb } from '../../db';
import { generateRealUsageData } from '../../../tests/seedDatabase';
import { getFullImageUri } from '../../services/imageService';
import { trackEvent, AnalyticsEvents, setAnalyticsUser } from '../../services/analyticsService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../hooks/useToast';
import { deleteAccountData } from '../../services/accountService';

export default function SettingsScreen({ navigation }: any) {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { user } = useSelector((state: RootState) => state.auth);
    const { theme, isDark, setMode } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showSeedModal, setShowSeedModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteCloudBackup, setDeleteCloudBackup] = useState(true);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        setIsDeleting(true);
        try {
            await signOutGoogle();
        } catch (e) {
            // Ignored if not signed in or error occurs
        }
        trackEvent(AnalyticsEvents.SIGN_OUT);
        await setAnalyticsUser(null);
        dispatch(logout());
        setIsDeleting(false);
    };

    const confirmDeleteAccount = async () => {
        if (!user) return;

        setIsDeleting(true);
        try {
            // Here we determine the auth method. 
            // In this app, if isGoogleLinked is true, it's Google. 
            // Otherwise, we check if it's apple. 
            // Since we don't explicitly store auth type in the slice yet, we can infer it.
            // If they have a googleEmail, it's likely Google.
            const authMethod = user.email ? 'google' : 'apple';
            // Actually, we'll try to revoke Google if isGoogleLinked is true.

            const result = await deleteAccountData(
                user.email || '', // ID placeholder for apple
                authMethod,
                deleteCloudBackup
            );

            if (result.success) {
                showToast({
                    type: 'success',
                    title: 'Account Deleted',
                    message: 'Your account and data have been permanently removed.'
                });
                dispatch(logout());
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Delete Account failed:', error);
            showToast({
                type: 'error',
                title: 'Deletion Failed',
                message: 'Could not complete account deletion. Please try again or contact support.'
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeedDatabase = () => {
        setShowSeedModal(true);
    };

    const confirmSeed = () => {
        setShowSeedModal(false);
        setIsSeeding(true);
        // Yield the JS thread for 100ms so the Modal overlay can render
        setTimeout(async () => {
            try {
                const db = getDb();
                await generateRealUsageData(db);
                showToast({ type: 'success', title: 'Success', message: 'Database seeded successfully.' });
            } catch (error) {
                console.error('Error seeding DB:', error);
                showToast({ type: 'error', title: 'Error', message: 'Failed to seed database.' });
            } finally {
                setIsSeeding(false);
            }
        }, 100);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Manage your properties easily with RentVelo! Download now to automate your rent collections.',
                url: 'https://rentvelo.indieroots.in/',
                title: 'Share RentVelo'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const SettingItem = ({ icon: Icon, label, onPress, right, color = theme.colors.textPrimary }: any) => (
        <Pressable style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            {right || <ChevronRight size={20} color={theme.colors.textTertiary} />}
        </Pressable>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                        {user?.photoUrl ? (
                            <Image source={{ uri: getFullImageUri(user.photoUrl) || user.photoUrl }} style={styles.profileImage} />
                        ) : (
                            <CircleUser size={60} color={theme.colors.accent} strokeWidth={1.5} />
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.name || 'Velo Owner'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || 'owner@rentvelo.com'}</Text>
                        <Pressable style={styles.editProfileChip} onPress={() => navigation.navigate('Profile')}>
                            <Text style={styles.editProfileText}>Manage Profile</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account & Security</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={Shield}
                            label="Security & Privacy"
                            color="#10B981"
                            onPress={() => navigation.navigate('Privacy')}
                        />
                        <SettingItem
                            icon={Bell}
                            label="Notifications"
                            color="#F59E0B"
                            onPress={() => navigation.navigate('Notifications')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={Moon}
                            label="Dark Mode"
                            color="#6366F1"
                            right={<Toggle value={isDark} onValueChange={(v) => setMode(v ? 'dark' : 'light')} />}
                        />
                        <SettingItem
                            icon={Database}
                            label="Data Backup"
                            color="#EC4899"
                            onPress={() => navigation.navigate('Backup')}
                        />
                        {__DEV__ && (
                            <SettingItem
                                icon={Database}
                                label={isSeeding ? "Seeding Database..." : "Seed Database (Dev)"}
                                color="#8B5CF6"
                                onPress={handleSeedDatabase}
                            />
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Documents</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={FileText}
                            label="Terms & Conditions"
                            color="#8B5CF6"
                            onPress={() => navigation.navigate('TermsEditor')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support & About</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon={HelpCircle}
                            label="Help Center"
                            color="#06B6D4"
                            onPress={() => showToast({
                                type: 'info',
                                title: 'Help Center',
                                message: 'Contact rentvelo@indieroots.in for assistance.'
                            })}
                        />
                        <SettingItem
                            icon={Share2}
                            label="Share RentVelo"
                            color="#F43F5E"
                            onPress={handleShare}
                        />
                        <SettingItem
                            icon={Info}
                            label="About Application"
                            color={theme.colors.textSecondary}
                            onPress={() => navigation.navigate('About')}
                        />
                    </View>
                </View>

                <View style={styles.logoutWrapper}>
                    <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={20} color={theme.colors.danger} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </Pressable>
                </View>

                <View style={[styles.section, { marginTop: theme.spacing.xl }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>Danger Zone</Text>
                    <View style={[styles.sectionContent, { borderColor: theme.colors.danger + '30' }]}>
                        <SettingItem
                            icon={Trash2}
                            label="Permanently Delete Account"
                            color={theme.colors.danger}
                            onPress={() => setShowDeleteModal(true)}
                        />
                    </View>
                </View>

                <View style={styles.versionWrapper}>
                    <Text style={styles.version}>RentVelo v{CHANGELOG.version} • Made with ❤️</Text>
                </View>
            </ScrollView>

            <ConfirmationModal
                visible={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                title="Logout"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                variant="danger"
            />
            <ConfirmationModal
                visible={showSeedModal}
                onClose={() => setShowSeedModal(false)}
                onConfirm={confirmSeed}
                title="Seed Database"
                message="Are you sure you want to inject 1-year of test data into this environment?"
                confirmText="Seed Data"
                cancelText="Cancel"
                variant="danger"
            />
            <Modal visible={isSeeding || isDeleting} transparent={true} animationType="fade">
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loaderText}>
                        {isDeleting ? "Permanently Wiping Data..." : "Generating 1 Year of Realistic App Data..."}
                    </Text>
                    <Text style={styles.loaderSubText}>
                        {isDeleting ? "This may take a moment." : "This takes about 10-15 seconds."}
                    </Text>
                </View>
            </Modal>

            <ConfirmationModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteAccount}
                title="Permanently Delete Account?"
                message="This action is IRREVERSIBLE. All your properties, rent records, and documents will be permanently deleted from this device."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={isDeleting}
            >
                <Pressable
                    style={styles.deleteOption}
                    onPress={() => setDeleteCloudBackup(!deleteCloudBackup)}
                >
                    <View style={styles.checkboxLabel}>
                        <AlertCircle size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.deleteOptionText}>Also wipe Google Drive backups</Text>
                    </View>
                    <Toggle value={deleteCloudBackup} onValueChange={(v) => setDeleteCloudBackup(v)} />
                </Pressable>
            </ConfirmationModal>

        </View>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.l,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    profileEditBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small,
    },
    profileCard: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.l,
        padding: theme.spacing.l,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
        marginBottom: theme.spacing.xl,
    },
    profileImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.l,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    profileEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    editProfileChip: {
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 10,
    },
    editProfileText: {
        fontSize: 12,
        color: theme.colors.accent,
        fontWeight: theme.typography.semiBold,
    },
    section: {
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.l,
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
    sectionContent: {
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
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemLabel: {
        fontSize: 16,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    },
    logoutWrapper: {
        marginTop: theme.spacing.l,
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    versionWrapper: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.danger + '10',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        gap: 10,
        width: '100%',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.danger,
    },
    version: {
        marginTop: theme.spacing.xl,
        color: theme.colors.textTertiary,
        fontSize: 12,
        fontWeight: theme.typography.medium,
    },
    loaderOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    loaderSubText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    deleteOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isDark ? theme.colors.background : theme.colors.surfaceVariant,
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    checkboxLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteOptionText: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.medium,
    }
});

