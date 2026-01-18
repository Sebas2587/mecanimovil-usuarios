import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

// Mapeo de categorías a imágenes locales
// Las imágenes deben estar en assets/images/
// IMPORTANTE: Solo agregar imágenes que realmente existen, de lo contrario la app puede crashear
const getCategoryImage = (categoryId, categoryName) => {
  // Mapeo por ID de categoría
  const imagesById = {
    9: require('../../../assets/images/afinaciones.jpg'), // Afinaciones
    // Agregar más categorías aquí según se vayan añadiendo imágenes
  };

  // Mapeo alternativo por nombre de categoría (case-insensitive)
  const imagesByName = {
    'afinaciones': require('../../../assets/images/afinaciones.jpg'),
    'aire acondicionado': require('../../../assets/images/aire acondicionado.jpg'),
    'sistema de frenos': require('../../../assets/images/sistema de frenos.jpg'),
    'mantenimiento preventivo': require('../../../assets/images/afinaciones.jpg'),
    // Agregar más categorías aquí según se vayan añadiendo imágenes
  };

  // Intentar por ID primero
  if (categoryId && imagesById[categoryId]) {
    return imagesById[categoryId];
  }

  // Intentar por nombre
  if (categoryName) {
    const nombreNormalizado = categoryName.toLowerCase().trim();
    if (imagesByName[nombreNormalizado]) {
      return imagesByName[nombreNormalizado];
    }
  }

  return null;
};

/**
 * Componente de tarjeta para categorías con diseño compacto estilo Uber Eats
 * Muestra ícono circular arriba y nombre de categoría abajo
 * 
 * @param {Object} props
 * @param {Object} props.category - Objeto de categoría con id, nombre, descripcion, icono, imagen_url
 * @param {Function} props.onPress - Callback al presionar la tarjeta
 */
const CategoryGridCard = ({ category, onPress }) => {
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

  // Obtener imagen o ícono
  const getImageSource = () => {
    // 1. Prioridad: URL de imagen del backend (si existe)
    if (category.imagen_url) {
      if (typeof category.imagen_url === 'string' &&
        (category.imagen_url.startsWith('http://') || category.imagen_url.startsWith('https://'))) {
        return { uri: category.imagen_url };
      }
    }

    // 2. Prioridad: Imagen local (por ID o nombre)
    const localImage = getCategoryImage(category.id, category.nombre);
    if (localImage) {
      return localImage;
    }

    // Si no hay imagen válida, retornar null para mostrar icono
    return null;
  };

  // Obtener color de fondo suave basado en el ID de la categoría usando el sistema de diseño
  const getBackgroundColor = () => {
    const colorPalette = [
      colors.primary?.[50] || '#E6F2F7', // Primary 50
      colors.accent?.[50] || '#E6F7FF', // Accent 50
      colors.primary?.[100] || '#CCE5EF', // Primary 100
      colors.accent?.[100] || '#CCEFFF', // Accent 100
      colors.neutral?.gray?.[50] || '#F8F9FA', // Gray 50
      colors.primary?.[50] || '#E6F2F7', // Primary 50 (repeat)
      colors.accent?.[50] || '#E6F7FF', // Accent 50 (repeat)
      colors.neutral?.gray?.[100] || '#F3F4F6', // Gray 100
    ];
    return colorPalette[category.id % colorPalette.length];
  };

  // Obtener color del ícono basado en el sistema de diseño
  const getIconColor = () => {
    const colorPalette = [
      colors.primary?.[500] || '#003459', // Primary 500
      colors.accent?.[500] || '#00A8E8', // Accent 500
      colors.primary?.[600] || '#002A47', // Primary 600
      colors.accent?.[600] || '#0087B8', // Accent 600
      colors.primary?.[500] || '#003459', // Primary 500 (repeat)
      colors.accent?.[500] || '#00A8E8', // Accent 500 (repeat)
      colors.primary?.[600] || '#002A47', // Primary 600 (repeat)
      colors.accent?.[600] || '#0087B8', // Accent 600 (repeat)
    ];
    return colorPalette[category.id % colorPalette.length];
  };

  const imageSource = getImageSource();
  const backgroundColor = getBackgroundColor();
  const iconColor = getIconColor();

  // Crear estilos dinámicos
  const styles = createStyles(colors, safeTypography, spacing, borders);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(category)}
      activeOpacity={0.7}
    >
      {/* Contenedor fijo para la imagen/ícono */}
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <View style={styles.imageContainer}>
            <Image
              source={imageSource}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor }]}>
            <Ionicons
              name={category.icono || 'construct-outline'}
              size={32}
              color={iconColor}
            />
          </View>
        )}
      </View>

      {/* Nombre de la categoría - puede hacer wrap sin afectar la imagen */}
      <Text
        style={styles.categoryName}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {category.nombre}
      </Text>
    </TouchableOpacity>
  );
};

// Función para crear estilos dinámicos
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 100, // Aumentado de 90 a 100 para dar más espacio
    marginRight: spacing.md || 16,
    paddingVertical: 0, // Sin padding vertical para evitar espacios innecesarios
  },
  imageWrapper: {
    width: 88, // Ancho fijo igual al imageContainer
    height: 88, // Altura fija para la imagen
    marginBottom: spacing.xs || 6,
    // Este contenedor mantiene la posición fija de la imagen
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: borders.radius?.avatar?.md || 34,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom eliminado porque ahora está en imageWrapper
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 88, // Tamaño fijo del contenedor
    height: 88, // Tamaño fijo del contenedor
    backgroundColor: colors.background?.paper || '#FFFFFF', // Fondo blanco para la imagen
    borderRadius: borders.radius?.md || 12, // Bordes redondeados
    // Sin sombra según solicitud del usuario
    // Sin borde según solicitud del usuario
    // Asegurar que el contenedor tenga un tamaño fijo y que las imágenes se ajusten
    overflow: 'hidden',
  },
  image: {
    width: 88, // Mismo tamaño que el contenedor
    height: 88, // Mismo tamaño que el contenedor
    // resizeMode cover para que todas las imágenes ocupen el mismo espacio
  },
  categoryName: {
    fontSize: typography.fontSize?.sm || 13, // Aumentado de xs (12) a sm (13)
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.primary || '#00171F',
    textAlign: 'center',
    lineHeight: typography.fontSize?.sm ? typography.fontSize.sm * 1.3 : 16.9, // Ajustado proporcionalmente
    maxWidth: 100, // Ajustado al nuevo ancho del contenedor
    paddingHorizontal: spacing.xs || 2,
    marginTop: 0, // Sin margen superior para evitar que empuje la imagen
    // El texto puede hacer wrap sin afectar la posición de la imagen
    flexShrink: 1,
  },
});

export default CategoryGridCard;

