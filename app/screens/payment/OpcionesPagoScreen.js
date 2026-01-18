import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAgendamiento } from '../../context/AgendamientoContext';
import { COLORS, ROUTES } from '../../utils/constants';
import { getMediaURL } from '../../services/api';
import MercadoPagoService from '../../services/mercadopago';
import { useTheme } from '../../design-system/theme/useTheme';
import { SPACING, SHADOWS, BORDERS } from '../../design-system/tokens';

const METODOS_PAGO = {
  MERCADOPAGO: 'mercadopago'
};

// Tipos de pago para ofertas con repuestos
const TIPO_PAGO_REPUESTOS = {
  REPUESTOS_ADELANTADO: 'repuestos',
  TODO_ADELANTADO: 'total'
};

const OpcionesPagoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, borders } = useTheme();
  const { carritos, carrito, cargarTodosLosCarritos, loading: carritoLoading } = useAgendamiento();
  
  // Safe borders for header
  const safeWidth = borders?.width || BORDERS?.width || { thin: 1 };
  
  // Detectar si viene de una solicitud pública, oferta secundaria o del flujo tradicional de carrito
  const origen = route.params?.origen;
  const solicitudId = route.params?.solicitudId;
  const resumenPago = route.params?.resumenPago;
  const esSolicitudPublica = origen === 'solicitud_publica' && solicitudId;
  const esOfertaSecundaria = origen === 'oferta_secundaria' && resumenPago;
  
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(METODOS_PAGO.MERCADOPAGO);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [fotosProveedores, setFotosProveedores] = useState({});
  const [creandoPreferencia, setCreandoPreferencia] = useState(false);
  const [cargandoCarrito, setCargandoCarrito] = useState(true);
  const [intentosCarga, setIntentosCarga] = useState(0);
  
  // Estados para solicitud pública
  const [datosSolicitud, setDatosSolicitud] = useState(null);
  const [cargandoSolicitud, setCargandoSolicitud] = useState(false);
  
  // Estados para pago con desglose de repuestos
  const [tipoPagoRepuestos, setTipoPagoRepuestos] = useState(TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO);
  
  // Estado para manejar el pago pendiente (para guardar en AsyncStorage)
  const [pagoPendiente, setPagoPendiente] = useState(null);

  // Cargar datos cuando la pantalla se enfoque (carrito o solicitud según el flujo)
  useFocusEffect(
    useCallback(() => {
      const cargarDatos = async () => {
        // Si es oferta secundaria, no necesitamos cargar datos adicionales (ya vienen en resumenPago)
        if (esOfertaSecundaria) {
          console.log('💳 OpcionesPagoScreen: Usando datos de oferta secundaria del resumenPago');
          setCargandoCarrito(false);
          setCargandoSolicitud(false);
          return;
        }
        
        if (esSolicitudPublica) {
          // Flujo de solicitud pública - Cargar datos de la solicitud
          try {
            setCargandoSolicitud(true);
            console.log('💳 OpcionesPagoScreen: Cargando datos de solicitud pública:', solicitudId);
            
            const solicitudesService = (await import('../../services/solicitudesService')).default;
            const datos = await solicitudesService.obtenerDatosPago(solicitudId);
            
            console.log('✅ OpcionesPagoScreen: Datos de solicitud cargados:', datos);
            setDatosSolicitud(datos);
          } catch (error) {
            console.error('❌ OpcionesPagoScreen: Error cargando datos de solicitud:', error);
            Alert.alert(
              'Error',
              `No se pudieron cargar los datos de pago: ${error.message || 'Error desconocido'}`,
              [
                {
                  text: 'Volver',
                  onPress: () => navigation.goBack()
                }
              ]
            );
          } finally {
            setCargandoSolicitud(false);
          }
        } else {
          // Flujo tradicional - Cargar carritos
          try {
            setCargandoCarrito(true);
            console.log('🛒 OpcionesPagoScreen: Cargando carritos...');
            const carritosCargados = await cargarTodosLosCarritos(true);
            console.log('✅ OpcionesPagoScreen: Carritos cargados:', carritosCargados?.length || 0);
            
            if (!carritosCargados || carritosCargados.length === 0) {
              console.warn('⚠️ OpcionesPagoScreen: No se encontraron carritos después de cargar');
            } else {
              const primerCarrito = carritosCargados[0];
              const itemsCount = primerCarrito.items_detail?.length || primerCarrito.items?.length || 0;
              console.log(`✅ OpcionesPagoScreen: Carrito ${primerCarrito.id} tiene ${itemsCount} items`);
            }
          } catch (error) {
            console.error('❌ OpcionesPagoScreen: Error cargando carritos:', error);
            setIntentosCarga(prev => prev + 1);
          } finally {
            setCargandoCarrito(false);
          }
        }
      };
      
      console.log('🛒 OpcionesPagoScreen: Pantalla enfocada, origen:', origen, 'solicitudId:', solicitudId);
      cargarDatos();
    }, [esSolicitudPublica, esOfertaSecundaria, solicitudId, resumenPago, cargarTodosLosCarritos])
  );

  // Calcular resumen según el origen (carrito, solicitud pública u oferta secundaria)
  const resumenGlobal = React.useMemo(() => {
    // Si es oferta secundaria, usar el resumenPago que viene en los parámetros
    if (esOfertaSecundaria && resumenPago) {
      console.log('🛒 OpcionesPagoScreen: Calculando resumen desde oferta secundaria');
      
      const serviciosDetalle = (resumenPago.servicios || []).map(servicio => ({
        servicio: servicio.nombre,
        proveedor: resumenPago.proveedor?.nombre || 'Proveedor',
        tipoProveedor: resumenPago.proveedor?.tipo === 'taller' ? 'Taller' : 'Mecánico',
        fecha: resumenPago.fecha_servicio || 'Por confirmar',
        hora: resumenPago.hora_servicio || 'Por confirmar',
        precio: (servicio.precio || 0) / 1.19, // Sin IVA
        precioOriginal: servicio.precio || 0,
        fotoServicio: null
      }));
      
      const totalGeneral = (resumenPago.monto_total || 0) / 1.19; // Sin IVA
      
      console.log('✅ OpcionesPagoScreen: Resumen desde oferta secundaria calculado:', {
        totalGeneral,
        totalServicios: serviciosDetalle.length
      });
      
      return {
        totalGeneral,
        totalServicios: serviciosDetalle.length,
        serviciosDetalle
      };
    }
    
    // Si es solicitud pública, usar los datos de la solicitud
    if (esSolicitudPublica && datosSolicitud) {
      console.log('🛒 OpcionesPagoScreen: Calculando resumen desde solicitud pública');
      console.log('🛒 OpcionesPagoScreen: Datos COMPLETOS de solicitud:', JSON.stringify(datosSolicitud, null, 2));
      console.log('🛒 OpcionesPagoScreen: Datos clave:', {
        incluye_repuestos: datosSolicitud.incluye_repuestos,
        costo_repuestos: datosSolicitud.costo_repuestos,
        costo_mano_obra: datosSolicitud.costo_mano_obra,
        monto_total: datosSolicitud.monto_total,
        proveedor_puede_recibir_pagos: datosSolicitud.proveedor_puede_recibir_pagos,
        oferta_id: datosSolicitud.oferta_id
      });
      
      const serviciosDetalle = datosSolicitud.servicios.map(servicio => ({
        servicio: servicio.nombre,
        proveedor: datosSolicitud.proveedor.nombre,
        tipoProveedor: datosSolicitud.proveedor.tipo === 'taller' ? 'Taller' : 'Mecánico',
        fecha: datosSolicitud.fecha_servicio || 'Por confirmar',
        hora: datosSolicitud.hora_servicio || 'Por confirmar',
        precio: servicio.precio / 1.19, // Sin IVA
        precioOriginal: servicio.precio,
        fotoServicio: null // Por ahora, podríamos agregar esto después
      }));
      
      const totalGeneral = datosSolicitud.monto_total / 1.19; // Sin IVA
      const montoTotal = parseFloat(datosSolicitud.monto_total || 0);
      
      // IMPORTANTE: Los costos de la oferta
      // - Repuestos: Es el costo directo de los repuestos (NO lleva IVA adicional, es el precio de compra)
      // - Mano de obra: Es un servicio, lleva IVA
      // - Gestión de compra: Es un servicio, lleva IVA
      const costoRepuestos = parseFloat(datosSolicitud.costo_repuestos || 0);
      const costoManoObraSinIva = parseFloat(datosSolicitud.costo_mano_obra || 0);
      const costoGestionCompraSinIva = parseFloat(datosSolicitud.costo_gestion_compra || 0);
      
      // Calcular montos CON IVA para servicios (mano de obra y gestión)
      // NOTA: Los repuestos NO llevan IVA adicional - es el costo directo de compra
      const costoManoObraConIva = Math.round(costoManoObraSinIva * 1.19);
      const costoGestionCompraConIva = Math.round(costoGestionCompraSinIva * 1.19);
      
      // Verificar si tiene desglose de repuestos
      // Condición: si incluye_repuestos es true Y tenemos al menos uno de los costos > 0
      const tieneDesgloseRepuestos = datosSolicitud.incluye_repuestos && 
        (costoRepuestos > 0 || costoManoObraSinIva > 0);
      
      // Verificar si hay repuestos reales para pagar (costo > 0)
      // Esta validación es importante para evitar mostrar opción de "Pagar Repuestos" con valor $0
      const tieneRepuestosParaPagar = costoRepuestos > 0;
      
      // Si incluye repuestos pero no hay desglose, mostrar mensaje informativo
      const incluyeRepuestosSinDesglose = datosSolicitud.incluye_repuestos && 
        costoRepuestos === 0 && costoManoObraSinIva === 0;
      
      console.log('✅ OpcionesPagoScreen: Resumen desde solicitud calculado:', {
        totalGeneral,
        montoTotal,
        totalServicios: serviciosDetalle.length,
        tieneDesgloseRepuestos,
        tieneRepuestosParaPagar,
        incluyeRepuestosSinDesglose,
        costoRepuestos,
        costoManoObraSinIva,
        costoGestionCompraSinIva,
        costoManoObraConIva,
        costoGestionCompraConIva
      });
      
      // Calcular monto total para pago anticipado de repuestos:
      // - Repuestos: precio directo (sin IVA adicional)
      // - Gestión de compra: con IVA (es un servicio)
      const pagoAnticipadoRepuestos = Math.round(costoRepuestos + costoGestionCompraConIva);

      // Estado de pago de la oferta (para pagos parciales)
      const estadoPagoRepuestos = datosSolicitud.estado_pago_repuestos || 'pendiente';
      const estadoPagoServicio = datosSolicitud.estado_pago_servicio || 'pendiente';
      const repuestosPagados = estadoPagoRepuestos === 'pagado';
      const servicioPagado = estadoPagoServicio === 'pagado';
      
      // Si ya pagó repuestos, solo mostrar opción de pagar servicio
      const soloServicioPendiente = repuestosPagados && !servicioPagado;
      
      console.log('🔍 Estado de pagos de la oferta:', {
        estadoPagoRepuestos,
        estadoPagoServicio,
        repuestosPagados,
        servicioPagado,
        soloServicioPendiente
      });

      // Si es pago parcial (solo falta pagar servicio), calcular solo el saldo pendiente
      let montoAPagar = Math.round(montoTotal);
      let desgloseParaMostrar = {
        costoRepuestos: costoRepuestos,
        costoManoObraSinIva: costoManoObraSinIva,
        costoGestionCompraSinIva: costoGestionCompraSinIva,
        costoManoObraConIva: costoManoObraConIva,
        costoGestionCompraConIva: costoGestionCompraConIva,
        subtotalSinIva: costoManoObraSinIva + costoRepuestos + costoGestionCompraSinIva,
        iva: (costoManoObraSinIva + costoGestionCompraSinIva) * 0.19,
      };

      if (soloServicioPendiente) {
        // Solo falta pagar el servicio (mano de obra con IVA)
        montoAPagar = costoManoObraConIva;
        desgloseParaMostrar = {
          costoRepuestos: 0, // Ya pagado, no mostrar
          costoManoObraSinIva: costoManoObraSinIva,
          costoGestionCompraSinIva: 0, // Ya pagado, no mostrar
          costoManoObraConIva: costoManoObraConIva,
          costoGestionCompraConIva: 0, // Ya pagado, no mostrar
          subtotalSinIva: costoManoObraSinIva,
          iva: costoManoObraSinIva * 0.19,
        };
        console.log('💰 Pago parcial detectado - Solo falta pagar servicio:', {
          montoAPagar,
          costoManoObraSinIva,
          costoManoObraConIva
        });
      }

      return {
        totalGeneral,
        totalServicios: serviciosDetalle.length,
        serviciosDetalle,
        // Datos adicionales para pago con repuestos
        tieneDesgloseRepuestos,
        tieneRepuestosParaPagar, // true solo si costoRepuestos > 0
        incluyeRepuestosSinDesglose,
        incluyeRepuestos: datosSolicitud.incluye_repuestos || false,
        // Valores para mostrar en el desglose (ajustados si es pago parcial)
        costoRepuestos: desgloseParaMostrar.costoRepuestos,
        costoManoObraSinIva: desgloseParaMostrar.costoManoObraSinIva,
        costoGestionCompraSinIva: desgloseParaMostrar.costoGestionCompraSinIva,
        // Valores CON IVA para los botones de pago (solo servicios llevan IVA)
        costoManoObraConIva: desgloseParaMostrar.costoManoObraConIva,
        costoGestionCompraConIva: desgloseParaMostrar.costoGestionCompraConIva,
        pagoAnticipadoRepuestos, // Repuestos (directo) + Gestión de compra (con IVA)
        totalConIva: montoAPagar, // Monto a pagar (ajustado si es pago parcial)
        proveedorPuedeRecibirPagos: datosSolicitud.proveedor_puede_recibir_pagos || false,
        ofertaId: datosSolicitud.oferta_id,
        fotoCotizacionRepuestos: datosSolicitud.foto_cotizacion_repuestos,
        // Estado de pagos para flujo de pago parcial
        estadoPagoRepuestos,
        estadoPagoServicio,
        repuestosPagados,
        servicioPagado,
        soloServicioPendiente,
        // Valores originales (para referencia si se necesita)
        costoRepuestosOriginal: costoRepuestos,
        costoGestionCompraOriginal: costoGestionCompraSinIva,
        // Desglose para mostrar
        subtotalSinIva: desgloseParaMostrar.subtotalSinIva,
        iva: desgloseParaMostrar.iva,
      };
    }
    
    // Si es solicitud pública pero aún no hay datos, retornar null para evitar procesar carrito
    if (esSolicitudPublica && !datosSolicitud) {
      console.log('⏳ OpcionesPagoScreen: Esperando datos de solicitud pública...');
      return null;
    }
    
    // Flujo tradicional - Calcular desde carritos (solo si NO es solicitud pública)
    const carritosArray = carritos || (carrito ? [carrito] : []);
    
    if (!carritosArray || carritosArray.length === 0) return null;
    
    let totalGeneral = 0;
    let serviciosDetalle = [];
    
    carritosArray.forEach(carrito => {
      console.log('🛒 OpcionesPagoScreen: Procesando carrito:', carrito.id);
      const totalConIVA = parseFloat(carrito.total || carrito.total_estimado || 0);
      const totalSinIVA = totalConIVA / 1.19;
      totalGeneral += totalSinIVA;
      
      const items = carrito.items_detail || carrito.items || [];
      console.log('   - Items en carrito:', items.length);
      
      if (items.length === 0) {
        console.warn('⚠️ OpcionesPagoScreen: Carrito sin items:', carrito.id);
      }
      
      items.forEach((item, index) => {
        console.log(`   - Procesando item ${index + 1}:`, {
          id: item.id,
          servicio_nombre: item.servicio_nombre,
          precio_estimado: item.precio_estimado,
          tiene_oferta_servicio_detail: !!item.oferta_servicio_detail
        });
        
        const precioConIVA = parseFloat(item.precio_estimado || item.precio || 0);
        const precioSinIVA = precioConIVA > 0 ? precioConIVA / 1.19 : 0;
        
        let fotoServicio = null;
        const ofertaDetail = item.oferta_servicio_detail || item.oferta_servicio;
        
        if (ofertaDetail && ofertaDetail.fotos_servicio && ofertaDetail.fotos_servicio.length > 0) {
          const primeraFoto = ofertaDetail.fotos_servicio[0];
          fotoServicio = primeraFoto.imagen || primeraFoto.imagen_url;
        } else if (!fotoServicio && ofertaDetail?.servicio_info?.foto) {
          fotoServicio = ofertaDetail.servicio_info.foto;
        } else if (!fotoServicio && ofertaDetail?.servicio?.foto) {
          fotoServicio = ofertaDetail.servicio.foto;
        } else {
          // Usar optional chaining para evitar errores si taller_info o mecanico_info no existen
          const tallerInfo = ofertaDetail?.taller_info || item?.taller_info || ofertaDetail?.taller || null;
          const mecanicoInfo = ofertaDetail?.mecanico_info || item?.mecanico_info || ofertaDetail?.mecanico || null;
          const proveedorInfo = tallerInfo || mecanicoInfo;
          
          if (proveedorInfo) {
            fotoServicio = proveedorInfo.foto_perfil || 
                          proveedorInfo.usuario?.foto_perfil ||
                          proveedorInfo.foto;
          }
        }
        
        // Obtener nombre del servicio y proveedor con fallbacks
        const servicioNombre = item.servicio_nombre || 
                              item.servicio?.nombre || 
                              ofertaDetail?.servicio_info?.nombre ||
                              ofertaDetail?.servicio?.nombre ||
                              'Servicio';
        
        const proveedorNombre = item.taller_nombre || 
                               item.mecanico_nombre ||
                               tallerInfo?.nombre ||
                               mecanicoInfo?.nombre ||
                               'Proveedor';
        
        const tipoProveedor = (item.taller_nombre || tallerInfo?.nombre) ? 'Taller' : 'Mecánico';
        
        serviciosDetalle.push({
          servicio: servicioNombre,
          proveedor: proveedorNombre,
          tipoProveedor: tipoProveedor,
          fecha: item.fecha_servicio || carrito.fecha_programada,
          hora: item.hora_servicio || carrito.hora_programada,
          precio: precioSinIVA,
          precioOriginal: precioConIVA,
          fotoServicio: fotoServicio
        });
      });
    });
    
    console.log('✅ OpcionesPagoScreen: Resumen calculado:', {
      totalGeneral,
      totalServicios: serviciosDetalle.length,
      serviciosDetalle: serviciosDetalle.map(s => `${s.servicio} - $${s.precio}`)
    });
    
    return {
      totalGeneral,
      totalServicios: serviciosDetalle.length,
      serviciosDetalle
    };
  }, [carritos, carrito, carritoLoading, esSolicitudPublica, esOfertaSecundaria, datosSolicitud, resumenPago]); // Recalcular cuando cambian datos de carrito, solicitud u oferta secundaria

  // Convertir URLs de fotos de servicios cuando cambien
  React.useEffect(() => {
    const convertirURLsFotos = async () => {
      if (!resumenGlobal || !resumenGlobal.serviciosDetalle || resumenGlobal.serviciosDetalle.length === 0) {
        setFotosProveedores({});
        return;
      }

      const nuevasFotosServicios = {};
      
      for (let i = 0; i < resumenGlobal.serviciosDetalle.length; i++) {
        const servicio = resumenGlobal.serviciosDetalle[i];
        
        if (servicio.fotoServicio) {
          const urlCompleta = await getMediaURL(servicio.fotoServicio);
          nuevasFotosServicios[i] = urlCompleta;
        }
      }
      
      setFotosProveedores(nuevasFotosServicios);
    };
    
    convertirURLsFotos();
  }, [resumenGlobal]);

  // Manejar retorno desde Checkout Pro
  useEffect(() => {
    const handleDeepLink = async (event) => {
      console.log('🔗 Deep link recibido:', event.url);
      
      // Verificar si es un retorno de Checkout Pro
      if (event.url.includes('mercadopago') || event.url.includes('payment_id') || event.url.includes('status')) {
        const returnData = MercadoPagoService.parseCheckoutReturn(event.url);
        
        console.log('📨 Datos del retorno:', returnData);
        
        // Obtener el carrito activo
        const carritoActivo = carritos?.[0] || carrito;
        if (!carritoActivo) {
          Alert.alert('Error', 'No se encontró el carrito');
          return;
        }
        
        // Navegar a confirmación con los datos del pago
        navigation.navigate('Confirmacion', {
          metodoPago: METODOS_PAGO.MERCADOPAGO,
          paymentStatus: returnData.status,
          paymentId: returnData.payment_id,
          externalReference: returnData.external_reference,
        });
      }
    };
    
    // Escuchar deep links cuando la app está activa
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Verificar si hay un deep link pendiente al montar
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [navigation, carritos, carrito]);

  // Procesar pago con Mercado Pago
  const handlePagarConMercadoPago = useCallback(async () => {
    if (!aceptaTerminos) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones');
      return;
    }

    try {
      setCreandoPreferencia(true);
      
      if (esOfertaSecundaria && resumenPago) {
        // Flujo de oferta secundaria - Crear preferencia de Mercado Pago con el solicitud_servicio_id
        console.log('💳 Iniciando pago de oferta secundaria:', resumenPago.oferta_id);
        
        const solicitudServicioId = resumenPago.solicitud_servicio_id;
        
        if (!solicitudServicioId) {
          throw new Error('No se pudo obtener el ID de la solicitud de servicio');
        }
        
        // Construir URLs de retorno
        const scheme = 'mecanimovil';
        const backUrls = {
          success: `${scheme}://payment/success`,
          failure: `${scheme}://payment/failure`,
          pending: `${scheme}://payment/pending`,
        };
        
        // Crear preferencia de pago usando el ID de la solicitud de servicio
        console.log('📝 Creando preferencia de pago para oferta secundaria, solicitud servicio:', solicitudServicioId);
        
        const preferencia = await MercadoPagoService.createPreference(
          null, // No hay carrito_id
          backUrls,
          null, // notification_url
          solicitudServicioId // solicitud_servicio_id
        );
        
        console.log('✅ Preferencia creada:', preferencia.preference_id_mp);
        console.log('   - Init Point:', preferencia.init_point);
        
        // Abrir Checkout Pro en navegador in-app
        // Usar init_point primero (producción), sandbox solo como fallback
        const checkoutUrl = preferencia.init_point || preferencia.sandbox_init_point;
        const result = await MercadoPagoService.openCheckoutPro(checkoutUrl);
        
        console.log('📥 Resultado de preparar Checkout Pro para oferta secundaria:', result);
        
        // Navegar a la pantalla de WebView modal si useWebView es true
        if (result && result.useWebView && result.url) {
          console.log('✅ Abriendo WebView modal para Checkout Pro (oferta secundaria)');
          navigation.navigate('MercadoPagoWebView', {
            checkoutUrl: result.url
          });
        } else if (result && result.url && result.url.startsWith('mecanimovil://')) {
          // Si el navegador retornó una URL (deep link), procesarla
          navigation.navigate('PaymentCallback', {
            url: result.url,
            from_browser: true
          });
        } else {
          // Verificar si hay un deep link pendiente
          try {
            const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
            if (pendingDeepLink) {
              navigation.navigate('PaymentCallback', {
                url: pendingDeepLink,
                from_browser: true
              });
            } else {
              throw new Error('No se pudo preparar el WebView para Checkout Pro');
            }
          } catch (e) {
            console.error('Error verificando deep link pendiente:', e);
            Alert.alert('Error', 'No se pudo abrir el checkout de Mercado Pago. Por favor, intenta nuevamente.');
          }
        }
      } else if (esSolicitudPublica) {
        // Flujo de solicitud pública - Pago directo al proveedor
        console.log('💳 Iniciando pago directo de solicitud pública:', solicitudId);
        
        // Verificar si el proveedor puede recibir pagos
        if (!resumenGlobal?.proveedorPuedeRecibirPagos) {
          Alert.alert(
            'Proveedor no configurado',
            'El proveedor aún no ha configurado su cuenta de Mercado Pago para recibir pagos. Por favor, contacta al proveedor por el chat o usa transferencia bancaria.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Construir URLs de retorno
        // IMPORTANTE: Usar el scheme de la app para deep linking
        // Mercado Pago agregará automáticamente los parámetros de query:
        // - status (approved, pending, rejected)
        // - payment_id
        // - external_reference
        // - collection_status
        // - payment_type
        const scheme = 'mecanimovil';
        const backUrls = {
          success: `${scheme}://payment/success`,
          failure: `${scheme}://payment/failure`,
          pending: `${scheme}://payment/pending`,
        };
        
        console.log('🔗 URLs de retorno configuradas:', backUrls);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'F',
            location: 'OpcionesPagoScreen.js:back_urls_config',
            message: 'Configurando back_urls para preferencia',
            data: {
              back_urls: backUrls,
              oferta_id: resumenGlobal?.ofertaId,
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        // Determinar el tipo de pago según la selección del usuario
        // Si es pago parcial (solo falta pagar servicio), usar 'servicio'
        // Si tiene repuestos para pagar, usar la selección del usuario
        // Si NO tiene repuestos (servicio sin repuestos), pagar total directamente
        let tipoPagoFinal;
        if (resumenGlobal?.soloServicioPendiente) {
          // Si ya pagó repuestos, solo falta pagar el servicio
          tipoPagoFinal = 'servicio';
        } else if (resumenGlobal?.tieneRepuestosParaPagar) {
          // Si tiene repuestos con costo > 0, usar la selección del usuario
          tipoPagoFinal = tipoPagoRepuestos;
        } else {
          // Si no tiene repuestos para pagar (servicio sin repuestos), pagar total
          tipoPagoFinal = TIPO_PAGO_REPUESTOS.TODO_ADELANTADO;
        }
        
        console.log('📝 Creando preferencia de pago directo al proveedor:', {
          ofertaId: resumenGlobal?.ofertaId,
          tipoPago: tipoPagoFinal,
          tieneDesglose: resumenGlobal?.tieneDesgloseRepuestos,
          tieneRepuestosParaPagar: resumenGlobal?.tieneRepuestosParaPagar,
          soloServicioPendiente: resumenGlobal?.soloServicioPendiente
        });
        
        // Usar el endpoint de pago directo al proveedor
        const preferencia = await MercadoPagoService.createPreferenceToProvider(
          resumenGlobal?.ofertaId,
          tipoPagoFinal,
          backUrls
        );
        
        console.log('✅ Preferencia creada:', preferencia);
        console.log('   - Init Point:', preferencia.init_point);
        console.log('   - Sandbox Init Point:', preferencia.sandbox_init_point);
        
        // Guardar el pago pendiente para confirmarlo cuando regrese de MP
        const pagoPendienteData = {
          ofertaId: resumenGlobal?.ofertaId,
          tipoPago: tipoPagoFinal,
          externalReference: preferencia.external_reference,
          monto: preferencia.monto,
          timestamp: Date.now(),
        };
        setPagoPendiente(pagoPendienteData);
        
        // También guardar en AsyncStorage para recuperar si la app se reinicia
        await AsyncStorage.setItem('pago_pendiente', JSON.stringify(pagoPendienteData));
        console.log('💾 Pago pendiente guardado en AsyncStorage:', pagoPendienteData);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'I',
            location: 'OpcionesPagoScreen.js:before_open_checkout',
            message: 'Antes de abrir Checkout Pro',
            data: { 
              pago_pendiente: pagoPendienteData,
              back_urls: backUrls,
              external_reference: preferencia.external_reference
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        // Abrir Checkout Pro del proveedor - Usar init_point primero (producción), sandbox solo como fallback
        const checkoutUrl = preferencia.init_point || preferencia.sandbox_init_point;
        if (!checkoutUrl) {
          throw new Error('No se pudo obtener el enlace de pago');
        }
        console.log('🚀 Abriendo Checkout Pro en navegador in-app:', checkoutUrl);
        
        // IMPORTANTE: Guardar el deep link esperado ANTES de abrir Mercado Pago
        // Esto asegura que si la app se reinicia, podamos procesar el deep link correctamente
        const expectedDeepLink = backUrls.success; // Mercado Pago redirigirá aquí después del pago
        await AsyncStorage.setItem('expected_deep_link', expectedDeepLink);
        await AsyncStorage.setItem('pago_pendiente_data', JSON.stringify({
          ...pagoPendienteData,
          expectedDeepLink,
          timestamp: Date.now()
        }));
        
        // Abrir Checkout Pro en WebView modal
        // Esto mantiene el contexto de la app y evita que se abran múltiples instancias
        const result = await MercadoPagoService.openCheckoutPro(checkoutUrl);
        
        console.log('📥 Resultado de preparar Checkout Pro:', result);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d21e2f6b-6baf-4202-b5db-1d07b32331cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'T',
            location: 'OpcionesPagoScreen.js:checkout_webview',
            message: 'Abriendo Checkout Pro en WebView modal',
            data: { result, expectedDeepLink },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        // Navegar a la pantalla de WebView modal
        if (result.useWebView && result.url) {
          console.log('✅ Abriendo WebView modal para Checkout Pro');
          navigation.navigate('MercadoPagoWebView', {
            checkoutUrl: result.url
          });
        } else {
          throw new Error('No se pudo preparar el WebView para Checkout Pro');
        }
      } else {
        // Flujo tradicional - Pago con carrito
        const carritoActivo = carritos?.[0] || carrito;
        if (!carritoActivo) {
          Alert.alert('Error', 'No se encontró el carrito');
          return;
        }

        console.log('💳 Iniciando proceso de pago con Mercado Pago');
        console.log('   - Carrito ID:', carritoActivo.id);
        
        // Construir URLs de retorno
        const scheme = 'mecanimovil';
        const backUrls = {
          success: `${scheme}://payment/success`,
          failure: `${scheme}://payment/failure`,
          pending: `${scheme}://payment/pending`,
        };
        
        // Crear preferencia de pago
        const preferencia = await MercadoPagoService.createPreference(
          carritoActivo.id,
          backUrls
        );
        
        console.log('✅ Preferencia creada:', preferencia.preference_id_mp);
        console.log('   - Init Point:', preferencia.init_point);
        
        // Abrir Checkout Pro en navegador in-app
        // Usar init_point primero (producción), sandbox solo como fallback
        const checkoutUrl = preferencia.init_point || preferencia.sandbox_init_point;
        const result = await MercadoPagoService.openCheckoutPro(checkoutUrl);
        
        // Si el navegador retornó una URL (deep link), procesarla
        if (result && result.url && result.url.startsWith('mecanimovil://')) {
          navigation.navigate('PaymentCallback', {
            url: result.url,
            from_browser: true
          });
        } else {
          // Verificar si hay un deep link pendiente
          try {
            const pendingDeepLink = await AsyncStorage.getItem('pending_deep_link');
            if (pendingDeepLink) {
              navigation.navigate('PaymentCallback', {
                url: pendingDeepLink,
                from_browser: true
              });
            }
          } catch (e) {
            console.warn('Error verificando deep link pendiente:', e);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando pago con Mercado Pago:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo iniciar el proceso de pago. Por favor, intenta nuevamente.'
      );
    } finally {
      setCreandoPreferencia(false);
    }
  }, [aceptaTerminos, carritos, carrito, esSolicitudPublica, esOfertaSecundaria, solicitudId, resumenPago, metodoPagoSeleccionado, datosSolicitud, navigation]);

  // Enviar comprobante por WhatsApp
  const handleEnviarComprobante = useCallback(async () => {
    if (!aceptaTerminos) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones');
      return;
    }

    try {
      // Si es oferta secundaria, primero actualizar el estado en el backend
      if (esOfertaSecundaria && resumenPago) {
        try {
          console.log('💳 Actualizando estado de oferta secundaria para transferencia...');
          const { post } = await import('../../services/api');
          const ofertaId = route.params?.ofertaId;
          
          if (ofertaId) {
            // Llamar al endpoint para actualizar el estado a pendiente_pago
            const response = await post(`/ordenes/ofertas/${ofertaId}/pagar-oferta-secundaria/`, {
              metodo_pago: 'transferencia'
            });
            console.log('✅ Estado de oferta secundaria actualizado a pendiente_pago:', response);
          } else {
            console.warn('⚠️ No se encontró ofertaId en route.params');
          }
        } catch (error) {
          console.error('❌ Error actualizando estado de oferta secundaria:', error);
          // Continuar con el flujo aunque falle la actualización
          // El usuario puede enviar el comprobante de todas formas
        }
      }
      
      const serviciosTexto = resumenGlobal?.serviciosDetalle.map(s => 
        `• ${s.servicio} - ${s.proveedor} (${s.fecha} a las ${s.hora})`
      ).join('\n') || '';
      
      const mensaje = `Hola, quiero confirmar mi agendamiento:\n\n${serviciosTexto}\n\nTotal: $${Math.round(resumenGlobal?.totalGeneral || 0).toLocaleString('es-CL')}\n\nMétodo de pago: Transferencia Bancaria\n\nDatos de cuenta:\nBanco: ${DATOS_TRANSFERENCIA.banco}\nCuenta: ${DATOS_TRANSFERENCIA.numeroCuenta}\nTitular: ${DATOS_TRANSFERENCIA.titular}`;
      
      const whatsappUrl = `whatsapp://send?phone=${TELEFONO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (!canOpen) {
        // Si es oferta secundaria o solicitud pública, no navegar a Confirmacion
        if (esOfertaSecundaria || esSolicitudPublica) {
          Alert.alert(
            'WhatsApp no disponible',
            'No se pudo abrir WhatsApp. Por favor, envía el comprobante manualmente. Recibirás una notificación cuando el pago sea validado.',
            [
              { 
                text: 'Ver Mis Solicitudes', 
                onPress: () => {
                  navigation.navigate(ROUTES.MIS_SOLICITUDES || 'MisSolicitudes');
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'WhatsApp no disponible',
            'No se pudo abrir WhatsApp. ¿Quieres continuar de todas formas?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Continuar',
                onPress: () => {
                  navigation.navigate('Confirmacion', { 
                    metodoPago: metodoPagoSeleccionado,
                    comprobanteEnviado: false
                  });
                }
              }
            ]
          );
        }
        return;
      }
      
      await Linking.openURL(whatsappUrl);
      
      setTimeout(() => {
        // Si es oferta secundaria, manejar diferente
        if (esOfertaSecundaria && resumenPago) {
          Alert.alert(
            'Comprobante Enviado',
            'Tu comprobante de pago ha sido enviado por WhatsApp. El pago será validado manualmente y recibirás una notificación push cuando sea confirmado.',
            [
              {
                text: 'Ver Mis Solicitudes',
                onPress: () => {
                  navigation.navigate(ROUTES.MIS_SOLICITUDES || 'MisSolicitudes');
                }
              },
              {
                text: 'Ver Detalle',
                style: 'cancel',
                onPress: () => {
                  navigation.navigate(ROUTES.DETALLE_SOLICITUD || 'DetalleSolicitud', {
                    solicitudId: resumenPago.solicitud_publica_id || solicitudId
                  });
                }
              }
            ]
          );
        } else if (esSolicitudPublica) {
          Alert.alert(
            'Comprobante Enviado',
            'Tu comprobante de pago ha sido enviado por WhatsApp. El pago será validado manualmente y recibirás una notificación push cuando sea confirmado.',
            [
              {
                text: 'Ver Mis Solicitudes',
                onPress: () => {
                  navigation.navigate(ROUTES.MIS_SOLICITUDES || 'MisSolicitudes');
                }
              },
              {
                text: 'Ver Detalle',
                style: 'cancel',
                onPress: () => {
                  navigation.navigate(ROUTES.DETALLE_SOLICITUD || 'DetalleSolicitud', {
                    solicitudId: solicitudId
                  });
                }
              }
            ]
          );
        } else {
          // Flujo tradicional de carrito
          Alert.alert(
            'Comprobante de Pago',
            '¿Enviaste el comprobante de pago por WhatsApp?',
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: () => {
                  navigation.navigate('Confirmacion', { 
                    metodoPago: metodoPagoSeleccionado,
                    comprobanteEnviado: false
                  });
                }
              },
              {
                text: 'Sí, enviado',
                onPress: () => {
                  navigation.navigate('Confirmacion', { 
                    metodoPago: metodoPagoSeleccionado,
                    comprobanteEnviado: true
                  });
                }
              }
            ]
          );
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error abriendo WhatsApp:', error);
      Alert.alert('Error', 'No se pudo abrir WhatsApp: ' + error.message);
    }
  }, [aceptaTerminos, resumenGlobal, navigation, metodoPagoSeleccionado, esSolicitudPublica, esOfertaSecundaria, solicitudId, resumenPago, route.params?.ofertaId]);

  // Mostrar loading mientras se cargan los datos (carrito, solicitud u oferta secundaria)
  const estasCargando = esOfertaSecundaria ? false : (esSolicitudPublica ? cargandoSolicitud : (cargandoCarrito || carritoLoading));
  const tieneDatos = esOfertaSecundaria ? !!resumenPago : (esSolicitudPublica ? !!datosSolicitud : !!(carritos?.length > 0 || carrito));
  
  if (estasCargando && !tieneDatos) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {esSolicitudPublica ? 'Cargando información de pago...' : 'Cargando información del carrito...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Si terminó de cargar y no hay datos, mostrar error
  if (!estasCargando && !resumenGlobal) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.errorContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.errorTitle}>
            {esSolicitudPublica ? 'No hay datos de pago disponibles' : 'No hay carrito disponible'}
          </Text>
          <Text style={styles.errorText}>
            {esSolicitudPublica 
              ? 'No se pudieron cargar los datos de pago de la solicitud. Por favor, verifica que la solicitud esté adjudicada.'
              : 'No se encontró ningún carrito activo. Por favor, vuelve a aceptar la oferta o verifica que el carrito esté disponible.'
            }
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={async () => {
              try {
                if (esSolicitudPublica) {
                  setCargandoSolicitud(true);
                  const solicitudesService = (await import('../../services/solicitudesService')).default;
                  const datos = await solicitudesService.obtenerDatosPago(solicitudId);
                  setDatosSolicitud(datos);
                } else {
                  setCargandoCarrito(true);
                  setIntentosCarga(prev => prev + 1);
                  await cargarTodosLosCarritos(true);
                }
              } catch (error) {
                console.error('Error recargando datos:', error);
                Alert.alert('Error', 'No se pudieron cargar los datos. Por favor, intenta de nuevo.');
              } finally {
                if (esSolicitudPublica) {
                  setCargandoSolicitud(false);
                } else {
                  setCargandoCarrito(false);
                }
              }
            }}
          >
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si aún no hay resumenGlobal pero hay datos en el contexto, esperar un momento
  if (!resumenGlobal && tieneDatos) {
    // Los datos están cargados pero el resumenGlobal aún no se ha calculado
    // Esto puede ocurrir si hay un delay en el cálculo, esperar un momento
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {esSolicitudPublica ? 'Preparando información de pago...' : 'Preparando información del carrito...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />
      
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: colors.background?.paper || '#FFFFFF',
          borderBottomWidth: safeWidth.thin,
          borderBottomColor: colors.border?.light || colors.neutral?.gray?.[200] || '#E5E7EB',
          ...SHADOWS.sm,
        }
      ]}>
        <View style={[styles.headerContent, { paddingHorizontal: spacing.md || SPACING.md }]}>
          <View style={styles.headerLeftContainer}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary?.[500] || COLORS.primary[500]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerTitleContainer}>
            <Text 
              style={[
                styles.headerTitle,
                {
                  color: colors.text?.primary || '#00171F',
                  fontSize: typography.fontSize?.xl || 20,
                  fontWeight: typography.fontWeight?.bold || '700',
                }
              ]}
              numberOfLines={1}
            >
              Método de Pago
            </Text>
          </View>
          
          <View style={styles.headerRightContainer} />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Resumen del Pedido</Text>
            
            {resumenGlobal.serviciosDetalle.map((servicio, index) => (
              <View key={index} style={styles.servicioResumenCard}>
                <View style={styles.proveedorFotoContainer}>
                  {fotosProveedores[index] ? (
                    <Image 
                      source={{ uri: fotosProveedores[index] }} 
                      style={styles.proveedorFoto}
                    />
                  ) : (
                    <View style={styles.proveedorFotoPlaceholder}>
                      <Ionicons 
                        name={servicio.tipoProveedor === 'Taller' ? 'business' : 'person'} 
                        size={24} 
                        color="#007AFF" 
                      />
                    </View>
                  )}
                </View>

                <View style={styles.servicioResumenInfo}>
                  <Text style={styles.servicioResumenNombre}>{servicio.servicio}</Text>
                  <View style={styles.proveedorResumenRow}>
                    <Ionicons 
                      name={servicio.tipoProveedor === 'Taller' ? 'business' : 'person'} 
                      size={14} 
                      color="#666666" 
                    />
                    <Text style={styles.proveedorResumenNombre}>{servicio.proveedor}</Text>
                  </View>
                  <View style={styles.fechaHoraRow}>
                    <View style={styles.fechaHoraItem}>
                      <Ionicons name="calendar-outline" size={14} color="#666666" />
                      <Text style={styles.fechaHoraTexto}>{servicio.fecha}</Text>
                    </View>
                    <View style={styles.fechaHoraItem}>
                      <Ionicons name="time-outline" size={14} color="#666666" />
                      <Text style={styles.fechaHoraTexto}>{servicio.hora}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.totalResumenCard}>
              <Text style={styles.totalResumenLabel}>
                {resumenGlobal?.soloServicioPendiente ? 'Saldo a pagar' : 'Total a pagar'}
              </Text>
              <Text style={styles.totalResumenValue}>
                ${Math.round(resumenGlobal.totalConIva || resumenGlobal.totalGeneral * 1.19).toLocaleString('es-CL')}
              </Text>
            </View>
          </View>

          {/* Sección de desglose de repuestos - Solo si la oferta incluye repuestos */}
          {esSolicitudPublica && resumenGlobal?.tieneDesgloseRepuestos && (
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>Detalle de precios</Text>
              
              <View style={styles.desgloseCard}>
                {/* Si es pago parcial, mostrar solo lo que falta pagar */}
                {resumenGlobal.soloServicioPendiente ? (
                  <>
                    {/* Información de lo ya pagado */}
                    <View style={styles.infoPagoParcialCard}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <View style={styles.infoPagoParcialContent}>
                        <Text style={styles.infoPagoParcialTitulo}>Ya pagado:</Text>
                        <Text style={styles.infoPagoParcialTexto}>
                          • Repuestos: ${Math.round(resumenGlobal.costoRepuestosOriginal || 0).toLocaleString('es-CL')}
                        </Text>
                        {resumenGlobal.costoGestionCompraOriginal > 0 && (
                          <Text style={styles.infoPagoParcialTexto}>
                            • Gestión de compra: ${Math.round((resumenGlobal.costoGestionCompraOriginal || 0) * 1.19).toLocaleString('es-CL')}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.desgloseDivider} />
                    
                    {/* Solo mostrar mano de obra (lo que falta pagar) */}
                    <View style={styles.desgloseRow}>
                      <View style={styles.desgloseItem}>
                        <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.desgloseLabel}>🔧 Mano de obra (sin IVA)</Text>
                      </View>
                      <Text style={styles.desgloseValue}>
                        ${Math.round(resumenGlobal.costoManoObraSinIva).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    
                    {/* Subtotal (solo mano de obra) */}
                    <View style={styles.desgloseDivider} />
                    <View style={styles.desgloseRow}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseLabel}>Subtotal</Text>
                      </View>
                      <Text style={styles.desgloseValue}>
                        ${Math.round(resumenGlobal.subtotalSinIva || resumenGlobal.costoManoObraSinIva).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    
                    {/* IVA 19% - Solo sobre mano de obra */}
                    <View style={styles.desgloseRow}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseLabel}>📋 IVA (19% sobre mano de obra)</Text>
                      </View>
                      <Text style={styles.desgloseValue}>
                        ${Math.round(resumenGlobal.iva || (resumenGlobal.costoManoObraSinIva * 0.19)).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    
                    {/* Total - destacado (solo saldo pendiente) */}
                    <View style={styles.desgloseDivider} />
                    <View style={[styles.desgloseRow, styles.desgloseTotalRow]}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseTotalLabel}>Saldo a pagar</Text>
                      </View>
                      <Text style={styles.desgloseTotalValue}>
                        ${resumenGlobal.totalConIva?.toLocaleString('es-CL')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Mano de obra (sin IVA) */}
                    {resumenGlobal.costoManoObraSinIva > 0 && (
                      <View style={styles.desgloseRow}>
                        <View style={styles.desgloseItem}>
                          <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
                          <Text style={styles.desgloseLabel}>🔧 Mano de obra (sin IVA)</Text>
                        </View>
                        <Text style={styles.desgloseValue}>
                          ${Math.round(resumenGlobal.costoManoObraSinIva).toLocaleString('es-CL')}
                        </Text>
                      </View>
                    )}
                    
                    {/* Repuestos - Precio directo (no lleva IVA adicional) */}
                    {resumenGlobal.costoRepuestos > 0 && (
                      <>
                        {resumenGlobal.costoManoObraSinIva > 0 && <View style={styles.desgloseDivider} />}
                        <View style={styles.desgloseRow}>
                          <View style={styles.desgloseItem}>
                            <Ionicons name="cog-outline" size={20} color="#666666" />
                            <Text style={styles.desgloseLabel}>📦 Repuestos</Text>
                          </View>
                          <Text style={styles.desgloseValue}>
                            ${Math.round(resumenGlobal.costoRepuestos).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      </>
                    )}
                    
                    {/* Gestión de compra (sin IVA) */}
                    {resumenGlobal.costoGestionCompraSinIva > 0 && (
                      <>
                        <View style={styles.desgloseDivider} />
                        <View style={styles.desgloseRow}>
                          <View style={styles.desgloseItem}>
                            <Ionicons name="car-outline" size={20} color="#FF9800" />
                            <Text style={[styles.desgloseLabel, { color: '#FF9800' }]}>🚚 Gestión de compra (sin IVA)</Text>
                          </View>
                          <Text style={[styles.desgloseValue, { color: '#FF9800' }]}>
                            ${Math.round(resumenGlobal.costoGestionCompraSinIva).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      </>
                    )}
                    
                    {/* Subtotal */}
                    <View style={styles.desgloseDivider} />
                    <View style={styles.desgloseRow}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseLabel}>Subtotal</Text>
                      </View>
                      <Text style={styles.desgloseValue}>
                        ${Math.round((resumenGlobal.subtotalSinIva || (resumenGlobal.costoManoObraSinIva + resumenGlobal.costoRepuestos + resumenGlobal.costoGestionCompraSinIva))).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    
                    {/* IVA 19% - Solo sobre servicios (mano de obra + gestión) */}
                    <View style={styles.desgloseRow}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseLabel}>📋 IVA (19% sobre servicios)</Text>
                      </View>
                      <Text style={styles.desgloseValue}>
                        ${Math.round((resumenGlobal.iva || ((resumenGlobal.costoManoObraSinIva + resumenGlobal.costoGestionCompraSinIva) * 0.19))).toLocaleString('es-CL')}
                      </Text>
                    </View>
                    
                    {/* Total - destacado */}
                    <View style={styles.desgloseDivider} />
                    <View style={[styles.desgloseRow, styles.desgloseTotalRow]}>
                      <View style={styles.desgloseItem}>
                        <Text style={styles.desgloseTotalLabel}>Total a pagar</Text>
                      </View>
                      <Text style={styles.desgloseTotalValue}>
                        ${resumenGlobal.totalConIva?.toLocaleString('es-CL')}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              
              {/* Foto de cotización de repuestos si existe */}
              {resumenGlobal.fotoCotizacionRepuestos && (
                <TouchableOpacity 
                  style={styles.fotoCotizacionContainer}
                  onPress={() => {
                    // Aquí podrías abrir la imagen en pantalla completa
                    Alert.alert('Cotización de Repuestos', 'Ver imagen de cotización de la casa de repuestos');
                  }}
                >
                  <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.fotoCotizacionText}>Ver cotización de repuestos</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}

              <Text style={[styles.seccionTitulo, { marginTop: 20 }]}>¿Cómo deseas pagar?</Text>
              
              {/* Si es pago parcial (solo falta pagar servicio), mostrar solo una opción */}
              {resumenGlobal.soloServicioPendiente ? (
                <TouchableOpacity
                  style={[
                    styles.tipoPagoButton,
                    styles.tipoPagoButtonSelected
                  ]}
                  activeOpacity={0.7}
                  disabled={true}
                >
                  <View style={styles.tipoPagoHeader}>
                    <View style={[styles.radioButton, styles.radioButtonSelected]}>
                      <View style={styles.radioButtonInner} />
                    </View>
                    <View style={styles.tipoPagoInfo}>
                      <Text style={styles.tipoPagoTitulo}>💰 Pagar Saldo Restante</Text>
                      <Text style={styles.tipoPagoMonto}>
                        ${resumenGlobal.totalConIva?.toLocaleString('es-CL')}
                      </Text>
                      <Text style={styles.tipoPagoDetalle}>
                        (Mano de obra)
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tipoPagoDescripcion}>
                    Ya pagaste los repuestos y la gestión de compra. Ahora solo falta pagar la mano de obra del servicio.
                  </Text>
                  <View style={styles.tipoPagoBadge}>
                    <Text style={styles.tipoPagoBadgeText}>Pago Restante</Text>
                  </View>
                </TouchableOpacity>
              ) : resumenGlobal.tieneRepuestosParaPagar ? (
                <>
                  {/* Opción 1: Pagar solo repuestos ahora - Solo si hay repuestos con costo > 0 */}
                  <TouchableOpacity
                    style={[
                      styles.tipoPagoButton,
                      tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO && styles.tipoPagoButtonSelected
                    ]}
                    onPress={() => setTipoPagoRepuestos(TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tipoPagoHeader}>
                      <View style={[
                        styles.radioButton,
                        tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO && styles.radioButtonSelected
                      ]}>
                        {tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <View style={styles.tipoPagoInfo}>
                        <Text style={styles.tipoPagoTitulo}>💳 Pagar Repuestos Ahora</Text>
                        <Text style={styles.tipoPagoMonto}>
                          ${resumenGlobal.pagoAnticipadoRepuestos?.toLocaleString('es-CL')}
                        </Text>
                        {resumenGlobal.costoGestionCompraConIva > 0 && (
                          <Text style={styles.tipoPagoDetalle}>
                            (Repuestos + Gestión de compra)
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.tipoPagoDescripcion}>
                      El proveedor comprará los repuestos{resumenGlobal.costoGestionCompraConIva > 0 ? ' (incluye traslado)' : ''} y realizará el servicio. Pagas la mano de obra (${resumenGlobal.costoManoObraConIva?.toLocaleString('es-CL')}) después de que termine.
                    </Text>
                    <View style={styles.tipoPagoBadge}>
                      <Text style={styles.tipoPagoBadgeText}>Recomendado</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Opción 2: Pagar todo ahora */}
                  <TouchableOpacity
                    style={[
                      styles.tipoPagoButton,
                      tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.TODO_ADELANTADO && styles.tipoPagoButtonSelected
                    ]}
                    onPress={() => setTipoPagoRepuestos(TIPO_PAGO_REPUESTOS.TODO_ADELANTADO)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tipoPagoHeader}>
                      <View style={[
                        styles.radioButton,
                        tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.TODO_ADELANTADO && styles.radioButtonSelected
                      ]}>
                        {tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.TODO_ADELANTADO && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <View style={styles.tipoPagoInfo}>
                        <Text style={styles.tipoPagoTitulo}>💵 Pagar Todo Ahora</Text>
                        <Text style={styles.tipoPagoMonto}>
                          ${resumenGlobal.totalConIva?.toLocaleString('es-CL')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tipoPagoDescripcion}>
                      Paga el servicio completo (repuestos + mano de obra) ahora. No tendrás que preocuparte por pagos adicionales.
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Si NO hay repuestos para pagar (servicio sin repuestos), mostrar solo opción de pagar total */
                <TouchableOpacity
                  style={[
                    styles.tipoPagoButton,
                    styles.tipoPagoButtonSelected
                  ]}
                  activeOpacity={0.7}
                  disabled={true}
                >
                  <View style={styles.tipoPagoHeader}>
                    <View style={[styles.radioButton, styles.radioButtonSelected]}>
                      <View style={styles.radioButtonInner} />
                    </View>
                    <View style={styles.tipoPagoInfo}>
                      <Text style={styles.tipoPagoTitulo}>💵 Pagar Servicio</Text>
                      <Text style={styles.tipoPagoMonto}>
                        ${resumenGlobal.totalConIva?.toLocaleString('es-CL')}
                      </Text>
                      <Text style={styles.tipoPagoDetalle}>
                        (Mano de obra)
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tipoPagoDescripcion}>
                    Este servicio es solo mano de obra, sin repuestos incluidos.
                  </Text>
                  <View style={styles.tipoPagoBadge}>
                    <Text style={styles.tipoPagoBadgeText}>Solo Servicio</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Alerta si el proveedor no puede recibir pagos */}
              {!resumenGlobal.proveedorPuedeRecibirPagos && (
                <View style={styles.warningProveedorCard}>
                  <Ionicons name="warning" size={24} color="#E65100" />
                  <View style={styles.warningProveedorContent}>
                    <Text style={styles.warningProveedorTitulo}>Proveedor sin Mercado Pago</Text>
                    <Text style={styles.warningProveedorTexto}>
                      El proveedor aún no ha configurado su cuenta de Mercado Pago. 
                      Por favor, usa transferencia bancaria o contacta al proveedor por el chat.
                    </Text>
                  </View>
                </View>
              )}

              {/* Info de pago seguro */}
              <View style={styles.infoSeguroCard}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                <Text style={styles.infoSeguroTexto}>
                  El pago va directamente a la cuenta de Mercado Pago del proveedor. Mecanimovil no interviene en la transacción.
                </Text>
              </View>
            </View>
          )}

          {/* Mensaje informativo cuando incluye repuestos pero NO hay desglose detallado */}
          {esSolicitudPublica && resumenGlobal?.incluyeRepuestosSinDesglose && (
            <View style={styles.seccion}>
              <View style={styles.infoRepuestosSinDesgloseCard}>
                <Ionicons name="information-circle" size={24} color="#1976D2" />
                <View style={styles.infoRepuestosSinDesgloseContent}>
                  <Text style={styles.infoRepuestosSinDesgloseTitulo}>Servicio con Repuestos</Text>
                  <Text style={styles.infoRepuestosSinDesgloseTexto}>
                    Esta oferta incluye repuestos. El proveedor no especificó el desglose de costos, 
                    por lo que el pago se realizará por el monto total.
                  </Text>
                  <Text style={styles.infoRepuestosSinDesgloseNota}>
                    💡 Si deseas pagar los repuestos por separado, contacta al proveedor por el chat 
                    para que actualice su oferta con el desglose de costos.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Selecciona tu método de pago</Text>
            
            {/* Opción Mercado Pago */}
            <TouchableOpacity
              style={[
                styles.metodoButton,
                metodoPagoSeleccionado === METODOS_PAGO.MERCADOPAGO && styles.metodoButtonSelected
              ]}
              onPress={() => setMetodoPagoSeleccionado(METODOS_PAGO.MERCADOPAGO)}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={28} color={metodoPagoSeleccionado === METODOS_PAGO.MERCADOPAGO ? COLORS.primary : '#666666'} />
              <View style={styles.metodoInfo}>
                <Text style={[
                  styles.metodoNombre,
                  metodoPagoSeleccionado === METODOS_PAGO.MERCADOPAGO && styles.metodoNombreSelected
                ]}>
                  Mercado Pago
                </Text>
                <Text style={styles.metodoDescripcion}>
                  Paga con tarjeta, efectivo o transferencia
                </Text>
              </View>
              {metodoPagoSeleccionado === METODOS_PAGO.MERCADOPAGO && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            
          </View>

          {/* Información de Mercado Pago */}
          <View style={styles.seccion}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <Text style={styles.infoTitulo}>Pago con Mercado Pago</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTexto}>
                  Serás redirigido a Mercado Pago para completar tu pago de forma segura.
                  Puedes pagar con tarjeta de crédito, débito, efectivo o transferencia bancaria.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.seccion}>
            <TouchableOpacity
              style={styles.terminosContainer}
              onPress={() => setAceptaTerminos(!aceptaTerminos)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                aceptaTerminos && styles.checkboxChecked
              ]}>
                {aceptaTerminos && (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.terminosTextoContainer}>
                <Text style={styles.terminosTexto}>
                  Acepto los términos y condiciones
                </Text>
                <Text style={styles.terminosSubtexto}>
                  Al continuar, aceptas nuestras políticas de servicio
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {metodoPagoSeleccionado === METODOS_PAGO.MERCADOPAGO ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!aceptaTerminos || creandoPreferencia) && styles.primaryButtonDisabled
              ]}
              onPress={handlePagarConMercadoPago}
              disabled={!aceptaTerminos || creandoPreferencia}
              activeOpacity={0.8}
            >
              {creandoPreferencia ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Procesando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {(() => {
                      // Si es solicitud pública con desglose de repuestos
                      if (esSolicitudPublica && resumenGlobal?.tieneDesgloseRepuestos) {
                        // Si es pago parcial (solo falta pagar servicio)
                        if (resumenGlobal.soloServicioPendiente) {
                          return `Pagar Saldo Restante ($${resumenGlobal.totalConIva?.toLocaleString('es-CL')})`;
                        }
                        // Si NO tiene repuestos para pagar (servicio sin repuestos)
                        if (!resumenGlobal.tieneRepuestosParaPagar) {
                          return `Pagar Servicio ($${resumenGlobal.totalConIva?.toLocaleString('es-CL')})`;
                        }
                        // Si el usuario eligió pagar solo repuestos
                        if (tipoPagoRepuestos === TIPO_PAGO_REPUESTOS.REPUESTOS_ADELANTADO) {
                          return `Pagar Repuestos ($${resumenGlobal.pagoAnticipadoRepuestos?.toLocaleString('es-CL')})`;
                        }
                        // Si el usuario eligió pagar todo
                        return `Pagar Todo ($${resumenGlobal.totalConIva?.toLocaleString('es-CL')})`;
                      }
                      // Si no tiene desglose o es otro flujo
                      return 'Pagar con Mercado Pago';
                    })()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !aceptaTerminos && styles.primaryButtonDisabled
              ]}
              onPress={handleEnviarComprobante}
              disabled={!aceptaTerminos}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Enviar Comprobante por WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonError: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    // Estilos inline aplicados desde el componente
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  headerLeftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm || 8,
  },
  headerTitle: {
    // Estilos inline aplicados desde el componente
  },
  headerRightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  seccion: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  servicioResumenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  proveedorFotoContainer: {
    marginRight: 12,
  },
  proveedorFoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  proveedorFotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  servicioResumenInfo: {
    flex: 1,
  },
  servicioResumenNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  proveedorResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  proveedorResumenNombre: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  fechaHoraRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fechaHoraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  fechaHoraTexto: {
    fontSize: 13,
    color: '#999999',
    marginLeft: 4,
  },
  totalResumenCard: {
    backgroundColor: '#333333',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalResumenLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalResumenValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  metodoButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F8FF',
  },
  metodoInfo: {
    flex: 1,
    marginLeft: 16,
  },
  metodoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  metodoNombreSelected: {
    color: COLORS.primary,
  },
  metodoDescripcion: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  infoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 12,
  },
  infoContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  infoTexto: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  terminosContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  terminosTextoContainer: {
    flex: 1,
  },
  terminosTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
    lineHeight: 22,
  },
  terminosSubtexto: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  primaryButton: {
    backgroundColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  testModeCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE082',
    marginTop: 16,
  },
  testModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFE082',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD54F',
  },
  testModeTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
    marginLeft: 10,
  },
  testModeContent: {
    padding: 16,
  },
  testModeTexto: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  testDataBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  testDataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
    marginRight: 8,
    minWidth: 80,
  },
  testDataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
    fontFamily: 'monospace',
    flex: 1,
  },
  testDataNote: {
    fontSize: 11,
    color: '#E65100',
    fontStyle: 'italic',
    marginTop: 4,
    width: '100%',
  },
  noteBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  noteText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 16,
    fontWeight: '500',
  },
  testModeSubtitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 12,
    marginTop: 16,
  },
  testCardContainer: {
    gap: 12,
  },
  testCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  testCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 6,
  },
  testCardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  testCardDetails: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  testModeNota: {
    fontSize: 12,
    color: '#E65100',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Estilos para desglose de repuestos
  desgloseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  desgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  desgloseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desgloseLabel: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  desgloseValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '700',
  },
  desgloseDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 4,
  },
  desgloseTotalRow: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  desgloseTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  desgloseTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  fotoCotizacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  fotoCotizacionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 10,
  },
  // Estilos para opciones de tipo de pago
  tipoPagoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    position: 'relative',
    overflow: 'hidden',
  },
  tipoPagoButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F8FF',
  },
  tipoPagoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipoPagoInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipoPagoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  tipoPagoMonto: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tipoPagoDetalle: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
  },
  tipoPagoDescripcion: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginLeft: 36,
  },
  infoPagoParcialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  infoPagoParcialContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoPagoParcialTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 4,
  },
  infoPagoParcialTexto: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  tipoPagoBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 12,
  },
  tipoPagoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  warningProveedorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
    gap: 12,
  },
  warningProveedorContent: {
    flex: 1,
  },
  warningProveedorTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  warningProveedorTexto: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 18,
  },
  infoSeguroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  infoSeguroTexto: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 16,
  },
  // Estilos para mensaje de repuestos sin desglose
  infoRepuestosSinDesgloseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
    gap: 12,
  },
  infoRepuestosSinDesgloseContent: {
    flex: 1,
  },
  infoRepuestosSinDesgloseTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 6,
  },
  infoRepuestosSinDesgloseTexto: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 10,
  },
  infoRepuestosSinDesgloseNota: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default OpcionesPagoScreen;
