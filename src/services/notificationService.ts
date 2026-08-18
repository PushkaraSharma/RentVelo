import { Platform } from 'react-native';

/**
 * Service to handle background notifications (like sending webhooks to Slack/Discord).
 */

export const notifyNewUserSignup = (name: string, email: string, platform: string) => {
    // 1. Don't run in dev mode to avoid spamming the channel during local testing
    if (__DEV__) return;

    // Expo automatically injects any variable starting with EXPO_PUBLIC_
    const webhookUrl = process.env.EXPO_PUBLIC_SIGNUP_WEBHOOK_URL;

    if (!webhookUrl) {
        console.debug('No EXPO_PUBLIC_SIGNUP_WEBHOOK_URL found in environment variables.');
        return;
    }
    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: `🎉 **New RentVelo User!**\nName: ${name}\nEmail: ${email}\nOS: ${platform}`,
            text: `🎉 *New RentVelo User!*\nName: ${name}\nEmail: ${email}\nOS: ${platform}`
        })
    }).catch(error => {
        // 4. Fail silently. The user is not affected if this fails.
        console.debug('Failed to send signup notification webhook:', error);
    });
};
