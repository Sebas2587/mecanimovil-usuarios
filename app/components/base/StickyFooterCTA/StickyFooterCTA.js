import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../../../design-system/tokens';

/**
 * CTA fijo inferior — patrón wizard Airbnb
 */
const StickyFooterCTA = ({ children, style }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, SPACING.md),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background.default,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
});

export default StickyFooterCTA;
