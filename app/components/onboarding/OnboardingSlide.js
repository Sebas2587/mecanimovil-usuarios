import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SPACING } from '../../design-system/tokens';
import OnboardingHeroMedia from './OnboardingHeroMedia';
import OnboardingSlideCopy from './OnboardingSlideCopy';
import OnboardingInteractivePanel from './OnboardingInteractivePanel';
import { ONBOARDING_IMAGES } from './onboardingSlides';

function slideHeightStyle(slideHeight) {
  if (Platform.OS === 'web') {
    return { height: '100vh', minHeight: '100vh' };
  }
  return { height: slideHeight, minHeight: slideHeight };
}

/**
 * Slide Airbnb: todo en un viewport — sin scroll vertical (mobile-safe).
 */
const OnboardingSlide = ({
  item,
  index,
  isActive,
  scrollX,
  slideWidth,
  slideHeight,
  horizontalPadding,
  titleSize,
  subtitleSize,
  contentBottomPad,
  contentTopPad,
}) => {
  const [serviceMode, setServiceMode] = useState('taller');
  const isModesSlide = item.demo === 'modes';

  const heroSource = useMemo(() => {
    if (!isModesSlide) return item.image;
    return serviceMode === 'domicilio'
      ? ONBOARDING_IMAGES.domicilio
      : ONBOARDING_IMAGES.taller;
  }, [isModesSlide, item.image, serviceMode]);

  const onModeChange = useCallback((id) => {
    setServiceMode(id);
  }, []);

  return (
    <View
      style={[
        styles.slide,
        { width: slideWidth },
        slideHeightStyle(slideHeight),
      ]}
    >
      <OnboardingHeroMedia
        source={heroSource}
        index={index}
        slideWidth={slideWidth}
        slideHeight={slideHeight}
        transitionKey={isModesSlide ? serviceMode : undefined}
      />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: contentTopPad,
            paddingBottom: contentBottomPad,
          },
        ]}
      >
        <View style={styles.spacer} />
        <OnboardingSlideCopy
          eyebrow={item.eyebrow}
          title={item.title}
          subtitle={item.subtitle}
          index={index}
          scrollX={scrollX}
          slideWidth={slideWidth}
          titleSize={titleSize}
          subtitleSize={subtitleSize}
        />
        <OnboardingInteractivePanel
          demo={item.demo}
          index={index}
          scrollX={scrollX}
          slideWidth={slideWidth}
          isActive={isActive}
          modeId={isModesSlide ? serviceMode : undefined}
          onModeChange={isModesSlide ? onModeChange : undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    overflow: 'hidden',
  },
  content: {
    zIndex: 2,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: SPACING.sm,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
});

export default React.memo(OnboardingSlide);
