import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * Card horizontal de alerta de mantenimiento
 * Diseño mejorado con colores destacados para alertas importantes
 * Usa el nuevo sistema de diseño con useTheme()
 */
const MaintenanceAlertCard = ({ alerta, vehicle, onPress }) => {
  const theme = useTheme();
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

  // Obtener colores según prioridad usando el nuevo sistema - Colores armoniosos y sutiles
  const getPriorityColors = (prioridad) => {
    if (prioridad >= 5) {
      // Crítica - Usar error del sistema pero más sutil
      return {
        background: colors.error?.[50] || '#FFEBEE',
        iconBg: colors.error?.[100] || '#FFD7D7',
        icon: colors.error?.[500] || '#FF6B6B',
        badge: colors.error?.[500] || '#FF6B6B',
        text: colors.text?.primary || '#00171F',
        actionBg: colors.error?.[500] || '#FF6B6B',
      };
    }
    if (prioridad >= 4) {
      // Alta - Usar warning del sistema
      return {
        background: colors.warning?.[50] || '#FFF8E6',
        iconBg: colors.warning?.[100] || '#FFF1CC',
        icon: colors.warning?.[500] || '#FFB84D',
        badge: colors.warning?.[500] || '#FFB84D',
        text: colors.text?.primary || '#00171F',
        actionBg: colors.warning?.[500] || '#FFB84D',
      };
    }
    if (prioridad >= 3) {
      // Media - Usar warning más claro
      return {
        background: colors.warning?.[50] || '#FFF8E6',
        iconBg: colors.warning?.[100] || '#FFF1CC',
        icon: colors.warning?.[400] || '#FFC733',
        badge: colors.warning?.[400] || '#FFC733',
        text: colors.text?.primary || '#00171F',
        actionBg: colors.warning?.[400] || '#FFC733',
      };
    }
    // Baja - Usar info/primary del sistema
    return {
      background: colors.info?.[50] || colors.primary?.[50] || '#E6F5F9',
      iconBg: colors.info?.[100] || colors.primary?.[100] || '#CCEBF3',
      icon: colors.info?.[500] || colors.primary?.[500] || '#007EA7',
      badge: colors.info?.[500] || colors.primary?.[500] || '#007EA7',
      text: colors.text?.primary || '#00171F',
      actionBg: colors.info?.[500] || colors.primary?.[500] || '#007EA7',
    };
  };

  const getPriorityIcon = (prioridad) => {
    if (prioridad >= 5) return 'warning';
    if (prioridad >= 4) return 'alert-circle';
    return 'information-circle';
  };

  const getPriorityLabel = (prioridad) => {
    if (prioridad >= 5) return 'CRÍTICA';
    if (prioridad >= 4) return 'ALTA';
    if (prioridad >= 3) return 'MEDIA';
    return 'BAJA';
  };

  const priorityColors = getPriorityColors(alerta.prioridad || 3);
  const priorityIcon = getPriorityIcon(alerta.prioridad || 3);
  const priorityLabel = getPriorityLabel(alerta.prioridad || 3);
  const componenteNombre = alerta.componente_salud_detail?.componente_config?.nombre || 
                          alerta.componente_salud_detail?.nombre || 
                          'Componente';

  const getVehicleDisplayName = () => {
    if (!vehicle) return '';
    const marca = vehicle.marca_nombre || vehicle.marca || '';
    const modelo = vehicle.modelo_nombre || vehicle.modelo || '';
    const year = vehicle.year ? `'${String(vehicle.year).slice(-2)}` : '';
    return `${marca} ${modelo} ${year}`.trim();
  };

  // Crear estilos dinámicos
  const styles = createStyles(colors, safeTypography, spacing, borders, priorityColors);

  return (
    <TouchableOpacity
      style={[styles.card, { 
        backgroundColor: priorityColors.background,
      }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Badge de prioridad - Esquina superior derecha */}
      <View style={[styles.priorityBadge, { backgroundColor: priorityColors.badge }]}>
        <Text style={styles.priorityBadgeText}>{priorityLabel}</Text>
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Header: Icono y título */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: priorityColors.iconBg }]}>
            <Ionicons name={priorityIcon} size={24} color={priorityColors.icon} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: priorityColors.text }]} numberOfLines={2}>
              {alerta.titulo || `${componenteNombre} requiere atención`}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {componenteNombre}
            </Text>
          </View>
        </View>

        {/* Descripción - Espaciado generoso */}
        {alerta.descripcion && (
          <Text style={styles.description} numberOfLines={2}>
            {alerta.descripcion}
          </Text>
        )}

        {/* Badge del vehículo - Destacado */}
        {vehicle && getVehicleDisplayName() && (
          <View style={styles.vehicleBadgeContainer}>
            <View style={[styles.vehicleBadge, { 
              backgroundColor: colors.primary?.[50] || '#E6F2F7',
              borderColor: colors.primary?.[300] || '#66B1D0',
            }]}>
              <Ionicons name="car-sport" size={14} color={colors.primary?.[500] || '#003459'} />
              <Text style={[styles.vehicleBadgeText, { color: colors.primary?.[600] || '#002A47' }]} numberOfLines={1}>
                {getVehicleDisplayName()}
              </Text>
            </View>
          </View>
        )}

        {/* Footer: Información adicional y acción */}
        <View style={styles.footer}>
          {alerta.componente_salud_detail?.salud_porcentaje !== undefined && (
            <View style={[styles.infoBadge, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
              <Ionicons name="heart-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.infoText} numberOfLines={1}>
                {Math.round(alerta.componente_salud_detail.salud_porcentaje)}% salud
              </Text>
            </View>
          )}
          
          {alerta.componente_salud_detail?.km_estimados_restantes !== undefined && 
           alerta.componente_salud_detail.km_estimados_restantes > 0 && (
            <View style={[styles.infoBadge, { backgroundColor: colors.background?.paper || '#FFFFFF' }]}>
              <Ionicons name="speedometer-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.infoText} numberOfLines={1}>
                {alerta.componente_salud_detail.km_estimados_restantes.toLocaleString()} km
              </Text>
            </View>
          )}

          {/* Enlace sutil en lugar de botón destacado */}
          <View style={styles.actionLink}>
            <Text style={[styles.actionLinkText, { color: colors.primary?.[500] || '#003459' }]}>
              Agendar
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={colors.primary?.[500] || '#003459'} 
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders, priorityColors) => StyleSheet.create({
  card: {
    width: 300, // Tamaño original
    borderRadius: borders.radius?.card?.md || 12,
    marginRight: spacing.md || 16,
    overflow: 'hidden',
    position: 'relative',
    // Sombra sutil y armoniosa
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityBadge: {
    position: 'absolute',
    top: spacing.md || 12,
    right: spacing.md || 12,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.badge?.sm || 6,
    zIndex: 10,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityBadgeText: {
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
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.lg || 20, // Espacio para el badge de prioridad
    paddingTop: spacing.xs || 2,
  },
  title: {
    fontSize: typography.fontSize?.lg || 18, // Aumentado de md (16) a lg (18)
    fontWeight: typography.fontWeight?.bold || '700',
    marginBottom: spacing.xs || 4,
    lineHeight: 24, // Aumentado proporcionalmente
    // Permitir 2 líneas para ver el título completo
  },
  subtitle: {
    fontSize: typography.fontSize?.sm || 13, // Aumentado de xs (12) a sm (13)
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    lineHeight: 18, // Aumentado proporcionalmente
  },
  description: {
    fontSize: typography.fontSize?.base || 14, // Aumentado de sm (13) a base (14)
    color: colors.text?.secondary || '#5D6F75',
    marginBottom: spacing.sm || 10, // Reducido de md (12) a sm (10)
    lineHeight: 20,
    paddingRight: spacing.lg || 20, // Espacio para no solaparse con el badge
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
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.semibold || '600',
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs || 6,
    marginTop: spacing.xs || 4,
    paddingTop: spacing.sm || 8, // Reducido de 10 a 8
    paddingBottom: spacing.xs || 2,
    borderTopWidth: 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#D7DFE3',
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
  infoText: {
    fontSize: typography.fontSize?.sm || 12, // Aumentado de xs (11) a sm (12)
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    flexShrink: 1,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: spacing.xs || 4,
    flexShrink: 0,
    paddingVertical: spacing.xs || 4,
  },
  actionLinkText: {
    fontSize: typography.fontSize?.sm || 13,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
});

export default MaintenanceAlertCard;
