import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Clave para AsyncStorage
const BOOKING_CART_STORAGE_KEY = '@booking_cart_data';

// Estados del carrito de agendamiento
const BOOKING_CART_STATES = {
  EMPTY: 'empty',
  HAS_ITEMS: 'has_items',
  READY_TO_CONFIRM: 'ready_to_confirm'
};

// Acciones del reducer
const ACTIONS = {
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  CLEAR_CART: 'CLEAR_CART',
  UPDATE_ITEM: 'UPDATE_ITEM',
  LOAD_FROM_STORAGE: 'LOAD_FROM_STORAGE'
};

// Estado inicial
const initialState = {
  cartItems: [],
  totalItems: 0,
  totalPrice: 0,
  state: BOOKING_CART_STATES.EMPTY,
  isLoaded: false // Para saber si ya se cargó desde AsyncStorage
};

// Función para calcular totales
const calculateTotals = (items) => {
  const totalPrice = items.reduce((total, item) => total + parseFloat(item.precio || 0), 0);
  return {
    totalItems: items.length,
    totalPrice,
    state: items.length > 0 ? BOOKING_CART_STATES.HAS_ITEMS : BOOKING_CART_STATES.EMPTY
  };
};

// Reducer para manejar el estado del carrito
function bookingCartReducer(state, action) {
  console.log('🔧 BookingCartReducer: Acción recibida:', action.type, 'Estado actual isLoaded:', state.isLoaded);

  switch (action.type) {
    case ACTIONS.LOAD_FROM_STORAGE:
      const loadedItems = action.payload || [];
      const loadedTotals = calculateTotals(loadedItems);

      const newLoadedState = {
        ...state,
        cartItems: loadedItems,
        ...loadedTotals,
        isLoaded: true
      };

      console.log('🔧 BookingCartReducer: LOAD_FROM_STORAGE - Nuevo estado:', {
        cartItems: newLoadedState.cartItems.length,
        totalItems: newLoadedState.totalItems,
        isLoaded: newLoadedState.isLoaded
      });

      return newLoadedState;

    case ACTIONS.ADD_TO_CART:
      const newItems = [...state.cartItems, action.payload];
      const newTotals = calculateTotals(newItems);

      const newAddState = {
        ...state,
        cartItems: newItems,
        ...newTotals
      };

      console.log('🔧 BookingCartReducer: ADD_TO_CART - Nuevo estado:', {
        cartItems: newAddState.cartItems.length,
        totalItems: newAddState.totalItems,
        isLoaded: newAddState.isLoaded
      });

      return newAddState;

    case ACTIONS.REMOVE_FROM_CART:
      const filteredItems = state.cartItems.filter(item => item.cartItemID !== action.payload);
      const filteredTotals = calculateTotals(filteredItems);

      const newRemoveState = {
        ...state,
        cartItems: filteredItems,
        ...filteredTotals
      };

      console.log('🔧 BookingCartReducer: REMOVE_FROM_CART - Nuevo estado:', {
        cartItems: newRemoveState.cartItems.length,
        totalItems: newRemoveState.totalItems,
        isLoaded: newRemoveState.isLoaded
      });

      return newRemoveState;

    case ACTIONS.UPDATE_ITEM:
      const updatedItems = state.cartItems.map(item =>
        item.cartItemID === action.payload.cartItemID
          ? { ...item, ...action.payload.updates }
          : item
      );
      const updatedTotals = calculateTotals(updatedItems);

      const newUpdateState = {
        ...state,
        cartItems: updatedItems,
        totalPrice: updatedTotals.totalPrice
      };

      console.log('🔧 BookingCartReducer: UPDATE_ITEM - Nuevo estado:', {
        cartItems: newUpdateState.cartItems.length,
        totalPrice: newUpdateState.totalPrice,
        isLoaded: newUpdateState.isLoaded
      });

      return newUpdateState;

    case ACTIONS.CLEAR_CART:
      const newClearState = {
        ...initialState,
        isLoaded: true
      };

      console.log('🔧 BookingCartReducer: CLEAR_CART - Nuevo estado:', {
        cartItems: newClearState.cartItems.length,
        totalItems: newClearState.totalItems,
        isLoaded: newClearState.isLoaded
      });

      return newClearState;

    default:
      console.log('🔧 BookingCartReducer: Acción no reconocida:', action.type);
      return state;
  }
}

// Crear el contexto
const BookingCartContext = createContext();

