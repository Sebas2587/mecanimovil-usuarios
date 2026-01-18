import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

/**
 * Componente para mostrar la información de un servicio en formato de tarjeta
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.service - Datos del servicio a mostrar
 * @param {Function} props.onPress - Función a ejecutar al presionar la tarjeta
 * @returns {JSX.Element} Componente de tarjeta de servicio
 */
const ServiceCard = ({ service, onPress }) => {
  // Manejamos posibles formatos diferentes de datos
  const normalizedService = normalizeServiceData(service);

  // Determinar el proveedor principal (taller o mecánico)
  const getProviderInfo = () => {
    // Usar los nuevos campos del backend
    if (normalizedService.taller_principal) {
      return {
        icon: 'business-outline',
        name: normalizedService.taller_principal.nombre,
        type: 'Taller',
        rating: normalizedService.taller_principal.calificacion_promedio || 0,
        precio_min: normalizedService.taller_principal.precio_sin_repuestos,
        precio_max: normalizedService.taller_principal.precio_con_repuestos
      };
    } else if (normalizedService.mecanico_principal) {
      return {
        icon: 'person-outline',
        name: normalizedService.mecanico_principal.nombre,
        type: 'Mecánico',
        rating: normalizedService.mecanico_principal.calificacion_promedio || 0,
        precio_min: normalizedService.mecanico_principal.precio_sin_repuestos,
        precio_max: normalizedService.mecanico_principal.precio_con_repuestos
      };
    } else if (normalizedService.proveedor_tipo === 'mecanico' && normalizedService.proveedor_nombre) {
      return {
        icon: 'person-outline',
        name: normalizedService.proveedor_nombre,
        type: 'Mecánico',
        rating: normalizedService.proveedor_calificacion || 0,
        precio_min: normalizedService.precio_sin_repuestos,
        precio_max: normalizedService.precio_con_repuestos
      };
    } else if (normalizedService.proveedor_tipo === 'taller' && normalizedService.proveedor_nombre) {
      return {
        icon: 'business-outline',
        name: normalizedService.proveedor_nombre,
        type: 'Taller',
        rating: normalizedService.proveedor_calificacion || 0,
        precio_min: normalizedService.precio_sin_repuestos,
        precio_max: normalizedService.precio_con_repuestos
      };
    } else {
      return {
        icon: 'construct-outline',
        name: 'Servicio Oficial',
        type: 'Servicio',
        rating: normalizedService.calificacion_promedio || 0,
        precio_min: normalizedService.precio_minimo,
        precio_max: normalizedService.precio_maximo
      };
    }
  };

  const providerInfo = getProviderInfo();

  // Usar getMediaURL de api.js para obtener URLs dinámicas
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (normalizedService.foto) {
        try {
          // Importar dinámicamente para evitar dependencias circulares
          const { getMediaURL } = await import('../services/api');
          const url = await getMediaURL(normalizedService.foto);
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
  }, [normalizedService.foto]);

  // Formatear el precio para mostrar
  const formatPrice = () => {
    if (providerInfo.precio_min && providerInfo.precio_max) {
      if (providerInfo.precio_min === providerInfo.precio_max) {
        return `$${parseInt(providerInfo.precio_min).toLocaleString()}`;
      } else {
        return `$${parseInt(providerInfo.precio_min).toLocaleString()} - $${parseInt(providerInfo.precio_max).toLocaleString()}`;
      }
    } else if (normalizedService.precio_minimo) {
      return `Desde $${parseInt(normalizedService.precio_minimo).toLocaleString()}`;
    } else if (normalizedService.precio_referencia) {
      return `$${parseInt(normalizedService.precio_referencia).toLocaleString()}`;
    }
    return 'Consultar precio';
  };

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
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(normalizedService)}
      activeOpacity={0.95}
    >
      {/* Imagen principal del servicio */}
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
          <View style={styles.placeholderContainer}>
            <Ionicons name="construct" size={24} color={COLORS.primary} />
          </View>
        )}

        {/* Badge de ofertas disponibles */}
        {normalizedService.ofertas_disponibles && normalizedService.ofertas_disponibles.total > 0 && (
          <View style={styles.offersBadge}>
            <Text style={styles.offersText}>{normalizedService.ofertas_disponibles.total} ofertas</Text>
          </View>
        )}
      </View>

      {/* Nombre del servicio */}
      <Text style={styles.title} numberOfLines={2}>
        {normalizedService.nombre}
      </Text>

      {/* Información del proveedor */}
      <View style={styles.providerContainer}>
        <View style={styles.providerInfo}>
          <Ionicons name={providerInfo.icon} size={14} color={COLORS.primary} />
          <Text style={styles.providerName} numberOfLines={1}>
            {providerInfo.name}
          </Text>
        </View>

        {/* Rating y reseñas */}
        <View style={styles.ratingContainer}>
          {renderRatingStars(providerInfo.rating)}
          <Text style={styles.reviewCount}>
            ({normalizedService.cantidad_resenas || 0})
          </Text>
        </View>
      </View>

      {/* Duración estimada */}
      {normalizedService.duracion_estimada_base && (
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.durationText}>
            {normalizedService.duracion_estimada_base}
          </Text>
        </View>
      )}

      {/* Precio del servicio */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatPrice()}</Text>
      </View>

      {/* Botón de solicitar */}
      <View style={styles.buttonContainer}>
        <Text style={styles.buttonText}>Solicitar Servicio</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Normaliza los datos del servicio para manejar diferentes estructuras
 * @param {Object} service - Datos del servicio tal como vienen del backend
 * @returns {Object} Datos normalizados con estructura consistente
 */
