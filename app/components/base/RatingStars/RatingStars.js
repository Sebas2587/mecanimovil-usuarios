import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, SPACING } from '../../../design-system/tokens';

/**
 * Estrellas de rating — Lucide fill, estilo Airbnb
 */
const RatingStars = ({ rating = 0, size = 14, max = 5, color = COLORS.text.primary }) => {
  const value = Math.max(0, Math.min(max, Number(rating) || 0));
  return (
    <View style={styles.row} accessibilityLabel={`${value} de ${max} estrellas`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <Star
            key={i}
            size={size}
            color={color}
            fill={filled ? color : 'transparent'}
            strokeWidth={1.75}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
});

export default RatingStars;
