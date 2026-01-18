import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * Card simple y minimalista para mostrar servicios en listas
 * Diseño vertical compacto para usar en FlatLists
 */
const SimpleServiceCard = ({ service, onPress }) => {
  const { colors, typography, spacing, borders } = useTheme();

  // Validación de datos de entrada
  if (!service) {
    console.warn('⚠️ SimpleServiceCard: No se proporcionó servicio');
    return null;
  }

  // Extraer información del servicio de manera segura
  const nombre = service.nombre || service.servicio_info?.nombre || 'Servicio sin nombre';
  const descripcion = service.descripcion || service.servicio_info?.descripcion || '';

  // Obtener icono según tipo de servicio
  const getServiceIcon = () => {
    try {
      const tipoServicio = service.tipo_servicio || service.servicio_info?.tipo_servicio;
      
      if (tipoServicio === 'con_repuestos') {
        return 'construct';
      } else if (tipoServicio === 'sin_repuestos') {
        return 'build';
      }
      
      // Iconos por categoría si está disponible
      if (service.categoria_nombre) {
        const categoria = service.categoria_nombre.toLowerCase();
        if (categoria.includes('aceite')) return 'water';
        if (categoria.includes('frenos')) return 'warning';
        if (categoria.includes('aire')) return 'snow';
        if (categoria.includes('motor')) return 'speedometer';
        if (categoria.includes('eléctric')) return 'flash';
      }
      
      return 'construct-outline';
    } catch (error) {
      console.warn('⚠️ Error obteniendo icono del servicio:', error);
      return 'construct-outline';
    }
  };

  // Obtener badge de tipo de servicio
  const getTipoServicioBadge = () => {
    const tipoServicio = service.tipo_servicio || service.servicio_info?.tipo_servicio;
    if (tipoServicio === 'con_repuestos') {
      return 'Incluye repuestos';
    } else if (tipoServicio === 'sin_repuestos') {
      return 'Solo mano de obra';
    }
    return null;
  };

  // Manejar press con validación
  const handlePress = () => {
    try {
      if (onPress && typeof onPress === 'function') {
        console.log('📋 SimpleServiceCard: Servicio seleccionado:', nombre);
        onPress(service);
      } else {
        console.warn('⚠️ SimpleServiceCard: onPress no es una función válida');
      }
    } catch (error) {
      console.error('❌ Error en SimpleServiceCard.handlePress:', error);
    }
  };

  const tipoBadge = getTipoServicioBadge();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.background?.paper || '#FFFFFF',
      borderRadius: borders.radius?.card?.md || 12,
      padding: spacing?.md || 16,
      marginBottom: spacing?.sm || 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.base?.inkBlack || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: borders.width?.thin || 1,
      borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: borders.radius?.full || 26,
      backgroundColor: colors.primary?.[50] || '#E6F2F7',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing?.md || 16,
    },
    contentContainer: {
      flex: 1,
      minWidth: 0,
    },
    serviceName: {
      fontSize: typography.fontSize?.md || 16,
      fontWeight: typography.fontWeight?.semibold || '600',
      color: colors.text?.primary || '#00171F',
      marginBottom: spacing?.xs || 4,
      lineHeight: 22,
    },
    serviceDescription: {
      fontSize: typography.fontSize?.sm || 14,
      color: colors.text?.secondary || '#5D6F75',
      marginBottom: spacing?.xs || 4,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing?.xs || 4,
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary?.[50] || '#E6F2F7',
      paddingHorizontal: spacing?.sm || 8,
      paddingVertical: spacing?.xs || 4,
      borderRadius: borders.radius?.full || 12,
    },
    badgeText: {
      fontSize: typography.fontSize?.xs || 12,
      color: colors.primary?.[700] || '#003459',
      fontWeight: typography.fontWeight?.medium || '500',
      marginLeft: spacing?.xs || 4,
    },
    chevronContainer: {
      width: 32,
      height: 32,
      borderRadius: borders.radius?.full || 16,
      backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing?.sm || 8,
    },
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getServiceIcon()} 
          size={26} 
          color={colors.primary?.[500] || '#003459'} 
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.serviceName} numberOfLines={2}>
          {nombre}
        </Text>

        {descripcion ? (
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {descripcion}
          </Text>
        ) : null}

        {tipoBadge && (
          <View style={styles.footer}>
            <View style={styles.badgeContainer}>
              <Ionicons 
                name={service.tipo_servicio === 'con_repuestos' ? 'cube-outline' : 'hand-left-outline'} 
                size={14} 
                color={colors.primary?.[700] || '#003459'} 
              />
              <Text style={styles.badgeText}>{tipoBadge}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.chevronContainer}>
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={colors.text?.secondary || '#5D6F75'} 
        />
      </View>
    </TouchableOpacity>
  );
};

export default SimpleServiceCard;
