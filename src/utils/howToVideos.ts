import { Linking } from 'react-native';
import { YOUTUBE_HOWTO_PLAYLIST_URL } from './Constants';
import { AnalyticsEvents, trackEvent } from '../services/analyticsService';

export type HowToVideosSource = 'setup_wizard' | 'settings' | 'get_started';

export const openHowToVideos = async (source: HowToVideosSource) => {
    trackEvent(AnalyticsEvents.HOW_TO_VIDEOS_OPENED, { source });
    try {
        await Linking.openURL(YOUTUBE_HOWTO_PLAYLIST_URL);
    } catch (e) {
        console.error('Failed to open how-to videos', e);
    }
};
