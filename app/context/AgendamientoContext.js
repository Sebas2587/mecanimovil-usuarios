import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import agendamientoService from '../services/agendamientoService';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

// Estados del carrito
const CARRITO_STATES = {
  VACIO: 'vacio',
  CON_SERVICIOS: 'con_servicios',
  CON_FECHA_HORA: 'con_fecha_hora',
  LISTO_PARA_CONFIRMAR: 'listo_para_confirmar',
  CONFIRMANDO: 'confirmando',
  CONFIRMADO: 'confirmado'
};

// Pasos del flujo de agendamiento
const PASOS_AGENDAMIENTO = {
  CONFIGURAR_SERVICIO: 'configurar_servicio',
  SELECCIONAR_PROVEEDOR: 'seleccionar_proveedor',
  SELECCIONAR_FECHA_HORA: 'seleccionar_fecha_hora',
  CARRITO: 'carrito',
  OPCIONES_PAGO: 'opciones_pago',
  CONFIRMACION: 'confirmacion'
};

// Acciones del reducer
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CARRITO: 'SET_CARRITO',
  SET_CARRITOS: 'SET_CARRITOS',
  SET_ERROR: 'SET_ERROR',
  AGREGAR_SERVICIO: 'AGREGAR_SERVICIO',
  REMOVER_SERVICIO: 'REMOVER_SERVICIO',
  ACTUALIZAR_ITEM: 'ACTUALIZAR_ITEM',
  SET_FECHA_HORA: 'SET_FECHA_HORA',
  SET_DISPONIBILIDAD: 'SET_DISPONIBILIDAD',
  LIMPIAR_CARRITO: 'LIMPIAR_CARRITO',
  SET_METODO_PAGO: 'SET_METODO_PAGO',
  SET_ACEPTA_TERMINOS: 'SET_ACEPTA_TERMINOS',
  SET_PASO_ACTUAL: 'SET_PASO_ACTUAL',
  SET_CONFIGURACION_SERVICIO: 'SET_CONFIGURACION_SERVICIO',
  RESET_STATE: 'RESET_STATE',
  FORCE_UPDATE: 'FORCE_UPDATE'
};

// Estado inicial
const initialState = {
  carrito: null,
  carritos: [],
  loading: false,
  error: null,
  disponibilidad: null,
  metodoPago: null,
  aceptaTerminos: false,
  estado: CARRITO_STATES.VACIO,
  pasoActual: null,
  configuracionServicio: null,
  forceUpdateCounter: 0,
  lastUpdate: Date.now()
};

// Reducer para manejar el estado del carrito
function carritoReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null
      };

    case ACTIONS.SET_CARRITO:
      const carrito = action.payload;
      let nuevoEstado = CARRITO_STATES.VACIO;
      
      if (carrito && carrito.items && carrito.items.length > 0) {
        if (carrito.fecha_servicio && carrito.hora_servicio) {
          nuevoEstado = CARRITO_STATES.CON_FECHA_HORA;
        } else {
          nuevoEstado = CARRITO_STATES.CON_SERVICIOS;
        }
      }
      
      return {
        ...state,
        carrito: carrito,
        loading: false,
        error: null,
        estado: nuevoEstado,
        lastUpdate: Date.now()
      };

    case ACTIONS.SET_CARRITOS:
      return {
        ...state,
        carritos: action.payload,
        loading: false,
        error: null,
        lastUpdate: Date.now()
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case ACTIONS.AGREGAR_SERVICIO:
      return {
        ...state,
        carrito: {
          ...state.carrito,
          items: [...(state.carrito?.items || []), action.payload]
        },
        estado: CARRITO_STATES.CON_SERVICIOS,
        lastUpdate: Date.now()
      };

    case ACTIONS.REMOVER_SERVICIO:
      const itemsActualizados = state.carrito?.items?.filter(
        item => item.id !== action.payload
      ) || [];
      
      return {
        ...state,
        carrito: {
          ...state.carrito,
          items: itemsActualizados
        },
        estado: itemsActualizados.length > 0 ? CARRITO_STATES.CON_SERVICIOS : CARRITO_STATES.VACIO,
        lastUpdate: Date.now()
      };

    case ACTIONS.SET_FECHA_HORA:
      return {
        ...state,
        carrito: {
          ...state.carrito,
          fecha_servicio: action.payload.fecha,
          hora_servicio: action.payload.hora
        },
        estado: CARRITO_STATES.CON_FECHA_HORA,
        lastUpdate: Date.now()
      };

    case ACTIONS.SET_DISPONIBILIDAD:
      return {
        ...state,
        disponibilidad: action.payload
      };

    case ACTIONS.SET_METODO_PAGO:
      return {
        ...state,
        metodoPago: action.payload
      };

    case ACTIONS.SET_ACEPTA_TERMINOS:
      return {
        ...state,
        aceptaTerminos: action.payload
      };

    case ACTIONS.LIMPIAR_CARRITO:
      return {
        ...initialState,
        forceUpdateCounter: state.forceUpdateCounter
      };

    case ACTIONS.SET_PASO_ACTUAL:
      return {
        ...state,
        pasoActual: action.payload
      };

    case ACTIONS.SET_CONFIGURACION_SERVICIO:
      return {
        ...state,
        configuracionServicio: action.payload
      };

    case ACTIONS.RESET_STATE:
      return {
        ...initialState,
        forceUpdateCounter: state.forceUpdateCounter + 1
      };

    case ACTIONS.FORCE_UPDATE:
      return {
        ...state,
        forceUpdateCounter: state.forceUpdateCounter + 1,
        lastUpdate: Date.now()
      };

    default:
      return state;
  }
}

