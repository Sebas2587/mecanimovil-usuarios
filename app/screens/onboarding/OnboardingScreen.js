import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/base/Button/Button';

const HAS_SEEN_ONBOARDING_KEY = 'has_seen_onboarding_v1';
const ONBOARDING_BG_1 = require('../../../assets/images/onboarding-mechanic.png');
const ONBOARDING_BG_2 = require('../../../assets/images/onboarding-health.png');
const MECANIMOVIL_LOGO = require('../../../assets/images/logo-mecanimovil.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SlideGradient = ({ variant }) => {
  const ink = COLORS.base.inkBlack ?? '#0B1220';
  const a = variant === 'connect' ? COLORS.secondary[500] : COLORS.primary[500];
  const b = variant === 'connect' ? COLORS.primary[600] : COLORS.secondary[600];

  return (
    <LinearGradient
      colors={[withOpacity(ink, 1), withOpacity(a, 0.28), withOpacity(b, 0.22), withOpacity(ink, 1)]}
      locations={[0, 0.28, 0.62, 1]}
      start={{ x: 0.1, y: 0.0 }}
      end={{ x: 0.9, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
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
    navigation.replace(ROUTES.LOGIN);
  }, [navigation]);

  const onNext = useCallback(() => {
    if (index >= slides.length - 1) {
      complete();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [complete, index, slides.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 70 }), []);

  return (
    <View style={styles.container}>
      <View style={[styles.logoWrap, { top: Math.max(insets.top, 10) + 26 }]}>
        <Image source={MECANIMOVIL_LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {item.variant === 'connect' || item.variant === 'health' ? (
              <View style={StyleSheet.absoluteFill}>
                {item.variant === 'connect' ? null : null}
                {/* fill frame (soft) */}
                <Image
                  source={item.variant === 'connect' ? ONBOARDING_BG_1 : ONBOARDING_BG_2}
                  style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
                  resizeMode="cover"
                  blurRadius={14}
                />
                {/* keep main image crisp (avoid over-scaling) */}
                <View style={styles.crispContainWrap} pointerEvents="none">
                  <Image
                    source={item.variant === 'connect' ? ONBOARDING_BG_1 : ONBOARDING_BG_2}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                  />
                </View>
                <LinearGradient
                  colors={[
                    withOpacity(COLORS.base.inkBlack ?? '#0B1220', 0.35),
                    withOpacity(COLORS.base.inkBlack ?? '#0B1220', 0.55),
                    withOpacity(COLORS.base.inkBlack ?? '#0B1220', 0.9),
                  ]}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ) : (
              <SlideGradient variant={item.variant} />
            )}

            <View style={[styles.textBlock, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 160 }]}>
              <Text style={styles.title}>
                {item.title[0]} <Text style={styles.titleAccent}>{item.title[1]}</Text> {item.title[2]}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.bottomOverlay, { bottom: Math.max(insets.bottom, 14) + 26 }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  active ? styles.dotActive : styles.dotInactive,
                  active ? { width: 26 } : { width: 10 },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.primaryCta}>
          <Button
            title={index === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
            onPress={onNext}
            type="primary"
            variant="solid"
            useGradient
            size="md"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base.inkBlack ?? '#0B1220',
  },
  listContent: {
    flexGrow: 1,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  logo: {
    width: 240,
    height: 56,
    opacity: 0.95,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    color: COLORS.base.white,
    fontSize: TYPOGRAPHY.styles.h1.fontSize,
    fontWeight: TYPOGRAPHY.styles.h1.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h1.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.h1.fontSize * TYPOGRAPHY.styles.h1.lineHeight),
  },
  titleAccent: {
    color: COLORS.primary[400],
  },
  description: {
    marginTop: 14,
    color: withOpacity(COLORS.base.white, 0.72),
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.styles.body.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.body.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.body.fontSize * TYPOGRAPHY.styles.body.lineHeight),
  },
  bottomOverlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCta: {
    width: 160,
  },
  crispContainWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotInactive: {
    backgroundColor: withOpacity(COLORS.base.white, 0.22),
  },
  dotActive: {
    backgroundColor: withOpacity(COLORS.base.white, 0.86),
  },
  // CTA styles handled by design-system Button
});

