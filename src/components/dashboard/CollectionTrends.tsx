import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { CURRENCY } from '../../utils/Constants';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { BarChart3 } from 'lucide-react-native';

interface TrendItem {
    month: number;
    year: number;
    label: string;
    expected: number;
    collected: number;
}

interface CollectionTrendsProps {
    trends: TrendItem[];
    propertyCount?: number;
    isPrivacyMode?: boolean;
}

const CHART_HEIGHT = 140;
const BAR_WIDTH = 20;
const BAR_GAP = 6;
const TOOLTIP_WIDTH = 104;
const TOOLTIP_HEIGHT = 44;

type SelectedBar = { index: number; type: 'expected' | 'collected' };

const formatAmount = (value: number, isPrivacyMode?: boolean) => {
    if (isPrivacyMode) return `${CURRENCY} •••`;
    return `${CURRENCY}${Math.round(value).toLocaleString('en-IN')}`;
};

export default function CollectionTrends({ trends, propertyCount = 0, isPrivacyMode }: CollectionTrendsProps) {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    const [selectedBar, setSelectedBar] = useState<SelectedBar | null>(null);
    const visibleTrends = trends.filter(t => t.expected > 0 || t.collected > 0);
    const maxVal = Math.max(...visibleTrends.map(t => Math.max(t.expected, t.collected)), 1);
    const totalCollected = visibleTrends.reduce((s, t) => s + t.collected, 0);
    const totalExpected = visibleTrends.reduce((s, t) => s + t.expected, 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const bestMonth = [...visibleTrends].sort((a, b) => b.collected - a.collected)[0];
    const title = visibleTrends.length >= 6 ? 'Last 6 Months' : visibleTrends.length <= 1 ? 'This Month' : 'Recent Collection Trends';
    const periodLabel = visibleTrends.length >= 6 ? 'Last 6 Months' : 'Period Collected';

    const chartWidth = Dimensions.get('window').width - 64; // padding
    const groupWidth = (BAR_WIDTH * 2) + BAR_GAP;
    const totalGrouping = visibleTrends.length * groupWidth;
    const spacing = (chartWidth - totalGrouping) / (visibleTrends.length + 1);

    const tooltip = (() => {
        if (!selectedBar) return null;
        const item = visibleTrends[selectedBar.index];
        if (!item) return null;

        const groupX = spacing + selectedBar.index * (groupWidth + spacing);
        const isExpected = selectedBar.type === 'expected';
        const value = isExpected ? item.expected : item.collected;
        const barCenter = isExpected
            ? groupX + BAR_WIDTH / 2
            : groupX + BAR_WIDTH + BAR_GAP + BAR_WIDTH / 2;
        const barTop = CHART_HEIGHT - (value / maxVal) * CHART_HEIGHT;

        return {
            label: `${isExpected ? 'Expected' : 'Collected'} · ${item.label}`,
            amount: formatAmount(value, isPrivacyMode),
            left: Math.min(Math.max(barCenter - TOOLTIP_WIDTH / 2, 0), chartWidth - TOOLTIP_WIDTH),
            caretLeft: barCenter - 5,
            top: Math.max(barTop - TOOLTIP_HEIGHT - 10, 0),
        };
    })();

    if (visibleTrends.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Collection Trends</Text>
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconBox}>
                        <BarChart3 size={28} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.emptyTitle}>No Trends Yet</Text>
                    <Text style={styles.emptyText}>
                        {propertyCount > 0
                            ? 'Trends will appear after rent bills or payments are recorded.'
                            : 'Add your first property to start seeing collection trends.'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            {/* Chart */}
            <View style={[styles.chartContainer, { width: chartWidth }]}>
                <Svg width={chartWidth} height={CHART_HEIGHT + 28}>
                    {visibleTrends.map((item, i) => {
                        const x = spacing + i * (groupWidth + spacing);
                        const expectedH = (item.expected / maxVal) * CHART_HEIGHT;
                        const collectedH = (item.collected / maxVal) * CHART_HEIGHT;
                        const expectedActive = selectedBar?.index === i && selectedBar.type === 'expected';
                        const collectedActive = selectedBar?.index === i && selectedBar.type === 'collected';
                        const dim = (active: boolean) => (!selectedBar || active ? 1 : 0.35);
                        const toggle = (type: SelectedBar['type']) =>
                            setSelectedBar(prev =>
                                prev?.index === i && prev.type === type ? null : { index: i, type }
                            );

                        return (
                            <React.Fragment key={i}>
                                {/* Expected bar — hit area spans the full column height */}
                                <G onPress={() => toggle('expected')}>
                                    <Rect
                                        x={x - BAR_GAP / 2}
                                        y={0}
                                        width={BAR_WIDTH + BAR_GAP}
                                        height={CHART_HEIGHT}
                                        fill="transparent"
                                    />
                                    <Rect
                                        x={x}
                                        y={CHART_HEIGHT - expectedH}
                                        width={BAR_WIDTH}
                                        height={expectedH || 2}
                                        rx={4}
                                        fill={theme.colors.border}
                                        opacity={dim(expectedActive)}
                                    />
                                </G>

                                <G onPress={() => toggle('collected')}>
                                    <Rect
                                        x={x + BAR_WIDTH + BAR_GAP / 2}
                                        y={0}
                                        width={BAR_WIDTH + BAR_GAP}
                                        height={CHART_HEIGHT}
                                        fill="transparent"
                                    />
                                    <Rect
                                        x={x + BAR_WIDTH + BAR_GAP}
                                        y={CHART_HEIGHT - collectedH}
                                        width={BAR_WIDTH}
                                        height={collectedH || 2}
                                        rx={4}
                                        fill={theme.colors.accent}
                                        opacity={dim(collectedActive)}
                                    />
                                </G>

                                {/* Month label */}
                                <SvgText
                                    x={x + groupWidth / 2}
                                    y={CHART_HEIGHT + 18}
                                    fontSize={10}
                                    fontWeight="600"
                                    fill={selectedBar?.index === i ? theme.colors.accent : theme.colors.textSecondary}
                                    textAnchor="middle"
                                >
                                    {item.label}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>

                {tooltip && (
                    <>
                        <View style={[styles.tooltip, { left: tooltip.left, top: tooltip.top }]}>
                            <Text style={styles.tooltipLabel} numberOfLines={1}>{tooltip.label}</Text>
                            <Text style={styles.tooltipAmount} numberOfLines={1}>{tooltip.amount}</Text>
                        </View>
                        <View
                            style={[
                                styles.tooltipCaret,
                                { left: tooltip.caretLeft, top: tooltip.top + TOOLTIP_HEIGHT - 5 },
                            ]}
                        />
                    </>
                )}
            </View>

            {!selectedBar && <Text style={styles.chartHint}>Tap a bar to see the amount</Text>}

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
                    <Text style={styles.statLabel}>{periodLabel}</Text>
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
        alignSelf: 'center',
        marginBottom: theme.spacing.s,
    },
    chartHint: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginBottom: theme.spacing.s,
        fontWeight: theme.typography.medium,
    },
    tooltip: {
        position: 'absolute',
        width: TOOLTIP_WIDTH,
        height: TOOLTIP_HEIGHT,
        borderRadius: 10,
        paddingHorizontal: 8,
        backgroundColor: theme.colors.textPrimary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipLabel: {
        fontSize: 10,
        color: theme.colors.surface,
        opacity: 0.75,
        fontWeight: theme.typography.medium,
    },
    tooltipAmount: {
        fontSize: 14,
        color: theme.colors.surface,
        fontWeight: theme.typography.bold,
        marginTop: 1,
    },
    tooltipCaret: {
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: theme.colors.textPrimary,
        transform: [{ rotate: '45deg' }],
        borderRadius: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.m,
    },
    emptyIconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
    },
    emptyText: {
        fontSize: 13,
        lineHeight: 20,
        color: theme.colors.textSecondary,
        textAlign: 'center',
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
