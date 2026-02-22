import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];

interface MonthPickerModalProps {
    visible: boolean;
    month: number; // 1-12
    year: number;
    onSelect: (month: number, year: number) => void;
    onClose: () => void;
}

export default function MonthPickerModal({ visible, month, year, onSelect, onClose }: MonthPickerModalProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [displayYear, setDisplayYear] = React.useState(year);

    React.useEffect(() => {
        setDisplayYear(year);
    }, [year, visible]);

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.container}>
                {/* Year Header */}
                <View style={styles.yearRow}>
                    <Pressable onPress={() => setDisplayYear(displayYear - 1)} style={styles.chevronBtn}>
                        <ChevronLeft size={22} color={theme.colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.yearText}>{displayYear}</Text>
                    <Pressable onPress={() => setDisplayYear(displayYear + 1)} style={styles.chevronBtn}>
                        <ChevronRight size={22} color={theme.colors.textPrimary} />
                    </Pressable>
                </View>

                {/* Month Grid */}
                <View style={styles.grid}>
                    {MONTHS.map((name, index) => {
                        const m = index + 1;
                        const isSelected = m === month && displayYear === year;
                        const isCurrent = m === new Date().getMonth() + 1 && displayYear === new Date().getFullYear();

                        return (
                            <Pressable
                                key={name}
                                style={[
                                    styles.monthCell,
                                    isSelected && styles.selectedCell,
                                    isCurrent && !isSelected && styles.currentCell,
                                ]}
                                onPress={() => onSelect(m, displayYear)}
                            >
                                <Text style={[
                                    styles.monthText,
                                    isSelected && styles.selectedText,
                                    isCurrent && !isSelected && styles.currentText,
                                ]}>
                                    {name.substring(0, 3)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Close */}
                <Pressable style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        width: '75%',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.m,
        ...theme.shadows.medium,
    },
    yearRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    chevronBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    yearText: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    monthCell: {
        width: '30%',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    selectedCell: {
        backgroundColor: theme.colors.accent,
    },
    currentCell: {
        borderWidth: 2,
        borderColor: theme.colors.accent,
    },
    monthText: {
        fontSize: 13,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary,
    },
    selectedText: {
        color: '#FFFFFF',
        fontWeight: theme.typography.bold,
    },
    currentText: {
        color: theme.colors.accent,
    },
    closeBtn: {
        marginTop: theme.spacing.s,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
    },
    closeBtnText: {
        fontSize: 15,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textSecondary,
    },
});
