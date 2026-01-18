import { get, post, put, delete_ } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Las URLs se manejan desde api.js con la configuración correcta de plataforma
// Ya no necesitamos configurar URLs aquí para evitar conflictos

class AgendamientoService {
  /**
   * Obtiene todos los carritos activos del cliente
   */
  async obtenerCarritosActivos() {
    try {
      console.log('AgendamientoService: Obteniendo todos los carritos activos del cliente');
      const data = await get('/ordenes/carritos/activos/');
      console.log('AgendamientoService: Carritos activos obtenidos:', data);
      
      return data;
    } catch (error) {
      console.log('AgendamientoService: Error al obtener carritos activos:', error.message);
      if (error.status === 404) {
        return []; // No hay carritos activos
      }
      throw error;
    }
  }

  /**
   * Obtiene todos los carritos activos del cliente con información detallada
   */
  async obtenerCarritosActivosDetallados() {
    try {
      console.log('AgendamientoService: Obteniendo todos los carritos activos del cliente con detalles');
      const carritosBase = await get('/ordenes/carritos/activos/');
      console.log('AgendamientoService: Carritos base obtenidos:', carritosBase);
      
      // CORREGIDO: Verificar que carritosBase sea un array válido
      if (!carritosBase) {
        console.log('AgendamientoService: No se recibieron datos del backend');
        return [];
      }
      
      // CORREGIDO: Manejar diferentes estructuras de respuesta del backend
      let carritosArray = [];
      
      if (Array.isArray(carritosBase)) {
        // Respuesta directa como array
        carritosArray = carritosBase;
        console.log('AgendamientoService: Respuesta es array directo con', carritosArray.length, 'carritos');
      } else if (carritosBase.carritos && Array.isArray(carritosBase.carritos)) {
        // NUEVO: Respuesta con estructura { carritos: [], total_carritos: N }
        carritosArray = carritosBase.carritos;
        console.log('AgendamientoService: Respuesta con estructura carritos con', carritosArray.length, 'carritos');
        console.log('AgendamientoService: Total carritos reportado:', carritosBase.total_carritos);
        console.log('AgendamientoService: Carritos limpiados:', carritosBase.carritos_limpiados);
      } else if (carritosBase.results && Array.isArray(carritosBase.results)) {
        // Respuesta paginada con results
        carritosArray = carritosBase.results;
        console.log('AgendamientoService: Respuesta paginada con', carritosArray.length, 'carritos');
      } else if (typeof carritosBase === 'object' && carritosBase.data && Array.isArray(carritosBase.data)) {
        // Respuesta envuelta en data
        carritosArray = carritosBase.data;
        console.log('AgendamientoService: Respuesta envuelta en data con', carritosArray.length, 'carritos');
      } else {
        console.error('AgendamientoService: Estructura de respuesta no reconocida:', carritosBase);
        return [];
      }
      
      console.log('AgendamientoService: Procesando', carritosArray.length, 'carritos');
      
      // Si no hay carritos, retornar array vacío
      if (carritosArray.length === 0) {
        console.log('AgendamientoService: No hay carritos activos');
        return [];
      }
      
      // CORRECCIÓN: El endpoint /activos/ no incluye items, necesitamos cargar cada carrito individualmente
      const carritosDetallados = [];
      
      for (const carritoBase of carritosArray) {
        try {
          console.log(`🔄 Cargando detalles del carrito ${carritoBase.id}...`);
          
          // Cargar carrito completo con items
          const carritoCompleto = await get(`/ordenes/carritos/${carritoBase.id}/`);
          
          // Usar items_detail si está disponible, sino items
          const items = carritoCompleto.items_detail || carritoCompleto.items || [];
          
          console.log(`✅ Carrito ${carritoBase.id} cargado con ${items.length} items`);
          
          // Transformar items para compatibilidad
          const itemsTransformados = items.map(item => ({
            ...item,
            // Mapear campos para compatibilidad
            servicioNombre: item.servicio_nombre || item.oferta_servicio_detail?.servicio_info?.nombre,
            tallerNombre: item.taller_nombre || carritoCompleto.taller_detail?.nombre,
            tallerDireccion: item.taller_direccion || carritoCompleto.taller_detail?.direccion,
            fechaSeleccionada: item.fecha_servicio || carritoCompleto.fecha_servicio,
            horaSeleccionada: item.hora_servicio || carritoCompleto.hora_servicio,
            precio: parseFloat(item.precio_estimado || 0),
            conRepuestos: item.con_repuestos,
            vehiculoID: carritoCompleto.vehiculo,
            vehiculo_info: carritoCompleto.vehiculo_detail || carritoBase.vehiculo_detail,
            carrito_id: carritoCompleto.id
          }));
          
          // Combinar datos base con detalles completos
          const carritoDetallado = {
            ...carritoBase, // Datos base del listado
            ...carritoCompleto, // Datos completos del carrito individual
            items: itemsTransformados, // Items transformados
            items_detail: items // Items originales para referencia
          };
          
          carritosDetallados.push(carritoDetallado);
          
        } catch (error) {
          console.error(`❌ Error cargando detalles del carrito ${carritoBase.id}:`, error);
          // Incluir carrito base aunque falle la carga de detalles
          carritosDetallados.push({
            ...carritoBase,
            items: [],
            items_detail: []
          });
        }
      }
      
      console.log(`✅ Carritos detallados procesados: ${carritosDetallados.length}`);
      carritosDetallados.forEach(carrito => {
        console.log(`   - Carrito ${carrito.id}: ${carrito.items?.length || 0} items, total: $${carrito.total_estimado || carrito.total || 0}`);
      });
      
      return carritosDetallados;
    } catch (error) {
      console.error('AgendamientoService: Error al obtener carritos activos detallados');
      console.error('AgendamientoService: Error completo:', error);
      console.error('AgendamientoService: Error message:', error?.message);
      console.error('AgendamientoService: Error status:', error?.status || error?.response?.status);
      console.error('AgendamientoService: Error response data:', error?.response?.data);
      console.error('AgendamientoService: Error stack:', error?.stack);
      
      // Manejar error 404 específicamente
      if (error?.status === 404 || error?.response?.status === 404) {
        console.log('AgendamientoService: No hay carritos activos (404 - normal)');
        return []; // No hay carritos activos
      }
      
      // Manejar errores de red
      if (error?.isNetworkError || error?.message?.toLowerCase().includes('network') || error?.code === 'NETWORK_ERROR') {
        console.error('AgendamientoService: Error de red detectado, retornando array vacío para evitar crash');
        return [];
      }
      
      // Para otros errores, loggear más información y retornar array vacío para evitar crashes
      console.error('AgendamientoService: Error inesperado de tipo:', typeof error);
      console.error('AgendamientoService: Error inesperado, retornando array vacío para evitar crash');
      console.error('AgendamientoService: Si este error persiste, revisar la conexión con el backend');
      return [];
    }
  }

