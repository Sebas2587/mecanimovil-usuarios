import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/format';
import { COLORS } from '../../utils/constants';

/**
 * Componente Modal para mostrar detalles de proveedores (talleres o mecánicos)
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Indica si el modal está visible
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object} props.provider - Datos del proveedor a mostrar
 * @param {string} props.type - Tipo de proveedor ('taller' o 'mecanico')
 * @param {Object} props.servicio - Datos del servicio relacionado (opcional)
 * @returns {JSX.Element} Componente de modal de proveedor
 */
const ProviderModal = ({
  visible,
  onClose,
  provider,
  type = 'taller', // 'taller' o 'mecanico'
  servicio = null
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

  // Función para llamar al proveedor
  const handleCall = () => {
    const phoneNumber = provider.telefono;
    if (!phoneNumber) {
      alert('No hay número de teléfono disponible');
      return;
    }

    const tel = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    Linking.openURL(tel).catch(err => {
      console.error('Error al intentar llamar:', err);
      alert('No se pudo realizar la llamada');
    });
  };

  // Función para abrir la ubicación en el mapa
  const handleOpenMap = () => {
    if (!provider.direccion && (!provider.ubicacion || !provider.ubicacion.coordinates)) {
      alert('No hay dirección disponible');
      return;
    }

    let latitude, longitude;

    if (provider.ubicacion && provider.ubicacion.coordinates) {
      [longitude, latitude] = provider.ubicacion.coordinates;
    }

    const location = provider.direccion || `${latitude},${longitude}`;
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${location}`
      : `geo:0,0?q=${location}`;

    Linking.openURL(url).catch(err => {
      console.error('Error al abrir el mapa:', err);
      alert('No se pudo abrir la ubicación en el mapa');
    });
  };

  // Renderizar estrellas según calificación
  const renderRatingStars = (rating, size = 16) => {
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
            size={size}
            color="#FFD700"
            style={styles.starIcon}
          />
        ))}

        {halfStar && (
          <Ionicons
            key="half"
            name="star-half"
            size={size}
            color="#FFD700"
            style={styles.starIcon}
          />
        )}

        {[...Array(emptyStars)].map((_, i) => (
          <Ionicons
            key={`empty-${i}`}
            name="star-outline"
            size={size}
            color="#FFD700"
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Encabezado del modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {type === 'taller' ? 'Detalle del Taller' : 'Detalle del Mecánico'}
            </Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Cabecera con imagen y nombre */}
            <View style={styles.header}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.providerImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.providerImagePlaceholder}>
                  <Ionicons
                    name={type === 'taller' ? 'business' : 'person'}
                    size={60}
                    color={COLORS.white}
                  />
                </View>
              )}

              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{provider.nombre}</Text>

                {/* Calificación */}
                <View style={styles.ratingContainer}>
                  {renderRatingStars(provider.calificacion_promedio)}
                  <Text style={styles.reviewsText}>
                    ({provider.cantidad_resenas || 0} reseñas)
                  </Text>
                </View>

                {/* Tipo de proveedor */}
                <View style={[
                  styles.typeBadge,
                  type === 'taller' ? styles.workshopType : styles.mechanicType
                ]}>
                  <Text style={styles.typeBadgeText}>
                    {type === 'taller' ? 'Taller' : 'Mecánico a domicilio'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Información del servicio si está disponible */}
            {servicio && servicio.nombre && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Servicio disponible</Text>
                <View style={styles.serviceCard}>
                  <Ionicons name="construct" size={20} color={COLORS.primary} style={styles.serviceIcon} />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{servicio.nombre}</Text>

                    {/* Precios */}
                    <View style={styles.priceContainer}>
                      {provider.precio_con_repuestos && (
                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Con repuestos:</Text>
                          <Text style={styles.priceValue}>
                            {formatCurrency(provider.precio_con_repuestos || 0)}
                          </Text>
                        </View>
                      )}

                      {provider.precio_sin_repuestos && (
                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Mano de obra:</Text>
                          <Text style={styles.priceValue}>
                            {formatCurrency(provider.precio_sin_repuestos || 0)}
                          </Text>
                        </View>
                      )}

                      {!provider.precio_sin_repuestos && !provider.precio_con_repuestos && (
                        <View style={styles.priceItem}>
                          <Text style={styles.priceUnavailable}>Consultar precio directamente</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Información de contacto */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Información de contacto</Text>

              {provider.direccion && (
                <View style={styles.contactItem}>
                  <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{provider.direccion}</Text>
                </View>
              )}

              {provider.telefono && (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{provider.telefono}</Text>
                </View>
              )}

              {type === 'taller' && provider.horario_atencion && (
                <View style={styles.contactItem}>
                  <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.contactText}>{provider.horario_atencion}</Text>
                </View>
              )}
            </View>

            {/* Descripción o información adicional */}
            {provider.descripcion && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Acerca de</Text>
                <Text style={styles.descriptionText}>{provider.descripcion}</Text>
              </View>
            )}
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={handleCall}
            >
              <Ionicons name="call-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Llamar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.mapButton]}
              onPress={handleOpenMap}
            >
              <Ionicons name="location-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Ver ubicación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: COLORS.white,
  },
  closeButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: COLORS.glass.white,
    alignItems: 'center',
  },
  providerImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
  },
  providerImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerDetails: {
    alignItems: 'center',
  },
  providerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  reviewsText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  workshopType: {
    backgroundColor: COLORS.primary,
  },
  mechanicType: {
    backgroundColor: COLORS.secondary,
  },
  typeBadgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glass.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceIcon: {
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  priceItem: {
    flexBasis: '48%',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  priceUnavailable: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textLight,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: COLORS.white,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  callButton: {
    backgroundColor: COLORS.secondary,
  },
  mapButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default ProviderModal; 