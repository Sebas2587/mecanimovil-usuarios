import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS } from '../../design-system/tokens';
import BackButton from './BackButton';

/**
 * Header de wizard — misma métrica de safe area / fila que AppHeader.
 */
const FlowHeader = ({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const progress = totalSteps > 0 ? Math.min(1, (step || 0) / totalSteps) : 0;
  const showProgress = totalSteps > 0;
  const showSubtitle = !!subtitle;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + SPACING.xs }]}>
      <View style={styles.topRow}>
        <View style={styles.side}>
          {onBack ? <BackButton onPress={onBack} /> : null}
        </View>
        {title ? (
          <Text style={[TYPOGRAPHY.styles.h5, styles.title]} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.titleSpacer} />
        )}
        <View style={[styles.side, styles.sideEnd]}>
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <X size={20} color={COLORS.text.secondary} strokeWidth={2} fill="none" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {showSubtitle ? (
        <Text style={[TYPOGRAPHY.styles.caption, styles.subtitle]}>{subtitle}</Text>
      ) : null}
      {showProgress ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFillWrap, { width: `${progress * 100}%` }]}>
            <PrimaryGradientFill style={StyleSheet.absoluteFillObject} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.default,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  titleSpacer: {
    flex: 1,
  },
  subtitle: {
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.neutral.gray[200],
    borderRadius: BORDERS.radius.pill,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressFillWrap: {
    height: '100%',
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
  },
});

export default FlowHeader;
