import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { User, Mail, Phone, MapPin, Camera, Check } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { login } from '../../redux/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestCameraPermission, requestLibraryPermission, launchCamera, launchLibrary } from '../../utils/ImagePickerUtil';
import ImagePickerModal from '../../components/common/ImagePickerModal';
import { storage } from '../../utils/storage';
import { saveImageToPermanentStorage, getFullImageUri } from '../../services/imageService';
import { useToast } from '../../hooks/useToast';

export default function ProfileScreen({ navigation }: any) {
    const { theme, isDark } = useAppTheme();
    const { showToast } = useToast();
    const styles = getStyles(theme, isDark);
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || null);
    const [loading, setLoading] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);

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

    const handleSelectCamera = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            showToast({ type: 'warning', title: 'Permission Required', message: 'Sorry, we need camera permissions to make this work!' });
            return;
        }
        const uri = await launchCamera({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (uri) setPhotoUrl(uri);
    };

    const handleSelectGallery = async () => {
        const hasPermission = await requestLibraryPermission();
        if (!hasPermission) {
            showToast({ type: 'warning', title: 'Permission Required', message: 'Sorry, we need gallery permissions to make this work!' });
            return;
        }
        const uri = await launchLibrary({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
        if (uri) setPhotoUrl(uri);
    };

    const pickImage = () => {
        setShowImagePicker(true);
    };

    const handleSave = async () => {
        if (!name || !email) {
            showToast({ type: 'error', title: 'Error', message: 'Name and Email are required.' });
            return;
        }

        setLoading(true);
        try {
            let finalPhotoUrl = photoUrl;
            if (photoUrl && photoUrl.startsWith('file://')) {
                const permanentPath = await saveImageToPermanentStorage(photoUrl);
                if (permanentPath) {
                    finalPhotoUrl = permanentPath;
                }
            }

            const updatedUser = { name, email, photoUrl: finalPhotoUrl || undefined };
            dispatch(login(updatedUser)); // Update Redux
            storage.set('@user_profile', JSON.stringify({ phone, businessName })); // Save extra fields
            showToast({ type: 'success', title: 'Success', message: 'Profile updated successfully' });
            navigation.goBack();
        } catch (error) {
            showToast({ type: 'error', title: 'Error', message: 'Failed to update profile.' });
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
                                <Image source={{ uri: getFullImageUri(photoUrl) || photoUrl }} style={styles.avatarImage} />
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
            <ImagePickerModal
                visible={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelectCamera={handleSelectCamera}
                onSelectGallery={handleSelectGallery}
            />
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
        borderRadius: 50,
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
        borderColor: theme.colors.surface,
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
