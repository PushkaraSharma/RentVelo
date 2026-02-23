import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { X, Trash2 } from 'lucide-react-native';
import SignatureScreen from 'react-native-signature-canvas';
import Button from '../common/Button';
import * as FileSystem from 'expo-file-system/legacy';

interface SignatureModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (signatureFilePath: string) => void;
    propertyId: number | string;
}

export default function SignatureModal({ visible, onClose, onSave, propertyId }: SignatureModalProps) {
    const signatureRef = useRef<any>(null);
    const insets = useSafeAreaInsets();
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const handleSignatureSave = async (signature: string) => {
        try {
            // signature is a base64 data URI
            const filename = `signature_${propertyId}_${Date.now()}.png`;
            const filepath = `${FileSystem.documentDirectory}${filename}`;
            const base64Data = signature.replace('data:image/png;base64,', '');

            await FileSystem.writeAsStringAsync(filepath, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });

            onSave(filepath);
        } catch (error) {
            console.error('Error saving signature:', error);
            // Fallback or let parent handle error (could just pass null)
        }
    };

    const signatureStyle = `.m-signature-pad--footer { display: none; margin: 0px; } .m-signature-pad { box-shadow: none; border: none; } body,html { width: 100%; height: 100%; }`;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.signatureContainer, { paddingTop: insets.top }]}>
                <View style={styles.signatureHeader}>
                    <Pressable onPress={onClose}>
                        <X size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.signatureTitle}>Draw Your Signature</Text>
                    <Pressable onPress={() => signatureRef.current?.clearSignature()}>
                        <Trash2 size={24} color={theme.colors.danger} />
                    </Pressable>
                </View>

                <View style={styles.signatureCanvasWrapper}>
                    <SignatureScreen
                        ref={signatureRef}
                        onOK={handleSignatureSave}
                        webStyle={signatureStyle}
                        backgroundColor="#FFF"
                        penColor="#000"
                    />
                </View>

                <View style={[styles.signatureFooter, { paddingBottom: insets.bottom }]}>
                    <Button
                        title="Clear"
                        onPress={() => signatureRef.current?.clearSignature()}
                        variant="outline"
                        style={{ flex: 1, marginRight: 10 }}
                    />
                    <Button
                        title="Save Signature"
                        onPress={() => signatureRef.current?.readSignature()}
                        style={{ flex: 1 }}
                    />
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    signatureContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    signatureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    signatureTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    signatureCanvasWrapper: {
        flex: 1,
        margin: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: '#FFF',
    },
    signatureFooter: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
});