  /**
   * Obtiene el carrito activo de un vehículo específico
   */
  async obtenerCarritoActivoPorVehiculo(vehiculoId) {
    try {
      console.log('AgendamientoService: Obteniendo carrito activo para vehículo:', vehiculoId);
      const data = await get('/ordenes/carritos/activo/', { vehiculo_id: vehiculoId });
      console.log('AgendamientoService: Carrito activo obtenido:', data);
      
      return data;
    } catch (error) {
      if (error.status === 404) {
        console.log('AgendamientoService: No hay carrito activo para este vehículo (estado normal)');
        return null; // No hay carrito activo
      }
      console.log('AgendamientoService: Error al obtener carrito activo:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el carrito activo de un vehículo (método legacy) con reintentos
   */
  async obtenerCarritoActivo(vehiculoId, maxReintentos = 3, delayMs = 500) {
    let ultimoError = null;
    
    for (let intento = 1; intento <= maxReintentos; intento++) {
      try {
        console.log(`🛒 Buscando carrito activo para vehículo: ${vehiculoId} (intento ${intento}/${maxReintentos})`);
        
        // CORRECCIÓN: Usar get() configurado en lugar de axios directamente
        const response = await get('/ordenes/carritos/activo/', { vehiculo_id: vehiculoId });
        
        console.log('✅ Carrito activo obtenido:', response);
        return {
          success: true,
          carrito: response
        };
        
      } catch (error) {
        ultimoError = error;
        console.error(`❌ Error obteniendo carrito (intento ${intento}/${maxReintentos}):`, error);
        
        if (error.status === 404) {
          console.log(`ℹ️ Error 404 en intento ${intento}/${maxReintentos} - No hay carrito activo para este vehículo`);
          
          // Si es el último intento, retornar el error
          if (intento === maxReintentos) {
            return {
              success: false,
              error: 'No hay carrito activo',
              carrito: null
            };
          }
          
          // Esperar antes del siguiente intento
          console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        // Si no es un error 404, no reintentar
        console.error('❌ Error no recuperable:', error);
        break;
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    return {
      success: false,
      error: ultimoError?.message || 'Error obteniendo carrito',
      carrito: null
    };
  }

  /**
   * Crea un nuevo carrito de agendamiento
   */
  async crearCarrito(vehiculoId) {
    try {
      // Obtener el ID del cliente desde el backend
      console.log('Obteniendo información del cliente desde el backend...');
      const clienteData = await get('/usuarios/cliente-detail/');
      console.log('Datos del cliente obtenidos del backend:', clienteData);
      
      if (!clienteData || !clienteData.id) {
        console.error('Error: No se encontró información del cliente en el backend');
        throw new Error('No se pudo obtener la información del cliente. Asegúrate de tener un perfil de cliente creado.');
      }

      console.log('Creando carrito para cliente:', clienteData.id, 'y vehículo:', vehiculoId);
      
      const data = await post('/ordenes/carritos/', {
        vehiculo: vehiculoId,
        cliente: clienteData.id,
        activo: true
      });
      return data;
    } catch (error) {
      console.error('Error al crear carrito:', error);
      
      // Si el error es que no existe cliente, dar un mensaje más específico
      if (error.status === 404 && error.message?.includes('cliente')) {
        throw new Error('No tienes un perfil de cliente creado. Contacta al administrador para crear tu perfil.');
      }
      
      throw error;
    }
  }

  /**
   * Obtiene carrito activo del cliente (único carrito temporal)
   * NUEVA ARQUITECTURA: UN SOLO CARRITO TEMPORAL POR CLIENTE
   */
  async obtenerCarritoActivo() {
    try {
      console.log('🛒 Obteniendo carrito activo del cliente...');
      const data = await get('/ordenes/carritos/activos/');
      
      if (data.carritos && data.carritos.length > 0) {
        const carrito = data.carritos[0]; // Solo debería haber uno
        console.log('✅ Carrito activo encontrado:', carrito);
        return carrito;
      }
      
      console.log('ℹ️ No hay carrito activo para el cliente');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo carrito activo:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo carrito temporal para el cliente
   * NUEVA ARQUITECTURA: Elimina automáticamente carritos existentes
   */
  async crearCarritoTemporal(vehiculoId) {
    try {
      console.log('🛒 Creando carrito temporal para vehículo:', vehiculoId);
      
      const data = await post('/ordenes/carritos/', {
        vehiculo: vehiculoId,
        activo: true
        // El cliente se asigna automáticamente en el backend
      });
      
      console.log('✅ Carrito temporal creado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creando carrito temporal:', error);
      throw error;
    }
  }

  /**
   * Obtiene o crea carrito activo
   * SIMPLIFICADO: Un solo carrito por cliente
   */
  async obtenerOCrearCarrito(vehiculoId, reintentarSiError = true) {
    console.log('🛒 INICIANDO obtenerOCrearCarrito - NUEVA ARQUITECTURA');
    
    try {
      // Primero intentar obtener carrito activo existente
      const carritoExistente = await this.obtenerCarritoActivo();
      
      if (carritoExistente) {
        console.log('✅ Usando carrito existente:', carritoExistente.id);
        return carritoExistente;
      }
      
      // No hay carrito, crear uno nuevo
      console.log('🛒 No hay carrito activo, creando uno nuevo...');
      const nuevoCarrito = await this.crearCarritoTemporal(vehiculoId);
      
      console.log('✅ Carrito creado exitosamente:', nuevoCarrito);
      return nuevoCarrito;
      
    } catch (error) {
      console.error('❌ Error en obtenerOCrearCarrito:', error);
      throw new Error(`Error obteniendo/creando carrito: ${error.message}`);
    }
  }

  /**
   * Obtiene un carrito específico por su ID
   */
  async obtenerCarrito(carritoId) {
    try {
      console.log('🛒 Obteniendo carrito con ID:', carritoId);
      const data = await get(`/ordenes/carritos/${carritoId}/`);
      console.log('🛒 Carrito obtenido:', data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo carrito:', error);
      throw error;
    }
  }

  /**
   * Agrega un servicio al carrito
   */
  async agregarServicioAlCarrito(carritoId, ofertaServicioId, conRepuestos = true, cantidad = 1) {
    try {
      const data = await post(`/ordenes/carritos/${carritoId}/agregar_servicio/`, {
        oferta_servicio_id: ofertaServicioId,
        con_repuestos: conRepuestos,
        cantidad: cantidad
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Agrega un servicio al carrito CON fecha y hora ya validadas
   * Esta es la versión correcta arquitecturalmente - el carrito recibe servicios completamente configurados
   */
  async agregarServicioAlCarritoCompleto(carritoId, ofertaServicioId, conRepuestos = true, cantidad = 1, fechaServicio = null, horaServicio = null) {
    try {
      console.log('🔧 agregarServicioAlCarritoCompleto - Datos de entrada:', {
        carritoId,
        ofertaServicioId,
        conRepuestos,
        cantidad,
        fechaServicio,
        horaServicio
      });
      
      // MEJORA: Formatear fecha y hora antes de enviar
      const fechaFormateada = fechaServicio ? this.formatearFecha(fechaServicio) : null;
      const horaFormateada = horaServicio ? this.formatearHora(horaServicio) : null;
      
      console.log('🔧 Datos formateados para envío:', {
        fechaOriginal: fechaServicio,
        fechaFormateada,
        horaOriginal: horaServicio,
        horaFormateada
      });
      
      const data = await post(`/ordenes/carritos/${carritoId}/agregar_servicio/`, {
        oferta_servicio_id: ofertaServicioId,
        con_repuestos: conRepuestos,
        cantidad: cantidad,
        fecha_servicio: fechaFormateada,
        hora_servicio: horaFormateada
      });
      
      console.log('✅ Servicio agregado exitosamente al carrito:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en agregarServicioAlCarritoCompleto:', error);
      throw error;
    }
  }

  /**
   * Agrega un servicio al carrito CON información específica de repuestos
   */
  async agregarServicioAlCarritoConRepuestos(carritoId, ofertaServicioId, conRepuestos = true, cantidad = 1, repuestosIncluidos = [], configuracionRepuestos = {}, fechaServicio = null, horaServicio = null) {
    try {
      console.log('🔧 agendamientoService: Agregando servicio con repuestos:', {
        carritoId,
        ofertaServicioId,
        conRepuestos,
        repuestosIncluidos: repuestosIncluidos.length,
        configuracionRepuestos
      });
      
      const data = await post(`/ordenes/carritos/${carritoId}/agregar_servicio/`, {
        oferta_servicio_id: ofertaServicioId,
        con_repuestos: conRepuestos,
        cantidad: cantidad,
        fecha_servicio: fechaServicio,
        hora_servicio: horaServicio,
        // Información específica de repuestos
        repuestos_incluidos: repuestosIncluidos,
        configuracion_repuestos: configuracionRepuestos
      });
      return data;
    } catch (error) {
      console.error('❌ Error en agregarServicioAlCarritoConRepuestos:', error);
      throw error;
    }
  }

  /**
   * Remueve un servicio del carrito
   */
  async removerServicioDelCarrito(carritoId, itemId) {
    try {
      const data = await post(`/ordenes/carritos/${carritoId}/remover_servicio/`, {
        item_id: itemId
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Selecciona fecha y hora para el agendamiento
   */
  async seleccionarFechaHora(carritoId, fechaServicio, horaServicio) {
    try {
      const data = await post(`/ordenes/carritos/${carritoId}/seleccionar_fecha_hora/`, {
        fecha_servicio: fechaServicio,
        hora_servicio: horaServicio
      });
      
      console.log('✅ Fecha y hora seleccionadas:', data);
      return {
        success: true,
        carrito: data
      };
      
    } catch (error) {
      console.error('❌ Error seleccionando fecha/hora:', error);
      
      return {
        success: false,
        error: error.message || 'Error seleccionando fecha y hora'
      };
    }
  }

  /**
   * Obtiene la disponibilidad de un taller
   * Arquitectura correcta: valida ANTES de agregar al carrito
   */
  async obtenerDisponibilidadTaller(tallerId, fechaServicio, horaServicio = null, duracionServicio = 60) {
    console.log('⚠️ DEPRECADO: obtenerDisponibilidadTaller() - Usar obtenerHorariosProveedor()');
    
    return await this.obtenerHorariosProveedor({
      tipo: 'taller',
      id: tallerId,
      fecha: fechaServicio,
      fecha_fin: horaServicio,
      duracion_servicio: duracionServicio
    });
  }

  /**
   * Obtiene la disponibilidad de un mecánico a domicilio
   * Arquitectura correcta: valida ANTES de agregar al carrito
   */
  async obtenerDisponibilidadMecanico(mecanicoId, fechaServicio, horaServicio = null) {
    try {
      // Si se proporciona hora específica, usar el endpoint de validación simple
      if (horaServicio) {
        const params = {
          mecanico_id: mecanicoId,
          fecha_servicio: fechaServicio,
          hora_servicio: horaServicio
        };
        
        const data = await get('/ordenes/validar_disponibilidad_mecanico/', params);
        return data;
      }
      
      // Si no se proporciona hora, retornar disponibilidad general
      return {
        disponible: true,
        mensaje: 'Mecánico disponible para servicios a domicilio',
        mecanico: mecanicoId,
        fecha: fechaServicio,
        tipo_servicio: 'domicilio'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Método general para validar disponibilidad de cualquier tipo de proveedor
   * Uso: validar ANTES de agregar al carrito
   */
  async validarDisponibilidadProveedor(tipoProveedor, proveedorId, fechaServicio, horaServicio) {
    try {
      console.log(`🕐 Validando disponibilidad de ${tipoProveedor} ${proveedorId} para ${fechaServicio} a las ${horaServicio}`);
      
      if (tipoProveedor === 'taller') {
        return await this.obtenerDisponibilidadTaller(proveedorId, fechaServicio, horaServicio);
      } else if (tipoProveedor === 'mecanico') {
        return await this.obtenerDisponibilidadMecanico(proveedorId, fechaServicio, horaServicio);
      } else {
        throw new Error(`Tipo de proveedor no válido: ${tipoProveedor}`);
      }
    } catch (error) {
      console.error(`❌ Error validando disponibilidad de ${tipoProveedor}:`, error);
      throw error;
    }
  }

  /**
   * Método unificado para obtener horarios de cualquier proveedor (taller o mecánico)
   * @param {string} tipoProveedor - 'taller' o 'mecanico'
   * @param {number} proveedorId - ID del proveedor
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Object>} - Respuesta unificada con horarios disponibles
   */
  async obtenerHorariosProveedor(tipoProveedor, proveedorId, fecha, duracionServicio = 60) {
    try {
      console.log(`🔍 obtenerHorariosProveedor llamado con:`, {
        tipoProveedor,
        proveedorId,
        fecha,
        duracionServicio
      });

      if (!tipoProveedor || !proveedorId || !fecha) {
        throw new Error('Se requieren tipo, id y fecha');
      }
      
      let endpoint;
      if (tipoProveedor === 'taller') {
        endpoint = `/usuarios/talleres/${proveedorId}/horarios_disponibles/`;
      } else if (tipoProveedor === 'mecanico' || tipoProveedor === 'domicilio') {
        endpoint = `/usuarios/mecanicos-domicilio/${proveedorId}/horarios_disponibles/`;
      } else {
        throw new Error('Tipo de proveedor no válido. Debe ser "taller" o "mecanico"');
      }
      
      const params = {
        fecha: fecha,
        duracion_servicio: duracionServicio
      };
      
      console.log(`🔍 Haciendo petición a: ${endpoint}`, params);
      
      // CORRECCIÓN: Usar get() configurado en lugar de axios directamente
      // Esto aplica interceptores, timeout y manejo de errores
      const responseData = await get(endpoint, params, { requiresAuth: false });
      
      console.log('✅ Respuesta exitosa del backend:', responseData);
      
      // Verificar la estructura de la respuesta
      if (responseData && responseData.slots_disponibles) {
        return {
          success: true,
          disponible: true,
          slots: responseData.slots_disponibles.map(slot => ({
            hora: slot.hora_inicio,
            hora_inicio: slot.hora_inicio, // Mantener compatibilidad
            horaFin: slot.hora_fin,
            hora_fin: slot.hora_fin, // Mantener compatibilidad
            disponible: slot.disponible,
            motivo: slot.motivo || null,
            tipo_servicio: tipoProveedor
          })),
          proveedor: responseData.proveedor || responseData.taller || responseData.mecanico || null,
          fecha: fecha,
          dia_nombre: responseData.dia_nombre || null,
          horario_configurado: responseData.horario_configurado || null,
          es_respaldo: false
        };
      } else {
        // Si no hay slots disponibles
        return {
          success: true,
          disponible: false,
          slots: [],
          mensaje: responseData?.mensaje || `El ${tipoProveedor} no está disponible este día`,
          fecha: fecha,
          es_respaldo: false
        };
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo horarios del backend:', error);
      
      // Verificar si es un error de red o de servidor
      if (error.isNetworkError || error.message?.includes('network') || error.message?.includes('conexión')) {
        console.log('🔄 Error de conexión, generando horarios de respaldo...');
      } else {
        console.log('🔄 Error del servidor, generando horarios de respaldo...');
      }
      
      // En caso de error, generar horarios de respaldo
      if (tipoProveedor === 'taller') {
        return this._generarHorariosRespaldoTaller(fecha);
      } else {
        return this._generarHorariosRespaldoMecanico(fecha);
      }
    }
  }

  /**
   * Método legacy para compatibilidad con código existente
   * @param {Object} proveedorData - Objeto con tipo, id, fecha_inicio
   */
  async obtenerHorariosProveedorObject(proveedorData) {
    const { tipo, id, fecha_inicio, duracion_servicio = 60 } = proveedorData;
    return this.obtenerHorariosProveedor(tipo, id, fecha_inicio, duracion_servicio);
  }

  /**
   * Genera horarios de respaldo para talleres cuando hay errores de conexión
   */
  _generarHorariosRespaldoTaller(fecha) {
    const fechaFormateada = this.formatearFecha(fecha);
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay(); // 0 = Domingo, 6 = Sábado
    
    // No generar horarios para domingos
    if (diaSemana === 0) {
      return {
        success: true,
        disponible: false,
        slots: [],
        mensaje: 'Los talleres no atienden los domingos',
        fecha: fechaFormateada
      };
    }
    
    // Horarios típicos de taller
    const horariosBase = diaSemana === 6 
      ? ['08:00', '09:00', '10:00', '11:00', '12:00'] // Sábado
      : ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']; // Lunes a Viernes
    
    const slots = horariosBase.map(hora => ({
      hora,
      horaFin: this._calcularHoraFin(hora, 60),
      disponible: true,
      tipo_servicio: 'taller'
    }));
    
    return {
      success: true,
      disponible: true,
      tipo_proveedor: 'taller',
      slots,
      mensaje: 'Horarios de respaldo (sin conexión)',
      fecha: fechaFormateada,
      es_respaldo: true
    };
  }

  /**
   * Genera horarios de respaldo para mecánicos cuando hay errores de conexión
   */
  _generarHorariosRespaldoMecanico(fecha) {
    const fechaFormateada = this.formatearFecha(fecha);
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    
    // No generar horarios para domingos
    if (diaSemana === 0) {
      return {
        success: true,
        disponible: false,
        slots: [],
        mensaje: 'Los mecánicos no atienden los domingos',
        fecha: fechaFormateada
      };
    }
    
    // Horarios típicos de mecánico (slots más largos)
    const horariosBase = diaSemana === 6 
      ? ['09:00', '12:00', '15:00'] // Sábado
      : ['08:00', '10:30', '13:00', '15:30']; // Lunes a Viernes
    
    const slots = horariosBase.map(hora => ({
      hora,
      horaFin: this._calcularHoraFin(hora, 120), // 2 horas por servicio
      disponible: true,
      tipo_servicio: 'domicilio'
    }));
    
    return {
      success: true,
      disponible: true,
      tipo_proveedor: 'mecanico',
      slots,
      mensaje: 'Horarios de respaldo (sin conexión)',
      fecha: fechaFormateada,
      es_respaldo: true
    };
  }

  /**
   * Calcula la hora de fin sumando minutos a una hora de inicio
   */
  _calcularHoraFin(horaInicio, duracionMinutos) {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(horas, minutos + duracionMinutos);
    return fecha.toTimeString().substring(0, 5);
  }

  /**
   * Obtiene información completa de un taller incluyendo horarios
   */
  async obtenerTallerConHorarios(tallerId) {
    try {
      const data = await get(`/usuarios/talleres/${tallerId}/`);
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Confirma el agendamiento
   */
  async confirmarAgendamiento(carritoId, metodoPago, aceptaTerminos = true) {
    try {
      console.log('🔍 AgendamientoService: Confirmando agendamiento', {
        carritoId,
        metodoPago,
        aceptaTerminos
      });
      
      // Usar endpoint normal
      const data = await post('/ordenes/agendamiento/confirmar_agendamiento/', {
        carrito_id: carritoId,
        metodo_pago: metodoPago,
        acepta_terminos: aceptaTerminos
      });
      
      console.log('✅ AgendamientoService: Respuesta del backend:', data);
      
      // Después de confirmar exitosamente, el carrito se marca como inactivo
      console.log('ℹ️ AgendamientoService: Carrito confirmado - ahora está inactivo en el backend');
      
      return data;
    } catch (error) {
      console.error('❌ AgendamientoService: Error en confirmación:', error);
      console.error('❌ AgendamientoService: Error response:', error.response?.data);
      
      // Proporcionar información más específica del error
      if (error.response?.status === 404) {
        console.error('❌ AgendamientoService: Carrito no encontrado (404) - posiblemente ya fue confirmado o eliminado');
        throw new Error('El carrito ya no está disponible. Posiblemente ya fue confirmado anteriormente.');
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.error('❌ AgendamientoService: Error de validación (400):', errorData);
        throw new Error(errorData.error || 'Error de validación en el agendamiento');
      }
      
      throw error;
    }
  }

  /**
   * Crea un agendamiento directo (para carrito local)
   */
  async crearAgendamiento(agendamientoData) {
    try {
      console.log('🚀 AgendamientoService: Creando agendamiento directo con datos:', agendamientoData);
      
      // Obtener el ID del cliente desde el backend
      const clienteData = await get('/usuarios/cliente-detail/');
      
      if (!clienteData || !clienteData.id) {
        throw new Error('No se pudo obtener la información del cliente');
      }

      // Obtener información de la oferta de servicio para determinar el taller
      const ofertaServicio = await get(`/servicios/ofertas/${agendamientoData.oferta_servicio_id}/`);
      
      console.log('🔍 AgendamientoService: Oferta de servicio obtenida:', ofertaServicio);
      
      if (!ofertaServicio) {
        throw new Error('No se pudo obtener información de la oferta de servicio');
      }

      // Determinar el ID del taller
      let tallerId = null;
      
      if (ofertaServicio.taller) {
        tallerId = ofertaServicio.taller;
      } else if (ofertaServicio.taller_info && ofertaServicio.taller_info.id) {
        tallerId = ofertaServicio.taller_info.id;
      }
      
      console.log('🔍 AgendamientoService: Taller ID determinado:', tallerId);
      
      if (!tallerId) {
        throw new Error('No se pudo determinar el taller para este servicio');
      }

      // Preparar los datos para crear una SolicitudServicio directamente
      const dataParaBackend = {
        cliente: clienteData.id,
        vehiculo: agendamientoData.vehiculo_id,
        taller: tallerId,
        tipo_servicio: agendamientoData.tipo_proveedor || 'taller',
        fecha_servicio: agendamientoData.fecha_agendamiento,
        hora_servicio: agendamientoData.hora_agendamiento,
        metodo_pago: 'transferencia',
        total: agendamientoData.precio_acordado,
        estado: 'pendiente',
        notas_cliente: agendamientoData.notas_cliente || `Agendamiento desde carrito local`
      };

      console.log('🚀 AgendamientoService: Enviando datos al backend:', dataParaBackend);
      
      // Crear la solicitud de servicio
      const solicitud = await post('/ordenes/solicitudes/', dataParaBackend);
      
      console.log('✅ AgendamientoService: Solicitud de servicio creada:', solicitud);

      // Crear la línea de servicio asociada
      const lineaServicioData = {
        solicitud: solicitud.id,
        oferta_servicio: agendamientoData.oferta_servicio_id,
        con_repuestos: agendamientoData.con_repuestos !== false,
        cantidad: 1,
        precio_unitario: agendamientoData.precio_acordado,
        precio_final: agendamientoData.precio_acordado
      };

      console.log('🚀 AgendamientoService: Creando línea de servicio:', lineaServicioData);
      
      const lineaServicio = await post('/ordenes/lineas/', lineaServicioData);
      
      console.log('✅ AgendamientoService: Línea de servicio creada:', lineaServicio);
      
      // Retornar la solicitud con información adicional
      return {
        ...solicitud,
        linea_servicio: lineaServicio
      };
    } catch (error) {
      console.error('❌ AgendamientoService: Error al crear agendamiento:', error);
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de un carrito
   */
  async obtenerDetalleCarrito(carritoId) {
    try {
      const data = await get(`/ordenes/carritos/${carritoId}/`);
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualiza la configuración de repuestos de un item del carrito
   */
  async actualizarConfiguracionItem(carritoId, ofertaServicioId, conRepuestos, cantidad = 1) {
    try {
      const data = await post(`/ordenes/carritos/${carritoId}/agregar_servicio/`, {
        oferta_servicio_id: ofertaServicioId,
        con_repuestos: conRepuestos,
        cantidad: cantidad
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Formatea la fecha para la API (YYYY-MM-DD) - MEJORADO
   */
  formatearFecha(fecha) {
    if (!fecha) return null;
    
    console.log('🔍 AgendamientoService.formatearFecha - Input:', fecha);
    
    try {
      if (fecha instanceof Date) {
        // Usar toLocaleDateString para evitar problemas de zona horaria
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const fechaFormateada = `${year}-${month}-${day}`;
        console.log('✅ Fecha formateada (Date object):', fechaFormateada);
        return fechaFormateada;
      }
      
      if (typeof fecha === 'string') {
        // Si ya está en formato YYYY-MM-DD, retornar tal como está
        if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.log('✅ Fecha ya formateada:', fecha);
          return fecha;
        }
        
        // Si incluye tiempo (ISO string), extraer solo la fecha
        if (fecha.includes('T')) {
          const fechaSoloFecha = fecha.split('T')[0];
          console.log('✅ Fecha extraída de ISO string:', fechaSoloFecha);
          return fechaSoloFecha;
        }
        
        // Intentar parsear otros formatos
        const fechaObj = new Date(fecha);
        if (!isNaN(fechaObj.getTime())) {
          const year = fechaObj.getFullYear();
          const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
          const day = String(fechaObj.getDate()).padStart(2, '0');
          const fechaFormateada = `${year}-${month}-${day}`;
          console.log('✅ Fecha formateada (string parseado):', fechaFormateada);
          return fechaFormateada;
        }
      }
      
      console.error('❌ Formato de fecha no reconocido:', fecha);
      return fecha; // Retornar original si no se puede formatear
    } catch (error) {
      console.error('❌ Error formateando fecha:', error);
      return fecha; // Retornar original en caso de error
    }
  }

  /**
   * Formatea la hora para la API (HH:MM) - MEJORADO
   */
  formatearHora(hora) {
    if (!hora) return null;
    
    console.log('🔍 AgendamientoService.formatearHora - Input:', hora);
    
    try {
      if (hora instanceof Date) {
        const horaFormateada = hora.toTimeString().slice(0, 5);
        console.log('✅ Hora formateada (Date object):', horaFormateada);
        return horaFormateada;
      }
      
      if (typeof hora === 'string') {
        // Si ya está en formato HH:MM, retornar tal como está
        if (hora.match(/^\d{2}:\d{2}$/)) {
          console.log('✅ Hora ya formateada:', hora);
          return hora;
        }
        
        // Si tiene formato HH:MM:SS, convertir a HH:MM
        if (hora.match(/^\d{2}:\d{2}:\d{2}$/)) {
          const horaFormateada = hora.slice(0, 5);
          console.log('✅ Hora formateada (removidos segundos):', horaFormateada);
          return horaFormateada;
        }
        
        // Intentar parsear otros formatos
        try {
          const horaObj = new Date(`2000-01-01T${hora}`);
          if (!isNaN(horaObj.getTime())) {
            const horaFormateada = horaObj.toTimeString().slice(0, 5);
            console.log('✅ Hora formateada (string parseado):', horaFormateada);
            return horaFormateada;
          }
        } catch (parseError) {
          console.log('⚠️ Error parseando hora como Date, retornando original');
        }
      }
      
      console.error('❌ Formato de hora no reconocido:', hora);
      return hora; // Retornar original si no se puede formatear
    } catch (error) {
      console.error('❌ Error formateando hora:', error);
      return hora; // Retornar original en caso de error
    }
  }

  /**
   * Valida si una fecha está disponible para agendamiento
   */
  validarFechaDisponible(fecha) {
    const hoy = new Date();
    const fechaSeleccionada = new Date(fecha);
    
    // No permitir fechas pasadas
    if (fechaSeleccionada < hoy) {
      return false;
    }
    
    // No permitir domingos (día 0)
    if (fechaSeleccionada.getDay() === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Obtiene las fechas disponibles para los próximos días
   */
  obtenerFechasDisponibles(diasAdelante = 30) {
    const fechas = [];
    const hoy = new Date();
    
    // Normalizar la fecha de hoy a medianoche local para evitar problemas de zona horaria
    const hoySinTiempo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    for (let i = 1; i <= diasAdelante; i++) {
      // Crear fecha agregando días a la fecha normalizada
      const fecha = new Date(hoySinTiempo.getFullYear(), hoySinTiempo.getMonth(), hoySinTiempo.getDate() + i);
      
      if (this.validarFechaDisponible(fecha)) {
        // Obtener el día directamente del objeto Date antes de formatear
        const dia = fecha.getDate();
        const fechaFormateada = this.formatearFecha(fecha);
        
        fechas.push({
          fecha: fechaFormateada, // String en formato YYYY-MM-DD
          dia: dia, // Número del día para mostrar en UI
          fechaFormateada: fecha.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          diaSemana: fecha.toLocaleDateString('es-MX', { weekday: 'long' })
        });
      }
    }
    
    return fechas;
  }

  /**
   * Confirma un carrito y crea la solicitud de servicio
   */
  async confirmarCarrito(carritoId, metodoPago, notasCliente = '') {
    try {
      console.log('🚀 AgendamientoService: Confirmando carrito:', carritoId);
      
      // Obtener el carrito completo
      const carrito = await this.obtenerCarrito(carritoId);
      console.log('🛒 Carrito a confirmar:', carrito);
      
      if (!carrito || !carrito.items || carrito.items.length === 0) {
        throw new Error('El carrito está vacío o no existe');
      }

      // Obtener el ID del cliente
      const clienteData = await get('/usuarios/cliente-detail/');
      if (!clienteData || !clienteData.id) {
        throw new Error('No se pudo obtener la información del cliente');
      }

      // Tomar información del primer item para determinar taller/mecánico
      const primerItem = carrito.items[0];
      const ofertaServicio = primerItem.oferta_servicio;
      
      let tallerId = null;
      if (ofertaServicio.taller) {
        tallerId = ofertaServicio.taller.id || ofertaServicio.taller;
      }

      if (!tallerId) {
        throw new Error('No se pudo determinar el taller para este carrito');
      }

      // Crear la solicitud de servicio
      const solicitudData = {
        cliente: clienteData.id,
        vehiculo: carrito.vehiculo.id,
        taller: tallerId,
        tipo_servicio: 'taller',
        fecha_servicio: carrito.fecha_programada,
        hora_servicio: carrito.hora_programada,
        metodo_pago: metodoPago || 'transferencia',
        total: carrito.total,
        estado: 'pendiente',
        notas_cliente: notasCliente || 'Agendamiento confirmado desde carrito'
      };

      console.log('🚀 Creando solicitud con datos:', solicitudData);
      
      const solicitud = await post('/ordenes/solicitudes/', solicitudData);
      console.log('✅ Solicitud creada:', solicitud.id);

      // Crear líneas de servicio para cada item del carrito
      const lineasCreadas = [];
      for (const item of carrito.items) {
        const lineaData = {
          solicitud: solicitud.id,
          oferta_servicio: item.oferta_servicio_id,
          con_repuestos: item.con_repuestos,
          cantidad: item.cantidad,
          precio_unitario: item.precio_final / item.cantidad,
          precio_final: item.precio_final
        };

        console.log('🚀 Creando línea de servicio:', lineaData);
        const linea = await post('/ordenes/lineas/', lineaData);
        lineasCreadas.push(linea);
        console.log('✅ Línea creada:', linea.id);
      }

      // Marcar el carrito como procesado (opcional, si existe endpoint)
      try {
        await post(`/ordenes/carritos/${carritoId}/procesar/`, {
          solicitud_id: solicitud.id
        });
        console.log('✅ Carrito marcado como procesado');
      } catch (error) {
        console.log('⚠️ No se pudo marcar carrito como procesado (normal si endpoint no existe)');
      }

      return {
        ...solicitud,
        lineas_servicio: lineasCreadas,
        carrito_original: carrito
      };

    } catch (error) {
      console.error('❌ Error confirmando carrito:', error);
      throw error;
    }
  }

  /**
   * Confirma un carrito específico
   */
  async confirmarCarrito(carritoId, metodoPago, notasCliente = '') {
    try {
      const data = await post(`/ordenes/carritos/${carritoId}/confirmar/`, {
        metodo_pago: metodoPago,
        notas_cliente: notasCliente
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene la configuración activa de IVA y tarifa de servicio
   */
  async obtenerConfiguracionPrecio() {
    try {
      const data = await get('/ordenes/configuracion_precio/');
      return data;
    } catch (error) {
      console.error('Error al obtener configuración de precio:', error);
      // Retornar configuración por defecto en caso de error
      return {
        iva_porcentaje: 19.0,
        tarifa_servicio_porcentaje: 3.0,
        activo: true
      };
    }
  }

  /**
   * Calcula el desglose detallado de precios
   */
  async calcularPrecioDetallado(subtotal) {
    try {
      const data = await post('/ordenes/calcular_precio/', {
        subtotal: subtotal
      });
      return data;
    } catch (error) {
      console.error('Error al calcular precio detallado:', error);
      
      // Calcular manualmente en caso de error (usando configuración por defecto)
      const config = await this.obtenerConfiguracionPrecio();
      
      const tarifaServicio = subtotal * (config.tarifa_servicio_porcentaje / 100);
      const baseIva = subtotal + tarifaServicio;
      const iva = baseIva * (config.iva_porcentaje / 100);
      const total = subtotal + tarifaServicio + iva;
      
      return {
        subtotal: Math.round(subtotal * 100) / 100,
        tarifa_servicio: Math.round(tarifaServicio * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        total: Math.round(total * 100) / 100,
        iva_porcentaje: config.iva_porcentaje,
        tarifa_porcentaje: config.tarifa_servicio_porcentaje
      };
    }
  }

  /**
   * Obtiene los horarios disponibles de un taller para una fecha específica
   * @deprecated Usar obtenerHorariosProveedor('taller', tallerId, fecha) en su lugar
   */
  async obtenerHorariosTaller(tallerId, fecha) {
    console.log(`⚠️ obtenerHorariosTaller está deprecado, redirigiendo a obtenerHorariosProveedor`);
    return this.obtenerHorariosProveedor({
      tipo: 'taller',
      id: tallerId,
      fecha: fecha,
      fecha_fin: null,
      duracion_servicio: 60
    });
  }

  /**
   * Obtiene los horarios disponibles de un mecánico para una fecha específica
   * @deprecated Usar obtenerHorariosProveedor('mecanico', mecanicoId, fecha) en su lugar
   */
  async obtenerHorariosMecanico(mecanicoId, fecha) {
    console.log(`⚠️ obtenerHorariosMecanico está deprecado, redirigiendo a obtenerHorariosProveedor`);
    return this.obtenerHorariosProveedor({
      tipo: 'mecanico',
      id: mecanicoId,
      fecha: fecha,
      fecha_fin: null,
      duracion_servicio: 60
    });
  }
}

export default new AgendamientoService(); 