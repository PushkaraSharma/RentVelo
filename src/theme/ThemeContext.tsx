import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import {
    lightColors,
    darkColors,
    spacing,
    borderRadius,
    typography,
    shadows,
    ThemeColors
} from './index';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
    theme: {
        colors: ThemeColors;
        spacing: typeof spacing;
        borderRadius: typeof borderRadius;
        typography: typeof typography;
        shadows: typeof shadows;
    };
    isDark: boolean;
    mode: ThemeMode;
    setMode: (item: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();

    const [mode, setModeState] = useState<ThemeMode>('system');

    // Load persisted preference on mount
    useEffect(() => {
        const storedMode = storage.getString('theme_mode') as ThemeMode | undefined;
        if (storedMode) setModeState(storedMode);
    }, []);

    const setMode = (newMode: ThemeMode) => {
        setModeState(newMode);
        storage.set('theme_mode', newMode);
    };

    const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

    const theme = {
        colors: isDark ? darkColors : lightColors,
        spacing,
        borderRadius,
        typography,
        shadows,
    };

    return (
        <ThemeContext.Provider value={{ theme, isDark, mode, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
};
