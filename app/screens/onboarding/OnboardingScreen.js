import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, BORDERS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/base/Button/Button';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';

const HAS_SEEN_ONBOARDING_KEY = 'has_seen_onboarding_v1';
const ONBOARDING_BG_1 = require('../../../assets/images/onboarding-mechanic.png');
const ONBOARDING_BG_2 = require('../../../assets/images/onboarding-health.png');
const MECANIMOVIL_LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const CONTENT_MAX_WIDTH = 560;
const WIDE_BREAKPOINT = 768;
const COMPACT_BREAKPOINT = 420;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const webPressable = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

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

/** En web usamos 100vh para que el slide ocupe el viewport aunque el flex del stack falle. */
function slideHeightStyle(slideHeight) {
  if (Platform.OS === 'web') {
    return { height: '100vh', minHeight: '100vh' };
  }
  return { height: slideHeight, minHeight: slideHeight };
}

function useOnboardingLayout(viewportHeight, viewportWidth) {
  const isWide = viewportWidth >= WIDE_BREAKPOINT;
  const isCompact = viewportWidth < COMPACT_BREAKPOINT;
  const slideWidth = viewportWidth;
  const slideHeight = viewportHeight;
  const contentWidth = Math.min(viewportWidth - 40, CONTENT_MAX_WIDTH);
  const horizontalPadding = isWide ? 32 : Math.max(20, Math.round(viewportWidth * 0.06));
  const logoWidth = Math.min(240, Math.round(viewportWidth * 0.52));
  const logoHeight = Math.round(logoWidth * (56 / 240));
  const titleSize = isWide
    ? Math.min(44, TYPOGRAPHY.styles.h1.fontSize + 4)
    : Math.min(TYPOGRAPHY.styles.h1.fontSize, Math.max(28, Math.round(viewportWidth * 0.088)));
  const descriptionSize = isWide
    ? TYPOGRAPHY.styles.body.fontSize + 1
    : Math.min(TYPOGRAPHY.styles.body.fontSize, Math.max(14, Math.round(viewportWidth * 0.04)));
  const bottomBarHeight = isCompact ? 132 : 96;

  return {
    isWide,
    isCompact,
    slideWidth,
    slideHeight,
    contentWidth,
    horizontalPadding,
    logoWidth,
    logoHeight,
    titleSize,
    descriptionSize,
    bottomBarHeight,
  };
}

function buildSlideZones({ insets, layout }) {
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 14);
  const safeTop = Math.max(insets.top, Platform.OS === 'web' ? 0 : 10);
  // Logo más abajo en web (safe area 0 deja el logo pegado al borde superior)
  const logoTop =
    safeTop +
    (Platform.OS === 'web' ? Math.max(64, Math.round(layout.slideHeight * 0.09)) : 34);
  const textPaddingBottom = safeBottom + layout.bottomBarHeight + 28;

  return { logoTop, textPaddingBottom };
}

const OnboardingSlide = React.memo(function OnboardingSlide({
  item,
  index,
  scrollX,
  slideWidth,
  slideHeight,
  horizontalPadding,
  titleSize,
  descriptionSize,
  zones,
}) {
  const imageSource = item.variant === 'connect' ? ONBOARDING_BG_1 : ONBOARDING_BG_2;
  const inputRange = [(index - 1) * slideWidth, index * slideWidth, (index + 1) * slideWidth];

  const imageTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [slideWidth * 0.08, 0, -slideWidth * 0.08],
    extrapolate: 'clamp',
  });

  const imageScale = scrollX.interpolate({
    inputRange,
    outputRange: [1.06, 1, 1.06],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.75, 1, 0.75],
    extrapolate: 'clamp',
  });

  const textOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const textTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [20, 0, 20],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.slide,
        { width: slideWidth },
        slideHeightStyle(slideHeight),
      ]}
    >
      <View
        style={[
          styles.slideInner,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: zones.textPaddingBottom,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.imageFrame,
            {
              opacity: imageOpacity,
              transform: [{ translateX: imageTranslateX }, { scale: imageScale }],
            },
          ]}
        >
          <Image source={imageSource} style={styles.slideImage} resizeMode="cover" />
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.15) }]}>
            {item.title[0]} <Text style={styles.titleAccent}>{item.title[1]}</Text> {item.title[2]}
          </Text>
          <Text
            style={[
              styles.description,
              { fontSize: descriptionSize, lineHeight: Math.round(descriptionSize * 1.55) },
            ]}
          >
            {item.description}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
});

