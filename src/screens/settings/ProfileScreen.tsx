import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Check } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ProfileScreen({ navigation }: any) {
    const { user } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        // Simulate save
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Success', 'Profile updated successfully');
        }, 1000);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={50} color={theme.colors.accent} />
                            <Pressable style={styles.cameraIcon}>
                                <Camera size={16} color="#FFF" />
                            </Pressable>
                        </View>
                        <Text style={styles.avatarText}>Change Profile Photo</Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Full Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            icon={<User size={20} color={theme.colors.textTertiary} />}
                        />
                        <Input
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon={<Mail size={20} color={theme.colors.textTertiary} />}
                        />
                        <Input
                            label="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                            icon={<Phone size={20} color={theme.colors.textTertiary} />}
                        />
                        <Input
                            label="Business/Propery Group Name"
                            value={businessName}
                            onChangeText={setBusinessName}
                            placeholder="e.g. Sharma Estates"
                            icon={<MapPin size={20} color={theme.colors.textTertiary} />}
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        loading={loading}
                        icon={<Check size={20} color="#FFF" />}
                    />
                </View>
            </KeyboardAvoidingView>
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        ...theme.shadows.small,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.accent,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    avatarText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: theme.typography.semiBold,
        color: theme.colors.accent,
    },
    form: {
        gap: theme.spacing.m,
    },
    footer: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
});
