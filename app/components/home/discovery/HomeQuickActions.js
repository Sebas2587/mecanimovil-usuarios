import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../../design-system/tokens';

/**
 * Accesos rápidos del home — grilla (Airbnb summary tiles).
 * Iconos en primary (marca) sobre círculo primary[50].
 */
const HomeQuickActions = ({ items = [] }) => {
  if (!items.length) return null;

  return (
    <View style={styles.grid} accessibilityRole="list">
      {items.map((it) => {
        const badgeCount = it.badgeCount ?? 0;
        const iconBg = it.iconBg || COLORS.primary[50];
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
              <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                {it.icon}
              </View>
              {badgeCount > 0 ? (
                <View style={styles.badge} accessibilityElementsHidden>
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: COLORS.primary[500],
    borderRadius: BORDERS.radius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});

export default React.memo(HomeQuickActions);
