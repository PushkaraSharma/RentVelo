import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';

// We are using the web client ID extracted from google-services.json (oauth_client with client_type 3)
const GOOGLE_WEB_CLIENT_ID = '221955250116-tfa60qhpibsg77pmt6i43u80ovp40rij.apps.googleusercontent.com';

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export const initGoogleAuth = () => {
    GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
        scopes: [DRIVE_APPDATA_SCOPE],
    });
};

/**
 * Manually request Google Drive appData scope (iOS post-login / re-auth).
 * Callers must still probe Drive with verifyDrivePermissions.
 */
export const requestDriveScopes = async (): Promise<boolean> => {
    try {
        const hasPlayServices = await GoogleSignin.hasPlayServices();
        if (!hasPlayServices) return false;

        await GoogleSignin.addScopes({
            scopes: [DRIVE_APPDATA_SCOPE],
        });

        return true;
    } catch (error) {
        console.error('Error requesting Drive scopes:', error);
        return false;
    }
};

export interface GoogleUser {
    id: string;
    email: string;
    name: string | null;
    photo: string | null;
    familyName: string | null;
    givenName: string | null;
}

export const signInWithGoogle = async (): Promise<GoogleUser | null> => {
    try {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        const user = (response as any).data?.user || (response as any).user;

        if (user) {
            storage.set('@google_auth_token', JSON.stringify(user));
            return {
                id: user.id || '',
                email: user.email || '',
                name: user.name || null,
                photo: user.photo || null,
                familyName: user.familyName || null,
                givenName: user.givenName || null,
            };
        }
        return null;
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('User cancelled the login flow');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log('Sign in is in progress already');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            console.log('Play services not available or outdated');
        } else {
            console.error('Google Sign-In Error:', error);
        }
        throw error;
    }
};

export const signOutGoogle = async () => {
    try {
        await GoogleSignin.signOut();
        storage.remove('@google_auth_token');
    } catch (error) {
        console.error('Google Sign-Out Error:', error);
        throw error;
    }
};

export const revokeGoogleAccess = async () => {
    try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        storage.remove('@google_auth_token');
    } catch (error) {
        console.error('Google Revoke Access Error:', error);
        throw error;
    }
};

export const getGoogleTokens = async () => {
    try {
        const tokens = await GoogleSignin.getTokens();
        return tokens; // { idToken: string, accessToken: string }
    } catch (error) {
        console.error('Error getting Google tokens:', error);
        return null;
    }
};

export const isSignedIn = async (): Promise<boolean> => {
    const signedIn = await GoogleSignin.hasPreviousSignIn();
    return signedIn;
};
