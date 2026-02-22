import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { User, Mail, Phone, MapPin, Camera, Check } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { login } from '../../redux/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../utils/storage';

export default function ProfileScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = () => {
        const data = storage.getString('@user_profile');
        if (data) {
            const parsed = JSON.parse(data);
            setPhone(parsed.phone || '');
            setBusinessName(parsed.businessName || '');
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhotoUrl(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name || !email) {
            Alert.alert('Error', 'Name and Email are required.');
            return;
        }

        setLoading(true);
        try {
            const updatedUser = { name, email, photoUrl: photoUrl || undefined };
            dispatch(login(updatedUser)); // Update Redux
            storage.set('@user_profile', JSON.stringify({ phone, businessName })); // Save extra fields
            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Edit Profile" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarSection}>
                        <Pressable style={styles.avatarPlaceholder} onPress={pickImage}>
                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <User size={50} color={theme.colors.accent} />
                            )}
                            <View style={styles.cameraIcon}>
                                <Camera size={16} color="#FFF" />
                            </View>
                        </Pressable>
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

                <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
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
        paddingHorizontal: theme.spacing.s,
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
    avatarImage: {
        width: '100%',
        height: '100%',
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
