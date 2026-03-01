import * as ImagePicker from 'expo-image-picker';

export type ImageSelectionCallback = (uri: string) => void;

export interface PickerOptions {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
}

/**
 * Requests camera permissions and returns the status
 */
export const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
};

/**
 * Requests media library permissions and returns the status
 */
export const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
};

/**
 * Launches the camera and returns the URI of the captured image
 */
export const launchCamera = async (options: PickerOptions = {}): Promise<string | null> => {
    const result = await ImagePicker.launchCameraAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
    }
    return null;
};

/**
 * Launches the image library and returns the URI of the selected image
 */
export const launchLibrary = async (options: PickerOptions = {}): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        ...options,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
    }
    return null;
};
