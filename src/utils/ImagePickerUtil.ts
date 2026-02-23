import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type ImageSelectionCallback = (uri: string) => void;

interface PickerOptions {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
}

export const handleImageSelection = (
    onSuccess: ImageSelectionCallback,
    options: PickerOptions = { allowsEditing: true, aspect: [4, 3], quality: 1 }
) => {
    Alert.alert(
        "Upload Photo",
        "Choose an option",
        [
            {
                text: "Take Photo",
                onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert("Permission Required", "Sorry, we need camera permissions to make this work!");
                        return;
                    }

                    const result = await ImagePicker.launchCameraAsync({
                        ...options,
                        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct usage for launchCameraAsync vs images parameter which is different across versions. For ImagePicker v14+, MediaTypeOptions.Images or ['images'] depending on the API signature. We'll stick to 'Images' or just the older array signature which works generally.
                    });

                    if (!result.canceled && result.assets && result.assets.length > 0) {
                        onSuccess(result.assets[0].uri);
                    }
                }
            },
            {
                text: "Choose from Gallery",
                onPress: async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert("Permission Required", "Sorry, we need camera roll permissions to make this work!");
                        return;
                    }

                    const result = await ImagePicker.launchImageLibraryAsync({
                        ...options,
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    });

                    if (!result.canceled && result.assets && result.assets.length > 0) {
                        onSuccess(result.assets[0].uri);
                    }
                }
            },
            {
                text: "Cancel",
                style: "cancel"
            }
        ]
    );
};
