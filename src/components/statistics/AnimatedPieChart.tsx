import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useAppTheme } from '../../theme/ThemeContext';

interface ChartDataItem {
    value: number;
    color: string;
    text: string;
}

interface AnimatedPieChartProps {
    title: string;
    data: ChartDataItem[];
    fadeAnim: Animated.Value;
    scaleAnim: Animated.Value;
    centerSubLabel: string;
}

export default function AnimatedPieChart({ title, data, fadeAnim, scaleAnim, centerSubLabel }: AnimatedPieChartProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [selectedItem, setSelectedItem] = useState<{ label: string, value: string } | null>(null);

    // Reset selection when data changes
    useEffect(() => {
        setSelectedItem(null);
    }, [data]);

    const total = data.reduce((acc, item) => acc + item.value, 0);

    if (total === 0) {
        return (
            <View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
        );
    }

    const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    const pieData = data.filter(d => d.value > 0).map(d => ({
        ...d,
        onPress: () => setSelectedItem({ label: d.text, value: `${pct(d.value)}%` })
    }));

    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Animated.View style={[styles.chartContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <PieChart
                        data={pieData}
                        animationDuration={2000}
                        donut
                        radius={80}
                        innerRadius={50}
                        innerCircleColor={theme.colors.surface}
                        focusOnPress
                        centerLabelComponent={() => {
                            if (selectedItem) {
                                return (
                                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 16, color: theme.colors.textPrimary, fontWeight: 'bold' }}>{selectedItem.value}</Text>
                                        <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{selectedItem.label}</Text>
                                    </View>
                                );
                            }
                            return (
                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, color: theme.colors.textPrimary, fontWeight: 'bold' }}>100%</Text>
                                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{centerSubLabel}</Text>
                                </View>
                            );
                        }}
                    />
                </View>
                <View style={styles.legendRow}>
                    {pieData.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText}>{item.text}: {pct(item.value)}%</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    sectionTitle: {
        fontSize: 14,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.m,
    },
    chartContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyChart: {
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.m,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
});
