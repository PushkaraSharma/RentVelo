import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowLeft, Bell, Calendar, MessageSquare, AlertTriangle } from 'lucide-react-native';
import Toggle from '../../components/common/Toggle';

export default function NotificationsScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reminders</Text>
                    <View style={styles.card}>
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Calendar size={20} color={theme.colors.accent} />
                                <View>
                                    <Text style={styles.itemLabel}>Rent Due Reminders</Text>
                                    <Text style={styles.itemSubLabel}>Get notified when rent is due</Text>
                                </View>
                            </View>
                            <Toggle value={true} onValueChange={() => { }} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <MessageSquare size={20} color="#10B981" />
                                <View>
                                    <Text style={styles.itemLabel}>Tenant Messages</Text>
                                    <Text style={styles.itemSubLabel}>Alerts for new tenant messages</Text>
                                </View>
                            </View>
                            <Toggle value={true} onValueChange={() => { }} />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System</Text>
                    <View style={styles.card}>
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <AlertTriangle size={20} color="#F59E0B" />
                                <View>
                                    <Text style={styles.itemLabel}>Payment Failures</Text>
                                    <Text style={styles.itemSubLabel}>Immediate alerts for missed payments</Text>
                                </View>
                            </View>
                            <Toggle value={true} onValueChange={() => { }} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <View style={styles.itemLeft}>
                                <Bell size={20} color="#6366F1" />
                                <View>
                                    <Text style={styles.itemLabel}>Marketing & Updates</Text>
                                    <Text style={styles.itemSubLabel}>Stay updated with new features</Text>
                                </View>
                            </View>
                            <Toggle value={false} onValueChange={() => { }} />
                        </View>
                    </View>
                </View>

                <View style={styles.noteBox}>
                    <Text style={styles.noteTitle}>Push Notifications</Text>
                    <Text style={styles.noteText}>
                        You can further customize your notification preferences in your device
                        System Settings.
                    </Text>
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
    noteBox: {
        backgroundColor: theme.colors.accent + '10',
        padding: theme.spacing.l,
        borderRadius: 20,
        marginTop: theme.spacing.xl,
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent,
        marginBottom: 8,
    },
    noteText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});
