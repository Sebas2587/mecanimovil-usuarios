import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const { width } = Dimensions.get('window');

const NearbyMecanicoCard = ({ mecanico, onPress }) => {
  const theme = useTheme();
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Formatear calificación - verificar múltiples campos posibles
  // El backend devuelve: calificacion_promedio, numero_de_calificaciones, total_resenas
  const calificacion = parseFloat(
    mecanico?.calificacion_promedio ||
    mecanico?.rating ||
    mecanico?.calificacion ||
    0
  );
  const totalResenas = mecanico?.total_resenas !== undefined && mecanico?.total_resenas !== null
    ? mecanico.total_resenas
    : (mecanico?.numero_de_calificaciones !== undefined && mecanico?.numero_de_calificaciones !== null
      ? mecanico.numero_de_calificaciones
      : (mecanico?.total_reviews || mecanico?.reviews_count || 0));

  // Crear estilos dinámicos
  const styles = createStyles(colors, safeTypography, spacing, borders);

  // Obtener foto del mecánico o placeholder (prefiere usuario.foto_perfil)
  const getFotoMecanico = () => {
    const fotoUsuario = mecanico?.usuario?.foto_perfil;
    const fotoProveedor = mecanico?.foto_perfil;
    const url = fotoUsuario || fotoProveedor;

    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      return { uri: url };
    }
    return null;
  };

  // Obtener distancia formateada
  const obtenerDistancia = () => {
    if (mecanico.distance !== undefined && mecanico.distance !== null) {
      const distanciaKm = mecanico.distance;

      if (distanciaKm < 0.1) {
        return "< 100m";
      } else if (distanciaKm < 1) {
        return `${Math.round(distanciaKm * 1000)}m`;
      } else if (distanciaKm < 10) {
        return `${distanciaKm.toFixed(1)}km`;
      } else {
        return `${Math.round(distanciaKm)}km`;
      }
    }

    if (mecanico.distanciaFormateada) {
      return mecanico.distanciaFormateada;
    }

    if (mecanico.distancia) {
      return `${mecanico.distancia.toFixed(1)}km`;
    }

    return 'Distancia no disponible';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(mecanico)}
      activeOpacity={0.8}
    >
      {/* Imagen del mecánico - Proporción Airbnb 4:3 (180x135px) */}
      <View style={styles.imageContainer}>
        {getFotoMecanico() ? (
          <Image
            source={getFotoMecanico()}
            style={styles.mecanicoImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="person" size={36} color={colors.text?.secondary || '#5D6F75'} />
          </View>
        )}

        {/* Badge "A domicilio" flotante con glass effect */}
        <BlurView intensity={20} style={styles.domicilioBadge}>
          <Text style={styles.domicilioText}>
            A domicilio
          </Text>
        </BlurView>

        {/* Indicador de estado de conexión - solo cuando está conectado */}
        {mecanico?.esta_conectado && (
          <View style={styles.connectionIndicator}>
            <Ionicons
              name="checkmark"
              size={8}
              color="#FFFFFF"
            />
          </View>
        )}
      </View>

      {/* Información del mecánico */}
      <View style={styles.infoContainer}>
        {/* Nombre del mecánico */}
        <Text style={styles.mecanicoName} numberOfLines={1} ellipsizeMode="tail">
          {mecanico?.nombre || 'Mecánico'}
        </Text>

        {/* Fila de distancia y calificación */}
        <View style={styles.bottomRow}>
          <Text style={styles.distanceText}>
            {obtenerDistancia()}
          </Text>

          {/* Calificación - Siempre mostrar */}
          <View style={styles.ratingContainer}>
            {calificacion > 0 ? (
              <>
                <Ionicons name="star" size={14} color={colors.warning?.[500] || '#F59E0B'} />
                <Text style={styles.ratingText}>
                  {calificacion.toFixed(1)}
                </Text>
                {totalResenas > 0 && (
                  <Text style={styles.reviewsCount}>
                    ({totalResenas})
                  </Text>
                )}
              </>
            ) : totalResenas > 0 ? (
              <>
                <Ionicons name="star-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
                <Text style={styles.ratingText}>
                  ({totalResenas})
                </Text>
              </>
            ) : (
              <Text style={styles.newProviderText}>Nuevo</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};


// Función para crear estilos dinámicos
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    marginBottom: spacing.sm || 8,
    borderRadius: borders.radius?.card?.md || 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    position: 'relative',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  mecanicoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borders.radius?.card?.md || 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderRadius: borders.radius?.card?.md || 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domicilioBadge: {
    position: 'absolute',
    top: spacing.sm || 8,
    left: spacing.sm || 8,
    borderRadius: borders.radius?.badge?.md || 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 4,
    maxWidth: 100,
  },
  domicilioText: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
  },
  connectionIndicator: {
    position: 'absolute',
    top: spacing.sm || 8,
    right: spacing.sm || 8,
    width: 16,
    height: 16,
    borderRadius: borders.radius?.full || 9999,
    backgroundColor: colors.success?.[500] || '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  infoContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm || 8,
    paddingTop: 0,
  },
  mecanicoName: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: 0,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.1 : 15.4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
  },
  distanceText: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.secondary || '#5D6F75',
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 4,
    marginLeft: spacing.xs || 4,
  },
  ratingText: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  reviewsCount: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
    marginLeft: spacing.xs || 2,
  },
  newProviderText: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
    fontStyle: 'italic',
  },
});

export default NearbyMecanicoCard; 