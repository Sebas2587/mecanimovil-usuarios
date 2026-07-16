import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import { HomeTrendingChipsSkeleton } from '../../utils/HomePanelSkeletons';

/**
 * Rail «Qué eligen dueños de tu mismo auto» — patrón Airbnb (1 job / sección).
 * Datos: servicios agregados de otros usuarios con misma marca + modelo.
 */
const HomeMarketActivitySection = ({
  selectedVehicle,
  activity,
  loading,
  onSelectService,
}) => {
  if (!selectedVehicle) return null;

  const items = activity?.items ?? [];
  const marca =
    activity?.marca || selectedVehicle.marca_nombre || selectedVehicle.marca || '';
  const modelo =
    activity?.modelo || selectedVehicle.modelo_nombre || selectedVehicle.modelo || '';
  /** Si el modelo exacto no tenía suficiente historial, el backend amplía a la marca. */
  const isBrandScope = activity?.scope === 'marca';
  const vehicleLabel = isBrandScope
    ? marca || 'tu marca'
    : [marca, modelo].filter(Boolean).join(' ').trim() || 'tu auto';
  const sectionTitle = isBrandScope ? 'Servicios en tu marca' : 'Servicios en tu modelo';

  const handlePress = useCallback(
    (row) => {
      onSelectService?.(row);
    },
    [onSelectService],
  );

  return (
    <View style={styles.section}>
      <HomeSectionHeader title={sectionTitle} />

      {loading ? (
        <HomeTrendingChipsSkeleton />
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>
          {`Aún no hay suficientes agendamientos de dueños de ${vehicleLabel}.`}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          keyboardShouldPersistTaps="handled"
        >
          {items.map((row, idx) => {
            const nombre = row.servicio_nombre || 'Servicio';
            const count = Number(row.personas ?? 0);
            const rank = idx + 1;
            return (
              <TouchableOpacity
                key={`market-${row.servicio_id ?? idx}`}
                style={styles.tile}
                onPress={() => handlePress(row)}
                accessibilityRole="button"
                accessibilityLabel={`${nombre}, ${count} ${count === 1 ? 'persona' : 'personas'}. Agendar.`}
                activeOpacity={0.9}
              >
                <Text style={styles.rank}>{rank}</Text>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {nombre}
                </Text>
                <Text style={styles.tileMeta}>
                  {count === 1 ? '1 persona' : `${count} personas`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const TILE_W = 156;

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  rail: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  tile: {
    width: TILE_W,
    minHeight: 112,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    justifyContent: 'space-between',
  },
  rank: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.4,
    marginBottom: SPACING.xs,
  },
  tileTitle: {
    flexGrow: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  tileMeta: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary[500],
  },
});

export default React.memo(HomeMarketActivitySection);
