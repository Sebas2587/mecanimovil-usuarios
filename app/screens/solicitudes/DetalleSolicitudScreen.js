import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import OfertaCard from '../../components/ofertas/OfertaCard';
import RechazoCard from '../../components/solicitudes/RechazoCard';
import EstadoSolicitudBadge from '../../components/solicitudes/EstadoSolicitudBadge';
import Button from '../../components/base/Button/Button';
import AlertaPagoProximo from '../../components/alerts/AlertaPagoProximo';
import ChecklistViewerModal from '../../components/modals/ChecklistViewerModal';
import VehicleSelectionModal from '../../components/modals/VehicleSelectionModal';
import ScrollContainer from '../../components/base/ScrollContainer';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useAgendamiento } from '../../context/AgendamientoContext';
import solicitudesService from '../../services/solicitudesService';
import ofertasService from '../../services/ofertasService';
import { getMediaURL, post, get } from '../../services/api';
import { useTheme } from '../../design-system/theme/useTheme';
import checklistClienteService from '../../services/checklistService';

/**
 * Pantalla de detalle de una solicitud con sus ofertas
 */
const DetalleSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { solicitudId } = route.params || {};
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
    ? borders
    : {
      radius: {
        none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
        full: 9999,
        button: { sm: 8, md: 12, lg: 16, full: 9999 },
        input: { sm: 8, md: 12, lg: 16 },
        card: { sm: 8, md: 12, lg: 16, xl: 20 },
        modal: { sm: 12, md: 16, lg: 20, xl: 24 },
        avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
        badge: { sm: 4, md: 8, lg: 12, full: 9999 },
      },
      width: { none: 0, thin: 1, medium: 2, thick: 4 }
    };

  // Crear estilos dinámicos con los tokens del tema
  const styles = createStyles(colors, safeTypography, spacing, safeBorders);

  const { seleccionarOferta, cancelarSolicitud } = useSolicitudes();
  const { cargarTodosLosCarritos } = useAgendamiento();

  const [solicitud, setSolicitud] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [proveedorFotoUrl, setProveedorFotoUrl] = useState(null);
  const [proveedoresFotos, setProveedoresFotos] = useState({});
  const [timelineExpandido, setTimelineExpandido] = useState(false);
  const [tabActivo, setTabActivo] = useState('principal');

  // Estados para alerta de pago próximo
  const [mostrarAlertaPago, setMostrarAlertaPago] = useState(false);
  const [alertaTiempoRestanteHoras, setAlertaTiempoRestanteHoras] = useState(0);
  const [alertaTiempoRestanteMinutos, setAlertaTiempoRestanteMinutos] = useState(0);
  const [alertaMensaje, setAlertaMensaje] = useState('');

  // Estados para checklist
  const [checklistDisponible, setChecklistDisponible] = useState(false);
  const [verificandoChecklist, setVerificandoChecklist] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (solicitudId) {
        console.log('🔄 DetalleSolicitudScreen: Recargando datos al enfocar pantalla');
        cargarDatos();
      } else {
        console.error('DetalleSolicitudScreen: solicitudId es undefined');
        Alert.alert('Error', 'No se pudo identificar la solicitud');
        navigation.goBack();
      }
    }, [solicitudId])
  );

  // Verificar si debe mostrarse la alerta de pago próximo
  useEffect(() => {
    const verificarAlertaPago = () => {
      if (!solicitud || solicitud.estado !== 'adjudicada') {
        setMostrarAlertaPago(false);
        return;
      }

      // Verificar si tiene fecha_limite_pago
      if (!solicitud.fecha_limite_pago) {
        setMostrarAlertaPago(false);
        return;
      }

      const fechaLimite = new Date(solicitud.fecha_limite_pago);
      const ahora = new Date();
      const diferenciaMs = fechaLimite - ahora;
      const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

      // Mostrar alerta si faltan 6 horas o menos
      if (diferenciaHoras > 0 && diferenciaHoras <= 6) {
        const horas = Math.floor(diferenciaHoras);
        const minutos = Math.floor((diferenciaHoras - horas) * 60);
        setAlertaTiempoRestanteHoras(horas);
        setAlertaTiempoRestanteMinutos(minutos);
        setAlertaMensaje(`Quedan ${horas}h ${minutos}m para pagar esta solicitud`);
        setMostrarAlertaPago(true);
      } else {
        setMostrarAlertaPago(false);
      }
    };

    verificarAlertaPago();

    // Verificar cada 5 minutos
    const interval = setInterval(verificarAlertaPago, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [solicitud]);

  // Cargar alertas desde API como fallback (polling cada 5 minutos)
  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        // get() ya retorna response.data directamente
        const response = await get('/ordenes/solicitudes-publicas/alertas-pago/');
        if (response && response.alertas && response.alertas.length > 0) {
          const alerta = response.alertas.find(a => a.solicitud_id === solicitudId);
          if (alerta && alerta.tipo === 'pago_proximo') {
            setAlertaTiempoRestanteHoras(alerta.tiempo_restante_horas || 0);
            setAlertaTiempoRestanteMinutos(alerta.tiempo_restante_minutos || 0);
            setAlertaMensaje(alerta.mensaje || '');
            setMostrarAlertaPago(true);
          }
        }
      } catch (error) {
        // Silenciar error 404 ya que es normal si no hay alertas
        const errorStatus = error?.status || error?.response?.status;
        if (errorStatus === 404) {
          // 404 es esperado cuando no hay alertas activas
          console.log('ℹ️ DetalleSolicitudScreen: No hay alertas activas (404 - normal)');
        } else {
          console.error('❌ DetalleSolicitudScreen: Error cargando alertas:', {
            message: error?.message,
            status: errorStatus,
            data: error?.response?.data || error?.data
          });
        }
      }
    };

    if (solicitudId) {
      cargarAlertas();
      const interval = setInterval(cargarAlertas, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [solicitudId]);

  // Verificar si hay checklist disponible cuando la solicitud está completada
  useEffect(() => {
    const verificarChecklistDisponible = async () => {
      if (!solicitud || solicitud.estado !== 'completada') {
        setChecklistDisponible(false);
        return;
      }

      // Obtener el solicitud_servicio_id de la oferta seleccionada
      const ofertaSeleccionada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
      const ordenId = ofertaSeleccionada?.solicitud_servicio_id;

      if (!ordenId) {
        console.log('ℹ️ DetalleSolicitudScreen: No hay ordenId disponible para verificar checklist');
        setChecklistDisponible(false);
        return;
      }

      try {
        setVerificandoChecklist(true);
        console.log('🔍 DetalleSolicitudScreen: Verificando checklist para orden:', ordenId);

        const disponible = await checklistClienteService.tieneChecklistDisponible(ordenId);
        setChecklistDisponible(disponible);

        console.log(disponible ? '✅ DetalleSolicitudScreen: Checklist disponible' : '❌ DetalleSolicitudScreen: Sin checklist disponible');
      } catch (error) {
        console.error('❌ DetalleSolicitudScreen: Error verificando checklist:', error);
        setChecklistDisponible(false);
      } finally {
        setVerificandoChecklist(false);
      }
    };

    verificarChecklistDisponible();
  }, [solicitud]);

  const handleVerChecklist = () => {
    const ofertaSeleccionada = solicitud?.oferta_seleccionada_detail || solicitud?.oferta_seleccionada;
    const ordenId = ofertaSeleccionada?.solicitud_servicio_id;

    if (!ordenId) {
      Alert.alert('Error', 'No se pudo obtener la información del servicio');
      return;
    }

    console.log('🔍 DetalleSolicitudScreen: Abriendo modal de checklist para orden:', ordenId);
    setShowChecklistModal(true);
  };

  const cargarDatos = async () => {
    if (!solicitudId) {
      console.error('DetalleSolicitudScreen: No se puede cargar datos sin solicitudId');
      Alert.alert('Error', 'No se pudo identificar la solicitud');
      return;
    }

    try {
      setLoading(true);
      console.log('DetalleSolicitudScreen: Cargando datos para solicitudId:', solicitudId);
      const [solicitudData, ofertasData] = await Promise.all([
        solicitudesService.obtenerDetalleSolicitud(solicitudId),
        ofertasService.obtenerOfertasDeSolicitud(solicitudId)
      ]);

      // Normalizar solicitud si viene en formato GeoJSON Feature
      let solicitudNormalizada;
      if (solicitudData && solicitudData.type === 'Feature' && solicitudData.properties) {
        solicitudNormalizada = {
          ...solicitudData.properties,
          id: solicitudData.id || solicitudData.properties.id,
          geometry: solicitudData.geometry
        };
        // Asegurar que las ofertas secundarias se copien correctamente
        if (solicitudData.properties.ofertas_secundarias) {
          solicitudNormalizada.ofertas_secundarias = solicitudData.properties.ofertas_secundarias;
        }
      } else {
        solicitudNormalizada = solicitudData;
      }

      // Debug: Log de datos recibidos
      console.log('🔍 DetalleSolicitudScreen - Datos recibidos:', {
        solicitudData: {
          tieneOfertasSecundarias: !!solicitudNormalizada?.ofertas_secundarias,
          cantidadOfertasSecundarias: solicitudNormalizada?.ofertas_secundarias?.length || 0,
          ofertasSecundarias: solicitudNormalizada?.ofertas_secundarias
        },
        ofertasData: {
          total: ofertasData?.length || 0,
          ofertasSecundarias: (ofertasData || []).filter(o => o.es_oferta_secundaria).length,
          todasLasOfertas: ofertasData
        }
      });

      // Separar ofertas originales de ofertas secundarias
      const ofertasOriginales = (ofertasData || []).filter(o => !o.es_oferta_secundaria);
      const ofertasSecundarias = (ofertasData || []).filter(o => o.es_oferta_secundaria);

      console.log('🔍 DetalleSolicitudScreen - Ofertas filtradas:', {
        originales: ofertasOriginales.length,
        secundarias: ofertasSecundarias.length,
        secundariasDetalle: ofertasSecundarias.map(o => ({ id: o.id, estado: o.estado, es_oferta_secundaria: o.es_oferta_secundaria }))
      });

      // Ordenar ofertas originales por precio (menor a mayor)
      const ofertasOrdenadas = ofertasOriginales.sort((a, b) =>
        parseFloat(a.precio_total_ofrecido || 0) - parseFloat(b.precio_total_ofrecido || 0)
      );
      setOfertas(ofertasOrdenadas);

      // Priorizar ofertas secundarias del detalle de la solicitud (más confiable)
      // También verificar en oferta_seleccionada_detail.ofertas_secundarias como fallback
      let ofertasSecundariasFinales = [];

      // Fuente 1: ofertas_secundarias del detalle de la solicitud
      const ofertasSecundariasSolicitud = solicitudNormalizada?.ofertas_secundarias || [];

      // Fuente 2: ofertas_secundarias de la oferta seleccionada (fallback)
      const ofertaSeleccionada = solicitudNormalizada?.oferta_seleccionada_detail;
      console.log('🔍 oferta_seleccionada_detail completo:', {
        existe: !!ofertaSeleccionada,
        id: ofertaSeleccionada?.id,
        tieneOfertasSecundarias: !!ofertaSeleccionada?.ofertas_secundarias,
        cantidadOfertasSecundarias: ofertaSeleccionada?.ofertas_secundarias?.length || 0,
        ofertasSecundariasRaw: ofertaSeleccionada?.ofertas_secundarias,
        tipoOfertasSecundarias: Array.isArray(ofertaSeleccionada?.ofertas_secundarias) ? 'array' : typeof ofertaSeleccionada?.ofertas_secundarias
      });

      // Asegurar que ofertas_secundarias sea un array
      let ofertasSecundariasOfertaSeleccionada = [];
      if (ofertaSeleccionada?.ofertas_secundarias) {
        if (Array.isArray(ofertaSeleccionada.ofertas_secundarias)) {
          ofertasSecundariasOfertaSeleccionada = ofertaSeleccionada.ofertas_secundarias;
        } else if (typeof ofertaSeleccionada.ofertas_secundarias === 'object') {
          // Si es un objeto, intentar convertirlo a array
          ofertasSecundariasOfertaSeleccionada = Object.values(ofertaSeleccionada.ofertas_secundarias);
        }
      }

      console.log('🔍 ofertasSecundariasOfertaSeleccionada procesadas:', {
        cantidad: ofertasSecundariasOfertaSeleccionada.length,
        ofertas: ofertasSecundariasOfertaSeleccionada.map(o => ({ id: o.id, estado: o.estado, es_oferta_secundaria: o.es_oferta_secundaria }))
      });

      // Fuente 3: ofertas secundarias de ofertasData
      const ofertasSecundariasOfertasData = ofertasSecundarias;

      console.log('🔍 Fuentes de ofertas secundarias:', {
        solicitud: ofertasSecundariasSolicitud.length,
        ofertaSeleccionada: ofertasSecundariasOfertaSeleccionada.length,
        ofertasData: ofertasSecundariasOfertasData.length,
        detalleOfertaSeleccionada: ofertasSecundariasOfertaSeleccionada.map(o => ({ id: o.id, estado: o.estado }))
      });

      // Combinar todas las fuentes y eliminar duplicados por ID
      const todasLasOfertasSecundarias = [
        ...ofertasSecundariasSolicitud,
        ...ofertasSecundariasOfertaSeleccionada,
        ...ofertasSecundariasOfertasData
      ];

      ofertasSecundariasFinales = todasLasOfertasSecundarias.filter((oferta, index, self) =>
        index === self.findIndex((o) => o.id === oferta.id)
      );

      console.log('✅ Ofertas secundarias finales (combinadas y sin duplicados):', {
        cantidad: ofertasSecundariasFinales.length,
        ofertas: ofertasSecundariasFinales.map(o => ({ id: o.id, estado: o.estado, es_oferta_secundaria: o.es_oferta_secundaria }))
      });

      console.log('🔍 DetalleSolicitudScreen - Ofertas secundarias del backend:', {
        cantidad: solicitudNormalizada?.ofertas_secundarias?.length || 0,
        ofertas: solicitudNormalizada?.ofertas_secundarias?.map(o => ({ id: o.id, estado: o.estado })) || []
      });

      console.log('🔍 DetalleSolicitudScreen - Ofertas secundarias finales:', {
        cantidad: ofertasSecundariasFinales.length,
        ofertas: ofertasSecundariasFinales.map(o => ({ id: o.id, estado: o.estado }))
      });

      // Actualizar solicitud con ofertas secundarias antes de establecer el estado
      const solicitudConOfertasSecundarias = {
        ...solicitudNormalizada,
        ofertas_secundarias: ofertasSecundariasFinales
      };

      setSolicitud(solicitudConOfertasSecundarias);

      // Cargar fotos de proveedores dirigidos
      if (solicitudConOfertasSecundarias?.proveedores_dirigidos_detail && solicitudConOfertasSecundarias.proveedores_dirigidos_detail.length > 0) {
        const fotosProveedores = {};
        await Promise.all(
          solicitudConOfertasSecundarias.proveedores_dirigidos_detail.map(async (proveedor) => {
            try {
              // Intentar obtener foto desde múltiples fuentes
              let fotoProveedor = proveedor.foto_perfil ||
                proveedor.usuario?.foto_perfil ||
                proveedor.foto ||
                null;

              if (fotoProveedor) {
                // Si ya es una URL completa, usarla directamente
                if (typeof fotoProveedor === 'string' && (fotoProveedor.startsWith('http://') || fotoProveedor.startsWith('https://'))) {
                  fotosProveedores[proveedor.id] = fotoProveedor;
                } else {
                  // Si es una ruta relativa, usar getMediaURL
                  const fotoUrl = await getMediaURL(fotoProveedor);
                  fotosProveedores[proveedor.id] = fotoUrl;
                }
              }
            } catch (error) {
              console.warn(`Error obteniendo foto del proveedor ${proveedor.id}:`, error);
            }
          })
        );
        setProveedoresFotos(fotosProveedores);
      }

      // Cargar foto del proveedor si hay oferta seleccionada
      if (solicitudConOfertasSecundarias?.oferta_seleccionada_detail) {
        const ofertaSeleccionada = solicitudConOfertasSecundarias.oferta_seleccionada_detail;

        // Intentar obtener foto desde múltiples fuentes
        let fotoProveedor = ofertaSeleccionada.proveedor_foto ||
          ofertaSeleccionada.proveedor_info?.foto_perfil ||
          ofertaSeleccionada.proveedor_info?.usuario?.foto_perfil ||
          ofertaSeleccionada.proveedor_info?.foto ||
          ofertaSeleccionada.taller_info?.usuario?.foto_perfil ||
          ofertaSeleccionada.mecanico_info?.usuario?.foto_perfil ||
          ofertaSeleccionada.taller_info?.foto_perfil ||
          ofertaSeleccionada.mecanico_info?.foto_perfil ||
          null;

        // Si no hay foto en la oferta seleccionada, buscar en las ofertas cargadas
        if (!fotoProveedor && ofertasOrdenadas.length > 0) {
          const ofertaSeleccionadaEnLista = ofertasOrdenadas.find(o =>
            o.id === ofertaSeleccionada.id ||
            (typeof ofertaSeleccionada === 'string' && o.id === ofertaSeleccionada)
          );

          if (ofertaSeleccionadaEnLista) {
            fotoProveedor = ofertaSeleccionadaEnLista.proveedor_foto ||
              ofertaSeleccionadaEnLista.proveedor_info?.foto_perfil ||
              ofertaSeleccionadaEnLista.proveedor_info?.usuario?.foto_perfil ||
              ofertaSeleccionadaEnLista.proveedor_info?.foto ||
              null;
          }
        }

        if (fotoProveedor) {
          try {
            // Si ya es una URL completa, usarla directamente
            if (typeof fotoProveedor === 'string' && (fotoProveedor.startsWith('http://') || fotoProveedor.startsWith('https://'))) {
              setProveedorFotoUrl(fotoProveedor);
            } else {
              // Si es una ruta relativa, usar getMediaURL
              const fotoUrl = await getMediaURL(fotoProveedor);
              setProveedorFotoUrl(fotoUrl);
            }
          } catch (error) {
            console.warn('Error obteniendo foto del proveedor:', error);
            setProveedorFotoUrl(null);
          }
        } else {
          setProveedorFotoUrl(null);
        }
      } else {
        setProveedorFotoUrl(null);
      }

      console.log('DetalleSolicitudScreen: Solicitud cargada:', {
        id: solicitudConOfertasSecundarias?.id,
        estado: solicitudConOfertasSecundarias?.estado,
        tipoSolicitud: solicitudConOfertasSecundarias?.tipo_solicitud,
        tieneProveedoresDirigidos: !!solicitudConOfertasSecundarias?.proveedores_dirigidos_detail?.length,
        proveedoresDirigidos: solicitudConOfertasSecundarias?.proveedores_dirigidos_detail,
        tieneOfertaSeleccionada: !!solicitudConOfertasSecundarias?.oferta_seleccionada,
        ofertaSeleccionada: solicitudConOfertasSecundarias?.oferta_seleccionada,
        totalOfertas: solicitudConOfertasSecundarias?.total_ofertas,
        ofertasRecibidas: ofertasOrdenadas.length,
        ofertasSecundarias: ofertasSecundariasFinales.length,
        ofertasSecundariasDetalle: ofertasSecundariasFinales.map(o => ({ id: o.id, estado: o.estado }))
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const handleAceptarOferta = async (oferta) => {
    // Validar que la solicitud esté dentro del tiempo permitido antes de mostrar el alert
    const ahora = new Date();
    let fueraDelTiempo = false;
    let mensajeTiempo = '';

    // Verificar si la fecha de expiración ya pasó (aplica para todas las ofertas)
    if (solicitud.fecha_expiracion) {
      const fechaExpiracion = new Date(solicitud.fecha_expiracion);
      if (ahora > fechaExpiracion) {
        fueraDelTiempo = true;
        mensajeTiempo = 'La solicitud ha expirado y ya no está disponible para aceptar ofertas.';
      }
    }

    // Para ACEPTAR ofertas, NO validar la fecha/hora programada
    // La fecha/hora programada solo es relevante para PAGOS, no para aceptar ofertas
    // Solo validar la fecha de expiración (ya validada arriba)
    // Esto permite que los clientes acepten ofertas incluso si la fecha/hora programada ya pasó
    // El pago se validará después cuando el cliente intente pagar

    if (fueraDelTiempo) {
      Alert.alert(
        'Solicitud no disponible',
        mensajeTiempo,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Aceptar Oferta',
      `¿Estás seguro de que deseas aceptar la oferta de ${oferta.nombre_proveedor} por $${parseInt(oferta.precio_total_ofrecido).toLocaleString()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          style: 'default',
          onPress: async () => {
            setProcesando(true);
            try {
              const resultado = await seleccionarOferta(solicitudId, oferta.id);

              // Si es una oferta secundaria, manejar de manera diferente
              if (resultado && resultado.es_oferta_secundaria) {
                // Recargar la solicitud para mostrar el estado actualizado
                try {
                  const solicitudActualizada = await solicitudesService.obtenerDetalleSolicitud(solicitudId);
                  const solicitudNormalizada = solicitudActualizada && solicitudActualizada.type === 'Feature' && solicitudActualizada.properties
                    ? { ...solicitudActualizada.properties, id: solicitudActualizada.id || solicitudActualizada.properties.id, geometry: solicitudActualizada.geometry }
                    : solicitudActualizada;
                  setSolicitud(solicitudNormalizada);
                } catch (error) {
                  console.error('Error recargando solicitud:', error);
                }

                // Mostrar mensaje de confirmación y opción de pagar directamente
                Alert.alert(
                  '¡Oferta Secundaria Aceptada!',
                  `La oferta de servicio adicional ha sido aceptada. ¿Deseas proceder con el pago ahora?`,
                  [
                    { text: 'Ver Detalles', style: 'cancel' },
                    {
                      text: 'Pagar Ahora',
                      onPress: () => {
                        // Usar handlePagarOfertaSecundaria para pagar
                        handlePagarOfertaSecundaria(oferta);
                      }
                    }
                  ]
                );
                return;
              }

              // La oferta ahora se agrega al carrito (para ofertas originales)
              if (resultado && resultado.carrito) {
                // Recargar los carritos en el contexto para asegurar que estén actualizados
                try {
                  await cargarTodosLosCarritos();
                  console.log('Carritos recargados después de aceptar oferta');
                } catch (error) {
                  console.error('Error recargando carritos:', error);
                  // No fallar la operación si falla la recarga
                }

                // Recargar la solicitud para mostrar el estado actualizado
                try {
                  const solicitudActualizada = await solicitudesService.obtenerDetalleSolicitud(solicitudId);
                  // Normalizar solicitud si viene en formato GeoJSON Feature
                  const solicitudNormalizada = solicitudActualizada && solicitudActualizada.type === 'Feature' && solicitudActualizada.properties
                    ? { ...solicitudActualizada.properties, id: solicitudActualizada.id || solicitudActualizada.properties.id, geometry: solicitudActualizada.geometry }
                    : solicitudActualizada;
                  setSolicitud(solicitudNormalizada);

                  // Cargar foto del proveedor actualizada
                  if (solicitudNormalizada?.oferta_seleccionada_detail) {
                    const ofertaSeleccionada = solicitudNormalizada.oferta_seleccionada_detail;
                    let fotoProveedor = ofertaSeleccionada.proveedor_foto ||
                      ofertaSeleccionada.proveedor_info?.foto_perfil ||
                      ofertaSeleccionada.proveedor_info?.usuario?.foto_perfil ||
                      ofertaSeleccionada.taller_info?.usuario?.foto_perfil ||
                      ofertaSeleccionada.mecanico_info?.usuario?.foto_perfil ||
                      null;

                    if (fotoProveedor) {
                      try {
                        if (typeof fotoProveedor === 'string' && (fotoProveedor.startsWith('http://') || fotoProveedor.startsWith('https://'))) {
                          setProveedorFotoUrl(fotoProveedor);
                        } else {
                          const fotoUrl = await getMediaURL(fotoProveedor);
                          setProveedorFotoUrl(fotoUrl);
                        }
                      } catch (error) {
                        console.warn('Error obteniendo foto del proveedor:', error);
                        setProveedorFotoUrl(null);
                      }
                    } else {
                      setProveedorFotoUrl(null);
                    }
                  }
                } catch (error) {
                  console.error('Error recargando solicitud:', error);
                }

                // Verificar si la oferta tiene desglose de repuestos
                const tieneDesgloseRepuestos = oferta.incluye_repuestos &&
                  parseFloat(oferta.costo_repuestos || 0) > 0 &&
                  parseFloat(oferta.costo_mano_obra || 0) > 0;

                // Mostrar mensaje de confirmación y opción de pagar directamente
                Alert.alert(
                  '¡Oferta aceptada!',
                  tieneDesgloseRepuestos
                    ? 'La oferta incluye repuestos. Podrás elegir cómo pagar (repuestos ahora o todo junto).'
                    : 'La oferta ha sido agregada a tu carrito. ¿Deseas proceder con el pago ahora?',
                  [
                    { text: 'Ver Detalles', style: 'cancel' },
                    {
                      text: 'Pagar Ahora',
                      onPress: () => {
                        // Navegar siempre a OpcionesPago - ahora maneja todo el flujo incluyendo desglose de repuestos
                        navigation.navigate('OpcionesPago', {
                          solicitudId: solicitudId,
                          origen: 'solicitud_publica'
                        });
                      }
                    }
                  ]
                );
              } else if (resultado && resultado.solicitud_tradicional_id) {
                // Fallback: si aún viene solicitud_tradicional_id (compatibilidad con versión anterior)
                navigation.navigate(ROUTES.OPCIONES_PAGO || 'OpcionesPago', {
                  solicitudId: resultado.solicitud_tradicional_id
                });
              } else {
                Alert.alert('Éxito', 'Oferta aceptada correctamente');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error aceptando oferta:', error);
              let mensaje = error.response?.data?.detail || error.response?.data?.error || error.message || 'No se pudo aceptar la oferta';

              // Verificar si el mensaje es "G" o empieza con G (común para errores de 'Geometry' o 'Google')
              // y dar un mensaje más descriptivo al usuario
              if (mensaje && typeof mensaje === 'string') {
                const mensajeLower = mensaje.toLowerCase();
                if (mensajeLower === 'g' || mensajeLower === 'error g' || (mensajeLower.startsWith('g') && mensaje.length < 20)) {
                  console.warn('⚠️ Error críptico detectado ("' + mensaje + '"), reemplazando por mensaje amigable');
                  mensaje = 'Hubo un problema procesando la ubicación de la solicitud. Por favor intenta nuevamente.';
                } else if (mensajeLower.includes('geometry') || mensajeLower.includes('geometría') || mensajeLower.includes('geometria')) {
                  mensaje = 'La solicitud requiere una ubicación válida. Por favor verifica la dirección del servicio.';
                }
              }

              Alert.alert('Error', mensaje);
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
  };

  const handleChatPress = (oferta) => {
    // ✅ Validar que la solicitud esté activa
    if (!solicitud || !oferta || solicitud.estado === 'cancelada' || solicitud.estado === 'expirada') {
      Alert.alert(
        'Chat no disponible',
        'No se puede chatear en una solicitud cancelada o expirada'
      );
      return;
    }

    // ✅ Validar que la oferta esté en un estado válido
    if (oferta.estado === 'rechazada' || oferta.estado === 'retirada' || oferta.estado === 'expirada') {
      Alert.alert(
        'Chat no disponible',
        'No se puede chatear en una oferta que no está activa'
      );
      return;
    }

    // ✅ Si la solicitud está adjudicada, solo permitir chat si la oferta es la seleccionada
    // Nota: Para ofertas secundarias, siempre permitir chat porque son independientes
    if (solicitud.estado === 'adjudicada' && solicitud.oferta_seleccionada && !oferta.es_oferta_secundaria) {
      const ofertaSeleccionadaObj = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
      const ofertaSeleccionadaId = typeof ofertaSeleccionadaObj === 'object' && ofertaSeleccionadaObj?.id
        ? ofertaSeleccionadaObj.id
        : (typeof ofertaSeleccionadaObj === 'string' ? ofertaSeleccionadaObj : solicitud.oferta_seleccionada);

      if (ofertaSeleccionadaId !== oferta.id && oferta.estado !== 'en_chat' && oferta.estado !== 'vista') {
        Alert.alert(
          'Chat no disponible',
          'Solo puedes chatear con el proveedor de la oferta seleccionada'
        );
        return;
      }
    }

    navigation.navigate(ROUTES.CHAT_OFERTA, { ofertaId: oferta.id, solicitudId });
  };

  const handleVerDetalle = async (oferta) => {
    try {
      const detalle = await ofertasService.obtenerDetalleOferta(oferta.id);
      // Aquí podrías navegar a una pantalla de detalle o mostrar un modal
      Alert.alert(
        'Detalle de Oferta',
        `Proveedor: ${detalle.nombre_proveedor}\n` +
        `Precio: $${parseInt(detalle.precio_total_ofrecido).toLocaleString()}\n` +
        `Tiempo estimado: ${detalle.tiempo_estimado_total}\n` +
        `Garantía: ${detalle.garantia_ofrecida || 'No especificada'}\n` +
        `Descripción: ${detalle.descripcion_oferta || 'Sin descripción'}`
      );
    } catch (error) {
      console.error('Error obteniendo detalle:', error);
      Alert.alert('Error', 'No se pudo cargar el detalle de la oferta');
    }
  };

  const handleCompararOfertas = () => {
    if (ofertas.length < 2) {
      Alert.alert('Información', 'Necesitas al menos 2 ofertas para comparar');
      return;
    }
    navigation.navigate(ROUTES.COMPARADOR_OFERTAS, {
      solicitudId,
      ofertas: ofertas.map(o => o.id)
    });
  };

  const handleCancelarSolicitud = () => {
    Alert.alert(
      'Cancelar Solicitud',
      '¿Estás seguro de que deseas cancelar esta solicitud? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelarSolicitud(solicitudId);
              Alert.alert('Éxito', 'Solicitud cancelada correctamente');
              navigation.goBack();
            } catch (error) {
              console.error('Error cancelando solicitud:', error);
              Alert.alert('Error', 'No se pudo cancelar la solicitud');
            }
          }
        }
      ]
    );
  };

  const handleReenviarSolicitud = () => {
    Alert.alert(
      'Reenviar Solicitud',
      'Esta solicitud será publicada nuevamente por 48 horas. Los rechazos anteriores serán eliminados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reenviar',
          onPress: async () => {
            try {
              setProcesando(true);
              const result = await solicitudesService.reenviarSolicitud(solicitudId);
              Alert.alert(
                'Éxito',
                result.message || 'Solicitud reenviada exitosamente',
                [
                  {
                    text: 'OK',
                    onPress: () => cargarDatos()
                  }
                ]
              );
            } catch (error) {
              console.error('Error reenviando solicitud:', error);
              Alert.alert('Error', 'No se pudo reenviar la solicitud');
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
  };

  const handlePagarOferta = async () => {
    try {
      setProcesando(true);
      console.log('💳 DetalleSolicitudScreen: Navegando a pago directo para solicitud:', solicitudId);

      // Validar que tenemos una solicitud válida para pagar
      if (!solicitud) {
        Alert.alert(
          'Error',
          'No se pudo obtener la información de la solicitud.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar que la solicitud esté en un estado válido para pagar
      // 'adjudicada': oferta aceptada, esperando pago
      // 'pagada': puede tener pago parcial (solo repuestos), permitir pagar servicio
      // 'pendiente_pago': cliente inició proceso de pago pero no completó
      const estadosValidosParaPago = ['adjudicada', 'pagada', 'pendiente_pago'];
      if (!estadosValidosParaPago.includes(solicitud.estado)) {
        Alert.alert(
          'Error',
          'La solicitud debe estar adjudicada o pendiente de pago de servicio para proceder.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verificar si hay oferta aceptada y si tiene pago de servicio pendiente
      const ofertaAceptada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
      if (ofertaAceptada) {
        // Si ya pagó repuestos pero no el servicio, permitir pagar servicio
        if (ofertaAceptada.estado_pago_repuestos === 'pagado' &&
          ofertaAceptada.estado_pago_servicio === 'pendiente') {
          console.log('💳 DetalleSolicitudScreen: Pago de servicio pendiente, permitiendo continuar');
          // Continuar con el pago - se manejará en OpcionesPago
        } else if (ofertaAceptada.estado_pago_repuestos === 'pagado' &&
          ofertaAceptada.estado_pago_servicio === 'pagado') {
          Alert.alert(
            'Información',
            'Esta solicitud ya ha sido completamente pagada.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Validar que el pago completo no haya sido realizado
      if (solicitud.pago_realizado && ofertaAceptada?.estado_pago_servicio === 'pagado') {
        Alert.alert(
          'Información',
          'Esta solicitud ya ha sido pagada completamente.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar que la solicitud no esté bloqueada para pagos
      const estadosQueBloqueanPago = ['expirada', 'cancelada', 'finalizada'];
      if (estadosQueBloqueanPago.includes(solicitud.estado)) {
        const mensajesEstado = {
          'expirada': 'expirada',
          'cancelada': 'cancelada',
          'pagada': 'pagada',
          'finalizada': 'finalizada',
          'pendiente_pago': 'con pago en proceso'
        };
        Alert.alert(
          'Pago no disponible',
          `No se puede procesar el pago. La solicitud está ${mensajesEstado[solicitud.estado] || 'bloqueada'}.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar que el servicio no esté completado
      if (solicitud.servicio_completado === true || solicitud.estado === 'completada') {
        Alert.alert(
          'Servicio completado',
          'No se puede procesar el pago. El servicio ya ha sido completado.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar que la solicitud esté dentro del tiempo permitido
      const ahora = new Date();
      let fueraDelTiempo = false;
      let mensajeTiempo = '';

      // Si el estado es 'pendiente_pago', permitimos continuar independientemente de la fecha_preferida
      // porque el usuario ya intentó pagar y está retomando
      // Solo verificamos fecha_expiracion absoluta si es crítico, pero para pagos pendientes solemos ser flexibles
      const esPagoPendiente = solicitud.estado === 'pendiente_pago';

      if (!esPagoPendiente) {
        // Verificar si la fecha de expiración ya pasó
        if (solicitud.fecha_expiracion) {
          const fechaExpiracion = new Date(solicitud.fecha_expiracion);
          if (ahora > fechaExpiracion) {
            fueraDelTiempo = true;
            mensajeTiempo = 'La solicitud ha expirado y ya no está disponible para pagos.';
          }
        }

        // Verificar si la fecha/hora programada ya pasó
        // Prioridad: Usar fecha_limite_pago del backend si existe (ya viene con zona horaria correcta)
        if (!fueraDelTiempo && solicitud.fecha_limite_pago) {
          const fechaLimite = new Date(solicitud.fecha_limite_pago);
          if (ahora > fechaLimite) {
            fueraDelTiempo = true;
            mensajeTiempo = 'El tiempo límite para el pago ha expirado.';
          }
        }
        // Fallback: Verificar si la fecha/hora programada ya pasó
        else if (!fueraDelTiempo && solicitud.fecha_preferida) {
          let fechaProgramada;
          // FIX TZ ERROR: Parse manually to ensure local time
          if (typeof solicitud.fecha_preferida === 'string' && solicitud.fecha_preferida.includes('-')) {
            const [year, month, day] = solicitud.fecha_preferida.split('-').map(Number);
            fechaProgramada = new Date(year, month - 1, day); // Local time 00:00:00
          } else {
            fechaProgramada = new Date(solicitud.fecha_preferida);
          }

          // Si hay hora preferida, combinarla con la fecha
          if (solicitud.hora_preferida) {
            const [horas, minutos] = solicitud.hora_preferida.split(':').map(Number);
            fechaProgramada.setHours(horas || 0, minutos || 0, 0, 0);
          } else {
            // Si no hay hora, usar el final del día (23:59:59)
            fechaProgramada.setHours(23, 59, 59, 999);
          }

          // Si la fecha/hora programada ya pasó, no se puede pagar
          if (ahora > fechaProgramada) {
            fueraDelTiempo = true;
            mensajeTiempo = 'El tiempo programado para esta solicitud ya ha pasado y no está disponible para pagos.';
          }
        }
      }

      if (fueraDelTiempo) {
        Alert.alert(
          'Solicitud no disponible',
          mensajeTiempo,
          [{ text: 'OK' }]
        );
        return;
      }

      // Navegar directamente a OpcionesPago con la información de la solicitud
      // OpcionesPago detectará que es una solicitud pública y no usará carrito
      // Funciona tanto para Mercado Pago como para Transferencia Bancaria
      navigation.navigate('OpcionesPago', {
        solicitudId: solicitudId,
        origen: 'solicitud_publica'
      });

      console.log('✅ DetalleSolicitudScreen: Navegación a OpcionesPago exitosa');
    } catch (error) {
      console.error('❌ Error navegando a pagos:', error);
      Alert.alert(
        'Error',
        `No se pudo procesar la solicitud: ${error.message || 'Error desconocido'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setProcesando(false);
    }
  };

  const handlePagarOfertaSecundaria = async (ofertaSecundaria) => {
    try {
      setProcesando(true);
      console.log('💳 DetalleSolicitudScreen: Pagando oferta secundaria:', ofertaSecundaria.id);

      // Validar que la oferta secundaria está en un estado válido para pagar
      // (aceptada o pendiente_pago - igual que las órdenes principales)
      if (!['aceptada', 'pendiente_pago'].includes(ofertaSecundaria.estado)) {
        Alert.alert(
          'Error',
          `La oferta secundaria debe estar en estado "aceptada" o "pendiente_pago" para poder pagarse. Estado actual: ${ofertaSecundaria.estado}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar que la oferta no esté ya pagada
      if (ofertaSecundaria.estado === 'pagada') {
        Alert.alert(
          'Información',
          'Esta oferta secundaria ya ha sido pagada.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Llamar al endpoint de pago de oferta secundaria
      const response = await post(`/ordenes/ofertas/${ofertaSecundaria.id}/pagar-oferta-secundaria/`, {
        metodo_pago: 'mercadopago'
      });

      console.log('📥 DetalleSolicitudScreen: Respuesta completa del backend:', JSON.stringify(response, null, 2));

      // La función post() ya retorna response.data, así que response es directamente el objeto de datos
      if (response && response.resumen_pago) {
        console.log('✅ DetalleSolicitudScreen: Pago de oferta secundaria procesado, respuesta:', response);

        // Actualizar el estado localmente para reflejar el cambio inmediatamente
        // Usar el estado actualizado del backend si está disponible
        const estadoActualizado = response.oferta_actualizada?.estado || 'pendiente_pago';
        const solicitudServicioId = response.resumen_pago?.solicitud_servicio_id || response.oferta_actualizada?.solicitud_servicio_id;

        console.log(`🔄 Estado actualizado: ${estadoActualizado}, SolicitudServicio ID: ${solicitudServicioId}`);

        if (solicitud && solicitud.ofertas_secundarias) {
          const ofertasActualizadas = solicitud.ofertas_secundarias.map(oferta => {
            if (oferta.id === ofertaSecundaria.id) {
              console.log(`🔄 Actualizando oferta ${oferta.id}: ${oferta.estado} → ${estadoActualizado}`);
              return {
                ...oferta,
                estado: estadoActualizado,
                solicitud_servicio_id: solicitudServicioId
              };
            }
            return oferta;
          });
          setSolicitud({
            ...solicitud,
            ofertas_secundarias: ofertasActualizadas
          });
          console.log('✅ Estado de oferta secundaria actualizado localmente');
        }

        // Navegar a OpcionesPago con la información de la oferta secundaria
        navigation.navigate('OpcionesPago', {
          solicitudId: solicitudId,
          ofertaId: ofertaSecundaria.id,
          origen: 'oferta_secundaria',
          resumenPago: response.resumen_pago
        });

        console.log('✅ DetalleSolicitudScreen: Navegación a OpcionesPago para oferta secundaria exitosa');
      } else {
        console.error('❌ DetalleSolicitudScreen: Respuesta inválida del backend:', response);
        Alert.alert(
          'Error',
          `No se pudo procesar el pago de la oferta secundaria. ${response?.error || 'Respuesta inválida del servidor'}`
        );
      }
    } catch (error) {
      console.error('❌ Error pagando oferta secundaria:', error);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // Extraer mensaje de error más detallado
      let mensaje = 'No se pudo procesar el pago de la oferta secundaria';

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          mensaje = error.response.data;
        } else if (error.response.data.error) {
          mensaje = error.response.data.error;
        } else if (error.response.data.detail) {
          mensaje = error.response.data.detail;
        } else if (error.response.data.message) {
          mensaje = error.response.data.message;
        }
      } else if (error.message) {
        mensaje = error.message;
      }

      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazarOferta = async (oferta) => {
    Alert.alert(
      'Rechazar Oferta',
      `¿Estás seguro de que deseas rechazar esta oferta${oferta.es_oferta_secundaria ? ' de servicio adicional' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              await ofertasService.rechazarOferta(oferta.id);
              Alert.alert('Éxito', 'Oferta rechazada correctamente');
              // Recargar datos
              await cargarDatos();
            } catch (error) {
              console.error('Error rechazando oferta:', error);
              const mensaje = error.response?.data?.error || error.message || 'No se pudo rechazar la oferta';
              Alert.alert('Error', mensaje);
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
  };

  // Función helper para renderizar timeline de oferta secundaria
  const renderTimelineOfertaSecundaria = (ofertaSec) => {
    return <TimelineOfertaSecundaria ofertaSec={ofertaSec} colors={colors} styles={styles} />;
  };

  if (loading && !solicitud) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#F8F9FA'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando solicitud...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!solicitud) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#F8F9FA'} />
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.text?.secondary || '#5D6F75'} />
          <Text style={styles.emptyTitle}>Solicitud no encontrada</Text>
          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const puedeCancelar = ['creada', 'seleccionando_servicios', 'publicada', 'con_ofertas'].includes(solicitud.estado);
  const puedeComparar = ofertas.length >= 2;
  const estaAdjudicada = solicitud.estado === 'adjudicada';
  const tieneOfertaAceptada = !!(solicitud.oferta_seleccionada || solicitud.oferta_seleccionada_detail);

  // Función helper para verificar si la solicitud está dentro del tiempo permitido para ACEPTAR ofertas
  // Solo verifica la fecha de expiración, NO la fecha/hora programada (esa es para pagos)
  const estaDentroDelTiempoPermitidoParaAceptar = () => {
    const ahora = new Date();

    // Verificar si la fecha de expiración ya pasó
    if (solicitud.fecha_expiracion) {
      const fechaExpiracion = new Date(solicitud.fecha_expiracion);
      if (ahora > fechaExpiracion) {
        return false; // La solicitud expiró
      }
    }

    // NO verificar fecha/hora programada para aceptar ofertas
    // La fecha/hora programada solo es relevante para pagos, no para aceptar ofertas

    return true; // Está dentro del tiempo permitido
  };

  // Función helper para verificar si la solicitud está dentro del tiempo permitido para PAGAR
  // Esta sí verifica tanto la expiración como la fecha/hora programada
  const estaDentroDelTiempoPermitidoParaPagar = () => {
    const ahora = new Date();
    console.log('🔍 Debug Time Validation - Start:', { ahora: ahora.toISOString() });

    // Verificar si la fecha de expiración ya pasó
    if (solicitud.fecha_expiracion) {
      const fechaExpiracion = new Date(solicitud.fecha_expiracion);
      console.log('🔍 Debug Time Validation - Expiracion:', {
        fechaExpiracion: fechaExpiracion.toISOString(),
        expirado: ahora > fechaExpiracion
      });
      if (ahora > fechaExpiracion) {
        return false; // La solicitud expiró
      }
    }

    // Si el estado es 'pendiente_pago', permitimos pagar (coherencia con handlePagarOferta)
    if (solicitud.estado === 'pendiente_pago') {
      return true;
    }

    // 1. Prioridad: Usar fecha_limite_pago del backend si existe
    if (solicitud.fecha_limite_pago) {
      const fechaLimite = new Date(solicitud.fecha_limite_pago);
      if (ahora > fechaLimite) {
        return false;
      }
      return true;
    }

    // Verificar si la fecha/hora programada ya pasó (solo para pagos)
    if (solicitud.fecha_preferida) {
      // FIX POTENTIAL TZ ERROR: Parse manually to ensure local time
      // new Date("YYYY-MM-DD") creates UTC date which might be prev day in local time
      // Here we want to set up the date object correctly first
      let fechaProgramada;
      if (typeof solicitud.fecha_preferida === 'string' && solicitud.fecha_preferida.includes('-')) {
        const [year, month, day] = solicitud.fecha_preferida.split('-').map(Number);
        fechaProgramada = new Date(year, month - 1, day); // Local time 00:00:00
      } else {
        fechaProgramada = new Date(solicitud.fecha_preferida);
      }

      console.log('🔍 Debug Time Validation - Fecha Programada Initial:', fechaProgramada.toString());

      // Si hay hora preferida, combinarla con la fecha
      if (solicitud.hora_preferida) {
        const [horas, minutos] = solicitud.hora_preferida.split(':').map(Number);
        fechaProgramada.setHours(horas || 0, minutos || 0, 0, 0);
      } else {
        // Si no hay hora, usar el final del día (23:59:59)
        fechaProgramada.setHours(23, 59, 59, 999);
      }

      console.log('🔍 Debug Time Validation - Compare:', {
        ahora: ahora.toString(),
        fechaProgramada: fechaProgramada.toString(),
        pasoTiempo: ahora > fechaProgramada
      });

      // Si la fecha/hora programada ya pasó, no se puede pagar
      if (ahora > fechaProgramada) {
        return false; // El tiempo programado ya pasó
      }
    }

    return true; // Está dentro del tiempo permitido
  };

  const dentroDelTiempoParaAceptar = estaDentroDelTiempoPermitidoParaAceptar();
  const dentroDelTiempo = estaDentroDelTiempoPermitidoParaPagar();

  /* 
   * Estados que indican que la solicitud está finalizada o el pago está en proceso.
   * 'pendiente_pago' NO debe bloquear el pago porque si el usuario sale y vuelve,
   * debe poder retomar el pago.
   */
  const estadosQueBloqueanPago = ['expirada', 'cancelada', 'pagada', 'finalizada'];
  const bloqueaPago = estadosQueBloqueanPago.includes(solicitud.estado);

  // Verificar si el servicio está completado (aunque el estado de la solicitud no sea 'completada')
  const servicioCompletado = solicitud.servicio_completado === true || solicitud.estado === 'completada';

  // El botón de pago solo debe aparecer si:
  // - Hay una oferta aceptada
  // - El pago NO ha sido realizado
  // - La solicitud NO está bloqueada para pagos (expirada, cancelada, pagada, o pendiente_pago)
  // - El servicio NO está completado
  // - La solicitud está dentro del tiempo permitido (no expirada y antes de fecha/hora programada)
  // - La oferta seleccionada NO está en estados finales (pagada, en_ejecucion, completada)
  const ofertaSeleccionada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
  const estadoOferta = ofertaSeleccionada?.estado;
  const ofertaEnEstadoFinal = estadoOferta && ['pagada', 'en_ejecucion', 'completada'].includes(estadoOferta);

  const puedePagar = tieneOfertaAceptada &&
    !solicitud.pago_realizado &&
    !bloqueaPago &&
    !servicioCompletado &&
    dentroDelTiempo &&
    !ofertaEnEstadoFinal;

  console.log('🔍 Debug Button Visibility:', {
    estado: solicitud.estado,
    tieneOfertaAceptada,
    noPagoRealizado: !solicitud.pago_realizado,
    noBloqueaPago: !bloqueaPago,
    noServicioCompletado: !servicioCompletado,
    dentroDelTiempo,
    noOfertaFinal: !ofertaEnEstadoFinal,
    RESULT_puedePagar: puedePagar
  });

  // Calcular si hay botones de acción para ajustar el padding del ScrollView
  const tieneBotonesAccion = puedeCancelar || puedePagar || (solicitud?.estado === 'completada' && checklistDisponible);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.paper || '#FFFFFF'} />

      {/* Header */}
      <View style={[styles.header, { paddingLeft: Math.max(insets.left, spacing.md || 16), paddingRight: Math.max(insets.right, spacing.md || 16) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text?.primary || '#00171F'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Solicitud</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { paddingLeft: Math.max(insets.left, spacing.md || 16), paddingRight: Math.max(insets.right, spacing.md || 16) }]}>
        <TouchableOpacity
          style={[styles.tab, tabActivo === 'principal' && styles.tabActive]}
          onPress={() => setTabActivo('principal')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tabActivo === 'principal' && styles.tabTextActive]}>
            Servicio Principal
          </Text>
          {tieneOfertaAceptada && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>1</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tabActivo === 'adicionales' && styles.tabActive]}
          onPress={() => setTabActivo('adicionales')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tabActivo === 'adicionales' && styles.tabTextActive]}>
            Servicios Adicionales
          </Text>
          {solicitud.ofertas_secundarias && solicitud.ofertas_secundarias.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{solicitud.ofertas_secundarias.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollContainer
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Calcular paddingBottom: altura del actionsContainer (aprox 90px) + insets.bottom + padding adicional
            // Solo aplicar padding si estamos en tab principal y hay botones de acción
            paddingBottom: (tabActivo === 'principal' && tieneBotonesAccion ? 90 : 0) + Math.max(insets.bottom, spacing.md || 16) + (spacing.md || 16),
            // Respetar safe areas laterales usando el máximo entre insets y spacing
            paddingLeft: Math.max(insets.left, spacing.md || 16),
            paddingRight: Math.max(insets.right, spacing.md || 16),
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary?.[500] || '#003459']}
            tintColor={colors.primary?.[500] || '#003459'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Tab 1: Servicio Principal */}
        {tabActivo === 'principal' && (
          <>
            {/* Información de la solicitud - Diseño mejorado en una sola card con secciones internas */}
            <View style={[styles.solicitudInfoCard, {
              marginTop: spacing.md || 16,
              backgroundColor: colors.background?.paper || '#FFFFFF',
              borderColor: colors.neutral?.gray?.[200] || '#E5E7EB'
            }]}>

              {/* Header de la card con estado */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.sectionIconContainer, {
                    backgroundColor: (colors.primary?.[50] || colors.primary?.[100] || '#E6F2F7')
                  }]}>
                    <Ionicons name="construct" size={20} color={colors.primary?.[500] || '#003459'} />
                  </View>
                  <View style={styles.cardHeaderContent}>
                    <Text style={[styles.sectionLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                      Servicio Solicitado
                    </Text>
                    <Text style={[styles.sectionValue, { color: colors.text?.primary || '#00171F' }]} numberOfLines={2}>
                      {solicitud.servicios_solicitados_detail && solicitud.servicios_solicitados_detail.length > 0
                        ? solicitud.servicios_solicitados_detail.length === 1
                          ? solicitud.servicios_solicitados_detail[0].nombre
                          : solicitud.servicios_solicitados_detail.map(s => s.nombre).join(', ')
                        : 'Servicio no especificado'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardHeaderRight}>
                  <EstadoSolicitudBadge estado={solicitud.estado} />
                </View>
              </View>

              {/* Sección: Vehículo */}
              {solicitud.vehiculo_info && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconContainer, {
                      backgroundColor: (colors.accent?.[50] || colors.accent?.[100] || '#E6F7FC')
                    }]}>
                      <Ionicons name="car" size={20} color={colors.accent?.[500] || '#00A8E8'} />
                    </View>
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.sectionLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                        Vehículo
                      </Text>
                      <Text style={[styles.sectionValue, { color: colors.text?.primary || '#00171F' }]}>
                        {solicitud.vehiculo_info.marca} {solicitud.vehiculo_info.modelo}
                      </Text>
                      {solicitud.vehiculo_info.patente && (
                        <Text style={[styles.sectionSubValue, { color: colors.text?.secondary || '#5D6F75' }]}>
                          {solicitud.vehiculo_info.patente}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Sección: Dirección */}
              {solicitud.direccion_servicio_texto && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconContainer, {
                      backgroundColor: (colors.error?.[50] || colors.error?.[100] || '#FFE5E5')
                    }]}>
                      <Ionicons name="location" size={20} color={colors.error?.[500] || '#FF6B6B'} />
                    </View>
                    <View style={styles.sectionHeaderContent}>
                      <Text style={[styles.sectionLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                        Ubicación
                      </Text>
                      <Text style={[styles.sectionValue, { color: colors.text?.primary || '#00171F' }]} numberOfLines={2}>
                        {solicitud.direccion_servicio_texto}
                      </Text>
                      {solicitud.detalles_ubicacion && (
                        <Text style={[styles.sectionSubValue, { color: colors.text?.secondary || '#5D6F75' }]}>
                          {solicitud.detalles_ubicacion}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Grid: Fecha/Hora y Urgencia */}
              <View style={styles.sectionGrid}>
                <View style={styles.sectionGridItem}>
                  <View style={[styles.gridIconContainer, {
                    backgroundColor: (colors.info?.[50] || colors.secondary?.[50] || '#E6F5F9')
                  }]}>
                    <Ionicons name="calendar" size={18} color={colors.info?.[500] || colors.secondary?.[500] || '#007EA7'} />
                  </View>
                  <Text style={[styles.gridLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                    Fecha y Hora
                  </Text>
                  <Text style={[styles.gridValue, { color: colors.text?.primary || '#00171F' }]}>
                    {new Date(solicitud.fecha_preferida).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </Text>
                  {solicitud.hora_preferida && (
                    <Text style={[styles.gridSubValue, { color: colors.text?.secondary || '#5D6F75' }]}>
                      {solicitud.hora_preferida.substring(0, 5)}
                    </Text>
                  )}
                </View>

                <View style={styles.sectionGridItem}>
                  <View style={[styles.gridIconContainer, {
                    backgroundColor: solicitud.urgencia === 'urgente'
                      ? (colors.error?.[50] || '#FFE5E5')
                      : (colors.success?.[50] || '#E6F9F5')
                  }]}>
                    <Ionicons
                      name={solicitud.urgencia === 'urgente' ? 'alert-circle' : 'checkmark-circle'}
                      size={18}
                      color={solicitud.urgencia === 'urgente'
                        ? (colors.error?.[500] || '#FF6B6B')
                        : (colors.success?.[500] || '#00C9A7')}
                    />
                  </View>
                  <Text style={[styles.gridLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                    Urgencia
                  </Text>
                  <Text style={[styles.gridValue, {
                    color: solicitud.urgencia === 'urgente'
                      ? (colors.error?.[500] || '#FF6B6B')
                      : (colors.text?.primary || '#00171F')
                  }]}>
                    {solicitud.urgencia === 'urgente' ? 'Urgente' : 'Normal'}
                  </Text>
                </View>
              </View>

              {/* Sección: Tiempo de duración */}
              {(() => {
                const fechaCreacion = solicitud.fecha_creacion || solicitud.created_at;
                if (!fechaCreacion) return null;

                const fechaCreacionDate = new Date(fechaCreacion);
                const ahora = new Date();
                const diffTime = Math.abs(ahora - fechaCreacionDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionIconContainer, {
                        backgroundColor: (colors.warning?.[50] || colors.warning?.[100] || '#FFFBEB')
                      }]}>
                        <Ionicons name="time" size={20} color={colors.warning?.[500] || '#FFB84D'} />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text style={[styles.sectionLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                          Tiempo Abierta
                        </Text>
                        <Text style={[styles.sectionValue, { color: colors.warning?.[700] || '#D97706' }]}>
                          {diffDays} {diffDays === 1 ? 'día' : 'días'}
                        </Text>
                        {solicitud.tiempo_restante && (
                          <Text style={[styles.sectionSubValue, { color: colors.text?.secondary || '#5D6F75' }]}>
                            {solicitud.tiempo_restante}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Sección: Descripción del Problema */}
              {solicitud.descripcion_problema && solicitud.descripcion_problema.trim() && (
                <View style={styles.descripcionContainer}>
                  <View style={styles.descripcionHeader}>
                    <Ionicons name="document-text" size={18} color={colors.info?.[600] || colors.secondary?.[600] || '#006586'} />
                    <Text style={[styles.descripcionLabel, {
                      color: colors.info?.[700] || colors.secondary?.[700] || '#004C65'
                    }]}>
                      Descripción del Problema
                    </Text>
                  </View>
                  <View style={[styles.descripcionContent, {
                    backgroundColor: (colors.info?.[50] || colors.secondary?.[50] || '#E6F5F9'),
                    borderColor: (colors.info?.[200] || colors.secondary?.[200] || '#99D7E7'),
                  }]}>
                    <Text style={[styles.descripcionText, { color: colors.text?.primary || '#00171F' }]}>
                      {solicitud.descripcion_problema}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Proveedores Dirigidos (si es solicitud dirigida) */}
            {solicitud.tipo_solicitud === 'dirigida' && solicitud.proveedores_dirigidos_detail && solicitud.proveedores_dirigidos_detail.length > 0 && (
              <View style={[styles.proveedoresContainer, {
                backgroundColor: colors.background?.paper || '#FFFFFF',
                borderColor: colors.neutral?.gray?.[200] || '#E5E7EB'
              }]}>
                {/* Header de la sección */}
                <View style={styles.proveedoresSectionHeader}>
                  <View style={[styles.proveedoresIconContainer, {
                    backgroundColor: (colors.primary?.[50] || colors.primary?.[100] || '#E6F2F7')
                  }]}>
                    <Ionicons name="people" size={20} color={colors.primary?.[500] || '#003459'} />
                  </View>
                  <View style={styles.proveedoresSectionHeaderContent}>
                    <Text style={[styles.proveedoresSectionLabel, { color: colors.text?.secondary || '#5D6F75' }]}>
                      Proveedores Seleccionados
                    </Text>
                    <Text style={[styles.proveedoresSectionSubtitle, { color: colors.text?.secondary || '#5D6F75' }]}>
                      Esta solicitud fue enviada específicamente a estos proveedores
                    </Text>
                  </View>
                </View>

                {/* Lista de proveedores con diseño mejorado */}
                <View style={styles.proveedoresList}>
                  {solicitud.proveedores_dirigidos_detail.map((proveedor, index) => {
                    // Debug: Ver qué datos están llegando
                    console.log('🔍 Proveedor dirigido:', {
                      id: proveedor.id,
                      first_name: proveedor.first_name,
                      last_name: proveedor.last_name,
                      username: proveedor.username,
                      email: proveedor.email,
                      es_mecanico: proveedor.es_mecanico,
                      proveedorCompleto: proveedor
                    });

                    // Intentar obtener el nombre de múltiples fuentes
                    const nombreCompleto = (() => {
                      // Opción 1: first_name + last_name (ideal)
                      if (proveedor.first_name && proveedor.last_name) {
                        const nombre = `${proveedor.first_name.trim()} ${proveedor.last_name.trim()}`.trim();
                        if (nombre) return nombre;
                      }
                      // Opción 2: solo first_name
                      if (proveedor.first_name && proveedor.first_name.trim()) {
                        return proveedor.first_name.trim();
                      }
                      // Opción 3: solo last_name
                      if (proveedor.last_name && proveedor.last_name.trim()) {
                        return proveedor.last_name.trim();
                      }
                      // Opción 4: username como fallback
                      if (proveedor.username && proveedor.username.trim()) {
                        return proveedor.username.trim();
                      }
                      // Opción 5: email como último recurso
                      if (proveedor.email && proveedor.email.trim()) {
                        return proveedor.email.split('@')[0]; // Parte antes del @
                      }
                      // Fallback final
                      return 'Proveedor';
                    })();
                    const tipoProveedor = proveedor.es_mecanico ? 'Mecánico a Domicilio' : 'Taller';
                    const iconoProveedor = proveedor.es_mecanico ? "construct" : "business";
                    const tipoColor = proveedor.es_mecanico
                      ? (colors.accent?.[500] || '#00A8E8')
                      : (colors.primary?.[500] || '#003459');
                    const tipoBgColor = proveedor.es_mecanico
                      ? (colors.accent?.[50] || colors.accent?.[100] || '#E6F7FC')
                      : (colors.primary?.[50] || colors.primary?.[100] || '#E6F2F7');
                    const fotoProveedor = proveedoresFotos[proveedor.id];

                    return (
                      <View key={proveedor.id || index} style={[styles.proveedorCard, {
                        backgroundColor: colors.background?.paper || '#FFFFFF',
                        borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
                      }]}>
                        <View style={styles.proveedorCardMain}>
                          {fotoProveedor ? (
                            <Image
                              source={{ uri: fotoProveedor }}
                              style={styles.proveedorFoto}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.proveedorIconWrapper, {
                              backgroundColor: tipoBgColor
                            }]}>
                              <Ionicons
                                name={iconoProveedor}
                                size={24}
                                color={tipoColor}
                              />
                            </View>
                          )}
                          <View style={styles.proveedorInfo}>
                            <Text style={[styles.proveedorNombre, { color: colors.text?.primary || '#00171F' }]} numberOfLines={1}>
                              {nombreCompleto}
                            </Text>
                            <View style={[styles.proveedorTipoBadge, {
                              backgroundColor: tipoBgColor
                            }]}>
                              <Text style={[styles.proveedorTipoText, { color: tipoColor }]}>
                                {tipoProveedor}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {proveedor.telefono && (
                          <View style={[styles.proveedorContactInfo, {
                            borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB'
                          }]}>
                            <View style={styles.proveedorContactItem}>
                              <Ionicons name="call" size={16} color={colors.text?.secondary || '#5D6F75'} />
                              <Text style={[styles.proveedorContactText, { color: colors.text?.secondary || '#5D6F75' }]}>
                                {proveedor.telefono}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tipo de Solicitud (si es global) */}
            {solicitud.tipo_solicitud === 'global' && (
              <View style={styles.tipoSolicitudContainer}>
                <Ionicons name="globe-outline" size={20} color={colors.text?.secondary || '#5D6F75'} />
                <Text style={styles.tipoSolicitudText}>
                  Esta solicitud está abierta a todos los proveedores disponibles
                </Text>
              </View>
            )}

            {/* Timeline de Progreso de Solicitud */}
            <View style={[styles.timelineContainer, { marginTop: spacing.md || 16 }]}>
              <TouchableOpacity
                style={[styles.timelineHeader, { borderBottomWidth: timelineExpandido ? 1 : 0 }]}
                onPress={() => setTimelineExpandido(!timelineExpandido)}
                activeOpacity={0.7}
              >
                <View style={styles.timelineHeaderContent}>
                  <Text style={styles.timelineTitle}>Progreso de la Solicitud</Text>
                  {(() => {
                    // Obtener el estado actual más relevante para mostrar en el header
                    let estadoActual = 'Creada';
                    let estadoColor = colors.text?.secondary || '#5D6F75';

                    if (solicitud.estado === 'completada') {
                      estadoActual = 'Completada';
                      estadoColor = colors.success?.[700] || '#047857';
                    } else if (solicitud.estado === 'adjudicada') {
                      estadoActual = 'Adjudicada';
                      estadoColor = colors.primary?.[600] || '#002A47';
                    } else if (tieneOfertaAceptada) {
                      estadoActual = 'Oferta Aceptada';
                      estadoColor = colors.primary?.[600] || '#002A47';
                    } else if (solicitud.estado === 'con_ofertas') {
                      estadoActual = `${ofertas.length} Oferta${ofertas.length !== 1 ? 's' : ''}`;
                      estadoColor = colors.warning?.[700] || '#D97706';
                    } else if (solicitud.estado === 'publicada') {
                      estadoActual = 'Publicada';
                      estadoColor = colors.primary?.[600] || '#002A47';
                    } else if (solicitud.estado === 'expirada' || solicitud.estado === 'cancelada') {
                      estadoActual = solicitud.estado === 'expirada' ? 'Expirada' : 'Cancelada';
                      estadoColor = colors.error?.[700] || '#B91C1C';
                    }

                    return (
                      <View style={styles.timelineEstadoBadge}>
                        <Text style={[styles.timelineEstadoText, { color: estadoColor }]}>
                          {estadoActual}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                <Ionicons
                  name={timelineExpandido ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.text?.secondary || '#5D6F75'}
                />
              </TouchableOpacity>

              {timelineExpandido && (
                <View style={styles.timelineContent}>
                  {/* Paso 1: Solicitud Creada - Siempre completado */}
                  <TimelineStep
                    completed={true}
                    isLast={!['publicada', 'con_ofertas', 'adjudicada', 'expirada', 'cancelada'].includes(solicitud.estado)}
                    icon="document-text"
                    title="Solicitud Creada"
                    description={`Creada el ${new Date(solicitud.fecha_creacion || solicitud.created_at || Date.now()).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}`}
                    date={solicitud.fecha_creacion || solicitud.created_at}
                    colors={colors}
                    styles={styles}
                  />

                  {/* Paso 2: Solicitud Publicada */}
                  {['publicada', 'con_ofertas', 'adjudicada'].includes(solicitud.estado) && (
                    <TimelineStep
                      completed={true}
                      isLast={solicitud.estado === 'publicada'}
                      icon="send"
                      title="Solicitud Publicada"
                      description="Tu solicitud está visible para los proveedores"
                      date={solicitud.fecha_publicacion || solicitud.created_at}
                      colors={colors}
                      styles={styles}
                    />
                  )}

                  {/* Paso 3: Ofertas Recibidas */}
                  {['con_ofertas', 'adjudicada'].includes(solicitud.estado) && ofertas.length > 0 && (
                    <TimelineStep
                      completed={true}
                      isLast={!tieneOfertaAceptada}
                      icon="pricetags"
                      title="Ofertas Recibidas"
                      description={`${ofertas.length} oferta${ofertas.length !== 1 ? 's' : ''} recibida${ofertas.length !== 1 ? 's' : ''}`}
                      date={ofertas[0]?.fecha_creacion || ofertas[0]?.created_at}
                      additionalInfo={
                        <View style={styles.timelineBadge}>
                          <Text style={styles.timelineBadgeText}>
                            {ofertas.length}
                          </Text>
                        </View>
                      }
                      colors={colors}
                      styles={styles}
                    />
                  )}

                  {/* Paso 4: Oferta Aceptada y Proveedor Seleccionado */}
                  {tieneOfertaAceptada && (() => {
                    const ofertaSeleccionada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
                    const nombreProveedor = ofertaSeleccionada?.nombre_proveedor || ofertaSeleccionada?.proveedor_nombre || 'Proveedor';
                    const precio = ofertaSeleccionada?.precio_total_ofrecido || 0;
                    const tipoProveedor = ofertaSeleccionada?.tipo_proveedor || 'taller';
                    const fotoProveedor = proveedorFotoUrl ||
                      (ofertaSeleccionada?.proveedor_foto && typeof ofertaSeleccionada.proveedor_foto === 'string' &&
                        (ofertaSeleccionada.proveedor_foto.startsWith('http://') || ofertaSeleccionada.proveedor_foto.startsWith('https://')))
                      ? ofertaSeleccionada.proveedor_foto
                      : ofertaSeleccionada?.proveedor_info?.usuario?.foto_perfil ||
                      ofertaSeleccionada?.proveedor_info?.foto_perfil ||
                      ofertaSeleccionada?.taller_info?.usuario?.foto_perfil ||
                      ofertaSeleccionada?.mecanico_info?.usuario?.foto_perfil ||
                      null;

                    return (
                      <TimelineStep
                        completed={true}
                        isLast={!estaAdjudicada}
                        icon="checkmark-circle"
                        title="Oferta Aceptada"
                        description={`Oferta aceptada de ${nombreProveedor}`}
                        date={ofertaSeleccionada?.fecha_aceptacion || solicitud.fecha_adjudicacion || ofertaSeleccionada?.created_at}
                        providerInfo={{
                          nombre: nombreProveedor,
                          foto: fotoProveedor,
                          tipo: tipoProveedor,
                          precio: precio
                        }}
                        colors={colors}
                        styles={styles}
                      />
                    );
                  })()}

                  {/* Paso 5: Pago Realizado (si aplica) */}
                  {estaAdjudicada && solicitud.pago_realizado && (
                    <TimelineStep
                      completed={true}
                      isLast={!solicitud.servicio_completado && solicitud.estado !== 'en_ejecucion' && solicitud.estado !== 'completada'}
                      icon="card"
                      title="Pago Realizado"
                      description="El pago ha sido confirmado"
                      date={solicitud.fecha_pago}
                      colors={colors}
                      styles={styles}
                    />
                  )}

                  {/* Paso 6: Servicio Iniciado (cuando el proveedor inicia el servicio) */}
                  {solicitud.estado === 'en_ejecucion' || solicitud.estado === 'completada' ? (
                    <TimelineStep
                      completed={true}
                      isLast={!solicitud.servicio_completado && solicitud.estado !== 'completada'}
                      icon="play-circle"
                      title="Servicio Iniciado"
                      description="El proveedor ha iniciado el servicio"
                      date={(() => {
                        // Intentar obtener fecha de inicio desde la oferta seleccionada
                        const ofertaSeleccionada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
                        if (ofertaSeleccionada?.fecha_actualizacion) {
                          return ofertaSeleccionada.fecha_actualizacion;
                        }
                        // Si no hay fecha específica, usar fecha de actualización de la solicitud
                        return solicitud.fecha_actualizacion || solicitud.fecha_adjudicacion;
                      })()}
                      colors={colors}
                      styles={styles}
                    />
                  ) : null}

                  {/* Paso 7: Checklist en Progreso o Completado */}
                  {(() => {
                    // Verificar si hay información de checklist en la oferta seleccionada
                    const ofertaSeleccionada = solicitud.oferta_seleccionada_detail || solicitud.oferta_seleccionada;
                    const tieneChecklist = ofertaSeleccionada?.solicitud_servicio_id ||
                      (solicitud.estado === 'en_ejecucion' || solicitud.estado === 'completada');

                    if (tieneChecklist && (solicitud.estado === 'en_ejecucion' || solicitud.estado === 'completada')) {
                      return (
                        <TimelineStep
                          completed={solicitud.estado === 'completada'}
                          isLast={!solicitud.servicio_completado && solicitud.estado !== 'completada'}
                          icon="checklist"
                          title="Checklist"
                          description={solicitud.estado === 'completada'
                            ? "Checklist completado por el proveedor"
                            : "El proveedor está realizando el checklist"}
                          date={solicitud.fecha_actualizacion}
                          inProgress={solicitud.estado === 'en_ejecucion'}
                          colors={colors}
                          styles={styles}
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* Paso Final: Estado Final */}
                  {solicitud.estado === 'completada' ? (
                    <TimelineStep
                      completed={true}
                      isLast={true}
                      icon="checkmark-done-circle"
                      title="Servicio Completado"
                      description="El servicio ha sido completado exitosamente"
                      date={solicitud.fecha_completacion}
                      colors={colors}
                      styles={styles}
                    />
                  ) : solicitud.estado === 'expirada' ? (
                    <TimelineStep
                      completed={false}
                      isLast={true}
                      icon="time-outline"
                      title="Solicitud Expirada"
                      description="La solicitud ha expirado sin ofertas aceptadas"
                      date={solicitud.fecha_expiracion}
                      isError={true}
                      colors={colors}
                      styles={styles}
                    />
                  ) : solicitud.estado === 'cancelada' ? (
                    <TimelineStep
                      completed={false}
                      isLast={true}
                      icon="close-circle"
                      title="Solicitud Cancelada"
                      description="La solicitud fue cancelada"
                      date={solicitud.fecha_cancelacion}
                      isError={true}
                      colors={colors}
                      styles={styles}
                    />
                  ) : estaAdjudicada && (
                    <TimelineStep
                      completed={false}
                      isLast={true}
                      icon="hourglass-outline"
                      title="Esperando Confirmación"
                      description="Oferta aceptada, esperando confirmación de pago"
                      inProgress={true}
                      colors={colors}
                      styles={styles}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Ofertas */}
            <View style={styles.ofertasSection}>
              {ofertas.length === 0 ? (
                <View style={styles.emptyOfertasContainer}>
                  <Ionicons name="pricetags-outline" size={48} color={colors.text?.secondary || '#5D6F75'} />
                  <Text style={styles.emptyOfertasText}>
                    {solicitud.estado === 'publicada'
                      ? 'Aún no hay ofertas para esta solicitud'
                      : 'No hay ofertas disponibles'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Header integrado dentro del área de ofertas */}
                  <View style={styles.ofertasHeaderInline}>
                    <View style={styles.ofertasContadorContainer}>
                      <Ionicons name="pricetags" size={18} color={colors.text?.secondary || '#5D6F75'} />
                      <Text style={styles.ofertasContadorText}>
                        {ofertas.length} {ofertas.length === 1 ? 'oferta recibida' : 'ofertas recibidas'}
                      </Text>
                    </View>
                    {puedeComparar && (
                      <Button
                        title="Comparar"
                        onPress={handleCompararOfertas}
                        style={styles.compararButton}
                        type="outline"
                        icon="stats-chart-outline"
                      />
                    )}
                  </View>

                  {/* Ofertas originales (solo en tab principal) */}
                  {ofertas.map((oferta, index) => {
                    // Determinar si esta oferta es la aceptada
                    const ofertaSeleccionada = solicitud?.oferta_seleccionada_detail || solicitud?.oferta_seleccionada;
                    const esOfertaAceptada = ofertaSeleccionada && oferta && (
                      (typeof ofertaSeleccionada === 'object' && ofertaSeleccionada?.id === oferta.id) ||
                      (typeof ofertaSeleccionada === 'string' && ofertaSeleccionada === oferta.id) ||
                      ofertaSeleccionada === oferta.id
                    );

                    // Solo mostrar botón "Aceptar" si:
                    // - La solicitud NO está adjudicada (estado 'adjudicada')
                    // - Esta oferta NO es la aceptada
                    // - La oferta no está ya aceptada
                    // - La solicitud está dentro del tiempo permitido para aceptar (solo verifica expiración, NO fecha/hora programada)
                    // - La solicitud está en un estado que permite aceptar ofertas ('publicada', 'con_ofertas', etc.)
                    const estadosQuePermitenAceptar = ['publicada', 'con_ofertas', 'seleccionando_servicios'];
                    const puedeAceptarOfertas = estadosQuePermitenAceptar.includes(solicitud?.estado);
                    const dentroDelTiempoParaAceptar = estaDentroDelTiempoPermitidoParaAceptar();

                    const mostrarBotonAceptar = puedeAceptarOfertas &&
                      !estaAdjudicada &&
                      !esOfertaAceptada &&
                      oferta?.estado !== 'aceptada' &&
                      dentroDelTiempoParaAceptar;

                    // ✅ Validar si el chat debe estar habilitado
                    const puedeChatear = solicitud &&
                      solicitud.estado !== 'cancelada' &&
                      solicitud.estado !== 'expirada' &&
                      oferta?.estado !== 'rechazada' &&
                      oferta?.estado !== 'retirada' &&
                      oferta?.estado !== 'expirada' &&
                      // Si la solicitud está adjudicada, solo permitir chat con la oferta seleccionada
                      (solicitud.estado !== 'adjudicada' || esOfertaAceptada || oferta?.estado === 'en_chat' || oferta?.estado === 'vista');

                    // Determinar si la card debería estar expandida por defecto:
                    // - Primera oferta expandida
                    // - Oferta aceptada siempre expandida
                    // - Si es única oferta, expandida
                    const esUnicaOferta = ofertas.length === 1;
                    const inicialmenteExpandida = index === 0 || esOfertaAceptada || esUnicaOferta;

                    // Determinar si mostrar botón de pagar saldo pendiente para oferta principal
                    // Solo si es la oferta aceptada y tiene pago parcial
                    const tienePagoParcial = esOfertaAceptada && (
                      oferta.estado === 'pagada_parcialmente' ||
                      (oferta.estado_pago_repuestos === 'pagado' && oferta.estado_pago_servicio === 'pendiente')
                    );
                    const mostrarBotonPagarSaldo = tienePagoParcial;

                    return (
                      <OfertaCard
                        key={oferta.id}
                        oferta={oferta}
                        destacada={esOfertaAceptada}
                        inicialmenteExpandida={inicialmenteExpandida}
                        esUnicaOferta={esUnicaOferta}
                        onChatPress={puedeChatear ? () => handleChatPress(oferta) : undefined}
                        onAceptarPress={mostrarBotonAceptar ? () => handleAceptarOferta(oferta) : undefined}
                        onPagarPress={mostrarBotonPagarSaldo ? () => handlePagarOferta() : undefined}
                        onVerDetallePress={() => handleVerDetalle(oferta)}
                      />
                    );
                  })}
                </>
              )}
            </View>

            {/* Sección de Rechazos */}
            {solicitud.rechazos && solicitud.rechazos.length > 0 && (
              <View style={styles.ofertasSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.error?.[600] || '#DC2626'} />
                  <Text style={styles.sectionTitle}>
                    Proveedores que no pueden atender
                  </Text>
                </View>
                {solicitud.rechazos.map((rechazo) => (
                  <RechazoCard key={rechazo.id} rechazo={rechazo} />
                ))}
              </View>
            )}

            {/* Botón de reenviar si no hay ofertas pero hay rechazos */}
            {solicitud.puede_reenviar && (
              <View style={styles.reenviarContainer}>
                <View style={styles.reenviarInfo}>
                  <Ionicons name="information-circle" size={24} color={colors.primary?.[600] || '#002A47'} />
                  <Text style={styles.reenviarInfoText}>
                    No has recibido ofertas. Puedes reenviar esta solicitud para que más proveedores la vean.
                  </Text>
                </View>
                <Button
                  title="Reenviar Solicitud"
                  onPress={handleReenviarSolicitud}
                  icon="refresh-outline"
                  style={styles.reenviarButton}
                  disabled={procesando}
                />
              </View>
            )}
          </>
        )}

        {/* Tab 2: Servicios Adicionales */}
        {tabActivo === 'adicionales' && (
          <>
            {(() => {
              console.log('Tab Adicionales - Ofertas secundarias:', {
                tieneOfertasSecundarias: !!solicitud.ofertas_secundarias,
                cantidad: solicitud.ofertas_secundarias?.length || 0,
                ofertas: solicitud.ofertas_secundarias
              });
              return null;
            })()}
            {solicitud.ofertas_secundarias && solicitud.ofertas_secundarias.length > 0 ? (
              <View style={styles.ofertasSecundariasSection}>
                <View style={styles.ofertasSecundariasHeader}>
                  <View style={styles.ofertasSecundariasHeaderContent}>
                    <Ionicons name="add-circle" size={24} color={colors.warning?.[600] || '#D97706'} />
                    <Text style={styles.ofertasSecundariasTitle}>
                      Servicios Adicionales ({solicitud.ofertas_secundarias.length})
                    </Text>
                  </View>
                </View>
                <Text style={styles.ofertasSecundariasSubtitle}>
                  El proveedor ha propuesto servicios adicionales durante la ejecución del servicio original. Cada servicio adicional es independiente y tiene su propio flujo de pago.
                </Text>

                {solicitud.ofertas_secundarias.map((ofertaSec) => {
                  // Para ofertas secundarias (órdenes adicionales independientes), 
                  // pueden pagarse como cualquier orden principal una vez aceptadas
                  // Solo verificamos que no estén en estados finales
                  const estadosFinales = ['pagada', 'rechazada', 'en_ejecucion', 'completada'];
                  const estadosNoAccionables = ['aceptada', 'pendiente_pago', ...estadosFinales];

                  // Los botones de aceptar/rechazar NO deben mostrarse cuando:
                  // - La oferta ya está aceptada
                  // - La oferta está en proceso de pago (pendiente_pago)
                  // - La oferta está en estados finales
                  const mostrarBotonAceptar = !estadosNoAccionables.includes(ofertaSec.estado);
                  const mostrarBotonRechazar = !estadosNoAccionables.includes(ofertaSec.estado);

                  // El botón de pagar debe aparecer cuando la oferta está aceptada o pendiente_pago
                  // (pendiente_pago permite reintentar el pago si es necesario)
                  // NO debe aparecer en estados finales (pagada, en_ejecucion, completada)
                  const mostrarBotonPagar = ['aceptada', 'pendiente_pago'].includes(ofertaSec.estado) &&
                    !['pagada', 'en_ejecucion', 'completada'].includes(ofertaSec.estado);

                  return (
                    <View key={ofertaSec.id} style={styles.ofertaSecundariaCard}>
                      {/* Timeline independiente para esta oferta secundaria */}
                      {renderTimelineOfertaSecundaria(ofertaSec)}

                      {/* OfertaCard con botones de acción */}
                      <OfertaCard
                        oferta={ofertaSec}
                        esOfertaSecundaria={true}
                        inicialmenteExpandida={true}
                        esUnicaOferta={false}
                        onChatPress={
                          (solicitud &&
                            solicitud.estado !== 'cancelada' &&
                            solicitud.estado !== 'expirada' &&
                            ofertaSec?.estado !== 'rechazada' &&
                            ofertaSec?.estado !== 'retirada' &&
                            ofertaSec?.estado !== 'expirada')
                            ? () => handleChatPress(ofertaSec)
                            : undefined
                        }
                        onAceptarPress={mostrarBotonAceptar ? () => handleAceptarOferta(ofertaSec) : undefined}
                        onRechazarPress={mostrarBotonRechazar ? () => handleRechazarOferta(ofertaSec) : undefined}
                        onPagarPress={mostrarBotonPagar ? () => handlePagarOfertaSecundaria(ofertaSec) : undefined}
                        onVerDetallePress={() => handleVerDetalle(ofertaSec)}
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyOfertasContainer}>
                <Ionicons name="add-circle-outline" size={48} color={colors.text?.secondary || '#5D6F75'} />
                <Text style={styles.emptyOfertasText}>
                  No hay servicios adicionales disponibles
                </Text>
                <Text style={[styles.emptyOfertasText, { fontSize: 14, marginTop: spacing.sm || 12 }]}>
                  El proveedor aún no ha propuesto servicios adicionales para esta solicitud.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollContainer>

      {/* Acciones - Solo en tab principal */}
      {tabActivo === 'principal' && (
        <View style={[
          styles.actionsContainer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md || 16),
            paddingLeft: Math.max(insets.left, spacing.md || 16),
            paddingRight: Math.max(insets.right, spacing.md || 16),
          }
        ]}>
          {/* Botón para ver checklist en solicitudes completadas */}
          {solicitud?.estado === 'completada' && (
            <View style={styles.checklistSection}>
              {verificandoChecklist ? (
                <View style={styles.checklistVerificando}>
                  <ActivityIndicator size="small" color={colors.primary?.[500] || '#003459'} />
                  <Text style={styles.checklistVerificandoText}>
                    Verificando inspección...
                  </Text>
                </View>
              ) : checklistDisponible ? (
                <Button
                  title="Ver Inspección Realizada"
                  onPress={handleVerChecklist}
                  style={styles.checklistButton}
                  type="primary"
                  icon="document-text-outline"
                  disabled={procesando}
                />
              ) : null}
            </View>
          )}

          {puedeCancelar && (
            <Button
              title="Cancelar Solicitud"
              onPress={handleCancelarSolicitud}
              style={styles.cancelButton}
              type="danger"
              icon="close-circle-outline"
              disabled={procesando}
            />
          )}
          {puedePagar && (
            <Button
              title="Pagar Oferta Aceptada"
              onPress={handlePagarOferta}
              style={styles.pagarButton}
              type="primary"
              icon="card-outline"
              disabled={procesando}
            />
          )}
        </View>
      )}

      {procesando && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.processingText}>Procesando...</Text>
        </View>
      )}

      {/* Alerta de pago próximo */}
      <AlertaPagoProximo
        visible={mostrarAlertaPago}
        mensaje={alertaMensaje}
        tiempoRestanteHoras={alertaTiempoRestanteHoras}
        tiempoRestanteMinutos={alertaTiempoRestanteMinutos}
        onDismiss={async () => {
          // ✅ Obtener el ID válido ANTES de ocultar la alerta
          let idParaUsar = null;

          // 1. Primero intentar desde route.params (prioridad)
          if (solicitudId !== undefined && solicitudId !== null && solicitudId !== 'undefined' && solicitudId !== 'null') {
            const idStr = String(solicitudId).trim();
            if (idStr && idStr !== '' && idStr !== 'undefined' && idStr !== 'null') {
              idParaUsar = idStr;
            }
          }

          // 2. Si no está disponible, intentar desde el estado de solicitud
          if (!idParaUsar && solicitud?.id !== undefined && solicitud?.id !== null) {
            const idStr = String(solicitud.id).trim();
            if (idStr && idStr !== '' && idStr !== 'undefined' && idStr !== 'null') {
              idParaUsar = idStr;
            }
          }

          // 3. Validación estricta: si no hay ID válido, NO hacer la petición
          if (!idParaUsar) {
            console.warn('⚠️ DetalleSolicitudScreen: No se puede descartar alerta - ID inválido o faltante', {
              solicitudId_from_params: solicitudId,
              solicitudId_type: typeof solicitudId,
              solicitud_id: solicitud?.id,
              solicitud_exists: !!solicitud
            });
            // Ocultar la alerta de todos modos para no bloquear la UI
            setMostrarAlertaPago(false);
            return;
          }

          // 4. Validar formato del ID (debe ser UUID válido o número)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const numericRegex = /^\d+$/;

          if (!uuidRegex.test(idParaUsar) && !numericRegex.test(idParaUsar)) {
            console.error('❌ DetalleSolicitudScreen: solicitudId no tiene un formato válido (UUID o número):', idParaUsar);
            setMostrarAlertaPago(false);
            return;
          }

          // 5. Si llegamos aquí, el ID es válido - ocultar la alerta y hacer la petición
          setMostrarAlertaPago(false);

          try {
            const url = `/ordenes/solicitudes-publicas/${idParaUsar}/descartar-alerta/`;
            console.log(`✅ DetalleSolicitudScreen: Descartando alerta para solicitud ${idParaUsar}`);
            console.log(`✅ DetalleSolicitudScreen: URL de petición: ${url}`);

            const response = await post(url, {});
            console.log('✅ DetalleSolicitudScreen: Alerta descartada exitosamente:', response);
          } catch (error) {
            // Silenciar errores 404 ya que la alerta podría no existir
            const errorStatus = error?.status || error?.response?.status;
            if (errorStatus === 404) {
              console.log('ℹ️ DetalleSolicitudScreen: Alerta no encontrada (404) - puede que ya fue descartada o no existe');
              return;
            }

            // Solo loggear otros errores, no bloquear la UI (la alerta ya está oculta)
            console.error('❌ DetalleSolicitudScreen: Error descartando alerta:', {
              message: error?.message,
              status: errorStatus,
              data: error?.response?.data || error?.data,
              solicitudId: idParaUsar,
              url: `/ordenes/solicitudes-publicas/${idParaUsar}/descartar-alerta/`,
              errorType: typeof error,
              errorKeys: error ? Object.keys(error) : []
            });

            // No lanzar el error para no bloquear la UI
          }
        }}
        onPagar={() => {
          setMostrarAlertaPago(false);
          handlePagarOferta();
        }}
      />

      {/* Modal para ver checklist completado */}
      {solicitud?.estado === 'completada' && (() => {
        const ofertaSeleccionada = solicitud?.oferta_seleccionada_detail || solicitud?.oferta_seleccionada;
        const ordenId = ofertaSeleccionada?.solicitud_servicio_id;
        const servicioNombre = ofertaSeleccionada?.detalles_servicios?.[0]?.servicio_nombre || 'Servicio';

        if (!ordenId) return null;

        return (
          <ChecklistViewerModal
            visible={showChecklistModal}
            onClose={() => setShowChecklistModal(false)}
            ordenId={ordenId}
            servicioNombre={servicioNombre}
          />
        );
      })()}
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.md || 16,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: spacing.xs || 6,
    borderRadius: borders.radius?.avatar?.sm || 20,
  },
  headerTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingHorizontal: spacing.md || 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md || 16,
    paddingHorizontal: spacing.sm || 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing.xs || 8,
  },
  tabActive: {
    borderBottomColor: colors.primary?.[500] || '#003459',
  },
  tabText: {
    fontSize: typography.fontSize?.base || 15,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.text?.secondary || '#5D6F75',
  },
  tabTextActive: {
    color: colors.primary?.[500] || '#003459',
    fontWeight: typography.fontWeight?.bold || '700',
  },
  tabBadge: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.badge?.md || 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.xs || 11,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // El paddingBottom, paddingLeft y paddingRight se calculan dinámicamente con insets en contentContainerStyle
    // Esto asegura que todos los elementos hijos respeten las áreas seguras
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl || 32,
  },
  emptyTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 16,
  },
  // Card principal única con secciones internas
  solicitudInfoCard: {
    padding: spacing.md || 16,
    marginBottom: spacing.md || 16,
    marginHorizontal: 0,
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  // Header de la card con estado
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm || 12,
    gap: spacing.sm || 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm || 12,
    flex: 1,
    minHeight: 40, // Mismo alto que los iconos para alineación
  },
  cardHeaderContent: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  cardHeaderRight: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sección individual dentro de la card
  sectionContainer: {
    paddingVertical: spacing.xs || 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm || 12,
    minHeight: 40, // Mismo alto que los iconos para alineación consistente
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sectionHeaderContent: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionValue: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    lineHeight: typography.fontSize?.md ? typography.fontSize.md * 1.2 : 19.2,
  },
  sectionSubValue: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.regular || '400',
    marginTop: 2,
  },
  // Descripción del problema mejorada
  descripcionContainer: {
    marginTop: spacing.sm || 12,
    paddingTop: spacing.sm || 12,
  },
  descripcionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 8,
    marginBottom: spacing.xs || 8,
  },
  descripcionLabel: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descripcionContent: {
    borderRadius: borders.radius?.md || 8,
    padding: spacing.sm || 12,
    borderWidth: 1,
  },
  descripcionText: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.5 : 21,
  },
  // Grid para fecha/hora y urgencia
  sectionGrid: {
    flexDirection: 'row',
    gap: spacing.sm || 12,
    paddingVertical: spacing.sm || 12,
  },
  sectionGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs || 8,
  },
  gridLabel: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.medium || '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  gridValue: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    textAlign: 'center',
  },
  gridSubValue: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.regular || '400',
    marginTop: 2,
    textAlign: 'center',
  },
  ofertasSection: {
    paddingBottom: spacing.lg || 24,
    paddingHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    marginTop: spacing.md || 16,
  },
  ofertasHeader: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginBottom: spacing.md || 16,
    borderRadius: borders.radius?.card?.md || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    overflow: 'hidden',
  },
  ofertasHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.md || 16,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  ofertasTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    flex: 1,
  },
  ofertasHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
    paddingHorizontal: spacing.md || 16,
  },
  ofertasContadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
  },
  ofertasContadorText: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.secondary || '#5D6F75',
  },
  compararButton: {
    marginLeft: spacing.sm || 12,
  },
  emptyOfertasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl || 32,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    marginTop: 0, // Ya tiene marginTop en ofertasSection
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyOfertasText: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    marginTop: spacing.md || 16,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    paddingHorizontal: spacing.md || 16,
    paddingTop: spacing.md || 16,
    paddingBottom: 0, // El paddingBottom se calcula dinámicamente con insets
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: spacing.sm || 12,
  },
  cancelButton: {
    width: '100%',
    marginBottom: 0,
  },
  pagarButton: {
    width: '100%',
    marginBottom: 0,
  },
  checklistSection: {
    width: '100%',
    marginBottom: spacing.sm || 12,
  },
  checklistVerificando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md || 16,
    backgroundColor: colors.background?.default || '#F8F9FA',
    borderRadius: borders.radius?.md || 8,
    gap: spacing.xs || 8,
  },
  checklistVerificandoText: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.primary?.[500] || '#003459',
  },
  checklistButton: {
    width: '100%',
    marginBottom: 0,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: '#FFFFFF',
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  ofertaSeleccionadaContainer: {
    marginTop: spacing.md || 16,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    padding: spacing.md || 16,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.md || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  ofertaSeleccionadaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
    paddingBottom: spacing.sm || 12,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    gap: spacing.sm || 12,
  },
  ofertaSeleccionadaTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.success?.[700] || '#047857',
  },
  ofertaSeleccionadaContent: {
    gap: spacing.md || 16,
  },
  proveedorSeleccionadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm || 12,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderRadius: borders.radius?.card?.md || 12,
    gap: spacing.md || 16,
  },
  proveedorFoto: {
    width: 64,
    height: 64,
    borderRadius: borders.radius?.avatar?.md || 32,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  proveedorFotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borders.radius?.avatar?.md || 32,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proveedorSeleccionadoInfo: {
    flex: 1,
    gap: spacing.xs || 8,
  },
  proveedorSeleccionadoNombre: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
  },
  proveedorSeleccionadoTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 8,
  },
  proveedorSeleccionadoTipoText: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  precioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md || 16,
    backgroundColor: colors.success?.[50] || '#ECFDF5',
    borderRadius: borders.radius?.badge?.md || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.success?.[200] || '#A7F3D0',
  },
  precioLabel: {
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  precioValor: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.success?.[700] || '#047857',
  },
  ofertaSeleccionadaMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm || 12,
    padding: spacing.sm || 12,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    borderRadius: borders.radius?.badge?.md || 8,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.primary?.[200] || '#99D5E8',
  },
  ofertaSeleccionadaSubtext: {
    flex: 1,
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: 18,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  // Proveedores Dirigidos - Diseño rediseñado
  proveedoresContainer: {
    marginTop: spacing.md || 16,
    padding: spacing.md || 16,
    marginHorizontal: 0,
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  proveedoresSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md || 16,
    gap: spacing.sm || 12,
  },
  proveedoresIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  proveedoresSectionHeaderContent: {
    flex: 1,
    gap: 4,
  },
  proveedoresSectionLabel: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proveedoresSectionSubtitle: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.sm ? typography.fontSize.sm * 1.4 : 16.8,
    marginTop: 2,
  },
  proveedoresList: {
    gap: spacing.sm || 12,
  },
  proveedorCard: {
    borderRadius: borders.radius?.md || 8,
    borderWidth: borders.width?.thin || 1,
    overflow: 'hidden',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  proveedorCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md || 16,
    gap: spacing.md || 16,
  },
  proveedorFoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    flexShrink: 0,
  },
  proveedorIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  proveedorInfo: {
    flex: 1,
    gap: spacing.xs || 8,
    minWidth: 0,
  },
  proveedorNombre: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    lineHeight: typography.fontSize?.lg ? typography.fontSize.lg * 1.2 : 21.6,
  },
  proveedorTipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm || 10,
    paddingVertical: spacing.xs || 4,
    borderRadius: borders.radius?.badge?.md || 8,
  },
  proveedorTipoText: {
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.semibold || '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proveedorContactInfo: {
    paddingHorizontal: spacing.md || 16,
    paddingTop: spacing.sm || 12,
    paddingBottom: spacing.md || 16,
    borderTopWidth: borders.width?.thin || 1,
    gap: spacing.xs || 8,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  proveedorContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm || 12,
  },
  proveedorContactText: {
    flex: 1,
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.regular || '400',
    lineHeight: typography.fontSize?.sm ? typography.fontSize.sm * 1.3 : 15.6,
  },
  tipoSolicitudContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md || 16,
    padding: spacing.sm || 12,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderRadius: borders.radius?.badge?.md || 8,
    gap: spacing.sm || 12,
  },
  tipoSolicitudText: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    flex: 1,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  reenviarContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    padding: spacing.md || 16,
    marginBottom: spacing.md || 16,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    borderRadius: borders.radius?.card?.md || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  reenviarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md || 16,
    backgroundColor: colors.info?.[50] || colors.primary?.[50] || '#E6F2F7',
    borderRadius: borders.radius?.badge?.md || 8,
    marginBottom: spacing.md || 16,
    gap: spacing.sm || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.info?.[200] || colors.primary?.[200] || '#99D5E8',
  },
  reenviarInfoText: {
    flex: 1,
    fontSize: typography.fontSize?.base || 15,
    color: colors.text?.primary || '#00171F',
    lineHeight: 22,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  reenviarButton: {
    marginTop: 0,
  },
  // Estilos para Timeline
  timelineContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginBottom: spacing.md || 16,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    borderRadius: borders.radius?.card?.md || 12,
    overflow: 'hidden',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: 'stretch',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.md || 16,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    minHeight: 56,
  },
  timelineHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm || 12,
    marginRight: spacing.sm || 12,
  },
  timelineTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    flex: 1,
  },
  timelineEstadoBadge: {
    paddingHorizontal: spacing.sm || 10,
    paddingVertical: spacing.xs || 6,
    borderRadius: borders.radius?.badge?.md || 8,
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    alignSelf: 'flex-start',
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineEstadoText: {
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    letterSpacing: 0.3,
  },
  timelineContent: {
    paddingHorizontal: spacing.md || 16,
    paddingTop: spacing.sm || 12,
    paddingBottom: spacing.md || 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: spacing.xs || 4,
    alignItems: 'flex-start',
    width: '100%',
  },
  timelineLeft: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: spacing.sm || 12,
    width: 24,
    flexShrink: 0,
    paddingTop: 2, // Ajuste para alinear con la primera línea del título
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: borders.radius?.avatar?.md || 10,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    borderWidth: borders.width?.thin || 2,
    borderColor: colors.neutral?.gray?.[300] || '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleCompleted: {
    backgroundColor: colors.success?.[500] || '#00C9A7',
    borderColor: colors.success?.[500] || '#00C9A7',
  },
  timelineCircleError: {
    backgroundColor: colors.error?.[500] || '#FF6B6B',
    borderColor: colors.error?.[500] || '#FF6B6B',
  },
  timelineCircleInProgress: {
    backgroundColor: colors.warning?.[500] || '#FFB84D',
    borderColor: colors.warning?.[500] || '#FFB84D',
  },
  timelineStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs || 4,
    gap: spacing.sm || 12,
    flexWrap: 'wrap',
  },
  timelineStepTitle: {
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    flex: 1,
    minWidth: 0,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 19.6,
  },
  timelineStepTitleError: {
    color: colors.error?.[500] || '#FF6B6B',
  },
  timelineStepTitleCompleted: {
    color: colors.success?.[600] || '#00A186',
  },
  timelineStepTitleInProgress: {
    color: colors.warning?.[600] || '#E6A044',
  },
  timelineStepDescription: {
    fontSize: typography.fontSize?.sm || 13,
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: typography.fontSize?.sm ? typography.fontSize.sm * 1.4 : 18.2,
    marginBottom: spacing.xs || 2,
    marginTop: 0,
    fontWeight: typography.fontWeight?.regular || '400',
    flex: 1,
  },
  timelineStepDescriptionError: {
    color: colors.error?.[500] || '#FF6B6B',
  },
  timelineStepDate: {
    fontSize: typography.fontSize?.xs || 11,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing.xs || 4,
    fontWeight: typography.fontWeight?.medium || '500',
    letterSpacing: 0.2,
  },
  timelineBadge: {
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    paddingHorizontal: spacing.sm || 12,
    paddingVertical: spacing.xs || 6,
    borderRadius: borders.radius?.badge?.md || 8,
    minWidth: 28,
    alignItems: 'center',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.primary?.[200] || '#99D5E8',
  },
  timelineBadgeText: {
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[700] || '#001F2E',
  },
  timelineProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm || 12,
    backgroundColor: colors.primary?.[50] || '#E6F2F7',
    borderRadius: borders.radius?.badge?.md || 8,
    marginTop: spacing.sm || 12,
    gap: spacing.sm || 12,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.primary?.[200] || '#99D5E8',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineProviderFoto: {
    width: 44,
    height: 44,
    borderRadius: borders.radius?.avatar?.sm || 22,
    backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
  },
  timelineProviderFotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: borders.radius?.avatar?.sm || 22,
    backgroundColor: colors.primary?.[100] || '#CCE5F0',
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.primary?.[300] || '#66B1D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineProviderInfo: {
    flex: 1,
    gap: spacing.xs || 4,
    minWidth: 0,
  },
  timelineProviderNombre: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    numberOfLines: 1,
  },
  timelineProviderTipoText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  timelineProviderPrecioText: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.primary?.[700] || '#001F2E',
    marginLeft: spacing.xs || 8,
    flexShrink: 0,
  },
  // Estilos para ofertas secundarias - Mismo diseño que ofertas principales
  ofertasSecundariasSection: {
    paddingBottom: spacing.lg || 24,
    paddingHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
    marginTop: spacing.md || 16,
  },
  ofertasSecundariasHeader: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginBottom: spacing.md || 16,
    borderRadius: borders.radius?.card?.md || 12,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    overflow: 'hidden',
  },
  ofertasSecundariasHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.md || 16,
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    gap: spacing.sm || 12,
  },
  ofertasSecundariasTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    flex: 1,
  },
  ofertasSecundariasSubtitle: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    paddingHorizontal: spacing.md || 16,
    marginBottom: spacing.md || 16,
    marginTop: spacing.sm || 12,
    lineHeight: typography.fontSize?.base ? typography.fontSize.base * 1.4 : 19.6,
    fontWeight: typography.fontWeight?.regular || '400',
  },
  ofertaSecundariaCard: {
    marginBottom: spacing.md || 16,
    marginHorizontal: 0, // Se maneja con paddingLeft/paddingRight del ScrollView
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 12,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    gap: spacing.sm || 12,
  },
  sectionTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
});

// Componente TimelineStep
const TimelineStep = ({
  completed,
  isLast,
  icon,
  title,
  description,
  date,
  providerInfo,
  additionalInfo,
  isError = false,
  inProgress = false,
  colors,
  styles: timelineStyles
}) => {
  const iconName = isError
    ? icon
    : completed
      ? icon
      : inProgress
        ? icon
        : `${icon}-outline`;

  return (
    <View style={[
      timelineStyles.timelineStep,
      isLast && { marginBottom: 0 }
    ]}>
      {/* Círculo con check/icono */}
      <View style={timelineStyles.timelineLeft}>
        <View style={[
          timelineStyles.timelineCircle,
          completed && !isError && timelineStyles.timelineCircleCompleted,
          isError && timelineStyles.timelineCircleError,
          inProgress && timelineStyles.timelineCircleInProgress
        ]}>
          {completed && !isError && !inProgress ? (
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          ) : (
            <Ionicons
              name={iconName}
              size={10}
              color={completed || inProgress || isError ? '#FFFFFF' : (colors?.text?.secondary || '#5D6F75')}
            />
          )}
        </View>
      </View>

      {/* Contenido del paso */}
      <View style={[{ flex: 1, minWidth: 0 }]}>
        <View style={timelineStyles.timelineStepHeader}>
          <Text style={[
            timelineStyles.timelineStepTitle,
            isError && timelineStyles.timelineStepTitleError,
            completed && !isError && !inProgress && timelineStyles.timelineStepTitleCompleted,
            inProgress && !isError && timelineStyles.timelineStepTitleInProgress
          ]} numberOfLines={2}>
            {title}
          </Text>
          {additionalInfo}
        </View>

        <Text style={[
          timelineStyles.timelineStepDescription,
          isError && timelineStyles.timelineStepDescriptionError
        ]} numberOfLines={3}>
          {description}
        </Text>

        {/* Fecha */}
        {date && (
          <Text style={timelineStyles.timelineStepDate}>
            {new Date(date).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        )}

        {/* Información del proveedor si aplica */}
        {providerInfo && (
          <View style={timelineStyles.timelineProviderCard}>
            {providerInfo.foto ? (
              <Image
                source={{ uri: providerInfo.foto }}
                style={timelineStyles.timelineProviderFoto}
                resizeMode="cover"
              />
            ) : (
              <View style={timelineStyles.timelineProviderFotoPlaceholder}>
                <Ionicons
                  name={providerInfo.tipo === 'taller' ? 'business' : 'construct'}
                  size={20}
                  color={colors?.primary?.[600] || '#002A47'}
                />
              </View>
            )}
            <View style={timelineStyles.timelineProviderInfo}>
              <Text style={timelineStyles.timelineProviderNombre} numberOfLines={1} ellipsizeMode="tail">
                {providerInfo.nombre}
              </Text>
              <Text style={timelineStyles.timelineProviderTipoText} numberOfLines={1}>
                {providerInfo.tipo === 'taller' ? 'Taller' : 'Mecánico a Domicilio'}
              </Text>
            </View>
            {providerInfo.precio > 0 && (
              <Text style={timelineStyles.timelineProviderPrecioText} numberOfLines={1}>
                ${parseInt(providerInfo.precio).toLocaleString()}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// Componente TimelineOfertaSecundaria
const TimelineOfertaSecundaria = ({ ofertaSec, colors, styles: timelineStyles }) => {
  const [timelineSecExpandido, setTimelineSecExpandido] = useState(false);

  return (
    <View style={timelineStyles.timelineContainer}>
      <TouchableOpacity
        style={[timelineStyles.timelineHeader, { borderBottomWidth: timelineSecExpandido ? 1 : 0 }]}
        onPress={() => setTimelineSecExpandido(!timelineSecExpandido)}
        activeOpacity={0.7}
      >
        <View style={timelineStyles.timelineHeaderContent}>
          <Text style={timelineStyles.timelineTitle}>Progreso del Servicio Adicional</Text>
          {(() => {
            let estadoActual = 'Enviada';
            let estadoColor = colors?.text?.secondary || '#5D6F75';

            if (ofertaSec.estado === 'completada') {
              estadoActual = 'Completada';
              estadoColor = colors?.success?.[700] || '#047857';
            } else if (ofertaSec.estado === 'en_ejecucion') {
              estadoActual = 'En Ejecución';
              estadoColor = colors?.warning?.[700] || '#D97706';
            } else if (ofertaSec.estado === 'pagada') {
              estadoActual = 'Pagada';
              estadoColor = colors?.primary?.[600] || '#002A47';
            } else if (ofertaSec.estado === 'aceptada') {
              estadoActual = 'Aceptada';
              estadoColor = colors?.primary?.[600] || '#002A47';
            } else if (ofertaSec.estado === 'rechazada') {
              estadoActual = 'Rechazada';
              estadoColor = colors?.error?.[700] || '#B91C1C';
            }

            return (
              <View style={timelineStyles.timelineEstadoBadge}>
                <Text style={[timelineStyles.timelineEstadoText, { color: estadoColor }]}>
                  {estadoActual}
                </Text>
              </View>
            );
          })()}
        </View>
        <Ionicons
          name={timelineSecExpandido ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors?.text?.secondary || '#5D6F75'}
        />
      </TouchableOpacity>

      {timelineSecExpandido && (
        <View style={timelineStyles.timelineContent}>
          {/* Paso 1: Oferta Secundaria Enviada */}
          <TimelineStep
            completed={true}
            isLast={ofertaSec.estado === 'enviada' || ofertaSec.estado === 'vista'}
            icon="add-circle"
            title="Servicio Adicional Propuesto"
            description={`El proveedor ha propuesto un servicio adicional: ${ofertaSec.motivo_servicio_adicional || 'Servicio complementario'}`}
            date={ofertaSec.fecha_envio || ofertaSec.created_at}
            colors={colors}
            styles={timelineStyles}
          />

          {/* Paso 2: Oferta Secundaria Aceptada */}
          {['aceptada', 'pagada', 'en_ejecucion', 'completada'].includes(ofertaSec.estado) && (
            <TimelineStep
              completed={true}
              isLast={ofertaSec.estado === 'aceptada'}
              icon="checkmark-circle"
              title="Servicio Adicional Aceptado"
              description="Has aceptado este servicio adicional"
              date={ofertaSec.fecha_respuesta_cliente || ofertaSec.fecha_aceptacion}
              colors={colors}
              styles={timelineStyles}
            />
          )}

          {/* Paso 3: Pago Realizado */}
          {['pagada', 'en_ejecucion', 'completada'].includes(ofertaSec.estado) && (
            <TimelineStep
              completed={true}
              isLast={ofertaSec.estado === 'pagada'}
              icon="card"
              title="Pago Realizado"
              description="El pago del servicio adicional ha sido confirmado"
              date={ofertaSec.fecha_pago || ofertaSec.fecha_actualizacion}
              colors={colors}
              styles={timelineStyles}
            />
          )}

          {/* Paso 4: Servicio Iniciado */}
          {['en_ejecucion', 'completada'].includes(ofertaSec.estado) && (
            <TimelineStep
              completed={true}
              isLast={ofertaSec.estado === 'en_ejecucion'}
              icon="play-circle"
              title="Servicio Iniciado"
              description="El proveedor ha iniciado el servicio adicional"
              date={ofertaSec.fecha_actualizacion}
              colors={colors}
              styles={timelineStyles}
            />
          )}

          {/* Paso 5: Servicio Completado */}
          {ofertaSec.estado === 'completada' && (
            <TimelineStep
              completed={true}
              isLast={true}
              icon="checkmark-done-circle"
              title="Servicio Completado"
              description="El servicio adicional ha sido completado exitosamente"
              date={ofertaSec.fecha_actualizacion}
              colors={colors}
              styles={timelineStyles}
            />
          )}

          {/* Estado de Rechazo */}
          {ofertaSec.estado === 'rechazada' && (
            <TimelineStep
              completed={false}
              isLast={true}
              icon="close-circle"
              title="Servicio Adicional Rechazado"
              description="Has rechazado este servicio adicional"
              date={ofertaSec.fecha_respuesta_cliente}
              isError={true}
              colors={colors}
              styles={timelineStyles}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default DetalleSolicitudScreen;

