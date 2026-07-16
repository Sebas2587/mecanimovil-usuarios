import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';

/**
 * Enlace «Ver todos» — Airbnb: texto + chevron secondary (sin well CTA).
 */
const HomeSectionSeeAll = ({ onPress, label = 'Ver todos', disabled = false }) => {
  if (!onPress || disabled) return null;
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.text}>{label}</Text>
      <ChevronRight size={16} color={COLORS.buttonSecondary.outlineText} strokeWidth={2.25} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.buttonSecondary.outlineText,
  },
});

export default React.memo(HomeSectionSeeAll);
