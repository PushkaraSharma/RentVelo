import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { RotateCcw, Check } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { DEFAULT_TERMS_AND_CONDITIONS } from '../../utils/defaultTerms';
import { storage } from '../../utils/storage';

const TERMS_KEY = 'custom_terms_and_conditions';

export const getTermsAndConditions = (): string => {
    return storage.getString(TERMS_KEY) || DEFAULT_TERMS_AND_CONDITIONS;
};

export const saveTermsAndConditions = (terms: string): void => {
    storage.set(TERMS_KEY, terms);
};

export default function TermsEditorScreen({ navigation }: any) {
    const [terms, setTerms] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setTerms(getTermsAndConditions());
    }, []);

    const handleSave = () => {
        saveTermsAndConditions(terms);
        Alert.alert('Saved', 'Terms & Conditions updated successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    const handleReset = () => {
        Alert.alert(
            'Reset to Default',
            'This will replace your custom T&C with the default template. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        setTerms(DEFAULT_TERMS_AND_CONDITIONS);
                        saveTermsAndConditions(DEFAULT_TERMS_AND_CONDITIONS);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Header
                    title="Terms & Conditions"
                    rightAction={
                        <Pressable onPress={handleReset} style={styles.resetBtn}>
                            <RotateCcw size={20} color={theme.colors.accent} />
                        </Pressable>
                    }
                />

                <View style={styles.noteBar}>
                    <Text style={styles.noteText}>
                        These terms will be included when generating rent ledger PDFs.
                    </Text>
                </View>

                <TextInput
                    style={styles.editor}
                    value={terms}
                    onChangeText={setTerms}
                    multiline
                    textAlignVertical="top"
                    placeholder="Enter terms and conditions..."
                    placeholderTextColor={theme.colors.textTertiary}
                />

                <View style={styles.footer}>
                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        loading={loading}
                        icon={<Check size={20} color="#FFF" />}
                    />
                </View>
            </KeyboardAvoidingView>
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
        paddingRight: theme.spacing.m,
    },
    backButton: {
        padding: theme.spacing.s,
    },
    headerTitle: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    resetBtn: {
        padding: theme.spacing.s,
    },
    noteBar: {
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 10,
        marginHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
    },
    noteText: {
        fontSize: 12,
        color: theme.colors.accent,
        fontWeight: theme.typography.medium,
    },
    editor: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        margin: theme.spacing.m,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        fontSize: 14,
        color: theme.colors.textPrimary,
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: theme.spacing.m,
    },
});
