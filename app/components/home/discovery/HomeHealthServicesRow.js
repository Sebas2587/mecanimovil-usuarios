import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../../design-system/tokens';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import VehicleHealthService from '../../../services/vehicleHealthService';
import { getServicesByVehiculo } from '../../../services/service';
import {
  buildHealthServiceRecommendations,
  normalizeHealthComponentsList,
} from '../shared/homeHealthRecommendations';

function levelColor(level) {
  const l = String(level || '').toUpperCase();
  if (l === 'CRITICO' || l === 'CRÍTICO') return COLORS.error.main;
  if (l === 'ATENCION' || l === 'ATENCIÓN') return COLORS.warning.main;
  return COLORS.primary[500];
}

/**
 * Servicios sugeridos por desgaste / salud del vehículo (tap → nueva solicitud).
 */
const HomeHealthServicesRow = ({ selectedVehicle, onAgendarServicio }) => {
  const vehicleId = selectedVehicle?.id;

  const { data: healthComponents = [], isLoading: healthLoading } = useQuery({
    queryKey: ['vehicleHealthComponents', vehicleId],
    queryFn: () => VehicleHealthService.getComponents(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 5,
    select: normalizeHealthComponentsList,
  });

  const { data: vehicleServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['vehicleServices', vehicleId],
    queryFn: () => getServicesByVehiculo(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 5,
  });

  const recommendations = useMemo(
    () => buildHealthServiceRecommendations(healthComponents, vehicleServices),
    [healthComponents, vehicleServices],
  );

  const loading = healthLoading || servicesLoading;

  if (!selectedVehicle) return null;
  if (!loading && recommendations.length === 0) return null;

  const marca = selectedVehicle.marca_nombre || 'tu auto';

  return (
    <View style={styles.section}>
      <HomeSectionHeader
        icon={<ShieldAlert size={16} color={COLORS.warning.main} />}
        title="Según el desgaste de tu vehículo"
        hint={`Servicios recomendados para tu ${marca}`}
      />

      {loading ? (
        <ActivityIndicator color={COLORS.primary[500]} style={styles.loader} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {recommendations.map((rec) => {
            const svc = rec.service;
            return (
              <View key={`health-svc-${svc.id}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <View
                    style={[styles.dot, { backgroundColor: levelColor(rec.componentLevel) }]}
                  />
                  <Text style={styles.compName} numberOfLines={1}>
                    {rec.componentName}
                  </Text>
                </View>
                <Text style={styles.svcName} numberOfLines={2}>
                  {svc.nombre}
                </Text>
                <Text style={styles.wear} numberOfLines={2}>
                  Vida útil ~{Math.round(rec.componentHealth)}%
                  {rec.kmRestantes != null
                    ? ` · ${Number(rec.kmRestantes).toLocaleString('es-CL')} km`
                    : ''}
                </Text>
                <TouchableOpacity
                  style={styles.agendarBtn}
                  onPress={() => onAgendarServicio?.(svc)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.agendarText}>Agendar</Text>
                </TouchableOpacity>
              </View>
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
  card: {
    width: 168,
    padding: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
  },
  svcName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 18,
    marginBottom: 4,
    minHeight: 36,
  },
  wear: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  agendarBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[500],
  },
  agendarText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default React.memo(HomeHealthServicesRow);
