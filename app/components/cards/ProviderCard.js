import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import { COLORS } from '../../utils/constants';

/**
 * Componente para mostrar una tarjeta de proveedor (taller o mecánico)
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.provider - Datos del proveedor a mostrar
 * @param {string} props.type - Tipo de proveedor ('taller' o 'mecanico')
 * @param {Function} props.onPress - Función a ejecutar al presionar la tarjeta
 * @returns {JSX.Element} Componente de tarjeta de proveedor
 */
const ProviderCard = ({
  provider,
  type = 'taller', // 'taller' o 'mecanico'
  onPress
}) => {
  if (!provider) return null;

  // Usar getMediaURL de api.js para obtener URLs dinámicas
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (provider.foto) {
        try {
          // Importar dinámicamente para evitar dependencias circulares
          const { getMediaURL } = await import('../services/api');
          const url = await getMediaURL(provider.foto);
          setImageUrl(url);
        } catch (error) {
          console.error('Error obteniendo URL de imagen:', error);
          setImageUrl(null);
        }
      } else {
        setImageUrl(null);
      }
    };

    fetchImageUrl();
  }, [provider.foto]);

  // Renderizar estrellas según calificación
  const renderRatingStars = (rating) => {
    const ratingValue = parseFloat(rating) || 0;
    const fullStars = Math.floor(ratingValue);
    const halfStar = ratingValue - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Ionicons
            key={`full-${i}`}
            name="star"
            size={12}
            color="#FFD700"
            style={styles.starIcon}
          />
        ))}

        {halfStar && (
          <Ionicons
            key="half"
            name="star-half"
            size={12}
            color="#FFD700"
            style={styles.starIcon}
          />
        )}

        {[...Array(emptyStars)].map((_, i) => (
          <Ionicons
            key={`empty-${i}`}
            name="star-outline"
            size={12}
            color="#FFD700"
            style={styles.starIcon}
          />
        ))}

        {provider.cantidad_resenas > 0 && (
          <Text style={styles.reviewCount}>({provider.cantidad_resenas})</Text>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(provider)}
      activeOpacity={0.95}
    >
      {/* Imagen del proveedor */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.defaultImageContainer}>
            <Ionicons
              name={type === 'taller' ? 'business-outline' : 'person-outline'}
              size={40}
              color={COLORS.primary}
            />
          </View>
        )}
      </View>

      {/* Etiqueta según el tipo de proveedor */}
      <View style={[
        styles.typeBadge,
        type === 'taller' ? styles.workshopType : styles.mechanicType
      ]}>
        <Text style={styles.typeText}>
          {type === 'taller' ? 'Taller' : 'A domicilio'}
        </Text>
      </View>

      {/* Precio si está disponible */}
      <View style={styles.priceContainer}>
        {provider.precio_sin_repuestos ? (
          <Text style={styles.price}>
            {formatCurrency(provider.precio_sin_repuestos)}
          </Text>
        ) : (
          <Text style={styles.priceUnavailable}>Consultar precio</Text>
        )}
      </View>

      {/* Nombre del proveedor */}
      <Text style={styles.name} numberOfLines={2}>
        {provider.nombre}
      </Text>

      {/* Calificación con estrellas */}
      <View style={styles.ratingContainer}>
        {renderRatingStars(provider.calificacion_promedio)}
      </View>

      {/* Información adicional */}
      <View style={styles.detailsContainer}>
        {/* Servicio ofrecido si está disponible */}
        {provider.servicio_nombre && (
          <View style={styles.serviceContainer}>
            <Ionicons name="construct-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.serviceText} numberOfLines={1}>
              {provider.servicio_nombre}
            </Text>
          </View>
        )}

        {/* Dirección si está disponible */}
        {provider.direccion && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.addressText} numberOfLines={1}>
              {provider.direccion}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 250,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 12,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  defaultImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F6FF',
  },
  priceContainer: {
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  priceUnavailable: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    height: 38, // Fijamos altura para 2 líneas
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  detailsContainer: {
    marginTop: 6,
  },
  serviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceText: {
    fontSize: 13,
    color: COLORS.textDark,
    marginLeft: 6,
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 6,
    flex: 1,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
  },
  workshopType: {
    backgroundColor: COLORS.primary,
  },
  mechanicType: {
    backgroundColor: COLORS.secondary,
  },
  typeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
});

export default ProviderCard; 