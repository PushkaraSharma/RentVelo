import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
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
    HelpCircle,
    Info,
    Share2
} from 'lucide-react-native';
import Toggle from '../../components/common/Toggle';
import Header from '../../components/common/Header';

export default function SettingsScreen({ navigation }: any) {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) }
            ]
        );
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Manage your properties easily with RentVelo! Download now to automate your rent collections.',
                url: 'https://rentvelo.com',
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                        <CircleUser size={60} color={theme.colors.accent} strokeWidth={1.5} />
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
                            right={<Toggle value={false} onValueChange={() => { }} />}
                        />
                        <SettingItem
                            icon={Database}
                            label="Data Backup"
                            color="#EC4899"
                            onPress={() => navigation.navigate('Backup')}
                        />
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
                            onPress={() => Alert.alert('Help Center', 'Please contact support@rentvelo.com for assistance.')}
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
                        <Text style={styles.logoutText}>Log Out Account</Text>
                    </Pressable>
                    <Text style={styles.version}>RentVelo v1.1.0 • Made with ❤️</Text>
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
});

