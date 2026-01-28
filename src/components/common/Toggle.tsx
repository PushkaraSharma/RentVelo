import React from 'react';
import { Switch, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export default function Toggle({ value, onValueChange }: ToggleProps) {
    return (
        <Switch
            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={theme.colors.border}
            onValueChange={onValueChange}
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
