import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Modal } from 'react-native';
import { theme } from '../../theme';
import { Building2, ChevronRight, X } from 'lucide-react-native';

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
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Collect Rent From</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                    </View>

                    {properties.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>🎉 All caught up! No pending rent.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={properties}
                            keyExtractor={(item) => item.id.toString()}
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
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '60%',
        paddingBottom: 34,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        marginHorizontal: theme.spacing.m,
        marginTop: theme.spacing.s,
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
