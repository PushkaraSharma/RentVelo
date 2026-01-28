import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useDispatch } from 'react-redux';
import { completeOnboarding } from '../../redux/authSlice';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: 1,
        title: 'Automated Collections',
        description: 'Set up automated reminders for tenants and let our system handle rent calculations instantly. Never miss a payment again.',
        imagePlaceholder: 'Automated Collections UI',
        image: require('../../assets/onboard-1.png'),
    },
    {
        id: 2,
        title: 'Manage with Ease',
        description: 'Track rent, units, and tenants in one simple command center. Experience property management reimagined.',
        imagePlaceholder: 'Building Image',
        image: require('../../assets/onboard-2.png'),
    }
];

export default function OnboardingScreen() {
    const dispatch = useDispatch();
    const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

    const handleNext = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
            dispatch(completeOnboarding());
        }
    };

    const handleSkip = () => {
        dispatch(completeOnboarding());
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Placeholder for Image */}
                <View style={styles.imageContainer}>
                    <Image source={slides[currentSlideIndex].image} style={styles.image} />
                </View>

                {/* Indicators */}
                <View style={styles.indicatorContainer}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentSlideIndex === index && styles.activeIndicator
                            ]}
                        />
                    ))}
                </View>

                <Text style={styles.title}>{slides[currentSlideIndex].title}</Text>
                <Text style={styles.description}>{slides[currentSlideIndex].description}</Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Pressable style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>{currentSlideIndex === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
        alignItems: 'flex-end',
    },
    skipText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.m,
        fontWeight: theme.typography.medium,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
    },
    imageContainer: {
        width: width * 0.8,
        height: width * 0.8,
        marginBottom: theme.spacing.xl,
        ...theme.shadows.medium,
    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: theme.spacing.l,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.textTertiary,
        marginHorizontal: 4
    },
    activeIndicator: {
        backgroundColor: theme.colors.accent,
        width: 20,
    },
    title: {
        fontSize: theme.typography.xxl,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.s,
        textAlign: 'center',
    },
    description: {
        fontSize: theme.typography.m,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        padding: theme.spacing.l,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
    },
    buttonText: {
        color: theme.colors.primaryForeground,
        fontSize: theme.typography.m,
        fontWeight: theme.typography.semiBold,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: theme.borderRadius.xl
    }
});
