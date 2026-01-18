import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useTheme } from '../../design-system/theme/useTheme';
import CountdownTimer from '../common/CountdownTimer';

/**
 * Card limpia y minimalista para mostrar un resumen de una solicitud de servicio
 * @param {Object} solicitud - Objeto con la información de la solicitud
 * @param {Function} onPress - Función que se ejecuta al presionar la card
 * @param {boolean} fullWidth - Si es true, la card ocupa el 100% del ancho disponible (para listas verticales)
 */
const SolicitudCard = ({ solicitud, onPress, fullWidth = false }) => {
  const { obtenerOfertasNuevasCountPorSolicitud } = useSolicitudes();
  const ofertasNuevasCount = obtenerOfertasNuevasCountPorSolicitud(solicitud.id);
  const theme = useTheme();
  
  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};
  
  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };
  
  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined') 
    ? borders 
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM
  };

  const serviciosNombres = useMemo(() => {
    return solicitud.servicios_solicitados_detail
      ?.slice(0, 2)
      .map(s => s.nombre)
      .join(', ') || 'Sin servicios';
  }, [solicitud.servicios_solicitados_detail]);

  const fechaFormateada = useMemo(() => {
    return formatDate(solicitud.fecha_preferida);
  }, [solicitud.fecha_preferida]);

  const horaFormateada = useMemo(() => {
    return solicitud.hora_preferida ? formatTime(solicitud.hora_preferida) : '';
  }, [solicitud.hora_preferida]);

  const getEstadoConfig = () => {
    // Verificar si tiene pago parcial basándose en la oferta seleccionada
    const oferta = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
    const tienePagoParcial = oferta?.estado_pago_repuestos === 'pagado' && 
                             oferta?.estado_pago_servicio === 'pendiente';
    
    // Si el estado es 'pagada' pero tiene pago parcial, tratarlo como 'pagada_parcialmente'
    const estadoEfectivo = (solicitud.estado === 'pagada' && tienePagoParcial) 
      ? 'pagada_parcialmente' 
      : solicitud.estado;
    
    const configs = {
      creada: { 
        color: colors.text?.secondary || '#5D6F75', 
        bgColor: colors.neutral?.gray?.[100] || '#F3F4F6',
        borderColor: colors.neutral?.gray?.[300] || '#D1D5DB',
        texto: 'Creada' 
      },
      seleccionando_servicios: { 
        color: colors.info?.[600] || colors.primary?.[600] || '#002A47', 
        bgColor: colors.info?.[50] || colors.primary?.[50] || '#E6F2F7',
        borderColor: colors.info?.[300] || colors.primary?.[300] || '#66B1D0',
        texto: 'Seleccionando' 
      },
      publicada: { 
        color: colors.primary?.[700] || '#001F2E', 
        bgColor: colors.primary?.[50] || '#E6F2F7',
        borderColor: colors.primary?.[300] || '#66B1D0',
        texto: 'Publicada' 
      },
      con_ofertas: { 
        color: colors.warning?.[700] || '#D97706', 
        bgColor: colors.warning?.[50] || '#FFFBEB',
        borderColor: colors.warning?.[300] || '#FCD34D',
        texto: 'Con Ofertas' 
      },
      adjudicada: { 
        color: colors.success?.[700] || '#047857', 
        bgColor: colors.success?.[50] || '#ECFDF5',
        borderColor: colors.success?.[300] || '#6EE7B7',
        texto: 'Adjudicada' 
      },
      pagada: {
        color: colors.success?.[700] || '#047857',
        bgColor: colors.success?.[50] || '#ECFDF5',
        borderColor: colors.success?.[300] || '#6EE7B7',
        texto: 'Pagada'
      },
      pagada_parcialmente: {
        color: colors.warning?.[700] || '#D97706',
        bgColor: colors.warning?.[50] || '#FFFBEB',
        borderColor: colors.warning?.[300] || '#FCD34D',
        texto: 'Pagada Parcialmente'
      },
      expirada: { 
        color: colors.error?.[700] || '#B91C1C', 
        bgColor: colors.error?.[50] || '#FEF2F2',
        borderColor: colors.error?.[300] || '#FCA5A5',
        texto: 'Expirada' 
      },
      cancelada: { 
        color: colors.error?.[700] || '#B91C1C', 
        bgColor: colors.error?.[50] || '#FEF2F2',
        borderColor: colors.error?.[300] || '#FCA5A5',
        texto: 'Cancelada' 
      }
    };
    return configs[estadoEfectivo] || { 
      color: colors.text?.secondary || '#5D6F75', 
      bgColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      borderColor: colors.neutral?.gray?.[300] || '#D1D5DB',
      texto: estadoEfectivo 
    };
  };

  const estadoConfig = getEstadoConfig();

  const handlePress = () => {
    if (onPress) {
      onPress(solicitud);
    }
  };

  // Obtener icono según estado
  const getEstadoIcon = () => {
    const iconMap = {
      creada: 'document-text',
      seleccionando_servicios: 'list',
      publicada: 'megaphone',
      con_ofertas: 'pricetags',
      adjudicada: 'checkmark-circle',
      expirada: 'time',
      cancelada: 'close-circle',
    };
    return iconMap[solicitud.estado] || 'document-text';
  };

  // Crear estilos dinámicos con el tema (usar safeBorders para consistencia)
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: estadoConfig.bgColor },
        fullWidth && styles.cardFullWidth
      ]}
      onPress={handlePress} 
      activeOpacity={0.85}
    >
      {/* Badge de estado - Esquina superior derecha (similar a MaintenanceAlertCard) */}
      <View style={[
        styles.estadoBadge,
        {
          backgroundColor: estadoConfig.borderColor,
        }
      ]}>
        <Text style={styles.estadoBadgeText}>
          {estadoConfig.texto}
        </Text>
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Header: Icono y título (similar a MaintenanceAlertCard) */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
            <Ionicons 
              name={getEstadoIcon()} 
              size={24} 
              color={estadoConfig.color} 
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text?.primary || '#00171F' }]} numberOfLines={2}>
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

        {/* Badge destacado del vehículo */}
        {solicitud.vehiculo_info?.marca && (
          <View style={styles.vehicleBadgeContainer}>
            <View style={[styles.vehicleBadge, { 
              backgroundColor: colors.primary?.[50] || '#E6F2F7',
              borderColor: colors.primary?.[300] || '#66B1D0',
            }]}>
              <Ionicons name="car-sport" size={14} color={colors.primary?.[500] || '#003459'} />
              <Text style={[styles.vehicleBadgeText, { color: colors.primary?.[600] || '#002A47' }]} numberOfLines={1}>
                {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                {solicitud.vehiculo_info.year && ` ${solicitud.vehiculo_info.year}`}
              </Text>
            </View>
          </View>
        )}

        {/* Información de fecha y hora */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
          <Text style={styles.infoText} numberOfLines={2}>
            {fechaFormateada}
            {horaFormateada && ` a las ${horaFormateada}`}
          </Text>
        </View>

        {/* Contador regresivo para solicitudes sin ofertas (48h) */}
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

        {/* Contador regresivo para ofertas adjudicadas sin pago */}
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

        {/* Footer: Información adicional */}
        {solicitud.total_ofertas > 0 && (
          <View style={styles.footer}>
            <View style={[styles.infoBadge, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
              <Ionicons name="pricetags" size={14} color={colors.text?.secondary || '#5D6F75'} />
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

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  card: {
    width: 300, // Mismo ancho que MaintenanceAlertCard (para scroll horizontal)
    borderRadius: borders.radius?.card?.md || 12,
    marginRight: spacing.md || 16, // Margin para scroll horizontal
    overflow: 'hidden',
    position: 'relative',
    // Sombra sutil y armoniosa (igual que MaintenanceAlertCard)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardFullWidth: {
    width: '100%', // Para listas verticales
    marginRight: 0, // Sin margin en listas verticales
  },
  estadoBadge: {
    position: 'absolute',
    top: spacing.md || 12,
    right: spacing.md || 12,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.badge?.sm || 6,
    zIndex: 10,
    // Sombra sutil (igual que MaintenanceAlertCard)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  estadoBadgeText: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.bold || '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md || 14,
    paddingTop: 42, // Espacio optimizado para el badge
    paddingBottom: spacing.sm || 10, // Padding inferior optimizado
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm || 10, // Espaciado reducido
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borders.radius?.avatar?.md || 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm || 12,
    // Sombra sutil (igual que MaintenanceAlertCard)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.lg || 20, // Espacio para el badge de estado
    paddingTop: spacing.xs || 2,
    position: 'relative',
  },
  title: {
    fontSize: typography.fontSize?.lg || 18, // Aumentado de md (16) a lg (18)
    fontWeight: typography.fontWeight?.bold || '700',
    marginBottom: spacing.xs || 4,
    lineHeight: 24, // Aumentado proporcionalmente
  },
  ofertasNuevasBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error?.[500] || '#EF4444',
    borderRadius: borders.radius?.badge?.full || 12,
    paddingHorizontal: spacing.xs || 6,
    paddingVertical: 2,
    gap: spacing.xs || 4,
    shadowColor: colors.error?.[500] || '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  ofertasNuevasBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  vehicleBadgeContainer: {
    marginBottom: spacing.sm || 10, // Reducido de md (12) a sm (10)
    alignSelf: 'flex-start',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.button?.sm || 6,
    gap: spacing.xs || 4,
    borderWidth: 1,
    maxWidth: 260,
  },
  vehicleBadgeText: {
    fontSize: typography.fontSize?.sm || 12, // Aumentado de xs (11) a sm (12)
    fontWeight: typography.fontWeight?.semibold || '600',
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
    marginBottom: spacing.sm || 10,
  },
  infoText: {
    fontSize: typography.fontSize?.base || 14, // Aumentado de sm (13) a base (14)
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
    flex: 1,
    lineHeight: 20, // Aumentado proporcionalmente
  },
  countdownContainer: {
    marginBottom: spacing.sm || 8, // Reducido de 10 a 8
    marginTop: spacing.xs || 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs || 6,
    marginTop: spacing.xs || 4,
    paddingTop: spacing.sm || 8,
    paddingBottom: spacing.xs || 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.button?.sm || 6,
    gap: spacing.xs || 4,
    flexShrink: 1,
    maxWidth: '45%',
    backgroundColor: colors.background?.paper || '#FFFFFF',
  },
});

export default SolicitudCard;

