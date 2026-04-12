import { useState, useCallback } from 'react';
import { launchCameraWithPermission, launchLibraryWithPermission, PickerOptions } from '../utils/ImagePickerUtil';

interface UseImagePickerResult {
    visible: boolean;
    openPicker: (options?: PickerOptions, callback?: (uri: string) => void) => void;
    closePicker: () => void;
    handleCamera: () => Promise<string | null>;
    handleGallery: () => Promise<string | null>;
    pickerOptions: PickerOptions | undefined;
}

/**
 * Reusable hook to manage the state and logic for ImagePickerModal
 */
export const useImagePicker = (defaultCallback?: (uri: string) => void): UseImagePickerResult => {
    const [visible, setVisible] = useState(false);
    const [pickerOptions, setPickerOptions] = useState<PickerOptions>();
    const [activeCallback, setActiveCallback] = useState<(uri: string) => void>();

    const openPicker = useCallback((options?: PickerOptions, callback?: (uri: string) => void) => {
        setPickerOptions(options);
        setActiveCallback(() => callback);
        setVisible(true);
    }, []);

    const closePicker = useCallback(() => {
        setVisible(false);
    }, []);

    const handleCamera = useCallback(async (): Promise<string | null> => {
        const uri = await launchCameraWithPermission(pickerOptions);
        if (uri) {
            if (activeCallback) activeCallback(uri);
            else if (defaultCallback) defaultCallback(uri);
        }
        return uri;
    }, [pickerOptions, activeCallback, defaultCallback]);

    const handleGallery = useCallback(async (): Promise<string | null> => {
        const uri = await launchLibraryWithPermission(pickerOptions);
        if (uri) {
            if (activeCallback) activeCallback(uri);
            else if (defaultCallback) defaultCallback(uri);
        }
        return uri;
    }, [pickerOptions, activeCallback, defaultCallback]);

    return {
        visible,
        openPicker,
        closePicker,
        handleCamera,
        handleGallery,
        pickerOptions
    };
};
