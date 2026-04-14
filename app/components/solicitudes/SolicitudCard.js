import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSolicitudes } from '../../context/SolicitudesContext';
import CountdownTimer from '../common/CountdownTimer';
import { isSolicitudSinVehiculoEnCuenta } from '../../utils/solicitudVehicle';

const GLASS_BG = Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';
const BLUR_I = Platform.OS === 'ios' ? 30 : 0;

/** Estado → colores para tema oscuro glass */
const getEstadoGlassConfig = (estadoEfectivo) => {
  const configs = {
    creada: { color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', texto: 'Creada' },
    seleccionando_servicios: { color: '#93C5FD', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)', texto: 'Seleccionando' },
    publicada: { color: '#93C5FD', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', texto: 'Publicada' },
    con_ofertas: { color: '#FCD34D', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', texto: 'Con Ofertas' },
    adjudicada: { color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', texto: 'Adjudicada' },
    pagada: { color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', texto: 'Pagada' },
    pagada_parcialmente: { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', texto: 'Pagada Parcialmente' },
    expirada: { color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', texto: 'Expirada' },
    cancelada: { color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', texto: 'Cancelada' },
    ofertas_adicionales_pendientes: { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', texto: 'Ofertas adicionales' },
    en_ejecucion: { color: '#93C5FD', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', texto: 'En Progreso' },
    completada: { color: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', texto: 'Completada' },
  };
  return configs[estadoEfectivo] || {
    color: 'rgba(255,255,255,0.6)',
    bg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.15)',
    texto: estadoEfectivo,
  };
};

const SolicitudCard = ({ solicitud, onPress, fullWidth = false }) => {
  const { obtenerOfertasNuevasCountPorSolicitud } = useSolicitudes();
  const ofertasNuevasCount = obtenerOfertasNuevasCountPorSolicitud(solicitud.id);

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    // Si el string está en formato YYYY-MM-DD, parsearlo manualmente para evitar
    // desfase de zona horaria (new Date('2026-03-31') → UTC midnight → día anterior en UTC-3).
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

    const base = getEstadoGlassConfig(estadoEfectivo);
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
      {Platform.OS === 'ios' && <BlurView intensity={BLUR_I} tint="dark" style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_BG }]} pointerEvents="none" />

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
                <Ionicons name="notifications" size={12} color="#FFFFFF" />
                <Text style={styles.ofertasNuevasBadgeText}>{ofertasNuevasCount}</Text>
              </View>
            )}
          </View>
        </View>

        {(solicitud.vehiculo_info?.marca || solicitud.vehiculo_detail?.marca_nombre) ? (
          <View style={styles.vehicleBadgeContainer}>
            <View style={styles.vehicleBadge}>
              <Ionicons name="car-sport" size={14} color="#93C5FD" />
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
              <Ionicons name="shield-checkmark-outline" size={14} color="#A5B4FC" />
              <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                Sin vehículo en tu cuenta
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.45)" />
          <Text style={styles.infoText} numberOfLines={2}>
            {fechaFormateada}
            {horaFormateada && ` a las ${horaFormateada}`}
          </Text>
        </View>

        {solicitud.estado === 'publicada' &&
          solicitud.total_ofertas === 0 &&
          solicitud.fecha_expiracion && (
            <View style={styles.countdownContainer}>
              <CountdownTimer
                targetDate={solicitud.fecha_expiracion}
                type="solicitud"
                size="small"
                dark
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
                dark
              />
            </View>
          )}

        {solicitud.total_ofertas > 0 && (
          <View style={styles.footer}>
            <View style={styles.infoBadge}>
              <Ionicons name="pricetags" size={14} color="rgba(255,255,255,0.5)" />
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
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    borderRadius: 8,
    zIndex: 10,
    borderWidth: 1,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
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
    color: '#FFFFFF',
  },
  ofertasNuevasBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  ofertasNuevasBadgeText: {
    color: '#FFFFFF',
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
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.3)',
    backgroundColor: 'rgba(99,102,241,0.12)',
    maxWidth: 260,
  },
  vehicleBadgeMuted: {
    borderColor: 'rgba(165,180,252,0.35)',
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E7FF',
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
    color: 'rgba(255,255,255,0.55)',
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
    borderRadius: 8,
    gap: 4,
    flexShrink: 1,
    maxWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});

export default SolicitudCard;
