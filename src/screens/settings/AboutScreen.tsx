import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { Globe, Github, Twitter, Heart } from 'lucide-react-native';
import Header from '../../components/common/Header';
import Constants from 'expo-constants';
import { OTA_VERSION } from '../../utils/Constants';

export default function AboutScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const styles = getStyles(theme, isDark);
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="About App" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoPlaceholder}>
                        <Image source={isDark ? require('../../../assets/app-icon-dark.png') : require('../../../assets/app-icon.png')} style={styles.logo} />
                    </View>
                    <Text style={styles.appName}>RentVelo</Text>
                    <Text style={styles.appVersion}>Version {Constants.expoConfig?.version}_{OTA_VERSION}</Text>
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
                    <Text style={[styles.sectionTitle, { textAlign: 'left', marginLeft: theme.spacing.s }]}>Connect With Us</Text>
                    <Pressable
                        style={({ pressed }) => [
                            styles.websiteCard,
                            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => Linking.openURL('https://rentvelo.indieroots.in/')}
                    >
                        <View style={styles.websiteIconContainer}>
                            <Globe size={28} color={theme.colors.primary} />
                        </View>
                        <View style={styles.websiteInfo}>
                            <Text style={styles.websiteTitle}>Visit Our Website</Text>
                            <Text style={styles.websiteSubTitle}>rentvelo.indieroots.in</Text>
                        </View>
                        <View style={[styles.arrowContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>→</Text>
                        </View>
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <View style={styles.madeWith}>
                        <Text style={styles.footerText}>Made with </Text>
                        <Heart size={14} color="#EF4444" fill="#EF4444" />
                        <Text style={styles.footerText}> for Property Owners</Text>
                    </View>
                    <Text style={styles.copyright}>© 2026 RentVelo. All Rights Reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.medium,
        marginBottom: theme.spacing.m,
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
        borderWidth: 1,
        borderColor: theme.colors.border,
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
    websiteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.small,
    },
    websiteIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    websiteInfo: {
        flex: 1,
    },
    websiteTitle: {
        fontSize: 16,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    websiteSubTitle: {
        fontSize: 13,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
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
    logo: {
        resizeMode: 'contain',
        width: 100,
        height: 100,
        borderRadius: 24,
    },
});
