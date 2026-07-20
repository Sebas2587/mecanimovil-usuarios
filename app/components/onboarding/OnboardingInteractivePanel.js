import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import BrandPickerDemo from './interactive/BrandPickerDemo';
import ServiceModeToggle from './interactive/ServiceModeToggle';
import VehicleHealthDemo from './interactive/VehicleHealthDemo';
import { interpolateFade } from './onboardingMotion';

/**
 * Demo con fade ligero. Solo el slide activo monta animaciones internas.
 */
const OnboardingInteractivePanel = ({
  demo,
  index,
  scrollX,
  slideWidth,
  isActive,
  modeId,
  onModeChange,
}) => {
  const opacity = interpolateFade(scrollX, index, slideWidth);

  let content = null;
  if (demo === 'brands') content = <BrandPickerDemo active={isActive} />;
  else if (demo === 'modes') {
    content = (
      <ServiceModeToggle
        active={isActive}
        modeId={modeId}
        onModeChange={onModeChange}
      />
    );
  } else if (demo === 'health') content = <VehicleHealthDemo active={isActive} />;

  if (!content) return null;

  return <Animated.View style={[styles.wrap, { opacity }]}>{content}</Animated.View>;
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: 4,
  },
});

export default React.memo(OnboardingInteractivePanel);