// NUEVO: Hook personalizado para selectores optimizados
export function useAgendamientoSelector(selector, deps = []) {
  const context = useContext(AgendamientoContext);
  if (!context) {
    throw new Error('useAgendamientoSelector debe ser usado dentro de un AgendamientoProvider');
  }

  return useMemo(
    () => selector(context),
    [context.lastUpdate, context.forceUpdateCounter, ...deps]
  );
}

// NUEVO: Selectores predefinidos para casos comunes
export const agendamientoSelectors = {
  // Selector para estado de carrito individual
  carritoState: (state) => ({
    carrito: state.carrito,
    loading: state.loading,
    error: state.error,
    totalServicios: state.carrito?.cantidad_items || state.carrito?.items?.length || 0,
    totalEstimado: state.carrito?.total || state.carrito?.total_estimado || 0,
    tieneServicios: (state.carrito?.cantidad_items || state.carrito?.items?.length || 0) > 0,
    tieneFechaHora: !!(state.carrito?.fecha_servicio && state.carrito?.hora_servicio)
  }),

  // Selector para estado global de carritos
  carritosGlobalState: (state) => {
    const totalServiciosGlobal = state.carritos.reduce((total, carrito) => {
      const cantidad = carrito.cantidad_items || carrito.items?.length || 0;
      return total + cantidad;
    }, 0);

    const totalEstimadoGlobal = state.carritos.reduce((total, carrito) => {
      const carritoTotal = parseFloat(carrito.total || carrito.total_estimado || 0);
      return total + carritoTotal;
    }, 0);

    return {
      carritos: state.carritos,
      totalServiciosGlobal,
      totalEstimadoGlobal,
      tieneServiciosGlobal: totalServiciosGlobal > 0,
      cantidadCarritos: state.carritos.length,
      todosLosItems: state.carritos.flatMap(carrito => 
        (carrito.items_detail || carrito.items || []).map(item => ({
          ...item,
          carrito_id: carrito.id,
          vehiculo_info: carrito.vehiculo_detail,
          taller_info: carrito.taller_detail
        }))
      )
    };
  },

  // Selector solo para loading
  loadingState: (state) => ({
    loading: state.loading,
    error: state.error
  }),

  // Selector para flujo de agendamiento
  flujoState: (state) => ({
    pasoActual: state.pasoActual,
    configuracionServicio: state.configuracionServicio,
    metodoPago: state.metodoPago,
    aceptaTerminos: state.aceptaTerminos,
    disponibilidad: state.disponibilidad
  })
};

// Crear el contexto
const AgendamientoContext = createContext();

