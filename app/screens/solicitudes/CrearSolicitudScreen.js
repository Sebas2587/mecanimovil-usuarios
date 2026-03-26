import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Car, Plus, Sparkles } from 'lucide-react-native';
import { ROUTES } from '../../utils/constants';
import FormularioSolicitud from '../../components/solicitudes/FormularioSolicitud';
import { useSolicitudes } from '../../context/SolicitudesContext';
import * as vehicleService from '../../services/vehicle';
import * as locationService from '../../services/location';
import * as userService from '../../services/user';
import * as serviceService from '../../services/service';
import solicitudesService from '../../services/solicitudesService';

/**
 * Pantalla para crear una nueva solicitud de servicio
 * Puede recibir un servicio preseleccionado desde la navegación
 */
const CrearSolicitudScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { crearSolicitud } = useSolicitudes();
  const queryClient = useQueryClient();

  // Incremented after successful submit to force FormularioSolicitud re-mount
  const [submitCount, setSubmitCount] = useState(0);

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
    fromDashboard // Flag para flujo desde dashboard predictivo
  } = route.params || {};

  /** Servicios que pueden contratarse sin vehículo en la plataforma (ej. revisión precompra) */
  const esServicioSinVehiculo = (servicio) => {
    if (!servicio || !servicio.nombre) return false;
    const n = String(servicio.nombre).toLowerCase();
    return n.includes('precompra') || n.includes('pre-compra') || n.includes('pre compra');
  };

  // Estado inicial síncrono si ya viene servicio como objeto (modal salud) → Formulario ve paso 1→3 al instante
  const buildInitialFromParams = () => {
    if (servicioPreseleccionado && servicioPreseleccionado.id) {
      const s = servicioPreseleccionado;
      return {
        servicios_seleccionados: [
          {
            id: s.id,
            nombre: s.nombre || 'Servicio',
            descripcion: s.descripcion || '',
            precio_referencia: s.precio_referencia,
            categoria_id: s.categoria_id ?? s.categoria,
            tipo_servicio: s.tipo_servicio,
          },
        ],
        tipo_solicitud: 'global',
        proveedores_dirigidos: [],
        vehiculo: vehicle || null,
        descripcion_problema: descripcionPrellenada || '',
        urgencia: 'normal',
        direccion_usuario: null,
        direccion_servicio_texto: '',
        detalles_ubicacion: '',
        fecha_preferida: '',
        hora_preferida: '',
        ubicacion_servicio: null,
        // Inspección precompra u otros servicios sin vehículo registrado
        sin_vehiculo_registrado: esServicioSinVehiculo(s),
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
  const [clienteId, setClienteId] = useState(null);

  // TanStack Query for Vehicles - Auto refresh when focused or cache updates
  const {
    data: allVehicles = [],
    isLoading: isLoadingVehicles,
    refetch: refetchVehicles
  } = useQuery({
    queryKey: ['userVehicles'], // Shared key with UserPanelScreen
    queryFn: vehicleService.getUserVehicles,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Auto-refresh when coming back to app
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

  useEffect(() => {
    // Sync client ID if not set
    if (!clienteId && vehiculos.length > 0 && vehiculos[0].cliente_detail?.id) {
      console.log('✅ CrearSolicitudScreen: Sincronizando Cliente ID desde vehículos:', vehiculos[0].cliente_detail.id);
      setClienteId(vehiculos[0].cliente_detail.id);
    }
  }, [vehiculos, clienteId]);

  // UseFocusEffect to refetch when screen is focused (e.g. after adding vehicle)
  // Verificar si puede crear solicitud y cargar parámetros cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      // Force vehicle & services refresh (clears any corrupted cache from server outages)
      refetchVehicles();
      queryClient.invalidateQueries({ queryKey: ['vehicleServices'] });

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
                      navigation.navigate(ROUTES.MIS_SOLICITUDES);
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
                      navigation.navigate(ROUTES.MIS_SOLICITUDES);
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

          // 2. Verificar parámetros preseleccionados
          const params = route.params || {};
          const tieneServicio = !!params.servicioPreseleccionado;
          const tieneServiciosArray = !!(params.serviciosPreSeleccionados && Array.isArray(params.serviciosPreSeleccionados) && params.serviciosPreSeleccionados.length > 0);
          const tieneProveedor = !!params.proveedorPreseleccionado;
          const tieneVehicle = !!params.vehicle;

          // Si NO hay parámetros preseleccionados, limpiar initialData
          if (!tieneServicio && !tieneServiciosArray && !tieneProveedor && !tieneVehicle) {
            console.log('🔍 useFocusEffect: No hay parámetros preseleccionados - limpiando initialData');
            setInitialData({});
          }
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
          console.log('✅ CrearSolicitudScreen: Datos preseleccionados recibidos:', {
            tieneServicioObjeto,
            tieneServiciosArray,
            tieneProveedor,
            tieneVehicleParam
          });

          try {
            let proveedorFormato = null;
            let serviciosParaInitialData = [];

            // Si hay servicio como objeto (desde categorías o proveedor)
            if (tieneServicioObjeto) {
              serviciosParaInitialData = [servicioPreseleccionado];
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

              // Preparar proveedor en formato esperado por FormularioSolicitud
              proveedorFormato = {
                ...proveedorPreseleccionado,
                tipo: tipoProveedorPreseleccionado, // 'taller' o 'mecanico'
                usuario_id: usuarioId // Necesario para el backend
              };

              console.log('✅ Proveedor formateado:', proveedorFormato);
            }

            setInitialData({
              servicios_seleccionados: serviciosParaInitialData,
              tipo_solicitud: proveedorFormato ? 'dirigida' : 'global',
              proveedores_dirigidos: proveedorFormato ? [proveedorFormato] : [],
              fromProviderDetail: fromProviderDetail || false,
              fromDashboard: fromDashboard || false,
              vehiculo: tieneVehicleParam ? vehicle : null,
              descripcion_problema: descripcionPrellenada || '',
              urgencia: 'normal',
              direccion_usuario: null,
              direccion_servicio_texto: '',
              detalles_ubicacion: '',
              fecha_preferida: '',
              hora_preferida: '',
              ubicacion_servicio: null
            });

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
        } else {
          // Limpiar si no hay parámetros (ya manejado en verificarYCargarDatos pero se refuerza aquí)
          console.log('🧹 CrearSolicitudScreen: No hay parámetros preseleccionados - limpiando initialData');
          setInitialData({});
          setInitialDataReady(true);
        }
      };

      prepararDatosIniciales();

    }, [
      navigation,
      route.params,
      refetchVehicles,
      queryClient,
      servicioPreseleccionado,
      serviciosPreSeleccionados,
      proveedorPreseleccionado,
      tipoProveedorPreseleccionado,
      fromProviderDetail,
      vehicle,
      descripcionPrellenada
    ])
  );

  const cargarDatos = async () => {
    // Only load non-vehicle data (addresses, client details)
    // Vehicles are now handled by useQuery
    // But we still set generic loading state for initial render

    // If vehicles are already loaded from cache, we don't need to block UI
    if (isLoadingVehicles && vehicles.length === 0) {
      setLoading(true);
    }

    try {
      const [direccionesData, clienteData] = await Promise.all([
        locationService.getUserAddresses(),
        userService.getClienteDetails().catch(() => null)
      ]);

      setDirecciones(Array.isArray(direccionesData) ? direccionesData : []);

      // Obtener ID del cliente
      let clienteIdValue = null;
      if (clienteData && clienteData.id) {
        clienteIdValue = clienteData.id;
      }

      if (clienteIdValue) {
        setClienteId(clienteIdValue);
        console.log('CrearSolicitudScreen: Cliente ID cargado:', clienteIdValue);
      }

    } catch (error) {
      console.error('Error cargando direcciones/cliente:', error);
      // Non-blocking error for addresses
    } finally {
      if (!isLoadingVehicles) {
        setLoading(false);
      }
    }
  };

  // Sync loading state with query
  useEffect(() => {
    if (!isLoadingVehicles) {
      setLoading(false);
    }
  }, [isLoadingVehicles]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSubmit = async (formData) => {
    if (creando) return;

    setCreando(true);
    try {
      console.log('CrearSolicitudScreen: Enviando datos del formulario:', formData);

      // Validar que tenemos el ID del cliente
      if (!clienteId) {
        Alert.alert(
          'Error',
          'No se pudo obtener la información del cliente. Por favor, inicia sesión nuevamente.'
        );
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
          // Validar que sea una fecha válida
          const date = new Date(fecha);
          if (!isNaN(date.getTime())) {
            return fecha;
          }
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

      console.log('CrearSolicitudScreen: Datos preparados:', solicitudData);

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

      // Crear la solicitud
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
          await solicitudesService.publicarSolicitud(solicitudId);
          console.log('CrearSolicitudScreen: ✅ Solicitud publicada automáticamente');

          setSubmitCount(prev => prev + 1);

          Alert.alert(
            'Éxito',
            'Solicitud creada y publicada con éxito. Los proveedores podrán ver tu solicitud y hacer ofertas.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate(ROUTES.HOME)
              }
            ]
          );
        } catch (error) {
          console.error('CrearSolicitudScreen: ❌ Error publicando solicitud:', error);
          // Si hay error al publicar, navegar al detalle para que el usuario pueda publicarla manualmente
          Alert.alert(
            'Solicitud creada',
            'Tu solicitud ha sido creada. Sin embargo, hubo un error al publicarla. Puedes publicarla manualmente desde el detalle.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate(ROUTES.DETALLE_SOLICITUD, {
                    solicitudId: solicitudId
                  });
                }
              }
            ]
          );
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
          await solicitudesService.publicarSolicitud(solicitudId);
          console.log('CrearSolicitudScreen: ✅ Solicitud publicada automáticamente (fallback)');
          Alert.alert(
            'Éxito',
            'Solicitud creada y publicada con éxito. Los proveedores podrán ver tu solicitud y hacer ofertas.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate(ROUTES.HOME)
              }
            ]
          );
        } catch (error) {
          console.error('CrearSolicitudScreen: ❌ Error publicando solicitud (fallback):', error);
          Alert.alert(
            'Solicitud creada',
            'Tu solicitud ha sido creada. Sin embargo, hubo un error al publicarla. Puedes publicarla manualmente desde el detalle.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate(ROUTES.DETALLE_SOLICITUD, {
                    solicitudId: solicitudId
                  });
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error creando solicitud:', error);
      const mensajeError = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || 'No se pudo crear la solicitud. Inténtalo de nuevo.';

      Alert.alert('Error', mensajeError);
    } finally {
      setCreando(false);
    }
  };

  const GlassShell = ({ children }) => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.08)' }} />
        <View style={{ position: 'absolute', top: 300, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(6,182,212,0.05)' }} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Sparkles size={16} color="#6EE7B7" />
          <Text style={styles.headerTitle}>Nueva Solicitud</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {children}
    </View>
  );

  if (loading || (needsPreloadServicios && !initialDataReady)) {
    return (
      <GlassShell>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#6EE7B7" />
          <Text style={styles.stateText}>
            {needsPreloadServicios && !initialDataReady ? 'Preparando servicio...' : 'Cargando datos...'}
          </Text>
        </View>
      </GlassShell>
    );
  }

  if (vehiculos.length === 0) {
    return (
      <GlassShell>
        <View style={styles.centeredState}>
          <View style={styles.emptyIconWrap}>
            <Car size={40} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
          <Text style={styles.stateText}>Necesitas al menos un vehículo para crear una solicitud</Text>
          <TouchableOpacity style={styles.addVehicleBtn} onPress={() => navigation.navigate(ROUTES.MIS_VEHICULOS)} activeOpacity={0.8}>
            <Plus size={18} color="#FFF" />
            <Text style={styles.addVehicleBtnText}>Agregar vehículo</Text>
          </TouchableOpacity>
        </View>
      </GlassShell>
    );
  }

  const totalBottomPadding = insets.bottom;

  return (
    <GlassShell>
      {creando && (
        <View style={styles.creatingOverlay}>
          <ActivityIndicator size="large" color="#6EE7B7" />
          <Text style={styles.creatingText}>Creando solicitud...</Text>
        </View>
      )}

      <FormularioSolicitud
        key={`${submitCount}-${route.params?.vehicle?.id || ''}-${servicioPreseleccionado?.id || ''}-${serviciosPreSeleccionados?.join(',') || ''}`}
        onSubmit={handleSubmit}
        initialData={initialData || {}}
        vehiculos={vehiculos}
        direcciones={direcciones}
        contentPaddingBottom={totalBottomPadding}
        onExit={() => navigation.goBack()}
      />
    </GlassShell>
  );
};

// Función para crear estilos dinámicos basados en el tema
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#FFFFFF',
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
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  addVehicleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6EE7B7',
  },
  creatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,7,18,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  creatingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CrearSolicitudScreen;

