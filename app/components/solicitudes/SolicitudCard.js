import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSolicitudes } from '../../context/SolicitudesContext';
import CountdownTimer from '../common/CountdownTimer';
import { isSolicitudSinVehiculoEnCuenta } from '../../utils/solicitudVehicle';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

/** Estado → superficie legible sobre canvas claro */
const getEstadoSurfaceConfig = (estadoEfectivo) => {
  const configs = {
    creada: {
      color: COLORS.text.secondary,
      bg: COLORS.neutral.gray[100],
      border: COLORS.border.light,
      texto: 'Creada',
    },
    seleccionando_servicios: {
      color: COLORS.primary[700],
      bg: COLORS.primary[50],
      border: COLORS.primary[200],
      texto: 'Seleccionando',
    },
    publicada: {
      color: COLORS.primary[700],
      bg: COLORS.primary[50],
      border: COLORS.primary[200],
      texto: 'Publicada',
    },
    con_ofertas: {
      color: COLORS.warning[800],
      bg: COLORS.warning[50],
      border: COLORS.warning[200],
      texto: 'Con Ofertas',
    },
    pendiente_confirmacion: {
      color: COLORS.primary[700],
      bg: COLORS.primary[50],
      border: COLORS.primary[200],
      texto: 'Esperando confirmación',
    },
    esperando_creditos_proveedor: {
      color: COLORS.warning[800],
      bg: COLORS.warning[50],
      border: COLORS.warning[300],
      texto: 'Esperando proveedor',
    },
    adjudicada: {
      color: COLORS.success[800],
      bg: COLORS.success.light,
      border: COLORS.success[200],
      texto: 'Adjudicada',
    },
    pagada: {
      color: COLORS.success[800],
      bg: COLORS.success.light,
      border: COLORS.success[200],
      texto: 'Pagada',
    },
    pagada_parcialmente: {
      color: COLORS.warning[800],
      bg: COLORS.warning[50],
      border: COLORS.warning[200],
      texto: 'Pagada Parcialmente',
    },
    expirada: {
      color: COLORS.error[700],
      bg: COLORS.error[50],
      border: COLORS.error[200],
      texto: 'Expirada',
    },
    cancelada: {
      color: COLORS.error[700],
      bg: COLORS.error[50],
      border: COLORS.error[200],
      texto: 'Cancelada',
    },
    ofertas_adicionales_pendientes: {
      color: COLORS.warning[800],
      bg: COLORS.warning[50],
      border: COLORS.warning[200],
      texto: 'Ofertas adicionales',
    },
    en_ejecucion: {
      color: COLORS.primary[700],
      bg: COLORS.primary[50],
      border: COLORS.primary[200],
      texto: 'En Progreso',
    },
    completada: {
      color: COLORS.success[800],
      bg: COLORS.success.light,
      border: COLORS.success[200],
      texto: 'Completada',
    },
  };
  return configs[estadoEfectivo] || {
    color: COLORS.text.secondary,
    bg: COLORS.neutral.gray[100],
    border: COLORS.border.light,
    texto: estadoEfectivo,
  };
};

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

  const serviciosNombres = useMemo(() => {
    return solicitud.servicios_solicitados_detail
      ?.slice(0, 2)
      .map(s => s.nombre)
      .join(', ') || 'Sin servicios';
  }, [solicitud.servicios_solicitados_detail]);

  const fechaFormateada = useMemo(() => formatDate(solicitud.fecha_preferida), [solicitud.fecha_preferida]);
  const horaFormateada = useMemo(() =>
    solicitud.hora_preferida ? formatTime(solicitud.hora_preferida) : '',
    [solicitud.hora_preferida]);

  const getEstadoConfig = () => {
    const oferta = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
    const tienePagoParcial = oferta?.estado_pago_repuestos === 'pagado' &&
      oferta?.estado_pago_servicio === 'pendiente';

    let estadoEfectivo = solicitud.estado_efectivo ?? solicitud.estado;
    if (estadoEfectivo === 'pagada' && tienePagoParcial) {
      estadoEfectivo = 'pagada_parcialmente';
    }

    const base = getEstadoSurfaceConfig(estadoEfectivo);
    if (estadoEfectivo === 'ofertas_adicionales_pendientes' && solicitud.estado_display_efectivo) {
      return { ...base, texto: solicitud.estado_display_efectivo };
    }
    return base;
  };

  const estadoConfig = getEstadoConfig();

  const handlePress = () => {
    if (onPress) onPress(solicitud);
  };

  const estadoParaIcono = solicitud.estado_efectivo ?? solicitud.estado;
  const getEstadoIcon = () => {
    const iconMap = {
      creada: 'document-text',
      seleccionando_servicios: 'list',
      publicada: 'megaphone',
      con_ofertas: 'pricetags',
      pendiente_confirmacion: 'hourglass-outline',
      esperando_creditos_proveedor: 'hourglass-outline',
      adjudicada: 'checkmark-circle',
      ofertas_adicionales_pendientes: 'mail-unread',
      en_ejecucion: 'construct',
      completada: 'checkmark-done-circle',
      expirada: 'time',
      cancelada: 'close-circle',
    };
    return iconMap[estadoParaIcono] || 'document-text';
  };

  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.cardFullWidth]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.bg, borderColor: estadoConfig.border }]}>
        <Text style={[styles.estadoBadgeText, { color: estadoConfig.color }]}>{estadoConfig.texto}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { borderColor: estadoConfig.border }]}>
            <Ionicons name={getEstadoIcon()} size={24} color={estadoConfig.color} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {serviciosNombres}
              {solicitud.servicios_solicitados_detail?.length > 2 && '...'}
            </Text>
            {ofertasNuevasCount > 0 && (
              <View style={styles.ofertasNuevasBadge}>
                <Ionicons name="notifications" size={12} color={COLORS.text.inverse} />
                <Text style={styles.ofertasNuevasBadgeText}>{ofertasNuevasCount}</Text>
              </View>
            )}
          </View>
        </View>

        {(solicitud.vehiculo_info?.marca || solicitud.vehiculo_detail?.marca_nombre) ? (
          <View style={styles.vehicleBadgeContainer}>
            <View style={styles.vehicleBadge}>
              <Ionicons name="car-sport" size={14} color={COLORS.primary[600]} />
              <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                {solicitud.vehiculo_info?.marca || solicitud.vehiculo_detail?.marca_nombre}{' '}
                {solicitud.vehiculo_info?.modelo || solicitud.vehiculo_detail?.modelo_nombre || ''}
                {(solicitud.vehiculo_info?.year || solicitud.vehiculo_detail?.year) &&
                  ` ${solicitud.vehiculo_info?.year || solicitud.vehiculo_detail?.year}`}
              </Text>
            </View>
          </View>
        ) : isSolicitudSinVehiculoEnCuenta(solicitud) ? (
          <View style={styles.vehicleBadgeContainer}>
            <View style={[styles.vehicleBadge, styles.vehicleBadgeMuted]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary[600]} />
              <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                Sin vehículo en tu cuenta
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.infoText} numberOfLines={2}>
            {fechaFormateada}
            {horaFormateada && ` a las ${horaFormateada}`}
          </Text>
        </View>

        {solicitud.estado === 'esperando_creditos_proveedor' &&
          solicitud.fecha_limite_confirmacion_creditos && (
            <View style={styles.countdownContainer}>
              <CountdownTimer
                targetDate={solicitud.fecha_limite_confirmacion_creditos}
                type="solicitud"
                size="small"
              />
            </View>
          )}

        {solicitud.estado === 'publicada' &&
          solicitud.total_ofertas === 0 &&
          solicitud.fecha_expiracion && (
            <View style={styles.countdownContainer}>
              <CountdownTimer
                targetDate={solicitud.fecha_expiracion}
                type="solicitud"
                size="small"
              />
            </View>
          )}

        {(solicitud.estado === 'adjudicada' || solicitud.estado === 'pendiente_pago') &&
          solicitud.fecha_limite_pago && (
            <View style={styles.countdownContainer}>
              <CountdownTimer
                targetDate={solicitud.fecha_limite_pago}
                type="pago"
                size="small"
              />
            </View>
          )}

        {solicitud.total_ofertas > 0 && (
          <View style={styles.footer}>
            <View style={styles.infoBadge}>
              <Ionicons name="pricetags" size={14} color={COLORS.text.tertiary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {solicitud.total_ofertas} oferta{solicitud.total_ofertas !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 200,
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
    minHeight: 180,
  },
  estadoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    zIndex: 10,
    borderWidth: BORDERS.width.thin,
  },
  estadoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 42,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
    paddingTop: 2,
    position: 'relative',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 24,
    color: COLORS.text.primary,
  },
  ofertasNuevasBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error.main,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  ofertasNuevasBadgeText: {
    color: COLORS.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  vehicleBadgeContainer: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    gap: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.primary[50],
    maxWidth: 260,
  },
  vehicleBadgeMuted: {
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.neutral.gray[100],
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[800],
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '400',
    flex: 1,
    lineHeight: 20,
  },
  countdownContainer: {
    marginBottom: 8,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    paddingBottom: 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    gap: 4,
    flexShrink: 1,
    maxWidth: '45%',
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
});

export default SolicitudCard;