// Provider del contexto
export function AgendamientoProvider({ children }) {
  const [state, dispatch] = useReducer(carritoReducer, initialState);
  
  // NUEVO: Obtener estado de autenticación
  const { user, token } = useAuth();
  
  // Referencias para optimizar el debounce
  const debounceTimeoutRef = useRef(null);
  const ultimaCargaRef = useRef(0);
  const stateChangeCallbacksRef = useRef([]);
  
  // NUEVO: Referencias para callbacks de notificación optimizadas
  const notificationCallbacksRef = useRef(new Set());

  // NUEVO: Función de debounce para actualizaciones
  const debouncedForceUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 AgendamientoContext: Ejecutando actualización debounced');
      dispatch({ type: ACTIONS.FORCE_UPDATE });
      
      // Notificar a callbacks después del dispatch
      notificationCallbacksRef.current.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error en callback de notificación:', error);
        }
      });
    }, 300); // Debounce de 300ms
  }, []);

  // NUEVO: Función para registrar callbacks de notificación optimizada
  const registerStateChangeCallback = useCallback((callback) => {
    notificationCallbacksRef.current.add(callback);
    
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

  // NUEVO: Invalidar caché de manera más controlada
  const invalidarCacheCompleto = useCallback(() => {
    console.log('💥 AgendamientoContext: Invalidando caché completo');
    ultimaCargaRef.current = 0;
    stateChangeCallbacksRef.current = [];
    dispatch({ type: ACTIONS.RESET_STATE });
  }, []);

  // NUEVA: Función simplificada y más confiable para cargar carritos
  const cargarTodosLosCarritos = useCallback(async (mostrarLoading = true) => {
    // NUEVO: Verificar autenticación antes de hacer llamadas
    if (!user || !token) {
      console.log('ℹ️ AgendamientoContext: Usuario no autenticado, no se cargarán carritos');
      dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
      dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
      return [];
    }
    
    if (mostrarLoading) {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    }
    
    try {
      console.log('🛒 AgendamientoContext: Cargando carritos DETALLADOS del cliente...');
      
      // CORRECCIÓN CRÍTICA: Usar obtenerCarritosActivosDetallados() para obtener información completa
      // incluyendo oferta_servicio_detail con taller_info/mecanico_info
      const carritosDetallados = await agendamientoService.obtenerCarritosActivosDetallados();
      
      console.log('✅ AgendamientoContext: Carritos DETALLADOS cargados:', carritosDetallados.length);
      if (carritosDetallados.length > 0) {
        console.log('📋 Items en carrito:', carritosDetallados[0].items_detail?.length || 0);
        // Log de estructura del primer item para debug
        if (carritosDetallados[0].items_detail && carritosDetallados[0].items_detail.length > 0) {
          const primerItem = carritosDetallados[0].items_detail[0];
          console.log('📸 Primer item estructura:', JSON.stringify({
            id: primerItem.id,
            servicio_nombre: primerItem.servicio_nombre,
            tiene_oferta_servicio_detail: !!primerItem.oferta_servicio_detail,
            tiene_taller_info: !!primerItem.taller_info,
            tiene_mecanico_info: !!primerItem.mecanico_info
          }, null, 2));
        }
      }
      
      dispatch({ type: ACTIONS.SET_CARRITOS, payload: carritosDetallados });
      
      // Si hay carrito, también establecerlo como carrito actual
      if (carritosDetallados.length > 0) {
        dispatch({ type: ACTIONS.SET_CARRITO, payload: carritosDetallados[0] });
      } else {
        dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
      }
      
      return carritosDetallados;
    } catch (error) {
      console.error('❌ AgendamientoContext: Error cargando carritos:', error);
      
      // NUEVO: Si es error de autenticación, limpiar estado silenciosamente
      if (error.status === 401) {
        console.log('ℹ️ AgendamientoContext: Error 401 - usuario no autenticado');
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
        dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
        return [];
      }
      
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return [];
    } finally {
      if (mostrarLoading) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }
  }, [user, token]); // NUEVO: Dependencias de autenticación

  const cargarCarritoActivo = useCallback(async (vehiculoId = null, mostrarLoading = true) => {
    // NUEVO: Verificar autenticación antes de hacer llamadas
    if (!user || !token) {
      console.log('ℹ️ AgendamientoContext: Usuario no autenticado, no se cargará carrito activo');
      dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
      dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
      return null;
    }
    
    if (mostrarLoading) {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    }
    
    try {
      console.log('🛒 AgendamientoContext: Cargando carrito activo del cliente...');
      
      // SIMPLIFICADO: Un solo carrito por cliente
      const carrito = await agendamientoService.obtenerCarritoActivo();
      
      if (carrito) {
        console.log('✅ AgendamientoContext: Carrito activo cargado:', carrito.id);
        dispatch({ type: ACTIONS.SET_CARRITO, payload: carrito });
        
        // También actualizar la lista de carritos para compatibilidad
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: [carrito] });
      } else {
        console.log('ℹ️ AgendamientoContext: No hay carrito activo');
        dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
      }
      
      return carrito;
    } catch (error) {
      console.error('❌ AgendamientoContext: Error cargando carrito activo:', error);
      
      // NUEVO: Si es error de autenticación, limpiar estado silenciosamente
      if (error.status === 401) {
        console.log('ℹ️ AgendamientoContext: Error 401 - usuario no autenticado');
        dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
        return null;
      }
      
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return null;
    } finally {
      if (mostrarLoading) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }
  }, [user, token]); // NUEVO: Dependencias de autenticación

  const obtenerOCrearCarrito = useCallback(async (vehiculoId) => {
    if (!vehiculoId) {
      throw new Error('No hay vehículo seleccionado');
    }

    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const carrito = await agendamientoService.obtenerOCrearCarrito(vehiculoId);
      dispatch({ type: ACTIONS.SET_CARRITO, payload: carrito });
      return carrito;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const agregarServicio = useCallback(async (configuracion) => {
    const { ofertaSeleccionada, conRepuestos, vehiculoId, fecha, hora } = configuracion;
    
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      console.log('🔧 AgendamientoContext: Agregando servicio al carrito...');
      
      // VALIDACIÓN: Verificar si ya existe el mismo servicio en el carrito
      const carritoActual = await agendamientoService.obtenerCarritoActivo();
      if (carritoActual && carritoActual.items_detail) {
        const servicioExistente = carritoActual.items_detail.find(item => 
          item.oferta_servicio === ofertaSeleccionada.id && 
          item.vehiculo === vehiculoId
        );
        
        if (servicioExistente) {
          console.log('⚠️ AgendamientoContext: Servicio ya existe en el carrito');
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          throw new Error('Este servicio ya está agregado al carrito para este vehículo');
        }
      }
      
      // Obtener o crear carrito único
      const carrito = await agendamientoService.obtenerOCrearCarrito(vehiculoId);
      
      // Agregar servicio con fecha y hora
      await agendamientoService.agregarServicioAlCarritoCompleto(
        carrito.id,
        ofertaSeleccionada.id,
        conRepuestos,
        1,
        fecha,
        hora
      );
      
      // Recargar carrito actualizado
      const carritoActualizado = await agendamientoService.obtenerCarritoActivo();
      
      console.log('✅ AgendamientoContext: Servicio agregado exitosamente');
      dispatch({ type: ACTIONS.SET_CARRITO, payload: carritoActualizado });
      dispatch({ type: ACTIONS.SET_CARRITOS, payload: carritoActualizado ? [carritoActualizado] : [] });
      dispatch({ type: ACTIONS.FORCE_UPDATE });
      
      return carritoActualizado;
    } catch (error) {
      console.error('❌ AgendamientoContext: Error agregando servicio:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // NUEVA: Función específica para agregar servicio con fecha y hora desde configuración completa
  const agregarServicioConFechaHora = useCallback(async (vehiculoId, ofertaId, conRepuestos, fecha, hora) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      console.log('🔧 AgendamientoContext: Agregando servicio con fecha y hora al carrito...');
      console.log('🔍 Parámetros recibidos:', {
        vehiculoId,
        ofertaId,
        conRepuestos,
        fecha,
        hora
      });
      
      // Obtener o crear carrito único
      const carrito = await agendamientoService.obtenerOCrearCarrito(vehiculoId);
      console.log('🛒 Carrito obtenido/creado:', carrito.id);
      
      // Agregar servicio con fecha y hora
      await agendamientoService.agregarServicioAlCarritoCompleto(
        carrito.id,
        ofertaId,
        conRepuestos,
        1, // cantidad por defecto
        fecha,
        hora
      );
      
      console.log('✅ Servicio agregado al carrito con fecha y hora');
      
      // Recargar carrito actualizado
      const carritoActualizado = await agendamientoService.obtenerCarritoActivo();
      
      console.log('✅ AgendamientoContext: Servicio con fecha/hora agregado exitosamente');
      dispatch({ type: ACTIONS.SET_CARRITO, payload: carritoActualizado });
      dispatch({ type: ACTIONS.SET_CARRITOS, payload: carritoActualizado ? [carritoActualizado] : [] });
      dispatch({ type: ACTIONS.FORCE_UPDATE });
      
      return carritoActualizado;
    } catch (error) {
      console.error('❌ AgendamientoContext: Error agregando servicio con fecha/hora:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const removerServicio = useCallback(async (carritoId, itemId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      await agendamientoService.removerServicioDelCarrito(carritoId, itemId);
      
      console.log('✅ AgendamientoContext: Servicio removido del backend');
      
      // CORREGIDO: Recarga más controlada sin usar recargarDespuesDeCambio automáticamente
      try {
        // 1. Cargar carritos actualizados
        const carritosActualizados = await agendamientoService.obtenerCarritosActivosDetallados();
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: carritosActualizados });
        
        // 2. Forzar update para notificar a componentes
        dispatch({ type: ACTIONS.FORCE_UPDATE });
        
        console.log('✅ AgendamientoContext: Estado actualizado después de remover servicio');
      } catch (reloadError) {
        console.error('⚠️ AgendamientoContext: Error recargando después de remover:', reloadError);
        // Si falla la recarga, al menos forzar un update
        dispatch({ type: ACTIONS.FORCE_UPDATE });
      }
      
      return true;
    } catch (error) {
      console.error('AgendamientoContext: Error al remover servicio:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const confirmarAgendamiento = useCallback(async (carritoId, metodoPago, aceptaTerminos, notas = '') => {
    try {
      console.log('🚀 AgendamientoContext: Iniciando confirmación de agendamiento para carrito:', carritoId);
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      const solicitud = await agendamientoService.confirmarAgendamiento(
        carritoId,
        metodoPago,
        aceptaTerminos,
        notas
      );
      
      console.log('✅ AgendamientoContext: Agendamiento confirmado exitosamente:', solicitud);
      
      // IMPORTANTE: Después de confirmar, el carrito se marca como inactivo en el backend
      // No intentar recargar inmediatamente para evitar errores 404
      
      // Limpiar el carrito actual del estado local ya que ahora está inactivo
      dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
      
      // Programar recarga de carritos después de un pequeño delay para permitir
      // que el backend procese completamente la confirmación
      setTimeout(async () => {
        try {
          console.log('🔄 AgendamientoContext: Recargando carritos después de confirmación');
          await recargarDespuesDeCambio('confirmar_agendamiento');
        } catch (error) {
          console.log('⚠️ AgendamientoContext: Error al recargar después de confirmación (normal):', error.message);
          // Es normal que algunos carritos ya no estén disponibles después de la confirmación
        }
      }, 1000);
      
      return solicitud;
    } catch (error) {
      console.error('❌ AgendamientoContext: Error al confirmar agendamiento:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Función específica para recargar después de cambios críticos (optimizada)
  const recargarDespuesDeCambio = useCallback(async (tipoOperacion = 'unknown') => {
    console.log(`🔄 AgendamientoContext: Recargando después de ${tipoOperacion}`);
    
    try {
      // 1. Invalidar cache inmediatamente
      ultimaCargaRef.current = 0;
      
      // 2. Cargar datos frescos del backend
      const carritos = await cargarTodosLosCarritos(true);
      console.log(`✅ AgendamientoContext: Carritos recargados para ${tipoOperacion}:`, carritos?.length || 0);
      
      // 3. Forzar update inmediato para componentes que necesiten sincronización rápida
      dispatch({ type: ACTIONS.FORCE_UPDATE });
      console.log(`🚀 AgendamientoContext: Force update inmediato ejecutado para ${tipoOperacion}`);
      
      // 4. Ejecutar debounced update adicional
      debouncedForceUpdate();
      
      // 5. Pequeña pausa para asegurar propagación del estado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return carritos;
    } catch (error) {
      console.error(`❌ AgendamientoContext: Error en recargarDespuesDeCambio (${tipoOperacion}):`, error);
      
      // Para operaciones de confirmación, los errores 404 son normales
      if (tipoOperacion === 'confirmar_agendamiento' && error.message && error.message.includes('404')) {
        console.log(`ℹ️ AgendamientoContext: Error 404 después de confirmación es normal - carritos ya están inactivos`);
        // Limpiar estado local y forzar update
        dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
        dispatch({ type: ACTIONS.SET_CARRITO, payload: null });
        dispatch({ type: ACTIONS.FORCE_UPDATE });
        return [];
      }
      
      // En caso de otros errores, al menos forzar un update
      dispatch({ type: ACTIONS.FORCE_UPDATE });
      return [];
    }
  }, [cargarTodosLosCarritos, debouncedForceUpdate]);

  // Otras funciones simplificadas...
  const seleccionarFechaHora = useCallback(async (fecha, hora) => {
    if (!state.carrito) {
      throw new Error('No hay carrito activo');
    }

    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      const fechaFormateada = agendamientoService.formatearFecha(fecha);
      const horaFormateada = agendamientoService.formatearHora(hora);
      
      const carritoActualizado = await agendamientoService.seleccionarFechaHora(
        state.carrito.id,
        fechaFormateada,
        horaFormateada
      );
      
      dispatch({ type: ACTIONS.SET_CARRITO, payload: carritoActualizado });
      
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      Alert.alert('Error', 'No se pudo seleccionar la fecha y hora');
      throw error;
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [state.carrito]);

  // Funciones simples que no necesitan optimización
  const setMetodoPago = useCallback((metodo) => {
    dispatch({ type: ACTIONS.SET_METODO_PAGO, payload: metodo });
  }, []);

  const setAceptaTerminos = useCallback((acepta) => {
    dispatch({ type: ACTIONS.SET_ACEPTA_TERMINOS, payload: acepta });
  }, []);

  const limpiarCarrito = useCallback(() => {
    dispatch({ type: ACTIONS.LIMPIAR_CARRITO });
  }, []);

  const setPasoActual = useCallback((paso) => {
    dispatch({ type: ACTIONS.SET_PASO_ACTUAL, payload: paso });
  }, []);

  const setConfiguracionServicio = useCallback((configuracion) => {
    dispatch({ type: ACTIONS.SET_CONFIGURACION_SERVICIO, payload: configuracion });
  }, []);

  // Cleanup del debounce
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // NUEVO: INICIALIZACIÓN AUTOMÁTICA AL MONTAR EL CONTEXTO (SOLO SI HAY USUARIO AUTENTICADO)
  useEffect(() => {
    let isMounted = true;
    
    const inicializarContexto = async () => {
      // NUEVO: Verificar autenticación antes de hacer llamadas
      if (!user || !token) {
        console.log('ℹ️ AgendamientoContext: Usuario no autenticado, saltando inicialización automática');
        return;
      }
      
      console.log('🚀 AgendamientoContext: INICIALIZACIÓN AUTOMÁTICA al montar el contexto');
      
      try {
        // Verificar si ya hay datos cargados para evitar cargas duplicadas
        if (state.carritos.length > 0) {
          console.log('ℹ️ AgendamientoContext: Ya hay carritos cargados, saltando inicialización');
          return;
        }
        
        // Cargar carritos automáticamente al inicializar el contexto
        console.log('🔄 AgendamientoContext: Cargando carritos automáticamente...');
        const carritosIniciales = await cargarTodosLosCarritos(false);
        
        if (isMounted) {
          console.log('✅ AgendamientoContext: Inicialización automática completada');
          console.log(`📊 AgendamientoContext: ${carritosIniciales?.length || 0} carritos cargados en la inicialización`);
          
          // Forzar un update para notificar a todos los componentes
          dispatch({ type: ACTIONS.FORCE_UPDATE });
        }
        
      } catch (error) {
        if (isMounted) {
          console.error('❌ AgendamientoContext: Error en inicialización automática:', error);
          
          // En caso de error, asegurar que el estado esté limpio
          dispatch({ type: ACTIONS.SET_CARRITOS, payload: [] });
          dispatch({ type: ACTIONS.SET_ERROR, payload: null }); // No mostrar error de inicialización al usuario
        }
      }
    };
    
    // Ejecutar inicialización con un pequeño delay para permitir que otros contextos se inicialicen
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        inicializarContexto();
      }
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user, token]); // NUEVO: Depender de user y token

  // NUEVO: Value del contexto optimizado con memoización estricta
  const contextValue = useMemo(() => {
    // NUEVO: Calcular propiedades derivadas que necesita CarritoAgendamiento
    const todosLosItems = state.carritos.reduce((acc, carrito) => {
      return acc.concat(carrito.items || []);
    }, []);
    
    const totalServiciosGlobal = todosLosItems.length;
    const tieneServiciosGlobal = totalServiciosGlobal > 0;
    const totalEstimadoGlobal = todosLosItems.reduce((total, item) => {
      return total + parseFloat(item.precio_estimado || 0);
    }, 0);
    
    // Propiedades para carrito específico
    const tieneServicios = state.carrito && state.carrito.items && state.carrito.items.length > 0;
    const totalServicios = state.carrito?.items?.length || 0;
    const totalEstimado = state.carrito?.items?.reduce((total, item) => {
      return total + parseFloat(item.precio_estimado || 0);
    }, 0) || 0;
    const tieneFechaHora = !!(state.carrito?.fecha_servicio && state.carrito?.hora_servicio);
    
    console.log('🔄 AgendamientoContext: Propiedades calculadas:', {
      totalServiciosGlobal,
      tieneServiciosGlobal,
      totalEstimadoGlobal: totalEstimadoGlobal.toFixed(2),
      tieneServicios,
      totalServicios,
      totalEstimado: totalEstimado.toFixed(2),
      carritosCount: state.carritos.length,
      itemsEnTodosLosCarritos: todosLosItems.length
    });
    
    return {
      // Estado directo (sin computaciones)
      ...state,
      
      // Propiedades calculadas globales
      todosLosItems,
      totalServiciosGlobal,
      tieneServiciosGlobal,
      totalEstimadoGlobal,
      
      // Propiedades calculadas específicas
      tieneServicios,
      totalServicios,
      totalEstimado,
      tieneFechaHora,
      
      // Contador de force update para triggers de re-render
      forceUpdateCounter: state.forceUpdateCounter,
      
      // Funciones estables (ya son useCallback)
      cargarTodosLosCarritos,
      cargarCarritoActivo,
      obtenerOCrearCarrito,
      agregarServicio,
      agregarServicioConFechaHora,
      removerServicio,
      seleccionarFechaHora,
      confirmarAgendamiento,
      setMetodoPago,
      setAceptaTerminos,
      limpiarCarrito,
      setPasoActual,
      setConfiguracionServicio,
      
      // Funciones de control de estado
      registerStateChangeCallback,
      invalidarCacheCompleto,
      recargarDespuesDeCambio,
      
      // Constantes
      CARRITO_STATES,
      PASOS_AGENDAMIENTO
    };
  }, [
    state,
    cargarTodosLosCarritos,
    cargarCarritoActivo,
    obtenerOCrearCarrito,
    agregarServicio,
    agregarServicioConFechaHora,
    removerServicio,
    seleccionarFechaHora,
    confirmarAgendamiento,
    setMetodoPago,
    setAceptaTerminos,
    limpiarCarrito,
    setPasoActual,
    setConfiguracionServicio,
    registerStateChangeCallback,
    invalidarCacheCompleto,
    recargarDespuesDeCambio
  ]);

  return (
    <AgendamientoContext.Provider value={contextValue}>
      {children}
    </AgendamientoContext.Provider>
  );
}

// Hook principal optimizado
export function useAgendamiento() {
  const context = useContext(AgendamientoContext);
  if (!context) {
    throw new Error('useAgendamiento debe ser usado dentro de un AgendamientoProvider');
  }
  return context;
}

// NUEVO: Hook con selector para casos específicos
export function useAgendamientoState(selector) {
  const context = useContext(AgendamientoContext);
  if (!context) {
    throw new Error('useAgendamientoState debe ser usado dentro de un AgendamientoProvider');
  }
  
  return useMemo(() => selector(context), [context.lastUpdate, context.forceUpdateCounter]);
}

export default AgendamientoContext; 