import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

// Mock types
type ActionItem = {
    id: string;
    name: string;
    room: string;
    daysOverdue: number;
};

interface ActionListProps {
    items: ActionItem[];
    onCollect: (id: string) => void;
}

export default function ActionList({ items, onCollect }: ActionListProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Action Required</Text>
                <Text style={styles.link}>View All</Text>
            </View>

            {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                    <View style={styles.avatarPlaceholder}>
                        {/* Using first letter as placeholder if no image */}
                        <Text style={styles.avatarText}>{item.name[0]}</Text>
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <View style={styles.detailsRow}>
                            <Text style={styles.details}>{item.room} • </Text>
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{item.daysOverdue} Days Overdue</Text>
                            </View>
                        </View>
                    </View>

                    <Pressable style={styles.button} onPress={() => onCollect(item.id)}>
                        <Text style={styles.buttonText}>Collect</Text>
                    </Pressable>
                </View>
            ))}
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        marginBottom: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    link: {
        fontSize: theme.typography.s,
        color: theme.colors.accent,
        fontWeight: theme.typography.semiBold,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.s,
        ...theme.shadows.small,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    avatarText: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
    },
    info: {
        flex: 1
    },
    name: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    details: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary
    },
    tag: {
        backgroundColor: theme.colors.dangerLight,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4
    },
    tagText: {
        fontSize: 10,
        color: theme.colors.danger,
        fontWeight: theme.typography.bold
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.s,
        borderRadius: theme.borderRadius.round,
    },
    buttonText: {
        color: theme.colors.primaryForeground,
        fontSize: theme.typography.s,
        fontWeight: theme.typography.semiBold
    }
});
