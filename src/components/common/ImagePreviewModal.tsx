import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { X, Trash2, Edit3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageView from 'react-native-image-viewing';

const { width, height } = Dimensions.get('window');

interface ImagePreviewModalProps {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    title?: string;
}

export default function ImagePreviewModal({
    visible,
    imageUri,
    onClose,
    onEdit,
    onDelete,
    title,
}: ImagePreviewModalProps) {
    const insets = useSafeAreaInsets();

    if (!imageUri) return null;

    return (
        <ImageView
            images={[{ uri: imageUri }]}
            imageIndex={0}
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
            HeaderComponent={() => (
                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                        <X size={24} color="#FFF" />
                    </Pressable>
                    {title ? (
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    ) : <View />}
                    <View style={{ width: 40 }} />
                </View>
            )}
            FooterComponent={() => (
                (onEdit || onDelete) ? (
                    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                        {onEdit && (
                            <Pressable style={styles.actionBtn} onPress={onEdit}>
                                <Edit3 size={20} color="#FFF" />
                                <Text style={styles.actionText}>Change</Text>
                            </Pressable>
                        )}
                        {onDelete && (
                            <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
                                <Trash2 size={20} color="#FF6B6B" />
                                <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Remove</Text>
                            </Pressable>
                        )}
                    </View>
                ) : <View />
            )}
        />
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        // Since ImageView has a dark background by default, 
        // we can add a subtle gradient or just padding.
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginHorizontal: 12,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingTop: 16,
        paddingHorizontal: 32,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    deleteBtn: {
        backgroundColor: 'rgba(255,107,107,0.12)',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
});
