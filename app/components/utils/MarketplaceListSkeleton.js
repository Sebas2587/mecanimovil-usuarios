import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';

const MarketplaceListSkeleton = ({ cards = 4 }) => {
  return (
    <View style={styles.root} accessibilityElementsHidden>
      {Array.from({ length: cards }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <Skeleton width="100%" height={180} borderRadius={0} />
          <View style={styles.body}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Skeleton width="72%" height={18} borderRadius={6} />
                <Skeleton width="54%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
              </View>
              <Skeleton width={90} height={18} borderRadius={6} />
            </View>
            <View style={styles.sellerRow}>
              <Skeleton width={24} height={24} borderRadius={12} />
              <Skeleton width={140} height={12} borderRadius={6} style={{ marginLeft: 8 }} />
            </View>
            <Skeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 12 }} />
            <Skeleton width="90%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
            <View style={styles.divider} />
            <View style={styles.footerRow}>
              <Skeleton width={110} height={12} borderRadius={6} />
              <Skeleton width={90} height={12} borderRadius={6} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    padding: SPACING.container?.horizontal ?? 16,
    paddingTop: SPACING.md,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 20,
  },
  body: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default MarketplaceListSkeleton;

