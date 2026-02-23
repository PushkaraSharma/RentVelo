import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

interface TrendItem {
    month: number;
    year: number;
    label: string;
    expected: number;
    collected: number;
}

interface CollectionTrendsProps {
    trends: TrendItem[];
    isPrivacyMode?: boolean;
}

const CHART_HEIGHT = 140;
const BAR_WIDTH = 20;
const BAR_GAP = 6;

export default function CollectionTrends({ trends, isPrivacyMode }: CollectionTrendsProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const maxVal = Math.max(...trends.map(t => Math.max(t.expected, t.collected)), 1);
    const totalCollected = trends.reduce((s, t) => s + t.collected, 0);
    const totalExpected = trends.reduce((s, t) => s + t.expected, 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const bestMonth = [...trends].sort((a, b) => b.collected - a.collected)[0];

    const chartWidth = Dimensions.get('window').width - 64; // padding
    const groupWidth = (BAR_WIDTH * 2) + BAR_GAP;
    const totalGrouping = trends.length * groupWidth;
    const spacing = (chartWidth - totalGrouping) / (trends.length + 1);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Collection Trends</Text>

            {/* Chart */}
            <View style={styles.chartContainer}>
                <Svg width={chartWidth} height={CHART_HEIGHT + 28}>
                    {trends.map((item, i) => {
                        const x = spacing + i * (groupWidth + spacing);
                        const expectedH = (item.expected / maxVal) * CHART_HEIGHT;
                        const collectedH = (item.collected / maxVal) * CHART_HEIGHT;

                        return (
                            <React.Fragment key={i}>
                                {/* Expected bar */}
                                <Rect
                                    x={x}
                                    y={CHART_HEIGHT - expectedH}
                                    width={BAR_WIDTH}
                                    height={expectedH || 2}
                                    rx={4}
                                    fill={theme.colors.border}
                                />
                                {/* Collected bar */}
                                <Rect
                                    x={x + BAR_WIDTH + BAR_GAP}
                                    y={CHART_HEIGHT - collectedH}
                                    width={BAR_WIDTH}
                                    height={collectedH || 2}
                                    rx={4}
                                    fill={theme.colors.accent}
                                />
                                {/* Month label */}
                                <SvgText
                                    x={x + groupWidth / 2}
                                    y={CHART_HEIGHT + 18}
                                    fontSize={10}
                                    fontWeight="600"
                                    fill={theme.colors.textSecondary}
                                    textAnchor="middle"
                                >
                                    {item.label}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.border }]} />
                    <Text style={styles.legendText}>Expected</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={styles.legendText}>Collected</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{collectionRate}%</Text>
                    <Text style={styles.statLabel}>Collection Rate</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={styles.statValue}>{bestMonth?.label || '—'}</Text>
                    <Text style={styles.statLabel}>Best Month</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {isPrivacyMode ? `${CURRENCY} •••` : `${CURRENCY}${(totalCollected / 1000).toFixed(1)}K`}
                    </Text>
                    <Text style={styles.statLabel}>YTD Collected</Text>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    title: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.m,
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: theme.spacing.m,
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
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: 14,
        paddingVertical: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.border,
    },
    statValue: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
        marginTop: 2,
    },
});
