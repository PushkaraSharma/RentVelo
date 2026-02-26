import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGES_DIR = `${FileSystem.documentDirectory}RentVeloImages/`;

/**
 * Ensures the RentVeloImages directory exists.
 */
export const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }
};

/**
 * Compresses an image and copies it to the permanent RentVeloImages directory.
 * Returns the relative filename.
 * @param cacheUri The temporary URI from ImagePicker
 */
export const saveImageToPermanentStorage = async (cacheUri: string): Promise<string | null> => {
    try {
        await ensureDirExists();

        // 1. Compress the image to reduce size (resize width to max 1080px to save space, and 70% quality)
        const manipResult = await ImageManipulator.manipulateAsync(
            cacheUri,
            [{ resize: { width: 1080 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. Generate a unique filename
        const filename = `img_${Date.now()}.jpg`;
        const destUri = `${IMAGES_DIR}${filename}`;

        // 3. Move the compressed image to permanent storage
        await FileSystem.moveAsync({
            from: manipResult.uri,
            to: destUri,
        });

        // 4. Return just the filename so DB doesn't store absolute device paths
        return filename;
    } catch (error) {
        console.error('Failed to save image to permanent storage:', error);
        return null; // Fallback gracefully
    }
};

/**
 * Given a filename stored in the Database, returns the full local URI to display it.
 * If the provided string is already an absolute path (from older version), it returns it as is.
 */
export const getFullImageUri = (filenameOrUri: string | null | undefined): string | null => {
    if (!filenameOrUri) return null;

    // If it's an old absolute path from the cache or a web URL, return as is
    if (filenameOrUri.startsWith('file://') || filenameOrUri.startsWith('http')) {
        return filenameOrUri;
    }

    // Otherwise, construct the full DocumentDirectory path
    return `${IMAGES_DIR}${filenameOrUri}`;
};
