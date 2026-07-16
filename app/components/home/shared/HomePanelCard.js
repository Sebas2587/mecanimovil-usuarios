import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import PrimaryGradientFill from '../../base/PrimaryGradientFill/PrimaryGradientFill';
import { COLORS, BORDERS } from '../../../design-system/tokens';

/**
 * Card base del panel home (paper + hairline, sin sombra fuerte).
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
    {variant === 'stop' ? (
      <View style={[styles.softBtnInner, styles.softBtnInnerStop]}>{children}</View>
    ) : (
      <PrimaryGradientFill style={[styles.softBtnInner, styles.softBtnInnerPrimary]}>
        {children}
      </PrimaryGradientFill>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardInner: {
    padding: 16,
  },
  softBtnWrap: {
    marginTop: 6,
    borderRadius: BORDERS.radius.button.md,
    overflow: 'hidden',
  },
  softBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDERS.radius.button.md,
  },
  softBtnInnerPrimary: {},
  softBtnInnerStop: {
    backgroundColor: COLORS.error.main,
  },
});

export default HomePanelCard;
