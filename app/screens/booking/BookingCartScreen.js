import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  StatusBar,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as locationService from '../../services/location';
import { useBookingCart } from '../../context/BookingCartContext';
import CartItemCard from '../../components/booking/CartItemCard';
import VehicleCartAccordion from '../../components/booking/VehicleCartAccordion';
import { COLORS, ROUTES } from '../../utils/constants';

const BookingCartScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Parámetros que pueden venir desde FlujoAgendamiento
  const { carritoBackendId, vehiculoId, fromAgendamiento } = route.params || {};
  
  // Estados para carrito backend vs local
  const [useBackendCart, setUseBackendCart] = useState(false);
  const [backendCartItems, setBackendCartItems] = useState([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendTotalPrice, setBackendTotalPrice] = useState(0);

  // Contexto del carrito local (fallback)
  const { 
    cartItems: localCartItems, 
    totalPrice: localTotalPrice, 
    isLoading: localLoading, 
    addToCart, 
    removeFromCart, 
    clearCart,
    refreshCart 
  } = useBookingCart();

  useEffect(() => {
    console.log('🔍 DEBUGGING BookingCartScreen useEffect:');
    console.log('  - fromAgendamiento:', fromAgendamiento);
    console.log('  - carritoBackendId:', carritoBackendId);
    console.log('  - vehiculoId:', vehiculoId);
    
    // Determinar qué carrito usar
    if (fromAgendamiento && carritoBackendId) {
      console.log('🛒 ✅ USANDO CARRITO BACKEND desde agendamiento');
      setUseBackendCart(true);
      cargarCarritoBackend();
    } else {
      console.log('🛒 ❌ USANDO CARRITO LOCAL');
      setUseBackendCart(false);
    }
  }, [fromAgendamiento, carritoBackendId]);

  const cargarCarritoBackend = async () => {
    if (!carritoBackendId) return;
    
    setBackendLoading(true);
    try {
      console.log('🛒 Cargando carrito backend ID:', carritoBackendId);
      
      // Importar el servicio de agendamiento
      const { default: agendamientoService } = await import('../../services/agendamientoService');
      
      // Obtener el carrito del backend
      const carrito = await agendamientoService.obtenerCarrito(carritoBackendId);
      console.log('🛒 Carrito backend obtenido:', carrito);
      
      if (carrito && carrito.items) {
        // Transformar items del backend manteniendo compatibilidad
        const itemsTransformados = carrito.items.map(item => {
          console.log('🔍 Item original del backend:', item);
          
          return {
            id: item.id,
            cartItemID: item.id,
            ofertaServicioID: item.oferta_servicio,
            
            // Información básica del servicio
            servicioNombre: item.servicio_nombre || 'Servicio',
            descripcion: item.oferta_servicio_detail?.servicio?.descripcion || '',
            categoria: 'General', // Valor por defecto
            
            // Información de precios
            precio: parseFloat(item.precio_estimado || 0),
            precio_final: parseFloat(item.precio_estimado || 0),
            precio_con_repuestos: parseFloat(item.oferta_servicio_detail?.precio_con_repuestos || 0),
            precio_sin_repuestos: parseFloat(item.oferta_servicio_detail?.precio_sin_repuestos || 0),
            con_repuestos: item.con_repuestos,
            conRepuestos: item.con_repuestos,
            cantidad: item.cantidad,
            
            // Información de agendamiento
            fechaSeleccionada: carrito.fecha_servicio,
            horaSeleccionada: carrito.hora_servicio,
            
            // Información del proveedor
            tallerNombre: item.taller_nombre || carrito.taller_detail?.nombre || 'Proveedor',
            tallerDireccion: carrito.taller_detail?.direccion || '',
            tipo_proveedor: carrito.taller_detail ? 'taller' : 'mecanico',
            
            // Información del vehículo
            vehiculo_info: carrito.vehiculo_detail,
            vehiculoID: carrito.vehiculo,
            vehiculoNombre: `${carrito.vehiculo_detail?.marca_nombre || ''} ${carrito.vehiculo_detail?.modelo_nombre || ''}`.trim(),
            
            // Duración estimada
            duracionEstimada: item.oferta_servicio_detail?.servicio?.duracion_estimada,
            
            // Información del carrito
            carrito_id: carrito.id,
            fecha_agregado: item.fecha_agregado
          };
        });
        
        console.log('🔍 Items transformados:', itemsTransformados);
        setBackendCartItems(itemsTransformados);
        setBackendTotalPrice(parseFloat(carrito.total_estimado || 0));
        console.log('✅ Items transformados:', itemsTransformados.length);
      } else {
        setBackendCartItems([]);
        setBackendTotalPrice(0);
      }
      
    } catch (error) {
      console.error('❌ Error cargando carrito backend:', error);
      Alert.alert('Error', 'No se pudo cargar el carrito');
      setBackendCartItems([]);
    } finally {
      setBackendLoading(false);
    }
  };

  // Función para eliminar item del carrito backend
  const handleRemoveBackendItem = async (item) => {
    try {
      console.log('🗑️ Eliminando item del carrito backend:', item);
      
      const { default: agendamientoService } = await import('../../services/agendamientoService');
      await agendamientoService.removerServicioDelCarrito(carritoBackendId, item.id || item.cartItemID);
      
      // Recargar carrito
      await cargarCarritoBackend();
      showToast('Servicio eliminado del carrito');
      
    } catch (error) {
      console.error('❌ Error eliminando item:', error);
      Alert.alert('Error', 'No se pudo eliminar el servicio');
    }
  };

  // Función para eliminar item del carrito local
  const handleRemoveLocalItem = (item) => {
    removeFromCart(item.cartItemID);
  };

  // Determinar qué datos usar
  const cartItems = useBackendCart ? backendCartItems : localCartItems;
  const totalPrice = useBackendCart ? backendTotalPrice : localTotalPrice;
  const isLoading = useBackendCart ? backendLoading : localLoading;

  // Función para manejar eliminación
  const handleRemoveItem = useBackendCart ? handleRemoveBackendItem : handleRemoveLocalItem;

  // Agrupar items por vehículo
  const itemsByVehicle = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return [];

    const groups = cartItems.reduce((acc, item) => {
      // Determinar ID del vehículo
      const vehiculoId = item.vehiculoID || item.vehiculo?.id || item.vehiculo_info?.id || 'unknown';
      
      if (!acc[vehiculoId]) {
        acc[vehiculoId] = {
          vehiculoId,
          vehiculo_info: item.vehiculo_info || item.vehiculo || {
            marca_nombre: 'Vehículo',
            modelo_nombre: 'Desconocido',
            patente: null
          },
          items: []
        };
      }
      
      acc[vehiculoId].items.push(item);
      return acc;
    }, {});

    return Object.values(groups);
  }, [cartItems]);

  // Función para proceder a confirmación
  const handleProceedToConfirmation = () => {
    if (cartItems.length === 0) {
      Alert.alert('Carrito vacío', 'No tienes servicios en tu carrito para proceder');
      return;
    }

    if (useBackendCart) {
      console.log('🚀 Procediendo a confirmación con carrito backend');
      navigation.navigate('BookingConfirmation', {
        carritoBackendId: carritoBackendId,
        vehiculoId: vehiculoId,
        fromBackendCart: true
      });
    } else {
      navigation.navigate('BookingConfirmation');
    }
  };

  // Función para mostrar feedback visual siguiendo el patrón del sistema de diseño
  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // En iOS usamos un alert simple
      setTimeout(() => {
        Alert.alert('Información', message);
      }, 100);
    }
  };

  const handleAddAnotherService = () => {
    // Mostrar opciones de navegación siguiendo el patrón del sistema de diseño
    Alert.alert(
      '🚗 Agregar Otro Servicio',
      'Selecciona el tipo de proveedor que prefieres:',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: '🏢 Talleres Especializados',
          onPress: async () => {
            showToast('Cargando talleres cercanos...');
            try {
              const active = await locationService.getActiveAddress();
              const address = active || await locationService.getMainAddress();
              if (address) { try { await locationService.setActiveAddress(address); } catch {} }
              navigation.navigate(ROUTES.TALLERES, { address: address || null });
            } catch {
              navigation.navigate(ROUTES.TALLERES);
            }
          }
        },
        {
          text: '🔧 Mecánicos a Domicilio',
          onPress: async () => {
            showToast('Cargando mecánicos disponibles...');
            try {
              const active = await locationService.getActiveAddress();
              const address = active || await locationService.getMainAddress();
              if (address) { try { await locationService.setActiveAddress(address); } catch {} }
              navigation.navigate(ROUTES.MECANICOS, { address: address || null });
            } catch {
              navigation.navigate(ROUTES.MECANICOS);
            }
          }
        },
        
      ],
      { 
        cancelable: true,
        userInterfaceStyle: 'light' // Para iOS, mantener consistencia visual
      }
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Limpiar Carrito',
      '¿Estás seguro de que deseas eliminar todos los servicios del carrito?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            if (useBackendCart) {
              // Para carrito backend, eliminar cada item individualmente
              try {
                for (const item of cartItems) {
                  await handleRemoveBackendItem(item);
                }
              } catch (error) {
                console.error('Error limpiando carrito backend:', error);
              }
            } else {
              // Para carrito local usar la función existente
              clearCart();
            }
          }
        }
      ]
    );
  };

  const renderCartItem = ({ item }) => (
    <CartItemCard
      item={item}
      onRemove={() => handleRemoveItem(item)}
      showVehicleInfo={itemsByVehicle.length > 1}
    />
  );

  const renderVehicleGroup = ({ item: vehicleGroup }) => (
    <VehicleCartAccordion
      vehicleGroup={vehicleGroup}
      onRemoveItem={handleRemoveItem}
      showVehicleInfo={false}
    />
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
      <Text style={styles.emptySubtitle}>
        Agrega servicios para tu vehículo y agenda múltiples citas
      </Text>
      <TouchableOpacity
        style={styles.addServiceButton}
        onPress={handleAddAnotherService}
      >
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.addServiceButtonText}>Explorar Servicios</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingCart = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Cargando tu carrito...</Text>
    </View>
  );

  // Determinar si mostrar agrupación por vehículos o lista simple
  const shouldGroupByVehicle = itemsByVehicle.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Carrito de Agendamiento</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido */}
      {isLoading ? (
        renderLoadingCart()
      ) : cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          {/* Lista de items - agrupados por vehículo o lista simple */}
          {shouldGroupByVehicle ? (
            <FlatList
              data={itemsByVehicle}
              renderItem={renderVehicleGroup}
              keyExtractor={(vehicleGroup) => vehicleGroup.vehiculoId?.toString() || 'unknown'}
              style={styles.itemsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.itemsContainer}
            />
          ) : (
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.cartItemID || item.id}
              style={styles.itemsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.itemsContainer}
            />
          )}

          {/* Resumen mejorado */}
          <View style={styles.summaryContainer}>
            {shouldGroupByVehicle && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehículos con servicios:</Text>
                <Text style={styles.summaryValue}>{itemsByVehicle.length}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total de servicios:</Text>
              <Text style={styles.summaryValue}>{cartItems.length}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.summaryTotalLabel}>Precio total estimado:</Text>
              <Text style={styles.summaryPrice}>
                ${Math.round(totalPrice).toLocaleString('es-CL')}
              </Text>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addAnotherButton}
              onPress={handleAddAnotherService}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addAnotherButtonText}>Agregar otro servicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.proceedButton,
                cartItems.length === 0 && styles.proceedButtonDisabled
              ]}
              onPress={handleProceedToConfirmation}
              disabled={cartItems.length === 0}
            >
              <Text style={styles.proceedButtonText}>Continuar a Confirmación</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    // Específico para web: permitir scroll vertical
    ...(Platform.OS === 'web' && {
      height: '100vh',
      overflow: 'hidden',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 15,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1 }], // Para animaciones futuras
  },
  addServiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    flex: 1,
    marginTop: 8,
  },
  itemsContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  summaryPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addAnotherButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  proceedButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 10,
  },
  summaryTotalLabel: {
    fontSize: 16,
    color: '#666666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default BookingCartScreen; 