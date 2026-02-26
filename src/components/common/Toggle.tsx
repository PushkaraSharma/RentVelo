import React from 'react';
import { Switch, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { hapticsSelection } from '../../utils/haptics';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export default function Toggle({ value, onValueChange }: ToggleProps) {
    const { theme } = useAppTheme();
    return (
        <Switch
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.border}
            onValueChange={(v) => { hapticsSelection(); onValueChange(v); }}
            value={value}
            style={styles.switch}
        />
    );
}

const styles = StyleSheet.create({
    switch: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
    }
});
