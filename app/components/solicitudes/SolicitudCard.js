import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSolicitudes } from '../../context/SolicitudesContext';
import CountdownTimer from '../common/CountdownTimer';
import { isSolicitudSinVehiculoEnCuenta } from '../../utils/solicitudVehicle';
import { formatServiciosListaTexto, resolveServiciosSolicitud } from '../../utils/solicitudServicios';
import {
  resolveModalidadServicio,
  resolveUbicacionServicioTexto,
  getModalidadServicioIcon,
} from '../../utils/solicitudModalidadServicio';
import {
  resolveRepuestosServicioMeta,
  getRepuestosServicioIcon,
} from '../../utils/solicitudRepuestosServicio';
import { COLORS, BORDERS, SHADOWS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { getEstadoSolicitudSurface } from '../../utils/solicitudEstadoDisplay';

const SolicitudCard = ({ solicitud, onPress, fullWidth = false }) => {
  const { obtenerOfertasNuevasCountPorSolicitud } = useSolicitudes();
  const ofertasNuevasCount = obtenerOfertasNuevasCountPorSolicitud(solicitud.id);

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No especificada';
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const serviciosNombres = useMemo(
    () => formatServiciosListaTexto(resolveServiciosSolicitud(solicitud)),
    [solicitud],
  );

  const fechaFormateada = useMemo(() => formatDate(solicitud.fecha_preferida), [solicitud.fecha_preferida]);
  const horaFormateada = useMemo(
    () => (solicitud.hora_preferida ? formatTime(solicitud.hora_preferida) : ''),
    [solicitud.hora_preferida],
  );

  const modalidadServicio = useMemo(() => resolveModalidadServicio(solicitud), [solicitud]);
  const repuestosMeta = useMemo(() => resolveRepuestosServicioMeta(solicitud), [solicitud]);
  const ubicacionTexto = useMemo(
    () => resolveUbicacionServicioTexto(solicitud, modalidadServicio),
    [solicitud, modalidadServicio],
  );

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

  const handlePress = () => {
    if (onPress) onPress(solicitud);
  };

  const totalOfertas = solicitud.total_ofertas ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.cardFullWidth]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <View style={styles.titleLine}>
              <Text style={styles.title} numberOfLines={2}>
                {serviciosNombres}
              </Text>
              {totalOfertas > 0 ? (
                <View style={styles.ofertasChip}>
                  <Ionicons name="pricetags-outline" size={12} color={COLORS.text.secondary} />
                  <Text style={styles.ofertasChipText}>
                    {totalOfertas} oferta{totalOfertas !== 1 ? 's' : ''}
                  </Text>
                </View>
              ) : null}
              {ofertasNuevasCount > 0 ? (
                <View style={styles.ofertasNuevasBadge}>
                  <Ionicons name="notifications" size={11} color={COLORS.text.inverse} />
                  <Text style={styles.ofertasNuevasBadgeText}>{ofertasNuevasCount}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {vehicleLabel ? (
            <View style={[styles.vehicleBadge, isSolicitudSinVehiculoEnCuenta(solicitud) && styles.vehicleBadgeMuted]}>
              <Ionicons
                name={isSolicitudSinVehiculoEnCuenta(solicitud) ? 'shield-checkmark-outline' : 'car-sport-outline'}
                size={13}
                color={COLORS.text.secondary}
              />
              <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                {vehicleLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.text.tertiary} />
            <Text style={styles.infoText} numberOfLines={2}>
              {fechaFormateada}
              {horaFormateada ? ` a las ${horaFormateada}` : ''}
            </Text>
          </View>

          {modalidadServicio ? (
            <View style={styles.infoRow}>
              <Ionicons
                name={getModalidadServicioIcon(modalidadServicio)}
                size={14}
                color={COLORS.text.tertiary}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {modalidadServicio.label}
              </Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons
              name={getRepuestosServicioIcon(repuestosMeta.incluye)}
              size={14}
              color={COLORS.text.tertiary}
            />
            <Text style={styles.infoText} numberOfLines={1}>
              {repuestosMeta.label}
            </Text>
          </View>

          {modalidadServicio ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.text.tertiary} />
              <Text style={styles.infoText} numberOfLines={2}>
                {ubicacionTexto}
              </Text>
            </View>
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

        <View style={styles.footerRow}>
          <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.bg, borderColor: estadoConfig.border }]}>
            <Text style={[styles.estadoBadgeText, { color: estadoConfig.color }]}>{estadoConfig.texto}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 160,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.sm,
  },
  cardFullWidth: {
    width: '100%',
    minHeight: 150,
  },
  estadoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    maxWidth: '100%',
  },
  estadoBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.xs,
  },
  titleLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    lineHeight: TYPOGRAPHY.styles.h3.fontSize * TYPOGRAPHY.styles.h3.lineHeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  ofertasChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    flexShrink: 0,
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
    flexShrink: 0,
  },
  ofertasNuevasBadgeText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    gap: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.neutral.gray[50],
    maxWidth: 180,
    flexShrink: 0,
  },
  vehicleBadgeMuted: {
    backgroundColor: COLORS.neutral.gray[100],
  },
  vehicleBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    flexShrink: 1,
  },
  metaSection: {
    gap: SPACING.xxs,
    paddingTop: SPACING.xxs,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    flex: 1,
    lineHeight: 18,
  },
  countdownContainer: {
    marginTop: SPACING.xs,
  },
});

export default SolicitudCard;
