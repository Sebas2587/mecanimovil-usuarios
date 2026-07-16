import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';

/**
 * Skeleton Airbnb para ficha pública de proveedor.
 * Bloques de media + texto (sin acentos decorativos).
 */
const PublicProviderDetailSkeleton = () => (
  <View style={styles.root}>
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.headerText}>
        <Skeleton width="58%" height={20} borderRadius={6} />
        <Skeleton width="36%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>

    <View style={styles.hero}>
      <Skeleton width="100%" height={220} borderRadius={BORDERS.radius.xl} />
    </View>

    <View style={styles.section}>
      <Skeleton width="42%" height={18} borderRadius={6} />
      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 14 }} />
      <Skeleton width="88%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
    </View>

    <View style={styles.section}>
      <Skeleton width="38%" height={18} borderRadius={6} style={{ marginBottom: 14 }} />
      <View style={styles.cardsRow}>
        <View style={styles.cardCol}>
          <Skeleton width="100%" height={0} style={styles.cardMedia} borderRadius={BORDERS.radius.lg} />
          <View style={styles.cardMediaBox}>
            <Skeleton width="100%" height="100%" borderRadius={BORDERS.radius.lg} />
          </View>
          <Skeleton width="78%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
          <Skeleton width="48%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.cardCol}>
          <View style={styles.cardMediaBox}>
            <Skeleton width="100%" height="100%" borderRadius={BORDERS.radius.lg} />
          </View>
          <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
          <Skeleton width="42%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <Skeleton width="100%" height={88} borderRadius={BORDERS.radius.xl} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  hero: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cardCol: {
    flex: 1,
  },
  cardMediaBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.gray[100],
  },
  cardMedia: {
    display: 'none',
  },
});

export default PublicProviderDetailSkeleton;
