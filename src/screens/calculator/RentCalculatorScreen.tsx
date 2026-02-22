import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import Toggle from '../../components/common/Toggle';
import { MoreHorizontal, Share, Wifi, Wrench, Droplet, ChevronUp } from 'lucide-react-native';
import Header from '../../components/common/Header';

// Mock Data
const var_borderRadius_s = 4; // Local helper
const TENANT = {
    name: 'John Doe',
    room: '302B',
    roomName: 'Premium Suite',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36',
    baseRent: 10000,
    prevReading: 1050,
    ratePerUnit: 10
};

const ADDONS = [
    { id: 'wifi', label: 'Wifi Access', price: 500, icon: Wifi },
    { id: 'maintenance', label: 'Maintenance', price: 300, icon: Wrench },
    { id: 'water', label: 'Water Charges', price: 250, icon: Droplet },
];

export default function RentCalculatorScreen({ navigation }: any) {
    const [currentReading, setCurrentReading] = useState('1120');
    const [selectedAddons, setSelectedAddons] = useState<string[]>(['wifi', 'maintenance', 'water']);

    const [liveTotal, setLiveTotal] = useState(0);
    const [unitsConsumed, setUnitsConsumed] = useState(0);
    const [electricityCost, setElectricityCost] = useState(0);

    useEffect(() => {
        // Calculate Logic
        const curr = parseInt(currentReading) || 0;
        const units = Math.max(0, curr - TENANT.prevReading);
        const elecCost = units * TENANT.ratePerUnit;

        let addonsCost = 0;
        selectedAddons.forEach(id => {
            const addon = ADDONS.find(a => a.id === id);
            if (addon) addonsCost += addon.price;
        });

        setUnitsConsumed(units);
        setElectricityCost(elecCost);
        setLiveTotal(TENANT.baseRent + elecCost + addonsCost);

    }, [currentReading, selectedAddons]);

    const toggleAddon = (id: string) => {
        if (selectedAddons.includes(id)) {
            setSelectedAddons(selectedAddons.filter(a => a !== id));
        } else {
            setSelectedAddons([...selectedAddons, id]);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Header
                title="RENT CALCULATOR"
                rightAction={
                    <Pressable style={styles.iconBtn}>
                        <MoreHorizontal size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Tenant Profile Mini */}
                <View style={styles.profileCard}>
                    <Image source={{ uri: TENANT.avatar }} style={styles.avatar} />
                    <View>
                        <Text style={styles.tenantName}>{TENANT.name}</Text>
                        <View style={styles.roomTag}>
                            <View style={styles.roomBadge}>
                                <Text style={styles.roomBadgeText}>{TENANT.room}</Text>
                            </View>
                            <Text style={styles.roomNameText}>{TENANT.roomName}</Text>
                        </View>
                    </View>
                </View>

                {/* Electricity Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Electricity</Text>
                    <View style={styles.readingParamsBtn}>
                        <Text style={styles.readingParamsText}>Reading</Text>
                    </View>
                </View>

                <View style={styles.readingContainer}>
                    {/* Previous */}
                    <View style={styles.readingCard}>
                        <Text style={styles.readingLabel}>PREVIOUS</Text>
                        <Text style={styles.readingValue}>{TENANT.prevReading.toLocaleString()}</Text>
                        <Text style={styles.readingDate}>Recorded Jul 01</Text>
                    </View>

                    {/* Current Input */}
                    <View style={[styles.readingCard, styles.readingCardActive]}>
                        <Text style={[styles.readingLabel, { color: theme.colors.accent }]}>CURRENT</Text>
                        <TextInput
                            style={styles.readingInput}
                            value={currentReading}
                            onChangeText={setCurrentReading}
                            keyboardType="numeric"
                            placeholder="0"
                        />
                    </View>
                </View>

                {/* Calculation Pill */}
                <View style={styles.calcPill}>
                    <View style={styles.calcItem}>
                        <Text style={styles.calcLabel}>UNITS</Text>
                        <Text style={styles.calcValue}>{unitsConsumed}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.calcItem}>
                        <Text style={styles.calcLabel}>RATE</Text>
                        <Text style={styles.calcValue}>₹{TENANT.ratePerUnit}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.calcItem}>
                        <Text style={[styles.calcValue, { color: theme.colors.accent }]}>₹{electricityCost}</Text>
                    </View>
                </View>

                <View style={styles.hr} />

                {/* Add-ons */}
                <Text style={styles.sectionTitle}>Add-ons</Text>

                {ADDONS.map((addon) => (
                    <Pressable
                        key={addon.id}

                        style={styles.addonCard}
                        onPress={() => toggleAddon(addon.id)}
                    >
                        <View style={styles.addonIconBg}>
                            <addon.icon size={20} color={theme.colors.textPrimary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addonTitle}>{addon.label}</Text>
                            <Text style={styles.addonPrice}>₹{addon.price} / mo</Text>
                        </View>
                        <Toggle
                            value={selectedAddons.includes(addon.id)}
                            onValueChange={() => toggleAddon(addon.id)}
                        />
                    </Pressable>
                ))}

            </ScrollView>

            {/* Footer - Live Total */}
            <View style={styles.footer}>
                <View style={styles.totalHeader}>
                    <Text style={styles.liveTotalLabel}>LIVE TOTAL</Text>
                    <ChevronUp size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.totalAmount}>{Math.floor(liveTotal).toLocaleString()}</Text>
                    <Text style={styles.decimal}>.00</Text>
                </View>

                <Pressable style={styles.confirmBtn}>
                    <Text style={styles.confirmBtnText}>Confirm & Share Receipt</Text>
                    <Share size={18} color="#000" />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB', // Slightly lighter gray
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
    },
    iconBtn: {
        padding: 8
    },
    headerTitle: {
        fontSize: theme.typography.s,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        letterSpacing: 1
    },
    content: {
        padding: theme.spacing.m,
        paddingBottom: 200 // Space for footer
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xl
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: theme.spacing.m
    },
    tenantName: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2
    },
    roomTag: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    roomBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: var_borderRadius_s,
        marginRight: 8
    },
    roomBadgeText: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.accent
    },
    roomNameText: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m
    },
    sectionTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    readingParamsBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    readingParamsText: {
        fontSize: 10,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary
    },
    readingContainer: {
        flexDirection: 'row',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l
    },
    readingCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        justifyContent: 'center'
    },
    readingCardActive: {
        backgroundColor: '#F3F4F6' // Light gray for active
    },
    readingLabel: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        letterSpacing: 0.5
    },
    readingValue: {
        fontSize: 28,
        fontWeight: theme.typography.bold,
        color: '#9CA3AF',
        marginBottom: theme.spacing.s
    },
    readingInput: {
        fontSize: 32,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        padding: 0
    },
    readingDate: {
        fontSize: 10,
        color: '#9CA3AF'
    },
    calcPill: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        alignSelf: 'center',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
        alignItems: 'center',
        ...theme.shadows.small
    },
    calcItem: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m
    },
    calcLabel: {
        fontSize: 8,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.bold,
        marginBottom: 2
    },
    calcValue: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.border
    },
    hr: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xl
    },
    addonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.small
    },
    addonIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m
    },
    addonTitle: {
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.textPrimary
    },
    addonPrice: {
        fontSize: theme.typography.s,
        color: theme.colors.textSecondary
    },
    footer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.l,
        ...theme.shadows.medium,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0
    },
    totalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs
    },
    liveTotalLabel: {
        fontSize: 10,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary,
        letterSpacing: 1
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: theme.spacing.l
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginRight: 4
    },
    totalAmount: {
        fontSize: 40,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary
    },
    decimal: {
        fontSize: 20,
        fontWeight: theme.typography.bold,
        color: theme.colors.textSecondary
    },
    confirmBtn: {
        backgroundColor: '#000000', // Black as per screenshot
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        borderRadius: theme.borderRadius.m
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontWeight: theme.typography.bold,
        fontSize: theme.typography.m,
        marginRight: theme.spacing.s
    }
});


