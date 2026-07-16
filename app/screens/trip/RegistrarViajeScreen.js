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
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import { ROUTES } from '../../utils/constants';
import { useTripTracking } from '../../context/TripTrackingContext';
import HomeTelemetrySection from '../../components/home/dashboard/HomeTelemetrySection';
import { formatKm } from '../../components/home/shared/homeFormatters';

/**
 * Registrar viaje GPS — Airbnb layout + tipografía / colores Tinder.
 */
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (tripActive ? 88 : SPACING.lg) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>GPS · actualiza tu kilometraje</Text>

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
                      size={15}
                      color={active ? COLORS.primary[500] : COLORS.text.tertiary}
                      strokeWidth={2}
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
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <Car size={18} color={COLORS.primary[500]} strokeWidth={2} />
            </View>
            <View style={styles.vehicleSummaryText}>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {vehicleLabel}
              </Text>
              <Text style={styles.vehicleSub}>
                Odómetro · {formatKm(odometer)} km
              </Text>
            </View>
            {!selectedVehicle ? (
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
                activeOpacity={0.85}
                hitSlop={8}
              >
                <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {!selectedVehicle ? (
          <View style={styles.hintCard}>
            <Text style={styles.hintTitle}>Sin vehículo</Text>
            <Text style={styles.hintBody}>
              Agrega un auto para iniciar el seguimiento GPS y actualizar el kilometraje.
            </Text>
            <TouchableOpacity
              style={styles.hintBtnWrap}
              onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
              activeOpacity={0.9}
            >
              <PrimaryGradientFill style={styles.hintBtn}>
                <Text style={styles.hintBtnText}>Agregar vehículo</Text>
              </PrimaryGradientFill>
            </TouchableOpacity>
          </View>
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
            Puedes seguir usando la app; la barra inferior mantiene el viaje hasta que lo detengas.
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
  lead: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  vehicleRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    maxWidth: 220,
  },
  vehicleChipActive: {
    borderColor: COLORS.primary[500],
    borderWidth: 2,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm - 1,
    paddingVertical: SPACING.sm - 1,
  },
  vehicleChipText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    maxWidth: 160,
  },
  vehicleChipTextActive: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[700],
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
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
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  hintCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  hintTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  hintBody: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  hintBtnWrap: {
    alignSelf: 'flex-start',
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
  },
  hintBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  hintBtnText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.base.white,
  },
  footerHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default RegistrarViajeScreen;
