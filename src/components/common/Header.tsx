import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeContext';

interface HeaderProps {
    title?: string;
    subTitle?: string;
    centerAction?: React.ReactNode;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    showBack?: boolean;
}

export default function Header({ title, subTitle, centerAction, onBack, rightAction, showBack = true }: HeaderProps) {
    const navigation = useNavigation();
    const { theme } = useAppTheme();
    const styles = getStyles(theme);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.header}>
            <View style={styles.left}>
                {showBack ? (
                    <Pressable onPress={handleBack} style={styles.backBtn}>
                        <ArrowLeft size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>

            <View style={styles.center}>
                {centerAction ? (
                    centerAction
                ) : (
                    <>
                        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                        {subTitle ? (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>{subTitle}</Text>
                        ) : null}
                    </>
                )}
            </View>

            <View style={styles.right}>
                {rightAction ? (
                    <View style={styles.rightAction}>
                        {rightAction}
                    </View>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
        height: 60,
    },
    left: {
        width: 44,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    right: {
        width: 44,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: -2,
    },
    rightAction: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    placeholder: {
        width: 44,
    }
});
