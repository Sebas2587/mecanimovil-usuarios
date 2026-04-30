import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';

const ChatsListSkeleton = () => (
  <View style={styles.wrap} accessibilityElementsHidden>
    {[0, 1, 2, 3, 4, 5].map((k) => (
      <View key={k} style={styles.card}>
        <Skeleton width="72%" height={16} borderRadius={4} style={styles.mb6} />
        <Skeleton width="40%" height={24} borderRadius={12} style={styles.mb8} />
        <View style={styles.divider} />
        <View style={styles.row}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={styles.col}>
            <Skeleton width="55%" height={14} borderRadius={4} style={styles.mb4} />
            <Skeleton width="88%" height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb4: { marginBottom: 4 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, marginLeft: 12 },
});

export default ChatsListSkeleton;
