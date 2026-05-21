import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Rating + conteo de reseñas en fila plana (sin cápsula), p. ej. Destacados / Cerca.
 * Sin reseñas: ★ 0 · 0
 */
const ProviderCardRatingBadge = ({ rating, reviewsCount = 0, compact = false }) => {
  const { ratingDisplay, reviewsDisplay, starFilled } = useMemo(() => {
    const reviews = Math.max(0, Math.floor(Number(reviewsCount) || 0));

    let raw = rating;
    if (raw != null && raw !== '' && raw !== '—') {
      const parsed = parseFloat(String(raw).trim().replace(',', '.'));
      if (Number.isFinite(parsed) && parsed > 0) {
        return {
          ratingDisplay: parsed.toFixed(1),
          reviewsDisplay: String(reviews),
          starFilled: true,
        };
      }
    }

    if (reviews > 0) {
      return {
        ratingDisplay: '0.0',
        reviewsDisplay: String(reviews),
        starFilled: false,
      };
    }

    return {
      ratingDisplay: '0',
      reviewsDisplay: '0',
      starFilled: false,
    };
  }, [rating, reviewsCount]);

  return (
    <View
      style={[styles.row, compact && styles.rowCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Calificación ${ratingDisplay}, ${reviewsDisplay} reseñas`}
    >
      <Star
        size={compact ? 12 : 13}
        color={COLORS.warning.main}
        fill={starFilled ? COLORS.warning.main : 'transparent'}
        strokeWidth={starFilled ? 0 : 2}
      />
      <Text style={[styles.ratingNum, compact && styles.ratingNumCompact]}>
        {ratingDisplay}
      </Text>
      <Text style={styles.dot}>·</Text>
      <Text style={[styles.reviewNum, compact && styles.reviewNumCompact]}>
        {reviewsDisplay}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
    maxWidth: '72%',
  },
  rowCompact: {
    maxWidth: '78%',
    gap: 3,
  },
  ratingNum: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  ratingNumCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  dot: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  reviewNum: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  reviewNumCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

export default React.memo(ProviderCardRatingBadge);
