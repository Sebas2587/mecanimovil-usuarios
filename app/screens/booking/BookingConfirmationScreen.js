import React, { useState, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBookingCart } from '../../context/BookingCartContext';
import { useAuth } from '../../context/AuthContext';
import agendamientoService from '../../services/agendamientoService';
import { ROUTES } from '../../utils/constants';

const BookingConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  // Parámetros que pueden venir desde el carrito backend
  const { carritoBackendId, vehiculoId, fromBackendCart } = route.params || {};
  
  // Estados para carrito backend vs local
  const [useBackendCart, setUseBackendCart] = useState(false);
  const [backendCartItems, setBackendCartItems] = useState([]);
  const [backendTotalPrice, setBackendTotalPrice] = useState(0);
  const [backendLoading, setBackendLoading] = useState(false);

  // Contexto del carrito local (fallback)
  const {
    cartItems: localCartItems,
    totalItems: localTotalItems,
    totalPrice: localTotalPrice,
    clearCart: clearLocalCart
  } = useBookingCart();

  // Estados locales
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('transferencia');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Métodos de pago disponibles
  const paymentMethods = [
    {
      id: 'transferencia',
      name: 'Transferencia Bancaria',
      icon: 'card-outline',
      description: 'Pago por transferencia bancaria'
    }
  ];

  // Datos bancarios para transferencia
  const bankDetails = {
    banco: 'Banco Estado',
    tipoCuenta: 'Cuenta Corriente',
    numeroCuenta: '12345678-9',
    rut: '12.345.678-9',
    titular: 'MecaniMovil SpA',
    email: 'pagos@mecanimovil.cl'
  };

  useEffect(() => {
    // Determinar qué carrito usar
    if (fromBackendCart && carritoBackendId) {
      console.log('🛒 Usando carrito backend para confirmación');
      setUseBackendCart(true);
      cargarCarritoBackend();
    } else {
      console.log('🛒 Usando carrito local para confirmación');
      setUseBackendCart(false);
    }
  }, [fromBackendCart, carritoBackendId]);

  const cargarCarritoBackend = async () => {
    if (!carritoBackendId) return;
    
    setBackendLoading(true);
    try {
      console.log('🛒 Cargando carrito backend para confirmación:', carritoBackendId);
      
      // Obtener el carrito del backend
      const carrito = await agendamientoService.obtenerCarrito(carritoBackendId);
      console.log('🛒 Carrito backend para confirmación:', carrito);
      
      if (carrito && carrito.items) {
        // Transformar items del backend al formato esperado por la confirmación
        const itemsTransformados = carrito.items.map(item => ({
          // IDs reales del backend
          id: item.id,
          cartItemID: item.id,
          ofertaServicioID: item.oferta_servicio_id, // Este es el ID REAL
          vehiculoID: item.vehiculo?.id || vehiculoId,
          
          // Información del servicio
          servicioNombre: item.oferta_servicio?.servicio?.nombre || 'Servicio',
          descripcion: item.oferta_servicio?.servicio?.descripcion || '',
          
          // Fechas y horarios
          fechaSeleccionada: carrito.fecha_programada,
          horaSeleccionada: carrito.hora_programada,
          
          // Precios
          precio: item.precio_final || 0,
          precio_con_repuestos: item.oferta_servicio?.precio_con_repuestos || 0,
          precio_sin_repuestos: item.oferta_servicio?.precio_sin_repuestos || 0,
          
          // Configuración
          conRepuestos: item.con_repuestos,
          cantidad: item.cantidad,
          
          // Información del proveedor
          tallerNombre: item.oferta_servicio?.taller?.nombre || 'Taller',
          tallerDireccion: item.oferta_servicio?.taller?.direccion || 'Dirección del taller',
          mecanicoNombre: item.oferta_servicio?.mecanico?.nombre,
          tipoProveedor: item.oferta_servicio?.taller ? 'taller' : 'mecanico',
          
          // Información del vehículo
          vehiculoNombre: `${item.vehiculo?.marca_nombre || ''} ${item.vehiculo?.modelo_nombre || ''}`.trim(),
          
          // Datos adicionales
          duracion_estimada: item.oferta_servicio?.servicio?.duracion_estimada,
          incluye_garantia: item.oferta_servicio?.servicio?.incluye_garantia,
        }));
        
        setBackendCartItems(itemsTransformados);
        setBackendTotalPrice(carrito.total || 0);
        console.log('✅ Items transformados para confirmación:', itemsTransformados.length);
      } else {
        setBackendCartItems([]);
        setBackendTotalPrice(0);
      }
      
    } catch (error) {
      console.error('❌ Error cargando carrito backend para confirmación:', error);
      Alert.alert('Error', 'No se pudo cargar el carrito para confirmación');
      setBackendCartItems([]);
    } finally {
      setBackendLoading(false);
    }
  };

  // Determinar qué datos usar
  const cartItems = useBackendCart ? backendCartItems : localCartItems;
  const totalPrice = useBackendCart ? backendTotalPrice : localTotalPrice;
  const totalItems = useBackendCart ? backendCartItems.length : localTotalItems;

  useEffect(() => {
    // Verificar que hay items en el carrito
    if (cartItems.length === 0) {
      Alert.alert(
        'Carrito Vacío',
        'No hay servicios para confirmar.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [cartItems, navigation]);

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
    if (methodId === 'transferencia') {
      setShowBankDetails(true);
    }
  };

  const handleConfirmBooking = async () => {
    if (!acceptedTerms) {
      Alert.alert('Términos y Condiciones', 'Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Método de Pago', 'Selecciona un método de pago para continuar.');
      return;
    }

    setIsProcessing(true);

    try {
      if (useBackendCart && carritoBackendId) {
        // **FLUJO CARRITO BACKEND**: Confirmar directamente el carrito del backend
        console.log('🚀 Confirmando carrito backend:', carritoBackendId);
        
        // Usar el método de confirmación del carrito backend
        const agendamiento = await agendamientoService.confirmarCarrito(
          carritoBackendId, 
          selectedPaymentMethod,
          `Agendamiento confirmado. Método de pago: ${selectedPaymentMethod}`
        );
        
        console.log('✅ Carrito backend confirmado:', agendamiento);

        // Mostrar confirmación
        Alert.alert(
          '¡Agendamiento Confirmado!',
          `Tu agendamiento ha sido confirmado exitosamente. ${
            selectedPaymentMethod === 'transferencia' 
              ? 'Recibirás los datos bancarios por WhatsApp para realizar el pago.' 
              : ''
          }`,
          [
            {
              text: 'Ver Mis Citas',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'TabNavigator' },
                    { name: 'OrderHistory' }
                  ]
                });
              }
            },
            {
              text: 'Ir al Inicio',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TabNavigator' }]
                });
              }
            }
          ]
        );

        // Enviar datos de pago por WhatsApp si es transferencia
        if (selectedPaymentMethod === 'transferencia') {
          setTimeout(() => {
            sendPaymentDetailsWhatsAppBackend([{ agendamiento, items: backendCartItems }]);
          }, 1000);
        }

      } else {
        // **FLUJO CARRITO LOCAL**: Lógica original para carrito local
        console.log('🚀 Confirmando carrito local');
        
        // Validar IDs mock para carrito local
        const itemsConIdsMock = cartItems.filter(item => {
          const esIdMock = typeof item.ofertaServicioID === 'string' && 
                          (item.ofertaServicioID.includes('-') || item.ofertaServicioID.match(/[a-z]/));
          return esIdMock;
        });

        if (itemsConIdsMock.length > 0) {
          console.error('❌ Detectados IDs mock en el carrito local:', itemsConIdsMock.map(item => ({
            servicio: item.servicioNombre,
            idMock: item.ofertaServicioID
          })));

          Alert.alert(
            'Error de Configuración',
            `Los siguientes servicios provienen de datos de prueba y no se pueden agendar en el sistema real:\n\n${itemsConIdsMock.map(item => `• ${item.servicioNombre}`).join('\n')}\n\nPor favor, selecciona servicios reales desde la sección de talleres o mecánicos.`,
            [
              {
                text: 'Ir a Talleres',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'TabNavigator' },
                      { name: ROUTES.TALLERES }
                    ]
                  });
                }
              },
              {
                text: 'Ir a Mecánicos',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'TabNavigator' },
                      { name: ROUTES.MECANICOS }
                    ]
                  });
                }
              },
              {
                text: 'Volver al Carrito',
                style: 'cancel',
                onPress: () => navigation.goBack()
              }
            ]
          );
          return;
        }

        // Crear agendamientos individuales para carrito local
        const agendamientosCreados = [];
        
        for (const item of cartItems) {
          try {
            console.log('Creando agendamiento para:', item.servicioNombre);
            console.log('ID de oferta:', item.ofertaServicioID);
            
            const agendamientoData = {
              vehiculo_id: item.vehiculoID,
              oferta_servicio_id: item.ofertaServicioID,
              fecha_agendamiento: item.fechaSeleccionada,
              hora_agendamiento: item.horaSeleccionada,
              direccion_servicio: item.tallerDireccion || 'Taller',
              notas_cliente: `Agendamiento desde carrito local. Método de pago: ${selectedPaymentMethod}`,
              precio_acordado: item.precio,
              con_repuestos: item.conRepuestos,
              tipo_proveedor: item.tipoProveedor || 'taller',
              estado: 'pendiente_pago'
            };

            const agendamiento = await agendamientoService.crearAgendamiento(agendamientoData);
            agendamientosCreados.push({
              agendamiento,
              item
            });
            
            console.log('✅ Agendamiento creado:', agendamiento.id);
          } catch (error) {
            console.error('❌ Error creando agendamiento para', item.servicioNombre, ':', error);
            throw new Error(`Error al agendar ${item.servicioNombre}: ${error.message}`);
          }
        }

        console.log('✅ Todos los agendamientos locales creados exitosamente');

        // Limpiar el carrito local
        await clearLocalCart();

        // Mostrar confirmación
        Alert.alert(
          '¡Agendamientos Confirmados!',
          `Se han creado ${agendamientosCreados.length} agendamiento(s) exitosamente. ${
            selectedPaymentMethod === 'transferencia' 
              ? 'Recibirás los datos bancarios por WhatsApp para realizar el pago.' 
              : ''
          }`,
          [
            {
              text: 'Ver Mis Citas',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'TabNavigator' },
                    { name: 'OrderHistory' }
                  ]
                });
              }
            },
            {
              text: 'Ir al Inicio',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TabNavigator' }]
                });
              }
            }
          ]
        );

        // Enviar datos de pago por WhatsApp si es transferencia
        if (selectedPaymentMethod === 'transferencia') {
          setTimeout(() => {
            sendPaymentDetailsWhatsApp(agendamientosCreados);
          }, 1000);
        }
      }

    } catch (error) {
      console.error('❌ Error en confirmación de agendamientos:', error);
      Alert.alert(
        'Error',
        `No se pudieron confirmar todos los agendamientos: ${error.message}`,
        [
          {
            text: 'Reintentar',
            onPress: () => setIsProcessing(false)
          },
          {
            text: 'Volver al Carrito',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const sendPaymentDetailsWhatsApp = (agendamientos) => {
    const phoneNumber = '+56912345678'; // Número de WhatsApp de MecaniMovil
    
    let message = `🚗 *DATOS PARA PAGO - MECANIMOVIL*\n\n`;
    message += `👤 *Cliente:* ${user?.first_name} ${user?.last_name}\n`;
    message += `📧 *Email:* ${user?.email}\n\n`;
    
    message += `💰 *DATOS BANCARIOS:*\n`;
    message += `🏦 Banco: ${bankDetails.banco}\n`;
    message += `💳 Tipo: ${bankDetails.tipoCuenta}\n`;
    message += `🔢 Cuenta: ${bankDetails.numeroCuenta}\n`;
    message += `🆔 RUT: ${bankDetails.rut}\n`;
    message += `👤 Titular: ${bankDetails.titular}\n\n`;
    
    message += `📋 *SERVICIOS AGENDADOS:*\n`;
    agendamientos.forEach((ag, index) => {
      const item = ag.item;
      message += `${index + 1}. ${item.servicioNombre}\n`;
      message += `   🚗 ${item.vehiculoNombre}\n`;
      message += `   📅 ${new Date(item.fechaSeleccionada).toLocaleDateString('es-CL')}\n`;
      message += `   ⏰ ${item.horaSeleccionada}\n`;
      message += `   💵 $${Math.round(item.precio).toLocaleString('es-CL')}\n\n`;
    });
    
    message += `💰 *TOTAL A PAGAR: $${Math.round(totalPrice).toLocaleString('es-CL')}*\n\n`;
    message += `📧 Envía el comprobante de pago a: ${bankDetails.email}\n`;
    message += `⚡ Una vez confirmado el pago, coordinaremos los servicios contigo.`;

    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback a WhatsApp Web
          const webUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((error) => {
        console.error('Error abriendo WhatsApp:', error);
        Alert.alert(
          'WhatsApp no disponible',
          'No se pudo abrir WhatsApp. Los datos de pago están disponibles en la pantalla.'
        );
      });
  };

  const sendPaymentDetailsWhatsAppBackend = (agendamientosBackend) => {
    const phoneNumber = '+56912345678'; // Número de WhatsApp de MecaniMovil
    
    let message = `🚗 *DATOS PARA PAGO - MECANIMOVIL*\n\n`;
    message += `👤 *Cliente:* ${user?.first_name} ${user?.last_name}\n`;
    message += `📧 *Email:* ${user?.email}\n\n`;
    
    message += `💰 *DATOS BANCARIOS:*\n`;
    message += `🏦 Banco: ${bankDetails.banco}\n`;
    message += `💳 Tipo: ${bankDetails.tipoCuenta}\n`;
    message += `🔢 Cuenta: ${bankDetails.numeroCuenta}\n`;
    message += `🆔 RUT: ${bankDetails.rut}\n`;
    message += `👤 Titular: ${bankDetails.titular}\n\n`;
    
    message += `📋 *SERVICIOS AGENDADOS:*\n`;
    backendCartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.servicioNombre}\n`;
      message += `   🚗 ${item.vehiculoNombre}\n`;
      message += `   📅 ${new Date(item.fechaSeleccionada).toLocaleDateString('es-CL')}\n`;
      message += `   ⏰ ${item.horaSeleccionada}\n`;
      message += `   💵 $${Math.round(item.precio).toLocaleString('es-CL')}\n\n`;
    });
    
    message += `💰 *TOTAL A PAGAR: $${Math.round(backendTotalPrice).toLocaleString('es-CL')}*\n\n`;
    message += `📧 Envía el comprobante de pago a: ${bankDetails.email}\n`;
    message += `⚡ Una vez confirmado el pago, coordinaremos los servicios contigo.`;

    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback a WhatsApp Web
          const webUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((error) => {
        console.error('Error abriendo WhatsApp:', error);
        Alert.alert(
          'WhatsApp no disponible',
          'No se pudo abrir WhatsApp. Los datos de pago están disponibles en la pantalla.'
        );
      });
  };

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethod,
        selectedPaymentMethod === method.id && styles.paymentMethodSelected
      ]}
      onPress={() => handlePaymentMethodSelect(method.id)}
    >
      <View style={styles.paymentMethodContent}>
        <Ionicons 
          name={method.icon} 
          size={24} 
          color={selectedPaymentMethod === method.id ? '#007AFF' : '#666666'} 
        />
        <View style={styles.paymentMethodText}>
          <Text style={[
            styles.paymentMethodName,
            selectedPaymentMethod === method.id && styles.paymentMethodNameSelected
          ]}>
            {method.name}
          </Text>
          <Text style={styles.paymentMethodDescription}>
            {method.description}
          </Text>
        </View>
        <Ionicons 
          name={selectedPaymentMethod === method.id ? 'radio-button-on' : 'radio-button-off'} 
          size={20} 
          color={selectedPaymentMethod === method.id ? '#007AFF' : '#CCCCCC'} 
        />
      </View>
    </TouchableOpacity>
  );

  const renderBankDetails = () => (
    <View style={styles.bankDetailsContainer}>
      <Text style={styles.bankDetailsTitle}>Datos para Transferencia</Text>
      <View style={styles.bankDetailItem}>
        <Text style={styles.bankDetailLabel}>Banco:</Text>
        <Text style={styles.bankDetailValue}>{bankDetails.banco}</Text>
      </View>
      <View style={styles.bankDetailItem}>
        <Text style={styles.bankDetailLabel}>Tipo de Cuenta:</Text>
        <Text style={styles.bankDetailValue}>{bankDetails.tipoCuenta}</Text>
      </View>
      <View style={styles.bankDetailItem}>
        <Text style={styles.bankDetailLabel}>Número de Cuenta:</Text>
        <Text style={styles.bankDetailValue}>{bankDetails.numeroCuenta}</Text>
      </View>
      <View style={styles.bankDetailItem}>
        <Text style={styles.bankDetailLabel}>RUT:</Text>
        <Text style={styles.bankDetailValue}>{bankDetails.rut}</Text>
      </View>
      <View style={styles.bankDetailItem}>
        <Text style={styles.bankDetailLabel}>Titular:</Text>
        <Text style={styles.bankDetailValue}>{bankDetails.titular}</Text>
      </View>
      <View style={styles.bankDetailNote}>
        <Ionicons name="information-circle" size={16} color="#007AFF" />
        <Text style={styles.bankDetailNoteText}>
          Estos datos se enviarán por WhatsApp después de confirmar
        </Text>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No hay servicios para confirmar</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title}>Confirmar Agendamiento</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumen de servicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Servicios</Text>
          {cartItems.map((item, index) => (
            <View key={item.cartItemID} style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{item.servicioNombre}</Text>
                <Text style={styles.servicePrice}>
                  ${Math.round(item.precio).toLocaleString('es-CL')}
                </Text>
              </View>
              <Text style={styles.serviceVehicle}>{item.vehiculoNombre}</Text>
              <Text style={styles.serviceProvider}>{item.tallerNombre}</Text>
              <View style={styles.serviceDateTime}>
                <Ionicons name="calendar" size={16} color="#666666" />
                <Text style={styles.serviceDateTimeText}>
                  {new Date(item.fechaSeleccionada).toLocaleDateString('es-CL')} a las {item.horaSeleccionada}
                </Text>
              </View>
            </View>
          ))}
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total a Pagar:</Text>
            <Text style={styles.totalAmount}>
              ${Math.round(totalPrice).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>

        {/* Métodos de pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pago</Text>
          {paymentMethods.map(renderPaymentMethod)}
          
          {showBankDetails && selectedPaymentMethod === 'transferencia' && renderBankDetails()}
        </View>

        {/* Términos y condiciones */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <Ionicons 
              name={acceptedTerms ? 'checkbox' : 'square-outline'} 
              size={24} 
              color={acceptedTerms ? '#007AFF' : '#CCCCCC'} 
            />
            <Text style={styles.termsText}>
              Acepto los términos y condiciones de servicio
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botón de confirmación */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!acceptedTerms || isProcessing) && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirmBooking}
          disabled={!acceptedTerms || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirmar Agendamientos</Text>
              <Ionicons name="checkmark-circle" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  headerSpacer: {
    width: 40,
  },
    content: {
    flex: 1,
    // Específico para web: permitir scroll vertical
    ...(Platform.OS === 'web' && {
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      height: 'auto',
      maxHeight: '100%',
    }),
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  serviceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  serviceVehicle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  serviceDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDateTimeText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentMethod: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  paymentMethodNameSelected: {
    color: '#007AFF',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  bankDetailsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  bankDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankDetailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  bankDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    textAlign: 'right',
  },
  bankDetailNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  bankDetailNoteText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  confirmButton: {
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
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default BookingConfirmationScreen; 