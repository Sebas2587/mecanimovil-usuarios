import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, BORDERS, SHADOWS } from '../../../design-system/tokens';

/**
 * Card base del panel home (paper + hairline + sombra suave).
 */
export const HomePanelCard = ({ children, style, onPress, innerStyle }) => {
  const inner = (
    <View style={[styles.card, style]}>
      <View style={[styles.cardInner, innerStyle]}>{children}</View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
};

export const HomeSoftButton = ({ onPress, children, variant }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.softBtnWrap}>
    <View
      style={[
        styles.softBtnInner,
        variant === 'stop' ? styles.softBtnInnerStop : styles.softBtnInnerPrimary,
      ]}
    >
      {children}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  cardInner: {
    padding: 16,
  },
  softBtnWrap: {
    marginTop: 6,
  },
  softBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
  },
  softBtnInnerPrimary: {
    backgroundColor: COLORS.primary[500],
  },
  softBtnInnerStop: {
    backgroundColor: COLORS.error.main,
  },
});

export default HomePanelCard;
