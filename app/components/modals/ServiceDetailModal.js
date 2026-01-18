import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import * as serviceService from '../../services/service';
// ModalAgendamiento eliminado - flujo antiguo de agendamiento
// import ModalAgendamiento from './agendamiento/ModalAgendamiento';

/**
 * Modal que muestra los detalles de un servicio y sus reseñas
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Indica si el modal está visible
 * @param {Object} props.service - Datos del servicio a mostrar
 * @param {Object} props.vehiculo - Vehículo seleccionado para el servicio
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onRequestService - Función para solicitar el servicio (opcional, para compatibilidad)
 * @returns {JSX.Element} Componente de modal de detalle de servicio
 */
const ServiceDetailModal = ({ visible, service, vehiculo, onClose, onRequestService }) => {
  // Flujo antiguo de agendamiento eliminado - ahora se usa el carrito o solicitudes públicas
  const handleIniciarAgendamiento = () => {
    if (!vehiculo) {
      Alert.alert('Error', 'Debes seleccionar un vehículo antes de solicitar un servicio.');
      return;
    }
    // Cerrar el modal y llamar a onRequestService si está disponible
    onClose();
    if (onRequestService) {
      onRequestService(service, vehiculo);
    } else {
      // Si no hay onRequestService, mostrar mensaje informativo
      Alert.alert(
        'Solicitar Servicio',
        'Para solicitar este servicio, por favor navega al perfil del proveedor desde la pantalla principal.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Formateamos el precio para mostrar
  const formatPrice = () => {
    if (!service) return 'Consultar precio';
    
    // Priorizar precio_minimo y precio_maximo si están disponibles
    if (service.precio_minimo && service.precio_maximo) {
      const minPrice = parseInt(service.precio_minimo);
      const maxPrice = parseInt(service.precio_maximo);
      
      if (minPrice === maxPrice) {
        return `$${minPrice.toLocaleString()}`;
      } else {
        return `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`;
      }
    }
    
    // Si solo hay precio_minimo
    if (service.precio_minimo) {
      return `Desde $${parseInt(service.precio_minimo).toLocaleString()}`;
    }
    
    // Si hay precio_referencia
    if (service.precio_referencia && service.precio_referencia !== "0.00") {
      return `$${parseInt(service.precio_referencia).toLocaleString()}`;
    }
    
    // Fallback a precio simple
    if (service.precio) {
      return `$${parseInt(service.precio).toLocaleString()}`;
    }
    
    return 'Consultar precio';
  };
  
  // Renderizamos estrellas según la calificación
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
  

  
  // Si no hay servicio, no mostrar nada
  if (!service) return null;
  
  // Obtener información del proveedor
  const getProviderInfo = () => {
    // Usar los nuevos campos del backend
    if (service.taller_principal) {
      return {
        icon: 'business-outline',
        name: service.taller_principal.nombre,
        type: 'Taller',
        rating: service.taller_principal.calificacion_promedio || 0
      };
    } else if (service.mecanico_principal) {
      const name = service.mecanico_principal.nombre || 
        (service.mecanico_principal.usuario 
          ? `${service.mecanico_principal.usuario.first_name || ''} ${service.mecanico_principal.usuario.last_name || ''}`.trim()
          : 'Mecánico');
      return {
        icon: 'person-outline',
        name,
        type: 'Mecánico',
        rating: service.mecanico_principal.calificacion_promedio || 0
      };
    } else if (service.proveedor_tipo === 'taller' && service.proveedor_nombre) {
      return {
        icon: 'business-outline',
        name: service.proveedor_nombre,
        type: 'Taller',
        rating: service.proveedor_calificacion || 0
      };
    } else if (service.proveedor_tipo === 'mecanico' && service.proveedor_nombre) {
      return {
        icon: 'person-outline',
        name: service.proveedor_nombre,
        type: 'Mecánico',
        rating: service.proveedor_calificacion || 0
      };
    } else if (service.taller) {
      return {
        icon: 'business-outline',
        name: service.taller.nombre || 'Taller',
        type: 'Taller',
        rating: service.taller.calificacion_promedio || 0
      };
    } else if (service.mecanico) {
      const name = service.mecanico.usuario 
        ? `${service.mecanico.usuario.first_name || ''} ${service.mecanico.usuario.last_name || ''}`.trim()
        : 'Mecánico';
      return {
        icon: 'person-outline',
        name,
        type: 'Mecánico',
        rating: service.mecanico.calificacion_promedio || 0
      };
    } else {
      return {
        icon: 'construct-outline',
        name: 'Servicio Oficial',
        type: 'Servicio',
        rating: service.calificacion_promedio || 0,
        reviews: service.cantidad_resenas || 0
      };
    }
  };
  
  const providerInfo = getProviderInfo();
  
  // Usar getMediaURL de api.js para obtener URLs dinámicas
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    const fetchImageUrl = async () => {
      if (service.foto) {
        try {
          // Importar dinámicamente para evitar dependencias circulares
          const { getMediaURL } = await import('../services/api');
          const url = await getMediaURL(service.foto);
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
  }, [service.foto]);
  
  // Función para formatear la duración
  const formatDuration = () => {
    if (service.duracion_estimada_base) {
      return `Duración estimada: ${service.duracion_estimada_base}`;
    } else if (service.duracion_minutos) {
      const hours = Math.floor(service.duracion_minutos / 60);
      const minutes = service.duracion_minutos % 60;
      if (hours > 0) {
        return `Duración estimada: ${hours}h ${minutes}min`;
      } else {
        return `Duración estimada: ${minutes} minutos`;
      }
    }
    return 'Duración a consultar';
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Encabezado del modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle del Servicio</Text>
          </View>
          
          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Imagen del servicio */}
            <View style={styles.imageContainer}>
              {imageUrl ? (
                <Image 
                  source={{ uri: imageUrl }}
                  style={styles.serviceImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.servicePlaceholder}>
                  <Ionicons name="construct" size={60} color={COLORS.primary} />
                </View>
              )}
            </View>
            
            {/* Detalles del servicio */}
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>{service.nombre}</Text>
              <Text style={styles.servicePrice}>{formatPrice()}</Text>
            </View>
            
            {/* Información del proveedor */}
            <View style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <View style={styles.providerIcon}>
                  <Ionicons name={providerInfo.icon} size={24} color={COLORS.white} />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{providerInfo.name}</Text>
                  <View style={styles.providerRating}>
                    {renderRatingStars(providerInfo.rating)}
                  </View>
                </View>
                <View style={styles.providerBadge}>
                  <Text style={styles.providerBadgeText}>{providerInfo.type}</Text>
                </View>
              </View>
            </View>
            
            {/* Descripción del servicio */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.serviceDescription}>
                {service.descripcion || 'No hay descripción disponible para este servicio.'}
              </Text>
            </View>
            
            {/* Detalles del servicio */}
            <View style={styles.serviceDetailsContainer}>
              {/* Duración estimada */}
              <View style={styles.serviceDetail}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.serviceDetailText}>
                  {formatDuration()}
                </Text>
              </View>
              
              {/* Ofertas disponibles */}
              {service.ofertas_disponibles && service.ofertas_disponibles.total > 0 && (
                <View style={styles.serviceDetail}>
                  <Ionicons name="pricetag-outline" size={20} color={COLORS.secondary} />
                  <Text style={styles.serviceDetailText}>
                    {service.ofertas_disponibles.total} ofertas disponibles
                  </Text>
                </View>
              )}
              
              {/* Requiere repuestos */}
              {service.requiere_repuestos !== undefined && (
                <View style={styles.serviceDetail}>
                  <Ionicons 
                    name={service.requiere_repuestos ? "build-outline" : "checkmark-circle-outline"} 
                    size={20} 
                    color={service.requiere_repuestos ? COLORS.warning : COLORS.success} 
                  />
                  <Text style={styles.serviceDetailText}>
                    {service.requiere_repuestos ? 'Puede requerir repuestos' : 'No requiere repuestos'}
                  </Text>
                </View>
              )}
              

            </View>
            

          </ScrollView>
          
          {/* Botón de solicitar servicio */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.requestButton}
              onPress={handleIniciarAgendamiento}
            >
              <Text style={styles.requestButtonText}>Solicitar Servicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* ModalAgendamiento eliminado - flujo antiguo de agendamiento
      <ModalAgendamiento
        visible={modalAgendamientoVisible}
        onClose={() => setModalAgendamientoVisible(false)}
        onComplete={handleAgendamientoCompleto}
        servicio={service}
        vehiculo={vehiculo}
      />
      */}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  modalBody: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.lightGray,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  servicePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  serviceHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  providerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },

  providerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  providerBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  sectionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  serviceDescription: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  serviceDetailsContainer: {
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceDetailText: {
    fontSize: 16,
    color: COLORS.textDark,
    marginLeft: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.textLight,
  },

  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  requestButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ServiceDetailModal; 