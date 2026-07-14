import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { HomeTrendingChipsSkeleton } from '../../utils/HomePanelSkeletons';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionHeader from '../shared/HomeSectionHeader';

/**
 * Demanda agregada como chips horizontales (tap → explore con búsqueda).
 */
const HomeTrendingServicesRow = ({ selectedVehicle, activity, loading, onSelectService }) => {
  if (!selectedVehicle) return null;

  const items = activity?.items ?? [];

  if (!loading && items.length === 0) return null;

  return (
    <View style={styles.section}>
      <HomeSectionHeader title="Más elegidos para tu modelo" />

      {loading ? (
        <HomeTrendingChipsSkeleton />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((row, idx) => {
            const nombre = row.servicio_nombre || 'Servicio';
            const count = Number(row.personas ?? 0);
            return (
              <TouchableOpacity
                key={`trend-${row.servicio_id ?? idx}`}
                style={styles.chip}
                onPress={() => onSelectService?.(nombre, row)}
                accessibilityRole="button"
                accessibilityLabel={`Agendar ${nombre}`}
                activeOpacity={0.85}
              >
                <Text style={styles.chipTitle} numberOfLines={2}>
                  {nombre}
                </Text>
                <Text style={styles.chipCount}>
                  {count} {count === 1 ? 'persona' : 'personas'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  loader: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    width: 148,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  chipTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 18,
    marginBottom: 6,
  },
  chipCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
  },
});

export default React.memo(HomeTrendingServicesRow);