// Función para generar IDs únicos usando expo-crypto
const generateUniqueId = async () => {
  try {
    // Usar expo-crypto para generar un UUID
    const uuid = await Crypto.randomUUID();
    return uuid;
  } catch (error) {
    console.warn('expo-crypto no disponible, usando generador alternativo:', error);
    // Generador alternativo usando timestamp + random
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomPart}`;
  }
};

// Función síncrona para generar IDs únicos como fallback
const generateUniqueIdSync = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  const extraRandom = Math.floor(Math.random() * 1000000).toString(36);
  return `cart-${timestamp}-${randomPart}-${extraRandom}`;
};

// Funciones para persistencia
const saveCartToStorage = async (cartItems) => {
  try {
    const cartData = {
      items: cartItems,
      timestamp: new Date().toISOString(),
      version: '1.0' // Para futuras migraciones si es necesario
    };

    const dataString = JSON.stringify(cartData);
    await AsyncStorage.setItem(BOOKING_CART_STORAGE_KEY, dataString);
    console.log('💾 Carrito guardado en AsyncStorage:', cartItems.length, 'items');

    // Verificar que se guardó correctamente
    const verification = await AsyncStorage.getItem(BOOKING_CART_STORAGE_KEY);
    if (!verification) {
      throw new Error('Verificación de guardado falló');
    }

  } catch (error) {
    console.error('❌ Error al guardar carrito en AsyncStorage:', error);
    // Intentar limpiar datos corruptos
    try {
      await AsyncStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      console.log('🧹 Datos corruptos eliminados, reintentando...');
      // Reintentar una vez
      const retryData = {
        items: cartItems,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      await AsyncStorage.setItem(BOOKING_CART_STORAGE_KEY, JSON.stringify(retryData));
      console.log('✅ Reintento de guardado exitoso');
    } catch (retryError) {
      console.error('❌ Error en reintento de guardado:', retryError);
    }
  }
};

const loadCartFromStorage = async () => {
  try {
    console.log('📱 Intentando cargar carrito desde AsyncStorage...');
    const cartDataString = await AsyncStorage.getItem(BOOKING_CART_STORAGE_KEY);

    if (!cartDataString) {
      console.log('📱 No hay carrito guardado en AsyncStorage');
      return [];
    }

    console.log('📱 Datos encontrados en AsyncStorage, parseando...');
    const cartData = JSON.parse(cartDataString);

    // Validar estructura de datos
    if (!cartData || typeof cartData !== 'object') {
      console.warn('⚠️ Estructura de datos inválida, limpiando...');
      await AsyncStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      return [];
    }

    const items = cartData.items || [];

    // Validar que los items sean un array válido
    if (!Array.isArray(items)) {
      console.warn('⚠️ Items no es un array válido, limpiando...');
      await AsyncStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      return [];
    }

    // Validar cada item del carrito
    const validItems = items.filter(item => {
      // Validación más flexible - no requerir servicioNombre ya que podemos obtenerlo de ofertaServicioID
      const isValidBasic = item &&
        typeof item === 'object' &&
        item.cartItemID &&
        item.vehiculoID;

      // Si falta servicioNombre pero tenemos ofertaServicioID, el item sigue siendo válido
      const hasServiceIdentifier = item.servicioNombre || item.ofertaServicioID;

      return isValidBasic && hasServiceIdentifier;
    });

    if (validItems.length !== items.length) {
      console.warn(`⚠️ Se encontraron ${items.length - validItems.length} items inválidos, guardando solo los válidos`);
      // Guardar solo los items válidos
      await saveCartToStorage(validItems);
    }

    console.log('📱 Carrito cargado exitosamente desde AsyncStorage:', validItems.length, 'items válidos');
    return validItems;

  } catch (error) {
    console.error('❌ Error al cargar carrito desde AsyncStorage:', error);

    // En caso de error de parsing, limpiar datos corruptos
    try {
      await AsyncStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      console.log('🧹 Datos corruptos eliminados');
    } catch (cleanupError) {
      console.error('❌ Error al limpiar datos corruptos:', cleanupError);
    }

    return [];
  }
};

const clearCartFromStorage = async () => {
  try {
    await AsyncStorage.removeItem(BOOKING_CART_STORAGE_KEY);
    console.log('🗑️ Carrito eliminado de AsyncStorage');
  } catch (error) {
    console.error('❌ Error al eliminar carrito de AsyncStorage:', error);
  }
};

// Provider del contexto
export function BookingCartProvider({ children }) {
  const [state, dispatch] = useReducer(bookingCartReducer, initialState);

  console.log('🔄 BookingCartProvider: Estado actual:', {
    cartItems: state.cartItems.length,
    totalItems: state.totalItems,
    totalPrice: state.totalPrice,
    isLoaded: state.isLoaded
  });

  // Cargar carrito desde AsyncStorage al inicializar
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones si el componente se desmonta

    const loadInitialCart = async () => {
      console.log('📱 BookingCartProvider: Iniciando carga desde AsyncStorage...');
      try {
        const savedItems = await loadCartFromStorage();
        console.log('📱 BookingCartProvider: Items cargados:', savedItems.length);

        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          dispatch({ type: ACTIONS.LOAD_FROM_STORAGE, payload: savedItems });
          console.log('📱 BookingCartProvider: Dispatch LOAD_FROM_STORAGE ejecutado');
        }
      } catch (error) {
        console.error('❌ BookingCartProvider: Error al cargar carrito inicial:', error);
        // En caso de error, marcar como cargado con carrito vacío
        if (isMounted) {
          dispatch({ type: ACTIONS.LOAD_FROM_STORAGE, payload: [] });
        }
      }
    };

    // Ejecutar inmediatamente sin delay
    loadInitialCart();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Array de dependencias vacío para ejecutar solo una vez

  // Guardar carrito en AsyncStorage cada vez que cambie (excepto en la carga inicial)
  useEffect(() => {
    console.log('💾 BookingCartProvider: useEffect save - isLoaded:', state.isLoaded, 'items:', state.cartItems.length);

    // Solo guardar si ya se cargó inicialmente y hay cambios reales
    if (state.isLoaded) {
      // Usar un pequeño delay para evitar guardados excesivos durante cambios rápidos
      const timeoutId = setTimeout(() => {
        saveCartToStorage(state.cartItems);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [state.cartItems, state.isLoaded]);

  // Función para agregar un item al carrito
  const addToCart = useCallback((serviceOffer, vehiculo, selectedDate, selectedTimeSlot, additionalData = {}) => {
    console.log('🚨 NEW SERVICE - AddToCart DEBUG:');
    console.log('🚨 serviceOffer COMPLETO:', JSON.stringify(serviceOffer, null, 2));
    console.log('🚨 serviceOffer keys:', Object.keys(serviceOffer || {}));
    console.log('🚨 additionalData:', JSON.stringify(additionalData, null, 2));

    // Mejorar el mapeo de servicioNombre para soportar múltiples estructuras
    let servicioNombre = 'Servicio sin nombre';

    // Intentar múltiples fuentes para el nombre del servicio
    if (serviceOffer.nombre) {
      servicioNombre = serviceOffer.nombre;
      console.log('✅ servicioNombre encontrado en serviceOffer.nombre:', servicioNombre);
    } else if (serviceOffer.servicio_info?.nombre) {
      servicioNombre = serviceOffer.servicio_info.nombre;
      console.log('✅ servicioNombre encontrado en serviceOffer.servicio_info.nombre:', servicioNombre);
    } else if (serviceOffer.servicio?.nombre) {
      servicioNombre = serviceOffer.servicio.nombre;
      console.log('✅ servicioNombre encontrado en serviceOffer.servicio.nombre:', servicioNombre);
    } else if (serviceOffer.servicio_nombre) {
      servicioNombre = serviceOffer.servicio_nombre;
      console.log('✅ servicioNombre encontrado en serviceOffer.servicio_nombre:', servicioNombre);
    } else if (serviceOffer.ofertaServicioID) {
      // Fallback: extraer nombre del ID
      const cleanName = serviceOffer.ofertaServicioID
        .split('-')
        .slice(1)
        .join(' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      servicioNombre = cleanName;
      console.log('⚠️ servicioNombre generado desde ofertaServicioID:', servicioNombre);
    } else {
      console.warn('❌ NO SE ENCONTRÓ servicioNombre en ninguna fuente para:', serviceOffer.id);
      console.log('❌ Estructura completa del serviceOffer:');
      console.log('❌', JSON.stringify(serviceOffer, null, 2));
    }

    console.log('🔧 FINAL servicioNombre que se guardará:', servicioNombre);

    // 🔧 CORREGIR CÁLCULO DE PRECIO: Usar conRepuestos para decidir qué precio usar
    const conRepuestos = additionalData.conRepuestos !== false; // default true
    let precioFinal = 0;

    if (conRepuestos) {
      precioFinal = parseFloat(serviceOffer.precio_con_repuestos || 0);
      console.log('💰 Usando precio CON repuestos:', precioFinal);
    } else {
      precioFinal = parseFloat(serviceOffer.precio_sin_repuestos || 0);
      console.log('💰 Usando precio SIN repuestos:', precioFinal);
    }

    // Si no se encuentra el precio específico, usar fallbacks
    if (precioFinal === 0) {
      console.warn('⚠️ Precio específico no encontrado, usando fallbacks...');
      precioFinal = parseFloat(serviceOffer.precio_con_repuestos || serviceOffer.precio_sin_repuestos || 0);
      console.log('💰 Precio fallback:', precioFinal);
    }

    console.log('💰 PRECIO FINAL CALCULADO:', precioFinal, 'conRepuestos:', conRepuestos);

    const cartItem = {
      cartItemID: generateUniqueIdSync(),
      ofertaServicioID: serviceOffer.id,
      servicioNombre: servicioNombre,
      tallerNombre: serviceOffer.taller_info?.nombre || serviceOffer.nombre_proveedor,
      tallerDireccion: serviceOffer.taller_info?.direccion || '',
      tallerID: serviceOffer.taller || serviceOffer.taller_info?.id,
      vehiculoID: vehiculo.id,
      vehiculoNombre: `${vehiculo.marca_nombre} ${vehiculo.modelo_nombre} ${vehiculo.year}`,
      vehiculoPatente: vehiculo.patente,
      fechaSeleccionada: selectedDate, // ISO string
      horaSeleccionada: selectedTimeSlot, // e.g., "10:00"
      precio: precioFinal, // 🔧 USAR EL PRECIO CORREGIDO
      conRepuestos: conRepuestos,
      duracionEstimada: serviceOffer.duracion_estimada,
      tipoProveedor: serviceOffer.tipo_proveedor || 'taller',
      // Datos adicionales para la confirmación
      ofertaCompleta: serviceOffer,
      vehiculoCompleto: vehiculo,
      fechaCreacion: new Date().toISOString()
    };

    console.log('📦 Agregando item al carrito local:', cartItem);
    dispatch({ type: ACTIONS.ADD_TO_CART, payload: cartItem });

    return cartItem;
  }, []);

  // Función para remover un item del carrito
  const removeFromCart = useCallback((cartItemID) => {
    console.log('🗑️ Removiendo item del carrito:', cartItemID);
    dispatch({ type: ACTIONS.REMOVE_FROM_CART, payload: cartItemID });
  }, []);

  // Función para actualizar un item del carrito
  const updateCartItem = useCallback((cartItemID, updates) => {
    console.log('✏️ Actualizando item del carrito:', cartItemID, updates);
    dispatch({ type: ACTIONS.UPDATE_ITEM, payload: { cartItemID, updates } });
  }, []);

  // Función para limpiar el carrito
  const clearCart = useCallback(async () => {
    console.log('🧹 Limpiando carrito de agendamiento');
    dispatch({ type: ACTIONS.CLEAR_CART });
    await clearCartFromStorage();
  }, []);

  // Función para obtener items por vehículo
  const getItemsByVehicle = useCallback((vehiculoID) => {
    return state.cartItems.filter(item => item.vehiculoID === vehiculoID);
  }, [state.cartItems]);

  // Función para verificar si un servicio ya está en el carrito
  const isServiceInCart = useCallback((ofertaServicioID, vehiculoID) => {
    return state.cartItems.some(item =>
      item.ofertaServicioID === ofertaServicioID &&
      item.vehiculoID === vehiculoID
    );
  }, [state.cartItems]);

  // Función para calcular el total por vehículo
  const getTotalByVehicle = useCallback((vehiculoID) => {
    const vehicleItems = getItemsByVehicle(vehiculoID);
    return vehicleItems.reduce((total, item) => total + parseFloat(item.precio), 0);
  }, [getItemsByVehicle]);

  // Función para reparar items existentes sin servicioNombre
  const repairCartItems = useCallback(async () => {
    console.log('🔧 INICIANDO REPARACIÓN DE ITEMS DEL CARRITO...');

    const itemsNeedingRepair = state.cartItems.filter(item =>
      !item.servicioNombre || item.servicioNombre === 'Servicio sin nombre'
    );

    if (itemsNeedingRepair.length === 0) {
      console.log('✅ No hay items que necesiten reparación');
      return;
    }

    console.log(`🔧 Encontrados ${itemsNeedingRepair.length} items que necesitan reparación`);

    const repairedItems = state.cartItems.map(item => {
      if (!item.servicioNombre || item.servicioNombre === 'Servicio sin nombre') {
        console.log('🔧 Reparando item:', item.cartItemID, 'ofertaServicioID:', item.ofertaServicioID);

        // Aplicar la misma lógica que addToCart para obtener servicioNombre
        let servicioNombre = 'Servicio sin nombre';

        // Intentar obtener desde ofertaCompleta
        if (item.ofertaCompleta?.nombre) {
          servicioNombre = item.ofertaCompleta.nombre;
          console.log('🔧 Nombre encontrado en ofertaCompleta.nombre:', servicioNombre);
        } else if (item.ofertaCompleta?.servicio_info?.nombre) {
          servicioNombre = item.ofertaCompleta.servicio_info.nombre;
          console.log('🔧 Nombre encontrado en ofertaCompleta.servicio_info.nombre:', servicioNombre);
        } else if (item.ofertaCompleta?.servicio?.nombre) {
          servicioNombre = item.ofertaCompleta.servicio.nombre;
          console.log('🔧 Nombre encontrado en ofertaCompleta.servicio.nombre:', servicioNombre);
        } else if (item.ofertaCompleta?.servicio_nombre) {
          servicioNombre = item.ofertaCompleta.servicio_nombre;
          console.log('🔧 Nombre encontrado en ofertaCompleta.servicio_nombre:', servicioNombre);
        } else if (item.ofertaServicioID) {
          // Extraer nombre del ID como último recurso
          const cleanName = item.ofertaServicioID
            .split('-')
            .slice(1)
            .join(' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          servicioNombre = cleanName;
          console.log('🔧 Nombre generado desde ofertaServicioID:', servicioNombre);
        }

        return { ...item, servicioNombre };
      }
      return item;
    });

    // Actualizar el estado con los items reparados
    dispatch({ type: ACTIONS.LOAD_FROM_STORAGE, payload: repairedItems });

    console.log(`✅ Reparación completada. ${itemsNeedingRepair.length} items reparados`);
  }, [state.cartItems]);

  // Función para debugging - verificar estado de AsyncStorage
  const debugAsyncStorage = useCallback(async () => {
    try {
      console.log('🔍 === DEBUG ASYNC STORAGE ===');
      const cartDataString = await AsyncStorage.getItem(BOOKING_CART_STORAGE_KEY);

      if (!cartDataString) {
        console.log('🔍 AsyncStorage: NO HAY DATOS');
        return { hasData: false, data: null };
      }

      console.log('🔍 AsyncStorage RAW:', cartDataString.substring(0, 200) + '...');

      try {
        const cartData = JSON.parse(cartDataString);
        console.log('🔍 AsyncStorage PARSED:', {
          hasItems: !!cartData.items,
          itemsLength: cartData.items?.length || 0,
          timestamp: cartData.timestamp,
          version: cartData.version
        });

        if (cartData.items && cartData.items.length > 0) {
          console.log('🔍 Primer item:', {
            cartItemID: cartData.items[0].cartItemID,
            servicioNombre: cartData.items[0].servicioNombre,
            vehiculoNombre: cartData.items[0].vehiculoNombre,
            precio: cartData.items[0].precio
          });
        }

        return { hasData: true, data: cartData };
      } catch (parseError) {
        console.log('🔍 ERROR AL PARSEAR:', parseError.message);
        return { hasData: true, data: null, error: parseError.message };
      }

    } catch (error) {
      console.log('🔍 ERROR GENERAL:', error.message);
      return { hasData: false, data: null, error: error.message };
    }
  }, []);

  // Asegurar que isLoaded siempre tenga un valor válido
  const safeIsLoaded = state.isLoaded === true;

  const value = useMemo(() => ({
    // Estado
    cartItems: state.cartItems,
    totalItems: state.totalItems,
    totalPrice: state.totalPrice,
    cartState: state.state,
    isLoaded: safeIsLoaded, // Garantizar que siempre sea boolean

    // Acciones
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,

    // Utilidades
    getItemsByVehicle,
    isServiceInCart,
    getTotalByVehicle,

    // Debugging (solo en desarrollo)
    debugAsyncStorage: __DEV__ ? debugAsyncStorage : undefined,
    repairCartItems: __DEV__ ? repairCartItems : undefined,

    // Constantes
    BOOKING_CART_STATES
  }), [
    state.cartItems,
    state.totalItems,
    state.totalPrice,
    state.state,
    safeIsLoaded,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    getItemsByVehicle,
    isServiceInCart,
    getTotalByVehicle,
    debugAsyncStorage,
    repairCartItems
  ]);

  console.log('📤 BookingCartProvider: Valor del contexto:', {
    cartItems: value.cartItems.length,
    totalItems: value.totalItems,
    totalPrice: value.totalPrice,
    isLoaded: value.isLoaded
  });

  return (
    <BookingCartContext.Provider value={value}>
      {children}
    </BookingCartContext.Provider>
  );
}

// Hook para usar el contexto
export function useBookingCart() {
  const context = useContext(BookingCartContext);
  if (!context) {
    throw new Error('useBookingCart debe ser usado dentro de un BookingCartProvider');
  }
  return context;
}

export default BookingCartContext; 