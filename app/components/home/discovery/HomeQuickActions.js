import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';
import PrimaryGradientBadge from '../../base/PrimaryGradientBadge/PrimaryGradientBadge';
import BrandIconWell from '../../base/BrandIconWell/BrandIconWell';

/**
 * Accesos rápidos del home — grilla (Airbnb summary tiles).
 * Iconos en degradado primario Tinder.
 */
const HomeQuickActions = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <View style={styles.grid} accessibilityRole="list">
      {items.map((it) => {
        const badgeCount = it.badgeCount ?? 0;
        return (
          <TouchableOpacity
            key={it.key}
            style={styles.tile}
            onPress={it.onPress}
            activeOpacity={0.92}
            disabled={!it.onPress}
            accessibilityRole="button"
            accessibilityLabel={it.sub ? `${it.title}. ${it.sub}` : it.title}
          >
            <View style={styles.tileTop}>
              <BrandIconWell size={36}>{it.icon}</BrandIconWell>
              {badgeCount > 0 ? (
                <PrimaryGradientBadge style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </PrimaryGradientBadge>
              ) : (
                <ChevronRight size={16} color={COLORS.text.tertiary} strokeWidth={2} />
              )}
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {it.title}
            </Text>
            {it.sub ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {it.sub}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    minHeight: 108,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  badge: {
    borderRadius: BORDERS.radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
  },
  badgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

export default React.memo(HomeQuickActions);
