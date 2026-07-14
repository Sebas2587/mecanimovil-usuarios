import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

/**
 * Card summary estilo Airbnb (Messages / Trips compact):
 * icono monocromo en círculo neutro + título bodyBold + subtítulo caption + badge opcional.
 */
const SummaryActionCard = ({
  title,
  subtitle,
  icon,
  badgeCount = 0,
  onPress,
  width,
  style,
}) => (
  <TouchableOpacity
    style={[styles.card, width != null && { width }, style]}
    onPress={onPress}
    activeOpacity={0.92}
    disabled={!onPress}
    accessibilityRole="button"
    accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
  >
    <View style={styles.iconCircle}>{icon}</View>
    <View style={styles.textCol}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {badgeCount > 0 ? (
      <View style={styles.badge} accessibilityElementsHidden>
        <Text style={styles.badgeText}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    ) : (
      <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} style={styles.chevron} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    minHeight: 80,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  chevron: {
    flexShrink: 0,
  },
  badge: {
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

export default React.memo(SummaryActionCard);
