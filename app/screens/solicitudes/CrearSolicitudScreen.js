import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Car, Plus, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { ROUTES } from '../../utils/constants';
import FormularioSolicitud from '../../components/solicitudes/FormularioSolicitud';
import { CrearSolicitudScreenSkeleton } from '../../components/utils/SolicitudFlowSkeletons';
import { resolveProveedorEntityId } from '../../utils/calendarioProveedorNavigation';
import { esServicioDiagnosticoInspeccion } from '../../utils/servicioDiagnosticoInspeccion';
import {
  buildConfirmarCandidatoPayload,
  confirmarCatalogoProveedor,
} from '../../services/agendamientoAsistidoService';
import { useSolicitudes } from '../../context/SolicitudesContext';
import * as vehicleService from '../../services/vehicle';
import * as locationService from '../../services/location';
import * as userService from '../../services/user';
import * as serviceService from '../../services/service';
import solicitudesService, { normalizarSolicitudPublica } from '../../services/solicitudesService';
import { validarSinServicioActivoDuplicado } from '../../utils/solicitudActivaGuard';
import { syncSolicitudesListAfterChange } from '../../hooks/useRequests';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/platformAlert';
import { formatApiErrorMessage } from '../../utils/formatApiError';

/**
 * Sale de Nueva Solicitud y muestra confirmación en la pantalla destino.
 * Mismo patrón que CalendarioProveedorScreen: reset con TabNavigator + pantalla de solicitudes.
 */
function finishCrearSolicitudSuccess(navigation, { solicitudId, title, message }) {
  const routes = solicitudId
    ? [
        { name: 'TabNavigator' },
        { name: ROUTES.DETALLE_SOLICITUD, params: { solicitudId } },
      ]
    : [
        { name: 'TabNavigator' },
        { name: ROUTES.MIS_SOLICITUDES, params: { refreshList: true } },
      ];

  navigation.reset({
    index: routes.length - 1,
    routes,
  });

  requestAnimationFrame(() => {
    showAlert(title, message);
  });
}

/**
 * Pantalla para crear una nueva solicitud de servicio
 * Puede recibir un servicio preseleccionado desde la navegación
 */
const CrearSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const { crearSolicitud } = useSolicitudes();

  // Incremented after successful submit to force FormularioSolicitud re-mount
  const [submitCount, setSubmitCount] = useState(0);
  // Evita volver a aplicar el mismo initialData en cada refocus (misma ruta/params)
  const preselectAppliedFingerprintRef = useRef(null);
  // El primer foco ya dispara refetch vía refetchOnMount en useQuery; evita segundo refetch inmediato + parpadeo
  const skipFirstFocusVehicleRefetchRef = useRef(true);
  // Ref estable para refetchVehicles: evita que useFocusEffect se recree en cada render
  const refetchVehiclesRef = useRef(null);
  // Bandera para saber si la carga inicial ya terminó — evita que loading vuelva a true y desmonte el formulario
  const initialLoadDoneRef = useRef(false);

  // Extraer parámetros de la ruta (servicio y proveedor preseleccionados)
  const {
    servicioPreseleccionado,
    serviciosPreSeleccionados, // Array de IDs de servicios (desde alertas)
    proveedorPreseleccionado,
    tipoProveedorPreseleccionado,
    fromProviderDetail,
    categoriaId,
    categoriaNombre,
    vehicle, // Vehículo preseleccionado (desde alertas)
    descripcionPrellenada, // Descripción pre-rellenada (desde alertas)
    fromDashboard, // Bloqueo de vehículo desde home
    agendamientoInteligente, // Comparador IA; sin proveedor fijo
    flujoCatalogoProveedor, // Perfil proveedor → oferta catálogo
    ofertaServicioId,
    isPreCompra, // Inspección pre-compra marketplace
    targetVehicleId, // ID del vehículo del vendedor (pre-compra)
    ofertaId, // ID de la oferta marketplace aceptada
    slotSeleccionado,
    pasoDestinoTrasCalendario,
  } = route.params || {};

  const [pasoResumeCalendario, setPasoResumeCalendario] = useState(null);

  // Horario elegido en CalendarioProveedorScreen
  useEffect(() => {
    if (!slotSeleccionado?.fecha) return;
    setInitialData((prev) => ({
      ...(prev || {}),
      fecha_preferida: slotSeleccionado.fecha,
      hora_preferida: slotSeleccionado.hora || '',
    }));
    const paso =
      typeof pasoDestinoTrasCalendario === 'number' && pasoDestinoTrasCalendario >= 1
        ? pasoDestinoTrasCalendario
        : 5;
    setPasoResumeCalendario(paso);
    navigation.setParams({
      slotSeleccionado: undefined,
      pasoDestinoTrasCalendario: undefined,
    });
  }, [slotSeleccionado?.fecha, slotSeleccionado?.hora, pasoDestinoTrasCalendario, navigation]);

  // Clave estable para useFocusEffect: `route.params` suele ser un objeto nuevo en cada render del
  // navigator y recreaba el callback → doble foco / refetch y setInitialData en momentos raros.
  const focusEffectRouteKey = React.useMemo(
    () =>
      JSON.stringify({
        sp: servicioPreseleccionado?.id ?? null,
        ss: serviciosPreSeleccionados ?? null,
        pp:
          proveedorPreseleccionado?.id ??
          proveedorPreseleccionado?.usuario?.id ??
          null,
        v: vehicle?.id ?? null,
        fpd: !!fromProviderDetail,
        tpp: tipoProveedorPreseleccionado ?? null,
        desc: descripcionPrellenada ?? null,
        fd: !!fromDashboard,
        ai: !!agendamientoInteligente,
        cat: !!flujoCatalogoProveedor,
        osid: ofertaServicioId ?? null,
        cid: categoriaId ?? null,
      }),
    [
      servicioPreseleccionado?.id,
      serviciosPreSeleccionados,
      proveedorPreseleccionado?.id,
      proveedorPreseleccionado?.usuario?.id,
      vehicle?.id,
      fromProviderDetail,
      tipoProveedorPreseleccionado,
      descripcionPrellenada,
      fromDashboard,
      agendamientoInteligente,
      flujoCatalogoProveedor,
      ofertaServicioId,
      categoriaId,
    ]
  );

  /** Servicios que pueden contratarse sin vehículo en la plataforma (ej. revisión precompra) */
  const esServicioSinVehiculo = (servicio) => {
    if (!servicio || !servicio.nombre) return false;
    const n = String(servicio.nombre).toLowerCase();
    return n.includes('precompra') || n.includes('pre-compra') || n.includes('pre compra');
  };

  // Estado inicial síncrono si ya viene servicio/proveedor → Formulario salta pasos de selección
  const buildInitialFromParams = () => {
    const buildServicioEntry = (s) => ({
      id: s.id,
      nombre: s.nombre || 'Servicio',
      descripcion: s.descripcion || '',
      precio_referencia: s.precio_referencia ?? s.precio_publicado_cliente,
      categoria_id: s.categoria_id ?? s.categoria,
      categoria_nombre:
        s.categoria_nombre
        || s.categoria
        || s.categorias_completas?.[0]?.nombre
        || s.categorias_info?.[0]?.nombre
        || null,
      es_diagnostico: s.es_diagnostico,
      tipo_servicio: s.tipo_servicio,
      oferta_id: s.oferta_id ?? s.oferta_servicio_id ?? ofertaServicioId,
      oferta_servicio_id: s.oferta_servicio_id ?? s.oferta_id ?? ofertaServicioId,
      precio_publicado_cliente: s.precio_publicado_cliente,
      precio_con_repuestos: s.precio_con_repuestos,
      precio_sin_repuestos: s.precio_sin_repuestos,
      costo_mano_de_obra_sin_iva: s.costo_mano_de_obra_sin_iva,
      costo_repuestos_sin_iva: s.costo_repuestos_sin_iva,
      desglose_precios: s.desglose_precios,
      duracion_estimada: s.duracion_estimada,
      fotos_servicio: Array.isArray(s.fotos_servicio) ? s.fotos_servicio : [],
      repuestos_seleccionados: s.repuestos_seleccionados || [],
      repuestos_info: s.repuestos_info || [],
      detalles_servicios: s.detalles_servicios || [],
    });

    const baseCampos = {
      vehiculo: vehicle || null,
      descripcion_problema: descripcionPrellenada || '',
      urgencia: 'normal',
      direccion_usuario: null,
      direccion_servicio_texto: '',
      detalles_ubicacion: '',
      fecha_preferida: '',
      hora_preferida: '',
      ubicacion_servicio: null,
    };

    if (servicioPreseleccionado?.id && proveedorPreseleccionado && fromProviderDetail) {
      const s = servicioPreseleccionado;
      const usuarioId =
        proveedorPreseleccionado.usuario_id
        ?? proveedorPreseleccionado.usuario?.id
        ?? proveedorPreseleccionado.usuario;
      const entityId = resolveProveedorEntityId(
        proveedorPreseleccionado,
        tipoProveedorPreseleccionado,
      );
      return {
        ...baseCampos,
        servicios_seleccionados: [buildServicioEntry(s)],
        tipo_solicitud: 'dirigida',
        tipo_proveedor_preseleccionado: tipoProveedorPreseleccionado,
        proveedor_entity_id: entityId,
        oferta_servicio_id_preseleccionada:
          s.oferta_servicio_id ?? s.oferta_id ?? ofertaServicioId ?? null,
        proveedores_dirigidos: [
          {
            ...proveedorPreseleccionado,
            id: entityId,
            tipo: tipoProveedorPreseleccionado,
            tipo_proveedor: tipoProveedorPreseleccionado,
            usuario_id: usuarioId,
            proveedor_entity_id: entityId,
            ...(tipoProveedorPreseleccionado === 'taller'
              ? { taller_id: entityId }
              : { mecanico_id: entityId }),
          },
        ],
        fromProviderDetail: true,
        flujoCatalogoProveedor: !!flujoCatalogoProveedor,
        requiere_repuestos: esServicioDiagnosticoInspeccion(s)
          ? false
          : s.tipo_servicio !== 'sin_repuestos',
        sin_vehiculo_registrado: esServicioSinVehiculo(s),
      };
    }

    if (servicioPreseleccionado && servicioPreseleccionado.id) {
      const s = servicioPreseleccionado;
      return {
        ...baseCampos,
        servicios_seleccionados: [buildServicioEntry(s)],
        tipo_solicitud: 'global',
        proveedores_dirigidos: [],
        agendamientoInteligente: agendamientoInteligente || false,
        requiere_repuestos: !esServicioDiagnosticoInspeccion(s),
        sin_vehiculo_registrado: esServicioSinVehiculo(s),
      };
    }
    if (agendamientoInteligente && vehicle) {
      return {
        vehiculo: vehicle,
        tipo_solicitud: 'global',
        proveedores_dirigidos: [],
        agendamientoInteligente: true,
        descripcion_problema: descripcionPrellenada || '',
        servicios_seleccionados: [],
        urgencia: 'normal',
        direccion_usuario: null,
        direccion_servicio_texto: '',
        detalles_ubicacion: '',
        fecha_preferida: '',
        hora_preferida: '',
        ubicacion_servicio: null,
      };
    }
    return {};
  };

  // State
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [initialData, setInitialData] = useState(buildInitialFromParams);
  // Evita montar el formulario antes de resolver servicios por ID (solo cuando vienen IDs sin objeto)
  const needsPreloadServicios =
    Array.isArray(serviciosPreSeleccionados) &&
    serviciosPreSeleccionados.length > 0 &&
    !(servicioPreseleccionado && servicioPreseleccionado.id);
  const [initialDataReady, setInitialDataReady] = useState(!needsPreloadServicios);
  const [direcciones, setDirecciones] = useState([]);

  // El cliente_id viene del contexto de autenticación — disponible desde el momento de login.
  // No hay race condition: si el usuario está autenticado, este valor siempre existe.
  const [clienteId, setClienteId] = useState(() => user?.cliente_id ?? null);

  // TanStack Query for Vehicles - Auto refresh when focused or cache updates
  const {
    data: allVehicles = [],
    isLoading: isLoadingVehicles,
    isFetched: vehiclesQueryFetched,
    refetch: refetchVehicles
  } = useQuery({
    queryKey: ['userVehicles'], // Shared key with UserPanelScreen
    queryFn: vehicleService.getUserVehicles,
    enabled: !isPreCompra,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: !isPreCompra,
    // refetchOnWindowFocus desactivado: causaba refetches inesperados que podían cascadear
    // re-renders en FormularioSolicitud y hacer parecer que el paso 1 se "recargaba".
    refetchOnWindowFocus: false,
  });

  // Filter active vehicles from query data
  const vehiculos = React.useMemo(() => {
    if (!allVehicles || !Array.isArray(allVehicles)) return [];

    // Filter deleted/inactive
    return allVehicles.filter(v => {
      const isActive = v.is_active !== false;
      const isNotDeleted = v.status !== 'deleted' && v.estado !== 'eliminado';
      return isActive && isNotDeleted;
    });
  }, [allVehicles]);

  // Sincronizar cliente_id si cambia el objeto user (ej. token refreshed mid-session).
  // El VehiculoLiteSerializer no retorna cliente_detail, así que este efecto ya no depende de vehículos.
  useEffect(() => {
    if (user?.cliente_id && !clienteId) {
      setClienteId(user.cliente_id);
    }
  }, [user?.cliente_id, clienteId]);

  // Mantener ref actualizada para refetchVehicles (evita incluirla en deps de useFocusEffect)
  refetchVehiclesRef.current = refetchVehicles;

  // UseFocusEffect to refetch when screen is focused (e.g. after adding vehicle)
  // Verificar si puede crear solicitud y cargar parámetros cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      // Vuelta desde calendario: no re-ejecutar prepararDatosIniciales (resetea paso y fecha).
      if (route.params?.slotSeleccionado?.fecha) {
        return undefined;
      }

      // Refetch de vehículos al volver a esta pantalla (ej. tras agregar auto en Mis vehículos).
      // No en el primer foco: useQuery ya tiene refetchOnMount y un refetch extra aquí duplicaba peticiones
      // y podía hacer "parpadear" listas del paso 1.
      if (skipFirstFocusVehicleRefetchRef.current) {
        skipFirstFocusVehicleRefetchRef.current = false;
      } else {
        // Usar ref para evitar que refetchVehicles sea dependencia del callback
        refetchVehiclesRef.current?.();
      }
      // No invalidar ['vehicleServices'] en cada foco: el Formulario remonta queries, recarga listas de
      // servicios y se siente como un mini reset en el paso 1; al volver del perfil basta el caché/local state.

      const verificarYCargarDatos = async () => {
        try {
          // 1. Verificar si el usuario puede crear una solicitud
          const puedeCrear = await solicitudesService.puedeCrearSolicitud();
          console.log('CrearSolicitudScreen: Verificación de creación:', puedeCrear);

          // Si hay un error pero no puede crear, mostrar alerta
          if (puedeCrear.error && !puedeCrear.puede_crear) {
            Alert.alert(
              'No puedes crear una solicitud',
              puedeCrear.razon || puedeCrear.mensaje || 'Tienes solicitudes o servicios adicionales pendientes de pago. Completa los pagos antes de continuar.',
              [
                {
                  text: 'Ver mis solicitudes',
                  onPress: () => {
                    navigation.goBack();
                    setTimeout(() => {
                      navigation.navigate(ROUTES.MIS_SOLICITUDES, { refreshList: true });
                    }, 100);
                  }
                },
                {
                  text: 'Volver',
                  onPress: () => navigation.goBack(),
                  style: 'cancel'
                }
              ]
            );
            return;
          }

          // Si no puede crear (sin error), mostrar alerta
          if (!puedeCrear.puede_crear) {
            Alert.alert(
              'No puedes crear una solicitud',
              puedeCrear.razon || 'Tienes solicitudes o servicios adicionales pendientes de pago. Completa los pagos antes de continuar.',
              [
                {
                  text: 'Ver mis solicitudes',
                  onPress: () => {
                    navigation.goBack();
                    setTimeout(() => {
                      navigation.navigate(ROUTES.MIS_SOLICITUDES, { refreshList: true });
                    }, 100);
                  }
                },
                {
                  text: 'Volver',
                  onPress: () => navigation.goBack(),
                  style: 'cancel'
                }
              ]
            );
            return;
          }

          // Si hay error pero puede crear, mostrar advertencia
          if (puedeCrear.error && puedeCrear.mensaje) {
            Alert.alert(
              'Advertencia',
              puedeCrear.mensaje,
              [{ text: 'Continuar', onPress: () => { } }]
            );
          }

          // Nota: No resetear initialData aquí al volver el foco sin params (p. ej. tras ver perfil
          // del proveedor). Eso recreaba {} y disparaba efectos en FormularioSolicitud que podían
          // borrar servicios/paso. El estado inicial ya viene de buildInitialFromParams / prepararDatosIniciales.
        } catch (error) {
          console.error('Error verificando solicitud:', error);
          Alert.alert(
            'Error',
            'No se pudo verificar si puedes crear una solicitud. Por favor, verifica manualmente que no tengas solicitudes pendientes de pago.',
            [{ text: 'Continuar', onPress: () => { } }]
          );
        }
      };

      verificarYCargarDatos();

      // Preparar datos iniciales si hay servicio o proveedor preseleccionado
      const prepararDatosIniciales = async () => {
        const tieneServicioObjeto = !!servicioPreseleccionado;
        const tieneServiciosArray = !!(serviciosPreSeleccionados && Array.isArray(serviciosPreSeleccionados) && serviciosPreSeleccionados.length > 0);
        const tieneProveedor = !!proveedorPreseleccionado;
        const tieneVehicleParam = !!vehicle;

        if (tieneServicioObjeto || tieneServiciosArray || tieneProveedor || tieneVehicleParam) {
          const preselectFingerprint = [
            servicioPreseleccionado?.id ?? '',
            Array.isArray(serviciosPreSeleccionados) ? serviciosPreSeleccionados.join(',') : '',
            proveedorPreseleccionado?.id ?? proveedorPreseleccionado?.usuario?.id ?? '',
            vehicle?.id ?? '',
            fromProviderDetail ? '1' : '',
            agendamientoInteligente ? 'ai' : '',
            flujoCatalogoProveedor ? 'cat' : '',
            ofertaServicioId ?? '',
            tipoProveedorPreseleccionado ?? '',
          ].join('|');

          if (preselectAppliedFingerprintRef.current === preselectFingerprint) {
            return;
          }

          console.log('✅ CrearSolicitudScreen: Datos preseleccionados recibidos:', {
            tieneServicioObjeto,
            tieneServiciosArray,
            tieneProveedor,
            tieneVehicleParam
          });

          try {
            let proveedorFormato = null;
            let serviciosParaInitialData = [];

            const buildServicioEntry = (s) => ({
              id: s.id,
              nombre: s.nombre || 'Servicio',
              descripcion: s.descripcion || '',
              precio_referencia: s.precio_referencia ?? s.precio_publicado_cliente,
              categoria_id: s.categoria_id ?? s.categoria,
              tipo_servicio: s.tipo_servicio,
              oferta_id: s.oferta_id ?? s.oferta_servicio_id ?? ofertaServicioId,
              oferta_servicio_id: s.oferta_servicio_id ?? s.oferta_id ?? ofertaServicioId,
              precio_publicado_cliente: s.precio_publicado_cliente,
              precio_con_repuestos: s.precio_con_repuestos,
              precio_sin_repuestos: s.precio_sin_repuestos,
              costo_mano_de_obra_sin_iva: s.costo_mano_de_obra_sin_iva,
              costo_repuestos_sin_iva: s.costo_repuestos_sin_iva,
              desglose_precios: s.desglose_precios,
              duracion_estimada: s.duracion_estimada,
              fotos_servicio: Array.isArray(s.fotos_servicio) ? s.fotos_servicio : [],
              repuestos_seleccionados: s.repuestos_seleccionados || [],
              repuestos_info: s.repuestos_info || [],
              detalles_servicios: s.detalles_servicios || [],
            });

            // Si hay servicio como objeto (desde categorías o proveedor)
            if (tieneServicioObjeto) {
              serviciosParaInitialData = [buildServicioEntry(servicioPreseleccionado)];
            }
            // Si hay servicios como array de IDs (desde alertas)
            else if (tieneServiciosArray) {
              console.log('📋 Cargando servicios desde IDs:', serviciosPreSeleccionados);
              try {
                const serviciosPromises = serviciosPreSeleccionados.map(async (servicioId) => {
                  try {
                    const servicioDetalle = await serviceService.getServicioDetalle(servicioId);
                    if (servicioDetalle) {
                      return {
                        id: servicioDetalle.id,
                        nombre: servicioDetalle.nombre,
                        descripcion: servicioDetalle.descripcion,
                        categoria_id: servicioDetalle.categoria,
                        tipo_servicio: servicioDetalle.tipo_servicio,
                        precio_referencia: servicioDetalle.precio_referencia
                      };
                    }
                    return null;
                  } catch (error) {
                    console.error(`❌ Error cargando servicio ${servicioId}:`, error);
                    return null;
                  }
                });

                const serviciosCargados = await Promise.all(serviciosPromises);
                serviciosParaInitialData = serviciosCargados.filter(s => s !== null);
                console.log('✅ Servicios cargados desde IDs:', serviciosParaInitialData.length);
              } catch (error) {
                console.error('❌ Error cargando servicios desde IDs:', error);
              }
            }

            // Si hay proveedor preseleccionado desde ProviderDetailScreen
            if (proveedorPreseleccionado && fromProviderDetail) {
              // Extraer usuario.id del proveedor (necesario para el backend)
              const usuarioId = proveedorPreseleccionado.usuario?.id ||
                proveedorPreseleccionado.usuario ||
                proveedorPreseleccionado.usuario_id ||
                proveedorPreseleccionado.id;

              console.log('📋 Preparando proveedor preseleccionado:', {
                nombre: proveedorPreseleccionado.nombre,
                usuarioId: usuarioId,
                tipo: tipoProveedorPreseleccionado
              });

              const entityId = resolveProveedorEntityId(
                proveedorPreseleccionado,
                tipoProveedorPreseleccionado,
              );
              proveedorFormato = {
                ...proveedorPreseleccionado,
                id: entityId,
                tipo: tipoProveedorPreseleccionado,
                tipo_proveedor: tipoProveedorPreseleccionado,
                usuario_id: usuarioId,
                proveedor_entity_id: entityId,
                ...(tipoProveedorPreseleccionado === 'taller'
                  ? { taller_id: entityId }
                  : { mecanico_id: entityId }),
              };

              console.log('✅ Proveedor formateado:', proveedorFormato);
            }

            // No mandar vehiculo: null: el Formulario interpretaba "fusionar" y borraba el auto ya elegido
            // en paso 1 cuando este setInitialData llegaba tras preparar async / re-render.
            const initialFromRoute = {
              servicios_seleccionados: serviciosParaInitialData,
              tipo_solicitud: proveedorFormato ? 'dirigida' : 'global',
              proveedores_dirigidos: proveedorFormato ? [proveedorFormato] : [],
              tipo_proveedor_preseleccionado: tipoProveedorPreseleccionado || null,
              proveedor_entity_id: proveedorFormato?.proveedor_entity_id ?? null,
              oferta_servicio_id_preseleccionada:
                serviciosParaInitialData[0]?.oferta_servicio_id ?? ofertaServicioId ?? null,
              fromProviderDetail: fromProviderDetail || false,
              fromDashboard: fromDashboard || false,
              agendamientoInteligente: agendamientoInteligente || false,
              flujoCatalogoProveedor: flujoCatalogoProveedor || false,
              descripcion_problema: descripcionPrellenada || '',
              urgencia: 'normal',
              direccion_usuario: null,
              direccion_servicio_texto: '',
              detalles_ubicacion: '',
              fecha_preferida: '',
              hora_preferida: '',
              ubicacion_servicio: null
            };
            if (tieneVehicleParam) {
              initialFromRoute.vehiculo = vehicle;
            }
            setInitialData((prev) => ({
              ...initialFromRoute,
              fecha_preferida: prev?.fecha_preferida || initialFromRoute.fecha_preferida,
              hora_preferida: prev?.hora_preferida || initialFromRoute.hora_preferida,
            }));

            preselectAppliedFingerprintRef.current = preselectFingerprint;

            setInitialDataReady(true);

            console.log('✅ InitialData preparado:', {
              tieneServicio: serviciosParaInitialData.length > 0,
              tieneProveedor: proveedorFormato ? true : false,
              tieneVehicle: tieneVehicleParam,
              tipo_solicitud: proveedorFormato ? 'dirigida' : 'global',
              servicios_seleccionados_count: serviciosParaInitialData.length
            });
          } catch (error) {
            console.error('❌ Error preparando datos iniciales:', error);
            setInitialData({});
            setInitialDataReady(true);
          }
        }
        // Sin params preseleccionados: no tocar initialData en cada refocus (conserva el flujo al volver del perfil).
      };

      prepararDatosIniciales();

      // NOTA: refetchVehicles se usa vía ref (refetchVehiclesRef) para no incluirla como dependencia
      // y evitar que el callback se recree innecesariamente, lo que causaba re-ejecución del
      // useFocusEffect → refetch → re-render → apariencia de "recarga" del paso 1.
    }, [navigation, focusEffectRouteKey, route.params?.slotSeleccionado?.fecha])
  );

  const cargarDatos = async () => {
    // Carga de datos no relacionados con vehículos. Los vehículos se manejan con useQuery.
    // El clienteId ya viene del contexto de auth (user.cliente_id); solo se hace fetch como
    // fallback para sesiones antiguas cuyo cache de AsyncStorage no incluía cliente_id todavía.

    if (
      !isPreCompra &&
      !initialLoadDoneRef.current &&
      isLoadingVehicles &&
      (!allVehicles || allVehicles.length === 0)
    ) {
      setLoading(true);
    }

    try {
      const direccionesData = await locationService.getUserAddresses();
      setDirecciones(Array.isArray(direccionesData) ? direccionesData : []);

      // Fallback solo si el cliente_id no estaba en la sesión cacheada (sesiones pre-fix).
      if (!clienteId) {
        try {
          const clienteData = await userService.getClienteDetails();
          if (clienteData?.id) {
            setClienteId(clienteData.id);
          }
        } catch {
          // No crítico — el submit validará con mensaje apropiado.
        }
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
    } finally {
      if (isPreCompra || !isLoadingVehicles) {
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    }
  };

  // Sync loading state with query — una vez que loading pasa a false por primera vez, no vuelve a true
  useEffect(() => {
    if (isPreCompra || !isLoadingVehicles) {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [isLoadingVehicles, isPreCompra]);

  // Inspección pre-compra: buscar servicio y preparar initialData
  useEffect(() => {
    if (!isPreCompra) return;
    let cancelled = false;

    (async () => {
      try {
        const servicios = await serviceService.buscarServicios('precompra');
        if (cancelled) return;
        const svc = Array.isArray(servicios)
          ? servicios.find(s => {
              const n = (s.nombre || '').toLowerCase();
              return n.includes('precompra') || n.includes('pre-compra') || n.includes('pre compra');
            })
          : null;

        if (!svc) {
          Alert.alert('Error', 'No se encontró el servicio de inspección pre-compra.');
          navigation.goBack();
          return;
        }

        setInitialData({
          servicios_seleccionados: [{
            id: svc.id,
            nombre: svc.nombre,
            descripcion: svc.descripcion || '',
            precio_referencia: svc.precio_referencia,
            categoria_id: svc.categoria_id ?? svc.categoria,
            tipo_servicio: svc.tipo_servicio,
          }],
          tipo_solicitud: 'global',
          proveedores_dirigidos: [],
          sin_vehiculo_registrado: true,
          descripcion_problema: 'Inspección pre-compra marketplace',
          urgencia: 'normal',
          direccion_usuario: null,
          direccion_servicio_texto: '',
          detalles_ubicacion: '',
          fecha_preferida: '',
          hora_preferida: '',
          ubicacion_servicio: null,
          isPreCompra: true,
          targetVehicleId,
          ofertaId,
        });
        setInitialDataReady(true);
        setLoading(false);
        initialLoadDoneRef.current = true;
      } catch (err) {
        if (!cancelled) {
          Alert.alert('Error', 'No se pudo cargar el servicio de inspección pre-compra.');
          navigation.goBack();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isPreCompra, targetVehicleId, ofertaId]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSubmit = async (formData) => {
    if (creando) return;

    setCreando(true);
    try {
      console.log('CrearSolicitudScreen: Enviando datos del formulario:', formData);

      if (
        !formData.sin_vehiculo_registrado
        && formData.vehiculo?.id
        && Array.isArray(formData.servicios_seleccionados)
        && formData.servicios_seleccionados.length > 0
      ) {
        const servicioIds = formData.servicios_seleccionados
          .map((s) => (typeof s === 'object' ? s?.id : s))
          .filter(Boolean);
        const okDup = await validarSinServicioActivoDuplicado(navigation, {
          vehiculoId: formData.vehiculo.id,
          servicioIds,
        });
        if (!okDup) {
          setCreando(false);
          return;
        }
      }

      // Validar que tenemos el ID del cliente
      if (!clienteId) {
        // Si no hay sesión activa: el usuario cerró sesión o el token expiró
        if (!user || !token) {
          Alert.alert(
            'Sesión expirada',
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            [{ text: 'Iniciar sesión', onPress: () => navigation.navigate(ROUTES.LOGIN) }]
          );
        } else {
          // Usuario autenticado pero sin perfil de cliente creado (caso muy infrecuente)
          Alert.alert(
            'Perfil incompleto',
            'No encontramos un perfil de cliente asociado a tu cuenta. Contacta a soporte si el problema persiste.'
          );
        }
        setCreando(false);
        return;
      }

      // Preparar ubicación de servicio en formato GeoJSON
      // GeoFeatureModelSerializer espera formato: {"type": "Point", "coordinates": [lng, lat]}
      let ubicacionServicio = null;
      let lng = null;
      let lat = null;

      // Intentar obtener coordenadas desde ubicacion_servicio
      if (formData.ubicacion_servicio) {
        console.log('CrearSolicitudScreen: ubicacion_servicio encontrada:', formData.ubicacion_servicio);
        if (formData.ubicacion_servicio.coordinates && Array.isArray(formData.ubicacion_servicio.coordinates)) {
          // Formato GeoJSON: {coordinates: [lng, lat], type: "Point"}
          lng = parseFloat(formData.ubicacion_servicio.coordinates[0]);
          lat = parseFloat(formData.ubicacion_servicio.coordinates[1]);
        } else if (formData.ubicacion_servicio.longitude !== undefined && formData.ubicacion_servicio.latitude !== undefined) {
          // Formato directo: {longitude: lng, latitude: lat}
          lng = parseFloat(formData.ubicacion_servicio.longitude);
          lat = parseFloat(formData.ubicacion_servicio.latitude);
        }
      }

      // Si no hay coordenadas en ubicacion_servicio, intentar desde direccion_usuario
      if ((!lng || !lat) && formData.direccion_usuario?.ubicacion) {
        console.log('CrearSolicitudScreen: Buscando coordenadas en direccion_usuario.ubicacion:', formData.direccion_usuario.ubicacion);
        if (formData.direccion_usuario.ubicacion.coordinates && Array.isArray(formData.direccion_usuario.ubicacion.coordinates)) {
          // Formato GeoJSON: {coordinates: [lng, lat], type: "Point"}
          lng = parseFloat(formData.direccion_usuario.ubicacion.coordinates[0]);
          lat = parseFloat(formData.direccion_usuario.ubicacion.coordinates[1]);
        } else if (formData.direccion_usuario.ubicacion.longitude !== undefined && formData.direccion_usuario.ubicacion.latitude !== undefined) {
          // Formato directo
          lng = parseFloat(formData.direccion_usuario.ubicacion.longitude);
          lat = parseFloat(formData.direccion_usuario.ubicacion.latitude);
        }
      }

      // Validar coordenadas
      if (!lng || !lat || isNaN(lng) || isNaN(lat)) {
        console.error('CrearSolicitudScreen: Coordenadas inválidas:', {
          ubicacion_servicio: formData.ubicacion_servicio,
          direccion_usuario_ubicacion: formData.direccion_usuario?.ubicacion,
          lng,
          lat
        });
        Alert.alert(
          'Error',
          'No se pudo determinar la ubicación del servicio. Por favor, selecciona una dirección válida con coordenadas.'
        );
        setCreando(false);
        return;
      }

      // Formatear en GeoJSON estándar para GeoFeatureModelSerializer
      // Nota: GeoJSON usa [longitude, latitude] en ese orden
      ubicacionServicio = {
        type: 'Point',
        coordinates: [lng, lat]
      };
      console.log('CrearSolicitudScreen: Ubicación en formato GeoJSON:', ubicacionServicio);

      // Función auxiliar para formatear fecha a YYYY-MM-DD
      const formatearFechaYYYYMMDD = (fecha) => {
        if (!fecha) return null;

        // Si ya está en formato YYYY-MM-DD, validar y retornar
        const regexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
        if (regexYYYYMMDD.test(fecha)) {
          // Validar sin efectos de zona horaria (no usar new Date('YYYY-MM-DD') en local)
          try {
            const [y, m, d] = String(fecha).split('-').map((v) => parseInt(v, 10));
            const utc = new Date(Date.UTC(y, m - 1, d));
            if (!isNaN(utc.getTime())) return fecha;
          } catch (e) {
            // noop
          }
          return null;
        }

        // Intentar convertir desde Date object o string
        try {
          const date = new Date(fecha);
          if (isNaN(date.getTime())) {
            console.error('❌ Error: fecha inválida para formatear:', fecha);
            return null;
          }
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('❌ Error al formatear fecha:', error, 'fecha original:', fecha);
          return null;
        }
      };

      // Preparar datos para el backend
      // Nota: fecha_expiracion se calcula automáticamente en el modelo, no es necesario enviarla
      const fechaFormateada = formatearFechaYYYYMMDD(formData.fecha_preferida);

      if (!fechaFormateada) {
        Alert.alert(
          'Error',
          'La fecha seleccionada no es válida. Por favor, selecciona una fecha nuevamente.',
          [{ text: 'OK' }]
        );
        setCreando(false);
        return;
      }

      console.log('✅ CrearSolicitudScreen: Fecha formateada correctamente:', {
        original: formData.fecha_preferida,
        formateada: fechaFormateada
      });

      // Sin vehículo solo cuando el formulario lo indica explícitamente (evita afectar flujos con vehículo)
      const sinVehiculo = formData.sin_vehiculo_registrado === true;

      const solicitudData = {
        cliente: clienteId, // ID del cliente
        descripcion_problema: formData.descripcion_problema,
        urgencia: formData.urgencia,
        requiere_repuestos: formData.requiere_repuestos !== undefined ? formData.requiere_repuestos : true,
        tipo_solicitud: formData.tipo_solicitud,
        direccion_usuario: formData.direccion_usuario?.id || null,
        direccion_servicio_texto: formData.direccion_servicio_texto || formData.direccion_usuario?.direccion || '',
        detalles_ubicacion: formData.detalles_ubicacion || '',
        fecha_preferida: fechaFormateada, // Asegurar formato YYYY-MM-DD
        hora_preferida: formData.hora_preferida || null,
        ubicacion_servicio: ubicacionServicio // Enviar en formato GeoJSON: {"type": "Point", "coordinates": [lng, lat]}
        // fecha_expiracion se calcula automáticamente en el modelo (48 horas desde ahora)
      };

      if (sinVehiculo) {
        solicitudData.sin_vehiculo_registrado = true;
        // No incluir vehiculo — el serializer lo deja en null
        if (isPreCompra && targetVehicleId) {
          const vid = Number(targetVehicleId);
          if (!Number.isNaN(vid)) {
            solicitudData.vehiculo_inspeccion_precompra = vid;
          }
        }
      } else {
        if (!formData.vehiculo || !formData.vehiculo.id) {
          Alert.alert('Error', 'Debes seleccionar un vehículo o usar el flujo de servicio sin vehículo registrado.');
          setCreando(false);
          return;
        }
        solicitudData.vehiculo = formData.vehiculo.id;
      }

      // Agregar servicios seleccionados (el campo correcto es servicios_solicitados)
      // IMPORTANTE: Los servicios deben estar seleccionados en el paso 2 del formulario
      // Los servicios vienen como objetos completos desde FormularioSolicitud, necesitamos extraer los IDs
      if (formData.servicios_seleccionados && Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0) {
        solicitudData.servicios_solicitados = formData.servicios_seleccionados
          .map(s => {
            // Asegurar que tenemos un ID válido
            // Los servicios pueden venir como objetos {id, nombre, ...} o como números directamente
            if (typeof s === 'object' && s !== null && s.id) {
              return s.id;
            } else if (typeof s === 'number') {
              return s;
            } else if (typeof s === 'string') {
              // Si es string, intentar convertir a número
              const numId = parseInt(s, 10);
              return isNaN(numId) ? null : numId;
            }
            return null;
          })
          .filter(id => id != null && typeof id === 'number'); // Solo IDs numéricos válidos

        console.log('CrearSolicitudScreen: Servicios agregados a solicitudData:', {
          cantidad: solicitudData.servicios_solicitados.length,
          ids: solicitudData.servicios_solicitados,
          serviciosOriginales: formData.servicios_seleccionados
        });
      } else {
        console.warn('CrearSolicitudScreen: ⚠️ No hay servicios seleccionados en formData', {
          servicios_seleccionados: formData.servicios_seleccionados,
          tipo: typeof formData.servicios_seleccionados,
          esArray: Array.isArray(formData.servicios_seleccionados),
          longitud: formData.servicios_seleccionados?.length
        });
      }

      // Si es solicitud dirigida, agregar proveedores
      // El backend espera IDs de Usuario (array de números), no objetos
      if (formData.tipo_solicitud === 'dirigida' && formData.proveedores_dirigidos.length > 0) {
        // Extraer los IDs de usuario de los proveedores
        solicitudData.proveedores_dirigidos = formData.proveedores_dirigidos
          .map(p => {
            // Prioridad: usuario_id > usuario.id > usuario > id
            return p.usuario_id || p.usuario?.id || (typeof p.usuario === 'number' ? p.usuario : null) || p.id;
          })
          .filter(id => id != null && typeof id === 'number'); // Solo IDs numéricos válidos

        console.log('CrearSolicitudScreen: IDs de usuarios de proveedores:', solicitudData.proveedores_dirigidos);
      }

      if (Array.isArray(formData.fotos_necesidad) && formData.fotos_necesidad.length > 0) {
        solicitudData.fotos_necesidad_data = formData.fotos_necesidad
          .slice(0, 3)
          .map((f) => {
            if (f && typeof f.base64 === 'string' && f.base64.length > 0) {
              const mime = f.mimeType && typeof f.mimeType === 'string' ? f.mimeType : 'image/jpeg';
              return `data:${mime};base64,${f.base64}`;
            }
            if (typeof f === 'string') return f;
            return null;
          })
          .filter(Boolean);
      }

      console.log('CrearSolicitudScreen: Datos preparados:', solicitudData);

      if (
        !solicitudData.servicios_solicitados ||
        !Array.isArray(solicitudData.servicios_solicitados) ||
        solicitudData.servicios_solicitados.length === 0
      ) {
        showAlert(
          'Servicios requeridos',
          'Debes seleccionar al menos un servicio antes de crear la solicitud.',
        );
        setCreando(false);
        return;
      }

      // VERIFICACIÓN CRÍTICA: ¿Hay servicios seleccionados en el paso 2?
      // Esta verificación debe hacerse ANTES de crear la solicitud para evitar navegar a SELECCIONAR_SERVICIOS
      // Verificar explícitamente si hay servicios en formData O en solicitudData
      const hayServiciosEnFormData = formData.servicios_seleccionados && Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0;
      const hayServiciosEnSolicitudData = solicitudData.servicios_solicitados && Array.isArray(solicitudData.servicios_solicitados) && solicitudData.servicios_solicitados.length > 0;
      const serviciosYaSeleccionados = hayServiciosEnFormData || hayServiciosEnSolicitudData;

      console.log('CrearSolicitudScreen: Verificación de servicios (ANTES de crear):', {
        serviciosYaSeleccionados,
        hayServiciosEnFormData,
        hayServiciosEnSolicitudData,
        serviciosEnFormData: formData.servicios_seleccionados,
        serviciosEnFormDataLength: formData.servicios_seleccionados?.length || 0,
        serviciosEnSolicitudData: solicitudData.servicios_solicitados,
        serviciosEnSolicitudDataLength: solicitudData.servicios_solicitados?.length || 0,
        tipoFormData: typeof formData.servicios_seleccionados,
        tipoSolicitudData: typeof solicitudData.servicios_solicitados,
        esArrayFormData: Array.isArray(formData.servicios_seleccionados),
        esArraySolicitudData: Array.isArray(solicitudData.servicios_solicitados)
      });

      const catalogoOfertaId =
        ofertaServicioId
        ?? formData.servicios_seleccionados?.[0]?.oferta_servicio_id
        ?? formData.servicios_seleccionados?.[0]?.oferta_id;

      if (flujoCatalogoProveedor && catalogoOfertaId) {
        try {
          const payload = buildConfirmarCandidatoPayload(formData, catalogoOfertaId, {});
          const resultado = await confirmarCatalogoProveedor(payload);
          const solicitudId = resultado?.solicitud_id || resultado?.solicitud?.id;

          if (user?.id && solicitudId) {
            const paraLista = normalizarSolicitudPublica(resultado?.solicitud) || {
              id: solicitudId,
              estado: resultado?.estado || 'pendiente_confirmacion',
            };
            await syncSolicitudesListAfterChange(queryClient, user.id, paraLista);
          }

          finishCrearSolicitudSuccess(navigation, {
            solicitudId,
            title: 'Solicitud enviada',
            message:
              'El proveedor recibió tu solicitud con el precio de su catálogo y debe confirmar la asignación.',
          });
        } catch (error) {
          const mensaje =
            error.response?.data?.error
            || error.message
            || 'No se pudo confirmar el servicio con el proveedor.';
          Alert.alert('Error', mensaje);
        } finally {
          setCreando(false);
        }
        return;
      }

      // Crear la solicitud (flujo estándar sin catálogo fijo)
      const solicitudCreada = await solicitudesService.crearSolicitud(solicitudData);
      console.log('CrearSolicitudScreen: Solicitud creada exitosamente:', solicitudCreada);

      // Extraer el ID de la solicitud (puede estar en diferentes formatos según la respuesta)
      // El backend devuelve formato GeoJSON Feature con estructura:
      // { id: "...", type: "Feature", geometry: {...}, properties: {...} }
      let solicitudId = null;
      let serviciosEnSolicitud = [];

      console.log('CrearSolicitudScreen: Estructura de solicitudCreada:', {
        tieneId: !!solicitudCreada?.id,
        tieneProperties: !!solicitudCreada?.properties,
        id: solicitudCreada?.id,
        propertiesKeys: solicitudCreada?.properties ? Object.keys(solicitudCreada.properties) : [],
        type: solicitudCreada?.type
      });

      if (solicitudCreada) {
        // El ID está en el nivel raíz del objeto GeoJSON Feature
        if (solicitudCreada.id) {
          solicitudId = solicitudCreada.id;
        } else if (solicitudCreada.properties && solicitudCreada.properties.id) {
          // Fallback: buscar en properties si no está en el nivel raíz
          solicitudId = solicitudCreada.properties.id;
        }

        // Los servicios están en properties.servicios_solicitados
        if (solicitudCreada.properties && solicitudCreada.properties.servicios_solicitados) {
          serviciosEnSolicitud = Array.isArray(solicitudCreada.properties.servicios_solicitados)
            ? solicitudCreada.properties.servicios_solicitados
            : [];
        } else if (solicitudCreada.servicios_solicitados) {
          // Fallback: buscar en el nivel raíz
          serviciosEnSolicitud = Array.isArray(solicitudCreada.servicios_solicitados)
            ? solicitudCreada.servicios_solicitados
            : [];
        }
      } else if (typeof solicitudCreada === 'string') {
        // Solo ID (caso poco probable pero manejado)
        solicitudId = solicitudCreada;
      }

      console.log('CrearSolicitudScreen: ID y servicios extraídos:', {
        solicitudId,
        serviciosEnSolicitud,
        cantidadServicios: serviciosEnSolicitud.length
      });

      if (!solicitudId) {
        console.error('CrearSolicitudScreen: No se pudo obtener el ID de la solicitud creada');
        Alert.alert('Error', 'No se pudo obtener el ID de la solicitud creada');
        setCreando(false);
        return;
      }

      console.log('CrearSolicitudScreen: Servicios en solicitud creada:', serviciosEnSolicitud);

      // NO llamar a crearSolicitud del contexto aquí porque:
      // 1. La solicitud ya fue creada exitosamente arriba
      // 2. crearSolicitud del contexto intentaría crear otra solicitud con los datos normalizados
      // 3. Los datos normalizados no tienen ubicacion_servicio en el formato correcto
      // El contexto se actualizará automáticamente cuando se carguen las solicitudes desde el servidor

      // DECISIÓN CRÍTICA: ¿Navegar a SELECCIONAR_SERVICIOS o publicar directamente?
      // Si el usuario completó el paso 6 (fecha/hora), significa que ya pasó por todos los pasos necesarios
      // incluyendo la selección de servicios (ya sea en paso 2 del flujo normal, o preseleccionados).
      // Por lo tanto, SIEMPRE debemos publicar directamente y NO navegar a SELECCIONAR_SERVICIOS.
      // Verificar también en la respuesta del backend (serviciosEnSolicitud) como confirmación
      const hayServiciosEnRespuestaBackend = serviciosEnSolicitud && Array.isArray(serviciosEnSolicitud) && serviciosEnSolicitud.length > 0;

      // DECISIÓN FINAL: Si llegamos hasta aquí (el usuario completó el paso 6), SIEMPRE publicar directamente.
      // El paso 6 es el último paso, así que si llegamos aquí significa que todo está completo.
      // Verificamos las fuentes de servicios como validación adicional para logs, pero no como condición de navegación.
      const debePublicarDirectamente = true; // Siempre true cuando se completa el paso 6

      console.log('CrearSolicitudScreen: Decisión de navegación (DESPUÉS de crear):', {
        serviciosYaSeleccionados, // Verificación ANTES de crear (debe ser true si hay servicios en paso 2)
        hayServiciosEnFormData, // Servicios en formData (ANTES de crear)
        hayServiciosEnSolicitudData, // Servicios en solicitudData (ANTES de crear)
        hayServiciosEnRespuestaBackend, // Verificación DESPUÉS de crear (servicios en respuesta del backend)
        debePublicarDirectamente, // Decisión final
        serviciosEnFormData: formData.servicios_seleccionados,
        serviciosEnSolicitudData: solicitudData.servicios_solicitados,
        serviciosEnRespuesta: serviciosEnSolicitud
      });

      // Si hay servicios seleccionados, significa que fueron seleccionados en el paso 2
      // Por lo tanto, NO navegar a SELECCIONAR_SERVICIOS, sino publicar directamente
      if (debePublicarDirectamente) {
        console.log('CrearSolicitudScreen: ✅ Servicios ya seleccionados en paso 2 - Publicando solicitud automáticamente');
        try {
          // Publicar la solicitud automáticamente si tiene servicios seleccionados
          const publicada = await solicitudesService.publicarSolicitud(solicitudId);
          console.log('CrearSolicitudScreen: ✅ Solicitud publicada automáticamente');

          if (user?.id) {
            const paraLista = normalizarSolicitudPublica(publicada) || {
              id: solicitudId,
              estado: 'publicada',
            };
            await syncSolicitudesListAfterChange(queryClient, user.id, paraLista);
          }

          finishCrearSolicitudSuccess(navigation, {
            solicitudId,
            title: 'Solicitud creada',
            message:
              'Tu solicitud fue publicada con éxito. Los proveedores podrán verla y hacer ofertas.',
          });
        } catch (error) {
          console.error('CrearSolicitudScreen: ❌ Error publicando solicitud:', error);
          finishCrearSolicitudSuccess(navigation, {
            solicitudId,
            title: 'Solicitud creada',
            message:
              'Tu solicitud fue creada, pero hubo un problema al publicarla. Puedes publicarla manualmente desde el detalle.',
          });
        }
      } else {
        // ESTE BLOQUE NUNCA DEBERÍA EJECUTARSE porque cuando se completa el paso 6,
        // siempre debemos publicar directamente (debePublicarDirectamente = true).
        // Sin embargo, lo dejamos como fallback de seguridad por si acaso.
        console.error('CrearSolicitudScreen: ❌ ERROR - No deberíamos llegar aquí después del paso 6');
        console.error('CrearSolicitudScreen: ❌ Esto indica un problema en la lógica de flujo');
        console.error('CrearSolicitudScreen: ❌ Debug - serviciosYaSeleccionados:', serviciosYaSeleccionados);
        console.error('CrearSolicitudScreen: ❌ Debug - hayServiciosEnFormData:', hayServiciosEnFormData);
        console.error('CrearSolicitudScreen: ❌ Debug - hayServiciosEnSolicitudData:', hayServiciosEnSolicitudData);
        console.error('CrearSolicitudScreen: ❌ Debug - hayServiciosEnRespuestaBackend:', hayServiciosEnRespuestaBackend);
        console.error('CrearSolicitudScreen: ❌ Debug - solicitudData.servicios_solicitados:', solicitudData.servicios_solicitados);

        // Aún así, intentar publicar directamente en lugar de navegar a SELECCIONAR_SERVICIOS
        // porque si llegamos al paso 6, significa que el usuario completó todos los pasos necesarios
        try {
          const publicadaFb = await solicitudesService.publicarSolicitud(solicitudId);
          console.log('CrearSolicitudScreen: ✅ Solicitud publicada automáticamente (fallback)');
          if (user?.id) {
            const paraLista = normalizarSolicitudPublica(publicadaFb) || {
              id: solicitudId,
              estado: 'publicada',
            };
            await syncSolicitudesListAfterChange(queryClient, user.id, paraLista);
          }
          finishCrearSolicitudSuccess(navigation, {
            solicitudId,
            title: 'Solicitud creada',
            message:
              'Tu solicitud fue publicada con éxito. Los proveedores podrán verla y hacer ofertas.',
          });
        } catch (error) {
          console.error('CrearSolicitudScreen: ❌ Error publicando solicitud (fallback):', error);
          finishCrearSolicitudSuccess(navigation, {
            solicitudId,
            title: 'Solicitud creada',
            message:
              'Tu solicitud fue creada, pero hubo un problema al publicarla. Puedes publicarla manualmente desde el detalle.',
          });
        }
      }
    } catch (error) {
      console.error('Error creando solicitud:', error);
      const mensajeError = formatApiErrorMessage(
        error,
        'No se pudo crear la solicitud. Inténtalo de nuevo.',
      );
      showAlert('Error', mensajeError);
    } finally {
      setCreando(false);
    }
  };

  // GlassShell está definido FUERA del componente — ver abajo de CrearSolicitudScreen.
  // Si se define aquí dentro, React crea un tipo de componente nuevo en cada render,
  // desmontando y remontando todo el árbol (FormularioSolicitud pierde estado, scroll, selecciones).
  const glassShellProps = {
    insetsTop: insets.top,
    onBack: () => navigation.goBack(),
  };

  if (
    loading ||
    (isPreCompra && !initialDataReady) ||
    (needsPreloadServicios && !initialDataReady)
  ) {
    return (
    <GlassShell {...glassShellProps}>
        <CrearSolicitudScreenSkeleton contentPaddingBottom={insets.bottom} />
      </GlassShell>
    );
  }

  // Solo tras al menos una respuesta de la query: evita mostrar “sin vehículos”/cambiar de árbol antes de tiempo
  if (!isPreCompra && vehiclesQueryFetched && vehiculos.length === 0) {
    return (
    <GlassShell {...glassShellProps}>
        <View style={styles.centeredState}>
          <View style={styles.emptyIconWrap}>
            <Car size={40} color={COLORS.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
          <Text style={styles.stateText}>Necesitas al menos un vehículo para crear una solicitud</Text>
          <TouchableOpacity style={styles.addVehicleBtn} onPress={() => navigation.navigate(ROUTES.MIS_VEHICULOS)} activeOpacity={0.8}>
            <Plus size={18} color={COLORS.text.onPrimary} />
            <Text style={styles.addVehicleBtnText}>Agregar vehículo</Text>
          </TouchableOpacity>
        </View>
      </GlassShell>
    );
  }

  const totalBottomPadding = insets.bottom;

  return (
    <GlassShell {...glassShellProps}>
      {creando && (
        <View style={styles.creatingOverlay}>
          <View style={styles.creatingCard}>
            <ActivityIndicator size="large" color={COLORS.primary[500]} />
            <Text style={styles.creatingText}>Creando solicitud...</Text>
          </View>
        </View>
      )}

      <FormularioSolicitud
        key={`${submitCount}-${focusEffectRouteKey}`}
        onSubmit={handleSubmit}
        initialData={initialData || {}}
        vehiculos={vehiculos}
        direcciones={direcciones}
        contentPaddingBottom={totalBottomPadding}
        onExit={() => navigation.goBack()}
        bloquearCambioVehiculo={!!(vehicle && (fromDashboard || agendamientoInteligente))}
        isPreCompra={!!isPreCompra}
        pasoResumeCalendario={pasoResumeCalendario}
        onPasoResumeConsumido={() => setPasoResumeCalendario(null)}
      />
    </GlassShell>
  );
};

/**
 * Shell de pantalla (canvas claro + header). Definido FUERA del componente para
 * mantener identidad de tipo entre renders (FormularioSolicitud no se remonta).
 */
const GlassShell = ({ children, insetsTop, onBack }) => (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" />
    <View style={[styles.header, { paddingTop: (insetsTop || 0) + 8 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <ArrowLeft size={22} color={COLORS.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Sparkles size={16} color={COLORS.primary[500]} />
        <Text style={styles.headerTitle}>Nueva Solicitud</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
    <View style={styles.shellBody}>{children}</View>
  </View>
);

// Función para crear estilos dinámicos basados en el tema
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  shellBody: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.3,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stateText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.neutral.gray[100],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.success.light,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.success[200],
  },
  addVehicleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success[700],
  },
  creatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  creatingCard: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: BORDERS.radius.modal.lg,
    alignItems: 'center',
    gap: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    ...SHADOWS.modal,
  },
  creatingText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CrearSolicitudScreen;

