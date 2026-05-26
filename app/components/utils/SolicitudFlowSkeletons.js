import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from '../feedback/Skeleton/Skeleton';
import { COLORS, BORDERS, SPACING } from '../../design-system/tokens';

export const CrearSolicitudScreenSkeleton = ({ contentPaddingBottom = 0 }) => {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Skeleton width={140} height={18} borderRadius={6} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (contentPaddingBottom || 0) + SPACING.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step header */}
        <View style={styles.block}>
          <Skeleton width={160} height={20} borderRadius={6} />
          <Skeleton width="92%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
          <Skeleton width="78%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>

        {/* Vehicle selector card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1 }}>
              <Skeleton width="70%" height={16} borderRadius={6} />
              <Skeleton width="55%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
            </View>
          </View>
        </View>

        {/* Services grid */}
        <View style={styles.block}>
          <Skeleton width={170} height={18} borderRadius={6} />
          <Skeleton width="88%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
          <View style={styles.pillsRow}>
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} width={86} height={34} borderRadius={18} />
            ))}
          </View>
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <View key={k} style={styles.gridItem}>
                <Skeleton width="100%" height={96} borderRadius={BORDERS.radius.card?.lg ?? 16} />
              </View>
            ))}
          </View>
        </View>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Skeleton width="100%" height={52} borderRadius={BORDERS.radius.button?.md ?? 14} />
        </View>
      </ScrollView>
    </View>
  );
};

export const SolicitudPaso1ServiciosSkeleton = () => {
  return (
    <View style={{ paddingVertical: 14 }}>
      <View style={styles.pillsRow}>
        {[0, 1, 2, 3].map((k) => (
          <Skeleton key={k} width={86} height={34} borderRadius={18} />
        ))}
      </View>
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={styles.gridItem}>
            <Skeleton width="100%" height={96} borderRadius={BORDERS.radius.card?.lg ?? 16} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const InlineChipSkeleton = ({ width = 140 }) => (
  <View style={styles.inlineChip}>
    <Skeleton width={width} height={14} borderRadius={6} />
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  block: {
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.card?.lg ?? 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  footer: {
    marginTop: 4,
    paddingBottom: SPACING.lg,
  },
  inlineChip: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
});

