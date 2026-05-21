import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Wrench } from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import {
  catalogoIncluyeRepuestos,
  formatPrecioCatalogoServicio,
  resolvePrecioTotalCatalogo,
} from '../home/shared/providerCatalogSchedule';
import { buildProviderAvatarUri, getProviderRating } from '../../utils/providerUtils';

/**
 * Resumen compacto proveedor + servicio de catálogo (paso 1 nueva solicitud).
 * Sin desglose IVA: el detalle de pago va en pasos posteriores.
 */
export default function SolicitudCatalogContextBanner({ proveedor, servicio, tipoProveedor }) {
  const conRepuestos = catalogoIncluyeRepuestos(servicio);
  const aDomicilio = tipoProveedor === 'mecanico';
  const total = useMemo(
    () => resolvePrecioTotalCatalogo(servicio, { conRepuestos }),
    [servicio, conRepuestos],
  );
  const precioLabel = formatPrecioCatalogoServicio(servicio, { conRepuestos });

  if (!proveedor || !servicio) return null;

  const nombreProveedor = proveedor.nombre || proveedor.nombre_comercial || 'Proveedor';
  const avatarUri = buildProviderAvatarUri(proveedor);
  const ratingRaw = getProviderRating(proveedor);
  const ratingNum =
    ratingRaw != null && ratingRaw !== ''
      ? parseFloat(String(ratingRaw).replace(',', '.'))
      : NaN;
  const ratingLabel =
    Number.isFinite(ratingNum) && ratingNum > 0 ? `${ratingNum.toFixed(1)} ★` : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Agendando con</Text>
      <View style={styles.row}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPh]}>
            <Wrench size={20} color={COLORS.primary[500]} />
          </View>
        )}
        <View style={styles.main}>
          <Text style={styles.proveedor} numberOfLines={1}>
            {nombreProveedor}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={COLORS.text.tertiary} />
            <Text style={styles.meta}>
              {aDomicilio ? 'A domicilio' : 'Taller'}
              {ratingLabel ? ` · ${ratingLabel}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.servicioRow}>
        <View style={styles.servicioText}>
          <Text style={styles.servicioNombre} numberOfLines={2}>
            {servicio.nombre || 'Servicio'}
          </Text>
          {servicio.duracion_estimada ? (
            <Text style={styles.duracion}>{servicio.duracion_estimada}</Text>
          ) : null}
        </View>
        <View style={styles.precioCol}>
          <Text style={styles.precio}>{precioLabel || (total > 0 ? `$${Math.round(total).toLocaleString('es-CL')}` : '—')}</Text>
          <Text style={styles.repuestosHint}>
            {conRepuestos ? 'Con repuestos' : 'Solo mano de obra'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  kicker: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPh: {
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  proveedor: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  meta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
  },
  servicioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  servicioText: {
    flex: 1,
    minWidth: 0,
  },
  servicioNombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  duracion: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  precioCol: {
    alignItems: 'flex-end',
    maxWidth: '42%',
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    fontVariant: ['tabular-nums'],
  },
  repuestosHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
    textAlign: 'right',
  },
});
