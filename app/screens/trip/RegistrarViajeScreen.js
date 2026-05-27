import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Car, ChevronRight } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { useTripTracking } from '../../context/TripTrackingContext';
import HomeTelemetrySection from '../../components/home/dashboard/HomeTelemetrySection';
import { HomePanelCard } from '../../components/home/shared/HomePanelCard';
import { formatKm } from '../../components/home/shared/homeFormatters';
import SolicitudFlowHeader from '../../components/solicitudes/SolicitudFlowHeader';

const RegistrarViajeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    odometer,
    tripActive,
    tripKm,
    tripElapsed,
    currentSpeed,
    startTrip,
    stopTrip,
  } = useTripTracking();

  useEffect(() => {
    const vid = params.vehicleId ?? params.vehicle?.id;
    if (vid) setSelectedVehicleId(vid);
  }, [params.vehicleId, params.vehicle?.id, setSelectedVehicleId]);

  const handleSelectVehicle = useCallback(
    (id) => setSelectedVehicleId(id),
    [setSelectedVehicleId],
  );

  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.marca_nombre || ''} ${selectedVehicle.modelo_nombre || ''}`.trim()
    : 'Selecciona un vehículo';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SolicitudFlowHeader
        title="Registrar viaje"
        subtitle="GPS · actualiza tu kilometraje"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (tripActive ? 88 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {vehicles.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vehículo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleRow}
            >
              {vehicles.map((v) => {
                const active = v.id === selectedVehicleId;
                return (
                  <TouchableOpacity
                    key={String(v.id)}
                    style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                    onPress={() => handleSelectVehicle(v.id)}
                    activeOpacity={0.85}
                  >
                    <Car
                      size={16}
                      color={active ? COLORS.primary[600] : COLORS.text.tertiary}
                    />
                    <Text
                      style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}
                      numberOfLines={1}
                    >
                      {v.marca_nombre} {v.modelo_nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <HomePanelCard style={styles.vehicleCard}>
            <View style={styles.vehicleSummary}>
              <View style={styles.vehicleIconWrap}>
                <Car size={20} color={COLORS.primary[600]} />
              </View>
              <View style={styles.vehicleSummaryText}>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicleLabel}
                </Text>
                <Text style={styles.vehicleSub}>
                  Odómetro actual · {formatKm(odometer)} km
                </Text>
              </View>
              {!selectedVehicle ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
                  activeOpacity={0.85}
                >
                  <ChevronRight size={20} color={COLORS.primary[500]} />
                </TouchableOpacity>
              ) : null}
            </View>
          </HomePanelCard>
        )}

        {!selectedVehicle ? (
          <HomePanelCard style={styles.hintCard}>
            <Text style={styles.hintTitle}>Sin vehículo</Text>
            <Text style={styles.hintBody}>
              Registra un vehículo para poder iniciar el seguimiento GPS y actualizar el
              kilometraje al terminar el viaje.
            </Text>
            <TouchableOpacity
              style={styles.hintBtn}
              onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
              activeOpacity={0.85}
            >
              <Text style={styles.hintBtnText}>Agregar vehículo</Text>
            </TouchableOpacity>
          </HomePanelCard>
        ) : (
          <HomeTelemetrySection
            tripActive={tripActive}
            tripKm={tripKm}
            tripElapsed={tripElapsed}
            currentSpeed={currentSpeed}
            onStartTrip={startTrip}
            onStopTrip={stopTrip}
          />
        )}

        {tripActive ? (
          <Text style={styles.footerHint}>
            Puedes usar otras secciones de la app; la barra inferior seguirá mostrando el viaje
            activo hasta que pulses Detener.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scroll: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    marginBottom: 8,
  },
  vehicleRow: {
    gap: 8,
    paddingRight: 8,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    maxWidth: 200,
  },
  vehicleChipActive: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.primary[50],
  },
  vehicleChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  vehicleChipTextActive: {
    color: COLORS.primary[700],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  vehicleCard: {
    marginBottom: SPACING.md,
  },
  vehicleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleSummaryText: {
    flex: 1,
    minWidth: 0,
  },
  vehicleName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  hintCard: {
    marginBottom: SPACING.md,
  },
  hintTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  hintBody: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  hintBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.button.md,
    backgroundColor: COLORS.primary[500],
  },
  hintBtnText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.onPrimary,
  },
  footerHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    lineHeight: 20,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default RegistrarViajeScreen;
