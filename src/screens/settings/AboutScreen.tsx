import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { Globe, Github, Twitter, Heart } from 'lucide-react-native';
import Header from '../../components/common/Header';

export default function AboutScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="About App" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoLabel}>RV</Text>
                    </View>
                    <Text style={styles.appName}>RentVelo</Text>
                    <Text style={styles.appVersion}>Version 1.1.0 (PRO)</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Our Mission</Text>
                    <Text style={styles.cardText}>
                        RentVelo is designed to simplify property management for owners in India.
                        Our goal is to automate rent collection, tenant tracking, and document
                        management with a focus on ease of use and modern aesthetics.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Follow Us</Text>
                    <View style={styles.linkRow}>
                        <Pressable style={styles.linkItem} onPress={() => Linking.openURL('https://rentvelo.com')}>
                            <Globe size={24} color={theme.colors.accent} />
                            <Text style={styles.linkLabel}>Website</Text>
                        </Pressable>
                        <Pressable style={styles.linkItem} onPress={() => Linking.openURL('https://github.com')}>
                            <Github size={24} color={theme.colors.textPrimary} />
                            <Text style={styles.linkLabel}>GitHub</Text>
                        </Pressable>
                        <Pressable style={styles.linkItem} onPress={() => Linking.openURL('https://twitter.com')}>
                            <Twitter size={24} color="#1DA1F2" />
                            <Text style={styles.linkLabel}>Twitter</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.madeWith}>
                        <Text style={styles.footerText}>Made with </Text>
                        <Heart size={14} color="#EF4444" fill="#EF4444" />
                        <Text style={styles.footerText}> for Property Owners</Text>
                    </View>
                    <Text style={styles.copyright}>© 2026 RentVelo Hub. All Rights Reserved.</Text>
                </View>
            </ScrollView>
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
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    content: {
        padding: theme.spacing.l,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.medium,
        marginBottom: theme.spacing.m,
    },
    logoLabel: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFF',
    },
    appName: {
        fontSize: 28,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    appVersion: {
        fontSize: 14,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.small,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    cardText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.l,
        textAlign: 'center',
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    linkItem: {
        alignItems: 'center',
        gap: 8,
    },
    linkLabel: {
        fontSize: 12,
        fontWeight: theme.typography.medium,
        color: theme.colors.textSecondary,
    },
    footer: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    madeWith: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    footerText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.medium,
    },
    copyright: {
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
});
