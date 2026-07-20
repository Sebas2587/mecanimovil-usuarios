import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { COLORS, SPACING } from '../../design-system/tokens';
import GuestGradientButton from '../guest/GuestGradientButton';
import OnboardingSkipButton from './OnboardingSkipButton';

/**
 * Barra inferior: Atrás textual (igual que Saltar) + CTA primario.
 */
const OnboardingBottomBar = ({
  index,
  count,
  isCompact,
  paddingHorizontal,
  bottomInset,
  onBack,
  onNext,
}) => {
  const isLast = index >= count - 1;
  const canGoBack = index > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal,
          paddingBottom: bottomInset + SPACING.md,
        },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.94)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.inner} pointerEvents="auto">
        <View style={styles.backSlot}>
          {canGoBack ? (
            <OnboardingSkipButton onPress={onBack} label="Atrás" />
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        <View style={[styles.cta, isCompact && styles.ctaGrow]}>
          <GuestGradientButton
            title={isLast ? 'Explorar MecaniMóvil' : 'Siguiente'}
            onPress={onNext}
            fullWidth={isCompact}
            iconNode={
              !isLast ? (
                <ArrowRight size={18} color={COLORS.base.white} strokeWidth={2.25} />
              ) : null
            }
            iconPosition="right"
            accessibilityLabel={isLast ? 'Comenzar a explorar' : 'Siguiente paso'}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    elevation: 60,
    paddingTop: SPACING.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    zIndex: 61,
  },
  backSlot: {
    flexShrink: 0,
    minWidth: 72,
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 72,
    height: 44,
  },
  cta: {
    minWidth: 148,
    maxWidth: 240,
    flexShrink: 1,
  },
  ctaGrow: {
    flex: 1,
    minWidth: 0,
    maxWidth: undefined,
  },
});

export default React.memo(OnboardingBottomBar);
