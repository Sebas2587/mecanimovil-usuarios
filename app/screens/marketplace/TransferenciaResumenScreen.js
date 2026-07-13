import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppHeader from '../../components/navigation/AppHeader';
import TransferCard from '../../components/cards/TransferCard';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING } from '../../design-system/tokens';

const TRANSFER_ITEMS = [
  'Historial de servicios y mantenciones',
  'Estado de salud del vehículo',
  'Kilometraje y viajes registrados',
  'Documentos y datos técnicos asociados',
];

/**
 * Resumen Focus antes del QR — spec vehicle-transfer.
 * Vendedor genera QR; comprador puede escanear desde aquí también.
 */
const TransferenciaResumenScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { vehicle, vehicleId } = route.params || {};

  const resolvedId = vehicleId || vehicle?.id;
  const vehicleName = useMemo(() => {
    if (!vehicle) return 'Tu vehículo';
    const marca = vehicle.marca?.nombre || vehicle.marca_nombre || vehicle.marca || '';
    const modelo = vehicle.modelo?.nombre || vehicle.modelo_nombre || vehicle.modelo || '';
    const year = vehicle.year || '';
    const base = [marca, modelo].filter(Boolean).join(' ');
    return year ? `${base} ${year}`.trim() : base || 'Tu vehículo';
  }, [vehicle]);

  const handleStartTransfer = useCallback(() => {
    if (!resolvedId) return;
    navigation.navigate(ROUTES.TRANSFERENCIA_VENDEDOR, {
      vehicleId: resolvedId,
      vehicle,
    });
  }, [navigation, resolvedId, vehicle]);

  const handleScanQR = useCallback(() => {
    navigation.navigate(ROUTES.TRANSFERENCIA_COMPRADOR);
  }, [navigation]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
      <AppHeader title="Transferir vehículo" onBack={handleBack} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[TYPOGRAPHY.styles.h2, styles.title]}>
          Traspaso del historial
        </Text>
        <Text style={[TYPOGRAPHY.styles.body, styles.subtitle]}>
          El auto se vende por fuera de Mecanimovil. Aquí solo traspasas el
          registro digital para que el nuevo dueño conserve historial y salud.
        </Text>

        <TransferCard
          vehicleName={vehicleName}
          items={TRANSFER_ITEMS}
          onStartTransfer={resolvedId ? handleStartTransfer : undefined}
          onScanQR={handleScanQR}
        />

        <Text style={[TYPOGRAPHY.styles.caption, styles.legal]}>
          Esto no reemplaza el trámite legal de dominio ni inscripción en el
          Registro Civil.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  focusRoot: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scroll: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  title: {
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  legal: {
    color: COLORS.text.tertiary,
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
});

export default TransferenciaResumenScreen;
