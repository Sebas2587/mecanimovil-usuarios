import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';
import { CARD_GAP, QUICK_ACTION_CARD_W, QUICK_ACTION_SNAP_INTERVAL } from '../shared/homeLayoutConstants';

/**
 * Carrusel horizontal de accesos rápidos (Servicios, Solicitudes, etc.).
 */
const HomeQuickActions = ({ items = [] }) => (
  <ScrollView
    horizontal
    nestedScrollEnabled={Platform.OS !== 'web'}
    showsHorizontalScrollIndicator={Platform.OS === 'web'}
    decelerationRate={Platform.OS === 'web' ? undefined : 'fast'}
    snapToInterval={Platform.OS === 'web' ? undefined : QUICK_ACTION_SNAP_INTERVAL}
    snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
    disableIntervalMomentum={Platform.OS === 'web' ? undefined : true}
    contentContainerStyle={styles.scrollContent}
    style={[styles.scrollOuter, Platform.OS === 'web' && styles.scrollOuterWeb]}
    keyboardShouldPersistTaps="handled"
  >
    {items.map((it) => (
      <HomePanelCard
        key={it.key}
        style={[styles.card, { width: QUICK_ACTION_CARD_W }]}
        innerStyle={styles.cardInner}
        onPress={it.onPress}
      >
        <View style={styles.iconWrap}>
          <View style={[styles.iconBox, { backgroundColor: it.iconBg }]}>{it.icon}</View>
          {(it.badgeCount ?? 0) > 0 ? (
            <View style={styles.badge} accessibilityElementsHidden>
              <Text style={styles.badgeText}>
                {(it.badgeCount ?? 0) > 99 ? '99+' : it.badgeCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {it.title}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {it.sub}
          </Text>
        </View>
      </HomePanelCard>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  scrollOuter: {
    marginBottom: 16,
    marginHorizontal: -2,
  },
  scrollOuterWeb: {
    overflow: 'scroll',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: CARD_GAP,
    paddingVertical: 2,
    paddingRight: 12,
  },
  card: {
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    minHeight: 76,
  },
  iconWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  badgeText: {
    color: COLORS.text.inverse,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  sub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 1,
  },
});

export default React.memo(HomeQuickActions);
