import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints based on standard device sizes
 */
export const BREAKPOINTS = {
    tablet: 768,
    desktop: 1024,
};

export const useResponsive = () => {
    const { width, height } = useWindowDimensions();

    const isTablet = width >= BREAKPOINTS.tablet;
    const isDesktop = width >= BREAKPOINTS.desktop;
    const isPhone = !isTablet;

    const screenType = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'phone';

    /**
     * Helper to get a value based on the current screen size
     * Example: const padding = responsiveValue({ phone: 16, tablet: 24, desktop: 32 });
     */
    const responsiveValue = <T>(values: { phone: T; tablet?: T; desktop?: T }): T => {
        if (isDesktop && values.desktop !== undefined) return values.desktop;
        if (isTablet && values.tablet !== undefined) return values.tablet;
        return values.phone;
    };

    return {
        width,
        height,
        isPhone,
        isTablet,
        isDesktop,
        screenType,
        responsiveValue,
        breakpoints: BREAKPOINTS,
    };
};
