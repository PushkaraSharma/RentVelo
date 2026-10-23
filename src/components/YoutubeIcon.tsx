import Svg, { Path, Rect } from 'react-native-svg';

export default function YoutubeIcon({ size = 20 }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000" />
            <Path d="M10 8.8v6.4l5.6-3.2L10 8.8z" fill="#FFFFFF" />
        </Svg>
    );
}
