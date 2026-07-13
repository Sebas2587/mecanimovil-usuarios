import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Icon from '../base/Icon/Icon';
import { Image } from 'expo-image';
import { useSolicitudes } from '../../context/SolicitudesContext';
import CountdownTimer from '../common/CountdownTimer';
import { isSolicitudSinVehiculoEnCuenta } from '../../utils/solicitudVehicle';
import { formatServiciosListaTexto, resolveServiciosSolicitud } from '../../utils/solicitudServicios';
import {
  resolveModalidadServicio,
  resolveUbicacionServicioTexto,
  getModalidadServicioIcon,
} from '../../utils/solicitudModalidadServicio';
import { resolveRepuestosServicioMeta } from '../../utils/solicitudRepuestosServicio';
import { resolveProveedorSolicitudResumen } from '../../utils/solicitudProveedorResumen';
import { COLORS, BORDERS, SHADOWS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { getEstadoSolicitudSurface } from '../../utils/solicitudEstadoDisplay';

function MetaLine({ icon, text, numberOfLines = 2 }) {
  if (!text) return null;
  return (
    <View style={styles.metaLine}>
      <Icon name={icon} size={14} color={COLORS.text.tertiary} />
      <Text style={styles.metaText} numberOfLines={numberOfLines}>
        {text}
      </Text>
    </View>
  );
}

function MetaChip({ icon, label }) {
  if (!label) return null;
  return (
    <View style={styles.metaChip}>
      {icon ? <Icon name={icon} size={12} color={COLORS.text.secondary} /> : null}
      <Text style={styles.metaChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ProveedorMetaRow({ proveedor }) {
  const fotoUrl = proveedor?.fotoUrl || null;

  if (!proveedor?.nombre) return null;

  return (
    <View style={styles.proveedorRow}>
      {fotoUrl ? (
        <Image source={{ uri: fotoUrl }} style={styles.proveedorAvatar} contentFit="cover" />
      ) : (
        <View style={styles.proveedorAvatarPlaceholder}>
          <Icon name="business-outline" size={16} color={COLORS.primary[600]} />
        </View>
      )}
      <View style={styles.proveedorTextWrap}>
        <Text style={styles.proveedorLabel}>{proveedor.label || 'Taller'}</Text>
        <Text style={styles.proveedorNombre} numberOfLines={1}>
          {proveedor.nombre}
        </Text>
      </View>
    </View>
  );
}

function VehiculoStripCompact({ solicitud, vehicleLabel }) {
  if (!vehicleLabel) return null;
  const sinVehiculo = isSolicitudSinVehiculoEnCuenta(solicitud);
  const v = solicitud.vehiculo_info || solicitud.vehiculo_detail;
  const patente = v?.patente;

  return (
    <View style={[styles.vehiculoStrip, sinVehiculo && styles.vehiculoStripMuted]}>
      <View style={styles.vehiculoIcon}>
        <Icon
          name={sinVehiculo ? 'shield-checkmark-outline' : 'car-sport-outline'}
          size={16}
          color={COLORS.primary[600]}
        />
      </View>
      <Text style={styles.vehiculoText} numberOfLines={1}>
        {vehicleLabel}
        {patente ? ` · ${patente}` : ''}
      </Text>
    </View>
  );
}

const SolicitudCard = ({ solicitud, onPress, fullWidth = false }) => {
  const { obtenerOfertasNuevasCountPorSolicitud } = useSolicitudes();
  const ofertasNuevasCount = obtenerOfertasNuevasCountPorSolicitud(solicitud.id);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha pendiente';
    const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha pendiente';
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return String(timeString).substring(0, 5);
  };

  const serviciosNombres = useMemo(
    () => formatServiciosListaTexto(resolveServiciosSolicitud(solicitud)),
    [solicitud],
  );

  const fechaFormateada = useMemo(() => formatDate(solicitud.fecha_preferida), [solicitud.fecha_preferida]);
  const horaFormateada = useMemo(
    () => formatTime(solicitud.hora_preferida),
    [solicitud.hora_preferida],
  );
  const cuandoTexto = horaFormateada
    ? `${fechaFormateada} · ${horaFormateada}`
    : fechaFormateada;

  const modalidadServicio = useMemo(() => resolveModalidadServicio(solicitud), [solicitud]);
  const repuestosMeta = useMemo(() => resolveRepuestosServicioMeta(solicitud), [solicitud]);
  const ubicacionTexto = useMemo(
    () => resolveUbicacionServicioTexto(solicitud, modalidadServicio),
    [solicitud, modalidadServicio],
  );
  const proveedorResumen = useMemo(() => resolveProveedorSolicitudResumen(solicitud), [solicitud]);

  const vehicleLabel = useMemo(() => {
    if (solicitud.vehiculo_info?.marca || solicitud.vehiculo_detail?.marca_nombre) {
      const marca = solicitud.vehiculo_info?.marca || solicitud.vehiculo_detail?.marca_nombre;
      const modelo = solicitud.vehiculo_info?.modelo || solicitud.vehiculo_detail?.modelo_nombre || '';
      const year = solicitud.vehiculo_info?.year || solicitud.vehiculo_detail?.year;
      return `${marca} ${modelo}${year ? ` ${year}` : ''}`.trim();
    }
    if (isSolicitudSinVehiculoEnCuenta(solicitud)) {
      return 'Sin vehículo en tu cuenta';
    }
    return null;
  }, [solicitud]);

  const estadoConfig = getEstadoSolicitudSurface(solicitud);
  const totalOfertas = solicitud.total_ofertas ?? 0;

  const handlePress = () => {
    if (onPress) onPress(solicitud);
  };

  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.cardFullWidth]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.headerBadges}>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: estadoConfig.bg, borderColor: estadoConfig.border },
            ]}
          >
            <Text style={[styles.estadoBadgeText, { color: estadoConfig.color }]} numberOfLines={2}>
              {estadoConfig.texto}
            </Text>
          </View>
          {totalOfertas > 0 ? (
            <View style={styles.ofertasChip}>
              <Icon name="pricetags-outline" size={12} color={COLORS.text.secondary} />
              <Text style={styles.ofertasChipText}>
                {totalOfertas} oferta{totalOfertas !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
          {ofertasNuevasCount > 0 ? (
            <View style={styles.ofertasNuevasBadge}>
              <Icon name="notifications" size={11} color={COLORS.text.inverse} />
              <Text style={styles.ofertasNuevasBadgeText}>{ofertasNuevasCount}</Text>
            </View>
          ) : null}
        </View>
        {solicitud.id ? (
          <Text style={styles.idText}>#{String(solicitud.id).slice(0, 8)}</Text>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {serviciosNombres}
      </Text>

      <VehiculoStripCompact solicitud={solicitud} vehicleLabel={vehicleLabel} />

      <View style={styles.metaBlock}>
        <MetaLine icon="calendar-outline" text={cuandoTexto} />

        <View style={styles.chipRow}>
          {modalidadServicio ? (
            <MetaChip
              icon={getModalidadServicioIcon(modalidadServicio)}
              label={modalidadServicio.label}
            />
          ) : null}
          <MetaChip icon="construct-outline" label={repuestosMeta.label} />
        </View>

        {proveedorResumen ? (
          <ProveedorMetaRow proveedor={proveedorResumen} />
        ) : null}

        {ubicacionTexto ? (
          <MetaLine icon="location-outline" text={ubicacionTexto} numberOfLines={2} />
        ) : null}
      </View>

      {solicitud.estado === 'esperando_creditos_proveedor'
        && solicitud.fecha_limite_confirmacion_creditos ? (
          <View style={styles.countdownContainer}>
            <CountdownTimer
              targetDate={solicitud.fecha_limite_confirmacion_creditos}
              type="solicitud"
              size="small"
            />
          </View>
        ) : null}

      {solicitud.estado === 'publicada'
        && solicitud.total_ofertas === 0
        && solicitud.fecha_expiracion ? (
          <View style={styles.countdownContainer}>
            <CountdownTimer
              targetDate={solicitud.fecha_expiracion}
              type="solicitud"
              size="small"
            />
          </View>
        ) : null}

      {(solicitud.estado === 'adjudicada' || solicitud.estado === 'pendiente_pago')
        && solicitud.fecha_limite_pago ? (
          <View style={styles.countdownContainer}>
            <CountdownTimer
              targetDate={solicitud.fecha_limite_pago}
              type="pago"
              size="small"
            />
          </View>
        ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: BORDERS.radius.card.lg,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  cardFullWidth: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerBadges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  estadoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.badge.md,
    borderWidth: BORDERS.width.thin,
    maxWidth: '100%',
  },
  estadoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: 16,
  },
  idText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  vehiculoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  vehiculoStripMuted: {
    opacity: 0.9,
  },
  vehiculoIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiculoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  metaBlock: {
    gap: SPACING.xs,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  metaText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: SPACING.xxs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.badge.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    maxWidth: '100%',
  },
  metaChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  proveedorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  proveedorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  proveedorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proveedorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  proveedorLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  proveedorNombre: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  ofertasChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.badge.md,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  ofertasChipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
  ofertasNuevasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error.main,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  ofertasNuevasBadgeText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  countdownContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
});

export default SolicitudCard;
