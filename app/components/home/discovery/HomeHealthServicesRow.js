import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { HomeHealthCardsSkeleton } from '../../utils/HomePanelSkeletons';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SHADOWS } from '../../../design-system/tokens';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import VehicleHealthService from '../../../services/vehicleHealthService';
import { getServicesByVehiculo } from '../../../services/service';
import { getHealthColorToken } from '../../../utils/healthFormat';
import {
  buildHealthServiceRecommendations,
  normalizeHealthComponentsList,
} from '../shared/homeHealthRecommendations';

function HealthWearServiceCard({ rec, onAgendar }) {
  if (!rec) return null;

  const svc = rec.service ?? null;
  const svcId = svc?.id ?? null;
  const svcNombre = svc?.nombre ?? null;
  const hasService = Boolean(svcId);

  const pct = Math.round(rec.componentHealth ?? 0);
  const accent = getHealthColorToken(COLORS, pct);
  const levelLabel = rec.componentLevelLabel || rec.componentLevel || '';
  const compName = rec.componentName || 'Componente';
  const agendarLabel = hasService && svcNombre
    ? `Agendar ${svcNombre}`
    : `Agendar revisión de ${compName}`;

  const handlePress = () => onAgendar?.(svc, rec);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={agendarLabel}
    >
      <Text style={styles.componentTitle} numberOfLines={2}>
        {compName}
      </Text>

      <View style={styles.pctRow}>
        <Text style={[styles.levelText, { color: accent }]}>
          {levelLabel}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, pct))}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>
        <Text style={[styles.pctText, { color: accent }]}>{pct}%</Text>
      </View>

      <View style={styles.cardBody}>
        {rec.actionLine ? (
          <Text style={styles.actionLine}>
            {rec.actionLine}
          </Text>
        ) : null}

        {rec.scheduleLine && rec.scheduleLine !== rec.actionLine ? (
          <Text style={styles.scheduleLine}>
            {rec.scheduleLine}
          </Text>
        ) : null}

        {hasService && svcNombre ? (
          <Text style={styles.svcName} numberOfLines={1}>
            {svcNombre}
          </Text>
        ) : null}
      </View>

      <View style={styles.agendarLink}>
        <Text style={styles.agendarLinkText}>Agendar</Text>
        <ChevronRight size={16} color={COLORS.primary[500]} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Servicios sugeridos por desgaste (un servicio por componente crítico).
 */
const HomeHealthServicesRow = ({ selectedVehicle, onAgendarServicio }) => {
  const vehicleId = selectedVehicle?.id;

  // Misma fuente que VehicleHealthScreen (componentes + alertas del reporte completo).
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['vehicleHealth', vehicleId],
    queryFn: () => VehicleHealthService.getVehicleHealthWithPatches(vehicleId, true),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 2,
  });

  const healthComponents = useMemo(
    () => normalizeHealthComponentsList(healthData?.componentes ?? healthData),
    [healthData],
  );

  const { data: predictionsData, isLoading: predictionsLoading } = useQuery({
    queryKey: ['vehicleHealthPredictions', vehicleId],
    queryFn: () => VehicleHealthService.getVehiclePredictions(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 15,
  });

  const { data: vehicleServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['vehicleServices', vehicleId],
    queryFn: () => getServicesByVehiculo(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 5,
  });

  const recommendations = useMemo(
    () => buildHealthServiceRecommendations(
      healthComponents,
      vehicleServices,
      healthData?.alertas ?? [],
      predictionsData?.predicciones ?? [],
    ),
    [healthComponents, vehicleServices, healthData?.alertas, predictionsData?.predicciones],
  );

  const loading = healthLoading || servicesLoading || predictionsLoading;

  if (!selectedVehicle) return null;
  if (!loading && recommendations.length === 0) return null;

  const marca = selectedVehicle.marca_nombre || 'tu auto';

  return (
    <View style={styles.section}>
      <HomeSectionHeader
        title="Mantenimiento sugerido"
        hint={`Por desgaste en tu ${marca}`}
      />

      {loading ? (
        <HomeHealthCardsSkeleton />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {recommendations.map((rec) => (
            <HealthWearServiceCard
              key={`health-${rec.componentKey}-${rec.service?.id ?? 'open'}`}
              rec={rec}
              onAgendar={onAgendarServicio}
            />
          ))}
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
    gap: 12,
    paddingRight: 8,
  },
  card: {
    width: 176,
    padding: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  cardBody: {
    minHeight: 48,
    marginBottom: 4,
  },
  componentTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 21,
    marginBottom: 8,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  levelText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    minWidth: 52,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[200],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  pctText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
  svcName: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 2,
  },
  actionLine: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    lineHeight: 17,
    marginBottom: 3,
    flexShrink: 1,
  },
  scheduleLine: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    lineHeight: 15,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  agendarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginTop: 2,
    paddingVertical: 4,
  },
  agendarLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[500],
  },
});

export default React.memo(HomeHealthServicesRow);
