import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { X, Check } from 'lucide-react-native';

interface PickerBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: string[] | { label: string; value: string }[];
    selectedValue?: string;
    onSelect: (value: string) => void;
}

const PickerBottomSheet: React.FC<PickerBottomSheetProps> = ({
    visible,
    onClose,
    title,
    options,
    selectedValue,
    onSelect
}) => {
    const { theme } = useAppTheme();
    const styles = getStyles(theme);
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.content} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.colors.textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {options.map((option) => {
                            const label = typeof option === 'string' ? option : option.label;
                            const value = typeof option === 'string' ? option : option.value;
                            const isSelected = selectedValue === value;

                            return (
                                <Pressable
                                    key={value}
                                    style={[
                                        styles.option,
                                        isSelected && styles.optionSelected
                                    ]}
                                    onPress={() => {
                                        onSelect(value);
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        isSelected && styles.optionTextSelected
                                    ]}>
                                        {label}
                                    </Text>
                                    {isSelected && <Check size={20} color={theme.colors.accent} />}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const getStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: Dimensions.get('window').height * 0.7,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.typography.l,
        fontWeight: theme.typography.bold,
        color: theme.colors.textPrimary,
    },
    closeBtn: {
        padding: theme.spacing.s,
    },
    scroll: {
        paddingHorizontal: theme.spacing.m,
    },
    scrollContent: {
        paddingVertical: theme.spacing.s,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
    },
    optionSelected: {
        backgroundColor: theme.colors.accentLight,
    },
    optionText: {
        fontSize: theme.typography.m,
        color: theme.colors.textPrimary,
    },
    optionTextSelected: {
        color: theme.colors.accent,
        fontWeight: theme.typography.bold,
    },
});

export default PickerBottomSheet;
