import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Car, ChevronDown, Plus } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';

/**
 * Selector compacto del vehículo activo en el home (card + estados vacío/carga).
 */
const HomeVehicleSelector = ({
  vehicles = [],
  vehiclesLoading,
  selectedVehicle,
  healthScore = null,
  healthScoreColor = null,
  onOpenSelector,
  onAddVehicle,
}) => {
  if (vehicles.length > 0 && selectedVehicle) {
    return (
      <HomePanelCard onPress={onOpenSelector} style={styles.cardMargin}>
        <View style={styles.selectorRow}>
          {selectedVehicle.foto ? (
            <Image
              source={{ uri: selectedVehicle.foto }}
              style={styles.selectorThumb}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.selectorThumb, styles.selectorThumbFallback]}>
              <Car size={22} color={COLORS.primary[500]} />
            </View>
          )}
          <View style={styles.selectorTextCol}>
            <Text style={styles.selectorTitle} numberOfLines={1}>
              {selectedVehicle.marca_nombre || selectedVehicle.marca || '—'}{' '}
              {selectedVehicle.modelo_nombre || selectedVehicle.modelo || ''}
            </Text>
            <Text style={styles.selectorSub}>
              {selectedVehicle.year || ''} · {selectedVehicle.patente || ''}
            </Text>
          </View>
          {healthScore != null ? (
            <View
              style={[
                styles.healthChip,
                healthScoreColor ? { borderColor: healthScoreColor } : null,
              ]}
            >
              <Text style={[styles.healthChipText, healthScoreColor ? { color: healthScoreColor } : null]}>
                {Math.round(healthScore)}%
              </Text>
            </View>
          ) : null}
          <ChevronDown size={20} color={COLORS.text.tertiary} />
        </View>
      </HomePanelCard>
    );
  }

  if (vehiclesLoading) {
    return (
      <HomePanelCard style={[styles.cardMargin, styles.loadingCard]}>
        <ActivityIndicator color={COLORS.primary[500]} size="large" />
        <Text style={styles.loadingText}>Cargando vehículos...</Text>
      </HomePanelCard>
    );
  }

  return (
    <HomePanelCard style={styles.cardMargin}>
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <Car size={32} color={COLORS.primary[500]} />
        </View>
        <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
        <Text style={styles.emptyText}>
          Registra tu primer vehículo para desbloquear el dashboard predictivo, telemetría y salud
          IA.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={onAddVehicle} activeOpacity={0.85}>
          <Plus size={18} color={COLORS.text.inverse} />
          <Text style={styles.emptyBtnText}>Agregar Vehículo</Text>
        </TouchableOpacity>
      </View>
    </HomePanelCard>
  );
};

const styles = StyleSheet.create({
  cardMargin: {
    marginBottom: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorThumb: {
    width: 48,
    height: 48,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.neutral.gray[100],
  },
  selectorThumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
  },
  selectorTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  selectorTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  selectorSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  healthChip: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1.5,
    borderColor: COLORS.primary[300],
    backgroundColor: COLORS.primary[50],
  },
  healthChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[600],
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    marginTop: 20,
  },
  emptyBtnText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default React.memo(HomeVehicleSelector);
