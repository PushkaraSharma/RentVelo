import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { BellOff, Check, Banknote, Sparkles, ChevronRight } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { useFocusEffect } from '@react-navigation/native';
import { Notification, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../db';
import WhatsNewModal from '../../components/modals/WhatsNewModal';
import { CHANGELOG } from '../../utils/Constants';

export default function NotificationsCenterScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    const loadNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [])
    );

    const markAllRead = async () => {
        try {
            await markAllNotificationsAsRead();
            await loadNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handlePress = async (item: Notification) => {
        if (!item.is_read) {
            await markNotificationAsRead(item.id);
            await loadNotifications();
        }
        if (item.property_id) {
            navigation.navigate('TakeRent', { propertyId: item.property_id, initialFilter: 'pending' });
        }
    };

    const formatDate = (d: Date) => {
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString();
    };

    const getNotifIcon = (type: string) => {
        if (type === 'rent_due') return <Banknote size={20} color={theme.colors.warning} />;
        return <Banknote size={20} color={theme.colors.success} />;
    };

    const renderWhatsNewCard = () => (
        <Pressable style={styles.whatsNewCard} onPress={() => setShowWhatsNew(true)}>
            <View style={styles.whatsNewIconBox}>
                <Sparkles size={20} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>What's New</Text>
                <Text style={styles.notifBody} numberOfLines={1}>
                    v{CHANGELOG.version} • {CHANGELOG.features[0]}
                </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
        </Pressable>
    );

    const renderNotification = ({ item }: { item: Notification }) => (
        <Pressable
            style={[styles.card, !item.is_read && styles.unreadCard]}
            onPress={() => handlePress(item)}
        >
            <View style={[
                styles.iconBox,
                item.type === 'rent_due' ? styles.iconDue : styles.iconPayment
            ]}>
                {getNotifIcon(item.type)}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>{item.created_at ? formatDate(item.created_at) : 'Just now'}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header
                title="Notifications"
                rightAction={
                    <Pressable onPress={markAllRead} style={styles.markAllBtn}>
                        <Check size={18} color={theme.colors.accent} />
                    </Pressable>
                }
            />

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNotification}
                contentContainerStyle={{ padding: theme.spacing.m, flexGrow: 1 }}
                ListHeaderComponent={renderWhatsNewCard}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptySubtitle}>
                            Rent reminders and collection alerts will appear here
                        </Text>
                    </View>
                }
            />

            <WhatsNewModal
                visible={showWhatsNew}
                onClose={() => setShowWhatsNew(false)}
                version={CHANGELOG.version}
                features={CHANGELOG.features}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    markAllBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    whatsNewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? theme.colors.accent + '15' : theme.colors.accentLight + '50',
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        gap: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.accent + '30',
    },
    whatsNewIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: isDark ? theme.colors.accent + '30' : theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.s,
        gap: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.accent,
        backgroundColor: isDark ? theme.colors.accent + '10' : theme.colors.accentLight + '30',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconDue: {
        backgroundColor: isDark ? '#F59E0B20' : theme.colors.warningLight,
    },
    iconPayment: {
        backgroundColor: isDark ? '#10B98120' : theme.colors.successLight,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    notifBody: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    notifTime: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.accent,
    },
});
