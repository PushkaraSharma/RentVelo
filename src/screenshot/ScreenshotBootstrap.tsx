import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { completeOnboarding, completeSetup, login } from '../redux/authSlice';
import { theme } from '../theme';
import { storage } from '../utils/storage';
import { OTA_VERSION } from '../utils/Constants';
import { seedScreenshotPortfolio } from './seed';

export const isScreenshotMode = process.env.EXPO_PUBLIC_SCREENSHOTS === '1';

export default function ScreenshotBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const [ready, setReady] = React.useState(!isScreenshotMode);

    React.useEffect(() => {
        if (!isScreenshotMode) return;
        let cancelled = false;
        (async () => {
            storage.set('@ota_version', OTA_VERSION.toString());
            storage.set('@app_lock_enabled', 'false');
            dispatch(login({
                name: 'Meera Sharma',
                email: 'meera@rentvelo.app',
                isGoogleLinked: false,
                authMethod: 'apple',
            }));
            dispatch(completeOnboarding());
            dispatch(completeSetup());
            if (storage.getString('@screenshot_seeded') !== '1') {
                await seedScreenshotPortfolio();
                storage.set('@screenshot_seeded', '1');
            }
            if (!cancelled) setReady(true);
        })().catch((error) => {
            console.error('Screenshot seed failed', error);
            if (!cancelled) setReady(true);
        });
        return () => { cancelled = true; };
    }, [dispatch]);

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
        );
    }

    return <>{children}</>;
}
