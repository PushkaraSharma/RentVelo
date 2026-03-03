import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { FileSpreadsheet, Upload, CheckCircle2, History, AlertCircle } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import * as DocumentPicker from 'expo-document-picker';
import { importFromExcel, ImportResult } from '../../services/importService';
import { useToast } from '../../hooks/useToast';

export default function ExcelImportScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);

    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handlePickDocument = async () => {
        try {
            const pickerResult = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                copyToCacheDirectory: true,
            });

            if (pickerResult.canceled) return;

            const file = pickerResult.assets[0];
            setImporting(true);
            setResult(null);

            const importResult = await importFromExcel(file.uri);
            setImporting(false);
            setResult(importResult);

            if (importResult.success) {
                showToast({
                    type: 'success',
                    title: 'Import Successful',
                    message: `Imported ${importResult.details?.unitsCreated} rooms and ${importResult.details?.tenantsCreated} tenants.`
                });
            } else {
                showToast({
                    type: 'error',
                    title: 'Import Failed',
                    message: importResult.message
                });
            }
        } catch (error) {
            setImporting(false);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'An error occurred while picking the file.'
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Bulk Excel Import" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoSection}>
                    <View style={styles.iconBox}>
                        <FileSpreadsheet size={48} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.infoTitle}>Import Room Data</Text>
                    <Text style={styles.infoText}>
                        Quickly migrate your existing data by uploading an Excel file.
                        The system will create properties, rooms, and active tenants automatically.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Format Requirements</Text>
                    <Text style={styles.cardText}>
                        • Columns required: ROOM NO, PLACE_NAME, ROOM RENT...{"\n"}
                        • PLACE_NAME will be used as Property Name.{"\n"}
                        • Property Type will default to 'Building'.
                    </Text>
                </View>

                {importing ? (
                    <View style={styles.statusBox}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                        <Text style={styles.statusText}>Processing Excel file...</Text>
                    </View>
                ) : result?.success ? (
                    <View style={[styles.statusBox, { borderColor: theme.colors.success + '40' }]}>
                        <CheckCircle2 size={40} color={theme.colors.success} />
                        <Text style={styles.statusTitle}>Import Complete!</Text>
                        <Text style={styles.statusSubTitle}>
                            {result.details?.propertiesCreated} Properties{"\n"}
                            {result.details?.unitsCreated} Units (Rooms){"\n"}
                            {result.details?.tenantsCreated} Active Tenants
                        </Text>
                        <Button
                            title="Done"
                            onPress={() => navigation.goBack()}
                            style={{ marginTop: 20, width: '100%' }}
                        />
                    </View>
                ) : result && !result.success ? (
                    <View style={[styles.statusBox, { borderColor: theme.colors.danger + '40' }]}>
                        <AlertCircle size={40} color={theme.colors.danger} />
                        <Text style={styles.statusTitle}>Import Failed</Text>
                        <Text style={styles.errorText}>{result.message}</Text>
                        <Button
                            title="Try Again"
                            onPress={() => setResult(null)}
                            style={{ marginTop: 20, width: '100%', backgroundColor: theme.colors.danger }}
                        />
                    </View>
                ) : (
                    <Button
                        title="Select Excel File"
                        icon={<Upload size={20} color="#FFF" />}
                        onPress={handlePickDocument}
                        style={styles.importBtn}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    iconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    infoTitle: {
        fontSize: 22,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 10,
    },
    cardText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    importBtn: {
        height: 56,
        borderRadius: 16,
    },
    statusBox: {
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statusText: {
        marginTop: 15,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginTop: 10,
    },
    statusSubTitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 24,
    },
    errorText: {
        fontSize: 14,
        color: theme.colors.danger,
        textAlign: 'center',
        marginTop: 10,
    }
});
