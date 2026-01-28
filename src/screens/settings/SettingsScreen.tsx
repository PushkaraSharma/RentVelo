import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/authSlice';
import { LogOut, Settings, Database, User, Bell, ChevronRight, Moon } from 'lucide-react-native';
import Toggle from '../../components/common/Toggle';

export default function SettingsScreen() {
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
    };

    const SettingItem = ({ icon: Icon, label, onPress, right }: any) => (
        <Pressable style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <Icon size={20} color={theme.colors.textPrimary} />
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            {right || <ChevronRight size={20} color={theme.colors.textSecondary} />}
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>GENERAL</Text>
                <SettingItem icon={User} label="Profile" />
                <SettingItem icon={Bell} label="Notifications" />
                <SettingItem
                    icon={Moon}
                    label="Dark Mode"
                    right={<Toggle value={false} onValueChange={() => { }} />}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>DATA & SYNC</Text>
                <SettingItem icon={Database} label="Backup to Google Drive" />
            </View>

            <View style={styles.section}>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color={theme.colors.danger} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>
            </View>

            <Text style={styles.version}>RentVelo v1.0.0 (Local)</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.l,
    },
    headerTitle: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.l
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        letterSpacing: 0.5
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderTopWidth: 1,
        borderColor: theme.colors.border
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.m
    },
    itemLabel: {
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.m,
        gap: 8
    },
    logoutText: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.danger
    },
    version: {
        textAlign: 'center',
        color: theme.colors.textTertiary,
        fontSize: 12
    }
});
