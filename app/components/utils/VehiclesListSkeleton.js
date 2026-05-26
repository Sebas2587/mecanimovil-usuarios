import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';

const VehiclesListSkeleton = ({ cards = 3 }) => {
  return (
    <View style={styles.root} accessibilityElementsHidden>
      {Array.from({ length: cards }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <Skeleton width="100%" height={160} borderRadius={BORDERS.radius.card?.lg ?? 16} />
          <View style={styles.body}>
            <Skeleton width="60%" height={18} borderRadius={6} />
            <Skeleton width="45%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
            <View style={{ marginTop: 14 }}>
              <Skeleton width="100%" height={86} borderRadius={BORDERS.radius.card?.lg ?? 16} />
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
    padding: SPACING.container?.horizontal ?? 16,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background.default,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    marginBottom: 20,
  },
  body: {
    padding: SPACING.lg,
  },
});

export default VehiclesListSkeleton;

