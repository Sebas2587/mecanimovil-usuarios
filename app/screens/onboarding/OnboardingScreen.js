import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import {
  OnboardingSlide,
  OnboardingBottomBar,
  OnboardingSkipButton,
  ONBOARDING_SLIDES,
  ONBOARDING_IMAGES,
  ONBOARDING_STORAGE_KEY,
} from '../../components/onboarding';
const CONTENT_MAX_WIDTH = 560;
const WIDE_BREAKPOINT = 768;
const COMPACT_BREAKPOINT = 420;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

/** En web, useWindowDimensions a veces no refleja el viewport real dentro del stack. */
function useViewportDimensions() {
  const { width, height } = useWindowDimensions();
  const [webHeight, setWebHeight] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return height;
    return Math.max(window.innerHeight, document.documentElement?.clientHeight ?? 0);
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const sync = () => {
      setWebHeight(Math.max(window.innerHeight, document.documentElement?.clientHeight ?? 0));
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const viewportHeight = Platform.OS === 'web' ? webHeight : height;
  return { width, height: viewportHeight };
}

function useOnboardingLayout(viewportHeight, viewportWidth) {
  const isWide = viewportWidth >= WIDE_BREAKPOINT;
  const isCompact = viewportWidth < COMPACT_BREAKPOINT;
  const slideWidth = viewportWidth;
  const slideHeight = viewportHeight;
  const horizontalPadding = isWide ? 32 : Math.max(16, Math.min(24, Math.round(viewportWidth * 0.05)));
  const logoWidth = Math.min(isCompact ? 140 : 180, Math.round(viewportWidth * 0.4));
  const logoHeight = Math.round(logoWidth * (56 / 240));
  const titleSize = isWide
    ? Math.min(36, TYPOGRAPHY.styles.h1.fontSize)
    : Math.min(28, Math.max(22, Math.round(viewportWidth * 0.065)));
  const subtitleSize = isWide
    ? TYPOGRAPHY.styles.body.fontSize
    : Math.min(14, Math.max(13, Math.round(viewportWidth * 0.036)));
  /** Una sola fila: Atrás + CTA — más baja que la barra anterior. */
  const bottomBarHeight = isCompact ? 88 : 96;

  return {
    isWide,
    isCompact,
    slideWidth,
    slideHeight,
    horizontalPadding,
    logoWidth,
    logoHeight,
    titleSize,
    subtitleSize,
    bottomBarHeight,
  };
}

/**
 * Onboarding Airbnb — media full-bleed, demos interactivos, CTA GuestGradient.
 */
export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useViewportDimensions();
  const layout = useOnboardingLayout(viewportHeight, viewportWidth);
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollOffsetRef = useRef(0);
  const [index, setIndex] = useState(0);

  const slides = ONBOARDING_SLIDES;

  const canReturn = navigation.canGoBack();

  const complete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // no-op
    }
    // Si vinimos desde GuestLanding, volver; si no, ir al landing sin borrar el stack
    // (así el usuario puede reabrir el tour).
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.GUEST_LANDING);
  }, [navigation]);

  /** Scroll nativo — más fluido y barato que RAF frame-a-frame. */
  const scrollToSlide = useCallback(
    (targetIndex) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, targetIndex));
      const to = clamped * layout.slideWidth;
      setIndex(clamped);
      scrollOffsetRef.current = to;
      listRef.current?.scrollToOffset({ offset: to, animated: true });
    },
    [layout.slideWidth, slides.length],
  );

  const resolveIndexFromOffset = useCallback(() => {
    const w = layout.slideWidth || 1;
    return Math.max(0, Math.min(slides.length - 1, Math.round(scrollOffsetRef.current / w)));
  }, [layout.slideWidth, slides.length]);

  const onNext = useCallback(() => {
    const current = resolveIndexFromOffset();
    if (current >= slides.length - 1) {
      complete();
      return;
    }
    scrollToSlide(current + 1);
  }, [complete, resolveIndexFromOffset, scrollToSlide, slides.length]);

  const onBack = useCallback(() => {
    const current = resolveIndexFromOffset();
    if (current <= 0) return;
    scrollToSlide(current - 1);
  }, [resolveIndexFromOffset, scrollToSlide]);

  const syncIndexFromScroll = useCallback(
    (e) => {
      const x = e?.nativeEvent?.contentOffset?.x ?? scrollOffsetRef.current;
      scrollOffsetRef.current = x;
      const w = layout.slideWidth || 1;
      const next = Math.max(0, Math.min(slides.length - 1, Math.round(x / w)));
      setIndex((prev) => (prev === next ? prev : next));
    },
    [layout.slideWidth, slides.length],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 16 }),
    [],
  );

  const getItemLayout = useCallback(
    (_, itemIndex) => ({
      length: layout.slideWidth,
      offset: layout.slideWidth * itemIndex,
      index: itemIndex,
    }),
    [layout.slideWidth],
  );

  const onScrollToIndexFailed = useCallback(
    (info) => {
      listRef.current?.scrollToOffset({
        offset: info.index * layout.slideWidth,
        animated: true,
      });
    },
    [layout.slideWidth],
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        // native en iOS/Android; en web el driver JS es más estable
        useNativeDriver: Platform.OS !== 'web',
        listener: (e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
        },
      }),
    [scrollX],
  );

  const safeTop = Math.max(insets.top, Platform.OS === 'web' ? 0 : 10);
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 14);
  const logoTop =
    safeTop + (Platform.OS === 'web' ? Math.max(20, Math.round(layout.slideHeight * 0.03)) : 12);
  const contentTopPad = logoTop + layout.logoHeight + SPACING.lg;
  const contentBottomPad = layout.bottomBarHeight + safeBottom + SPACING.md;

  const rootStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? {
            height: '100vh',
            minHeight: '100vh',
            maxHeight: '100vh',
            overflow: 'hidden',
          }
        : { flex: 1 },
    [],
  );

  const listStyle = useMemo(
    () => [
      styles.list,
      Platform.OS === 'web'
        ? { height: '100vh', minHeight: '100vh', flex: undefined }
        : { flex: 1 },
    ],
    [],
  );

  const renderSlide = useCallback(
    ({ item, index: slideIndex }) => (
      <OnboardingSlide
        item={item}
        index={slideIndex}
        isActive={slideIndex === index}
        scrollX={scrollX}
        slideWidth={layout.slideWidth}
        slideHeight={layout.slideHeight}
        horizontalPadding={layout.horizontalPadding}
        titleSize={layout.titleSize}
        subtitleSize={layout.subtitleSize}
        contentTopPad={contentTopPad}
        contentBottomPad={contentBottomPad}
      />
    ),
    [contentBottomPad, contentTopPad, index, layout, scrollX],
  );

  return (
    <View style={[styles.container, rootStyle]}>
      <View style={[styles.topBar, { top: logoTop, paddingHorizontal: layout.horizontalPadding }]}>
        <Image
          source={ONBOARDING_IMAGES.logo}
          style={{
            width: layout.logoWidth,
            height: layout.logoHeight,
            tintColor: '#FFFFFF',
          }}
          resizeMode="contain"
          accessibilityLabel="MecaniMóvil"
        />
        <OnboardingSkipButton
          onPress={complete}
          label={canReturn ? 'Cerrar' : 'Saltar'}
        />
      </View>

      <AnimatedFlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        snapToInterval={layout.slideWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        style={listStyle}
        contentContainerStyle={styles.listContent}
        renderItem={renderSlide}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={syncIndexFromScroll}
        onScrollEndDrag={syncIndexFromScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS !== 'web'}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
      />

      <OnboardingBottomBar
        count={slides.length}
        index={index}
        isCompact={layout.isCompact}
        paddingHorizontal={layout.horizontalPadding}
        bottomInset={safeBottom}
        onBack={onBack}
        onNext={onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  list: {
    flex: 1,
  },
  listContent: {
    alignItems: 'stretch',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: CONTENT_MAX_WIDTH + 64,
    alignSelf: 'center',
    width: '100%',
  },
});