const AnimatedDot = React.memo(function AnimatedDot({ index, scrollX, slideWidth, onPress }) {
  const inputRange = [(index - 1) * slideWidth, index * slideWidth, (index + 1) * slideWidth];

  const dotWidth = scrollX.interpolate({
    inputRange,
    outputRange: [10, 26, 10],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.22, 0.92, 0.22],
    extrapolate: 'clamp',
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ir al paso ${index + 1}`}
      hitSlop={8}
      style={({ pressed }) => [styles.dotHitArea, pressed && styles.skipTopPressed, webPressable]}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotWidth,
            opacity,
            overflow: 'hidden',
          },
        ]}
      >
        <PrimaryGradientFill style={StyleSheet.absoluteFillObject} />
      </Animated.View>
    </Pressable>
  );
});

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useViewportDimensions();
  const layout = useOnboardingLayout(viewportHeight, viewportWidth);
  const zones = useMemo(() => buildSlideZones({ insets, layout }), [insets, layout]);
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const slides = useMemo(
    () => [
      {
        key: 'connect',
        title: ['Conecta con', 'expertos', 'automotrices'],
        description:
          'Encuentra mecánicos y talleres según la marca de tu auto. Agenda a domicilio o en taller, rápido y con confianza.',
        variant: 'connect',
      },
      {
        key: 'health',
        title: ['Controla la', 'salud', 'de tu auto'],
        description:
          'Monitorea el estado en tiempo real, recibe alertas y anticípate a problemas antes de que se vuelvan costosos.',
        variant: 'health',
      },
    ],
    [],
  );

  const complete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true');
    } catch {
      // no-op
    }
    navigation.replace(ROUTES.GUEST_LANDING);
  }, [navigation]);

  const scrollToSlide = useCallback(
    (targetIndex) => {
      listRef.current?.scrollToOffset({
        offset: targetIndex * layout.slideWidth,
        animated: true,
      });
    },
    [layout.slideWidth],
  );

  const onNext = useCallback(() => {
    if (index >= slides.length - 1) {
      complete();
      return;
    }
    scrollToSlide(index + 1);
  }, [complete, index, scrollToSlide, slides.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

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
      setTimeout(() => {
        listRef.current?.scrollToOffset({
          offset: info.index * layout.slideWidth,
          animated: true,
        });
      }, 80);
    },
    [layout.slideWidth],
  );

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

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
        scrollX={scrollX}
        slideWidth={layout.slideWidth}
        slideHeight={layout.slideHeight}
        horizontalPadding={layout.horizontalPadding}
        titleSize={layout.titleSize}
        descriptionSize={layout.descriptionSize}
        zones={zones}
      />
    ),
    [layout, scrollX, zones],
  );

  const isLastSlide = index >= slides.length - 1;
  const safeTop = Math.max(insets.top, Platform.OS === 'web' ? 0 : 10);
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'web' ? 0 : 14);

  return (
    <View style={[styles.container, rootStyle]}>
      <View style={[styles.logoWrap, { top: zones.logoTop }]}>
        <Image
          source={MECANIMOVIL_LOGO}
          style={{ width: layout.logoWidth, height: layout.logoHeight }}
          resizeMode="contain"
        />
      </View>

      <Pressable
        onPress={complete}
        accessibilityRole="button"
        accessibilityLabel="Saltar onboarding"
        style={({ pressed }) => [
          styles.skipTop,
          { top: safeTop + 12 },
          pressed && styles.skipTopPressed,
          webPressable,
        ]}
      >
        <Text style={styles.skipTopText}>Saltar</Text>
      </Pressable>

      <AnimatedFlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        style={listStyle}
        contentContainerStyle={styles.listContent}
        renderItem={renderSlide}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        keyboardShouldPersistTaps="handled"
        {...(Platform.OS === 'web' ? { nestedScrollEnabled: true } : {})}
      />

      <View
        style={[
          styles.bottomOverlay,
          layout.isCompact ? styles.bottomOverlayStacked : styles.bottomOverlayRow,
          {
            bottom: safeBottom + 12,
            paddingHorizontal: layout.horizontalPadding,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.dots, layout.isCompact && styles.dotsCentered]}>
          {slides.map((s, i) => (
            <AnimatedDot
              key={s.key}
              index={i}
              scrollX={scrollX}
              slideWidth={layout.slideWidth}
              onPress={() => scrollToSlide(i)}
            />
          ))}
        </View>

        <View
          style={[styles.ctaGroup, layout.isCompact && styles.ctaGroupStacked]}
          pointerEvents="box-none"
        >
          {!isLastSlide ? (
            <Pressable
              onPress={complete}
              accessibilityRole="button"
              accessibilityLabel="Saltar onboarding"
              style={({ pressed }) => [
                styles.skipBottom,
                pressed && styles.skipTopPressed,
                webPressable,
              ]}
            >
              <Text style={styles.skipBottomText}>Saltar</Text>
            </Pressable>
          ) : null}

          <View style={[styles.primaryCta, layout.isCompact && styles.primaryCtaFull]}>
            <Button
              title={isLastSlide ? 'Comenzar' : 'Siguiente'}
              onPress={onNext}
              type="primary"
              variant="solid"
              size="md"
              fullWidth={layout.isCompact}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  list: {
    flex: 1,
  },
  listContent: {
    alignItems: 'stretch',
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  skipTop: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  skipTopPressed: {
    opacity: 0.72,
  },
  skipTopText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
  slide: {
    overflow: 'hidden',
    backgroundColor: COLORS.background.default,
    justifyContent: 'flex-end',
  },
  slideInner: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 96,
  },
  imageFrame: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    zIndex: 2,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  title: {
    ...TYPOGRAPHY.styles.h1,
    color: COLORS.text.primary,
  },
  titleAccent: {
    color: COLORS.primary[500],
  },
  description: {
    ...TYPOGRAPHY.styles.body,
    marginTop: 14,
    color: COLORS.text.secondary,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    paddingTop: 12,
    gap: 14,
  },
  bottomOverlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomOverlayStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotsCentered: {
    alignSelf: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotHitArea: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  ctaGroupStacked: {
    width: '100%',
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  skipBottom: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBottomText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
  primaryCta: {
    minWidth: 148,
    maxWidth: 220,
  },
  primaryCtaFull: {
    minWidth: undefined,
    maxWidth: undefined,
    width: '100%',
  },
});