const normalizeServiceData = (service) => {
  // Extraer precio de diferentes posibles fuentes
  let precio = service.precio || service.price || service.precio_referencia || null;
  let precio_descuento = service.precio_descuento || service.discount_price || null;

  // Extraer duración en minutos
  let duracion_minutos = service.duracion_minutos || service.duration_minutes || null;

  // Si la duración viene en formato HH:MM, convertir a minutos
  if (service.duracion_minutos && typeof service.duracion_minutos === 'string' && service.duracion_minutos.includes(':')) {
    const [hours, minutes] = service.duracion_minutos.split(':').map(Number);
    duracion_minutos = (hours * 60) + minutes;
  } else if (service.duracion_estimada_base && typeof service.duracion_estimada_base === 'string' && service.duracion_estimada_base.includes(':')) {
    const [hours, minutes] = service.duracion_estimada_base.split(':').map(Number);
    duracion_minutos = (hours * 60) + minutes;
  }

  // Construimos un objeto normalizado con los nuevos campos del backend
  return {
    id: service.id,
    nombre: service.nombre || service.name || 'Servicio sin nombre',
    descripcion: service.descripcion || service.description || '',
    duracion_minutos: duracion_minutos,
    duracion_estimada_base: service.duracion_estimada_base,
    precio: precio,
    precio_descuento: precio_descuento,
    precio_original: precio,
    precio_referencia: service.precio_referencia,
    precio_minimo: service.precio_minimo,
    precio_maximo: service.precio_maximo,
    foto: service.foto || service.image || null,
    // Nuevos campos del backend
    taller_principal: service.taller_principal,
    mecanico_principal: service.mecanico_principal,
    ofertas_disponibles: service.ofertas_disponibles,
    cantidad_resenas: service.cantidad_resenas || service.review_count || 0,
    // Campos legacy para compatibilidad
    taller: service.taller || service.workshop || null,
    mecanico: service.mecanico || service.mechanic || null,
    // Calificaciones
    calificacion_promedio: service.calificacion_promedio || service.rating || 0,
    // Campos extra que podrían venir en algunas APIs
    proveedor_tipo: service.proveedor_tipo || service.provider_type || null,
    proveedor_nombre: service.proveedor_nombre || service.provider_name || null,
    proveedor_foto: service.proveedor_foto || service.provider_image || null,
    proveedor_calificacion: service.proveedor_calificacion || service.provider_rating || 0,
    proveedor_resenas: service.proveedor_resenas || service.provider_review_count || 0,
    // Pasar el objeto original para tener todos los datos
    _original: service
  };
};

const styles = StyleSheet.create({
  container: {
    width: 170,
    height: 260, // Aumentar altura para acomodar el botón
    borderRadius: 10,
    backgroundColor: 'white',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.lightGray,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFE500',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    paddingHorizontal: 10,
    marginBottom: 6,
    height: 36, // Altura fija para 2 líneas
  },
  providerContainer: {
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 12,
    color: COLORS.textDark,
    marginLeft: 4,
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 1,
  },
  reviewCount: {
    fontSize: 10,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  typeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  offersBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  offersText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ServiceCard; 