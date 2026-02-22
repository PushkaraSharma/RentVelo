import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { Building2, ChevronRight } from 'lucide-react-native';
import RentModalSheet from '../rent/RentModalSheet';

interface PendingProperty {
    id: number;
    name: string;
    pendingCount: number;
}

interface PropertyPickerModalProps {
    visible: boolean;
    onClose: () => void;
    properties: PendingProperty[];
    onSelect: (propertyId: number) => void;
}

export default function PropertyPickerModal({ visible, onClose, properties, onSelect }: PropertyPickerModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    return (
        <RentModalSheet
            visible={visible}
            onClose={onClose}
            title="Collect Rent From"
        >
            {properties.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>🎉 All caught up! No pending rent.</Text>
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.item}
                            onPress={() => { onClose(); onSelect(item.id); }}
                        >
                            <View style={styles.iconBox}>
                                <Building2 size={20} color={theme.colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.propertyName}>{item.name}</Text>
                                <Text style={styles.pendingLabel}>
                                    {item.pendingCount} tenant{item.pendingCount > 1 ? 's' : ''} pending
                                </Text>
                            </View>
                            <ChevronRight size={18} color={theme.colors.textTertiary} />
                        </Pressable>
                    )}
                />
            )}
        </RentModalSheet>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    empty: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        gap: theme.spacing.m,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    propertyName: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    pendingLabel: {
        fontSize: 12,
        color: theme.colors.warning,
        fontWeight: theme.typography.medium,
        marginTop: 2,
    },
});
