import React, { useRef, useState } from 'react';
import { FlatList, Image, ImageSourcePropType, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { completeOnboarding } from '../../redux/authSlice';
import { lightColors } from '../../theme';

const slides: { key: string; image: ImageSourcePropType; title: string; body: string }[] = [
    {
        key: 'collections',
        title: 'Automated Collections',
        body: 'Set up automated reminders for tenants and let our system handle rent calculations instantly. Never miss a payment again.',
        image: require('../../../assets/onboard-1.png'),
    },
    {
        key: 'manage',
        title: 'Manage with Ease',
        body: 'Track rent, units, and tenants in one simple command center. Experience property management reimagined.',
        image: require('../../../assets/onboard-2.png'),
    },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<(typeof slides)[number]>);

const Slide = ({ item, index, scrollX, width, height, imageHeight }: { item: (typeof slides)[number]; index: number; scrollX: SharedValue<number>; width: number; height: number; imageHeight: number }) => {
    const imageStyle = useAnimatedStyle(() => {
        const input = [(index - 1) * width, index * width, (index + 1) * width];
        return {
            opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
            transform: [{ translateX: interpolate(scrollX.value, input, [width * 0.18, 0, -width * 0.18], Extrapolation.CLAMP) }],
        };
    });

    const textStyle = useAnimatedStyle(() => {
        const input = [(index - 1) * width, index * width, (index + 1) * width];
        return {
            opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
            transform: [{ translateY: interpolate(scrollX.value, input, [14, 0, 14], Extrapolation.CLAMP) }],
        };
    });

    return (
        <View style={[styles.slide, { width, height }]}>
            <Animated.View style={[styles.illustration, { height: imageHeight }, imageStyle]}>
                <Image source={item.image} style={styles.image} resizeMode="contain" />
            </Animated.View>
            <Animated.View style={[styles.copy, textStyle]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
            </Animated.View>
        </View>
    );
};

const Dot = ({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) => {
    const style = useAnimatedStyle(() => {
        const input = [(index - 1) * width, index * width, (index + 1) * width];
        return {
            width: interpolate(scrollX.value, input, [8, 22, 8], Extrapolation.CLAMP),
            opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
        };
    });
    return <Animated.View style={[styles.dot, style]} />;
};

export default function OnboardingScreen() {
    const dispatch = useDispatch();
    const { width, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList<(typeof slides)[number]>>(null);
    const indexRef = useRef(0);
    const leavingRef = useRef(false);
    const scrollX = useSharedValue(0);
    const [index, setIndex] = useState(0);
    const [listHeight, setListHeight] = useState(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const settleIndex = (offsetX: number) => {
        const next = Math.min(slides.length - 1, Math.max(0, Math.round(offsetX / width)));
        indexRef.current = next;
        setIndex(next);
    };

    const finish = () => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        dispatch(completeOnboarding());
    };

    const goNext = () => {
        if (indexRef.current >= slides.length - 1) {
            finish();
            return;
        }
        const next = indexRef.current + 1;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        indexRef.current = next;
        setIndex(next);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.list} onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}>
                <AnimatedFlatList
                    ref={listRef}
                    data={slides}
                    horizontal
                    pagingEnabled
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item, index: slideIndex }) => (
                        <Slide
                            item={item}
                            index={slideIndex}
                            scrollX={scrollX}
                            width={width}
                            height={listHeight}
                            imageHeight={Math.min(Math.round(windowHeight * 0.34), Math.max(listHeight - 188, 180))}
                        />
                    )}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
                    onMomentumScrollEnd={(event) => settleIndex(event.nativeEvent.contentOffset.x)}
                    onScrollEndDrag={(event) => {
                        const offsetX = event.nativeEvent.contentOffset.x;
                        const maxOffset = (slides.length - 1) * width;
                        if (offsetX > maxOffset + 48) finish();
                        else settleIndex(offsetX);
                    }}
                />
            </View>
            <View style={styles.footer}>
                <View style={styles.dots}>
                    {slides.map((slide, dotIndex) => (
                        <Dot key={slide.key} index={dotIndex} scrollX={scrollX} width={width} />
                    ))}
                </View>
                <View style={styles.actions}>
                    <Text style={styles.skip} onPress={finish}>Skip</Text>
                    <Pressable style={styles.nextButton} onPress={goNext}>
                        <Text style={styles.nextLabel}>{index === slides.length - 1 ? 'Get started' : 'Next'}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    list: {
        flex: 1,
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustration: {
        width: '78%',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    copy: {
        alignSelf: 'stretch',
        paddingHorizontal: 20,
        marginTop: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: lightColors.textPrimary,
        textAlign: 'center',
    },
    body: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 22,
        color: '#4B5563',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    dot: {
        height: 8,
        borderRadius: 9999,
        backgroundColor: lightColors.accent,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    skip: {
        fontSize: 14,
        color: '#4B5563',
    },
    nextButton: {
        backgroundColor: lightColors.accent,
        borderRadius: 9999,
        minWidth: 148,
        paddingHorizontal: 24,
        paddingVertical: 12,
        alignItems: 'center',
    },
    nextLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
});
