import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
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
    descripcionPrellenada // Descripción pre-rellenada (desde alertas)
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [direcciones, setDirecciones] = useState([]);
  const [creando, setCreando] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    cargarDatos();
  }, []);

  // Verificar si puede crear solicitud y cargar parámetros cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
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
    }, [route.params, navigation])
  );

  // Preparar datos iniciales si hay servicio o proveedor preseleccionado
  // IMPORTANTE: Este efecto se ejecuta cada vez que cambian los parámetros de la ruta
  useEffect(() => {
    const tieneServicioObjeto = !!servicioPreseleccionado;
    const tieneServiciosArray = !!(serviciosPreSeleccionados && Array.isArray(serviciosPreSeleccionados) && serviciosPreSeleccionados.length > 0);
    const tieneProveedor = !!proveedorPreseleccionado;
    const tieneVehicle = !!vehicle;

    if (tieneServicioObjeto || tieneServiciosArray || tieneProveedor || tieneVehicle) {
      console.log('✅ CrearSolicitudScreen: Datos preseleccionados recibidos:', {
        tieneServicioObjeto,
        tieneServiciosArray,
        tieneProveedor,
        tieneVehicle,
        tipoProveedor: tipoProveedorPreseleccionado,
        fromProviderDetail: fromProviderDetail
      });

      const prepararInitialData = async () => {
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
              // Cargar detalles de cada servicio por su ID
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
            // Si hay proveedor preseleccionado, configurar tipo_solicitud como 'dirigida'
            tipo_solicitud: proveedorFormato ? 'dirigida' : 'global',
            proveedores_dirigidos: proveedorFormato ? [proveedorFormato] : [],
            fromProviderDetail: fromProviderDetail || false, // Flag para FormularioSolicitud
            // Si hay vehículo preseleccionado (desde alertas), usarlo
            vehiculo: tieneVehicle ? vehicle : null,
            descripcion_problema: descripcionPrellenada || '',
            urgencia: 'normal',
            direccion_usuario: null,
            direccion_servicio_texto: '',
            detalles_ubicacion: '',
            fecha_preferida: '',
            hora_preferida: '',
            ubicacion_servicio: null
          });

          console.log('✅ InitialData preparado:', {
            tieneServicio: serviciosParaInitialData.length > 0,
            tieneProveedor: proveedorFormato ? true : false,
            tieneVehicle: tieneVehicle,
            tipo_solicitud: proveedorFormato ? 'dirigida' : 'global',
            servicios_seleccionados_count: serviciosParaInitialData.length
          });
        } catch (error) {
          console.error('❌ Error preparando datos iniciales:', error);
          // Si hay error, simplemente no prellenar datos
          setInitialData({});
        }
      };

      prepararInitialData();
    } else {
      // CRÍTICO: Si NO hay parámetros preseleccionados, limpiar initialData
      // Esto asegura que cuando el usuario navega normalmente (sin parámetros),
      // el formulario se reinicia correctamente
      console.log('🧹 CrearSolicitudScreen: No hay parámetros preseleccionados - limpiando initialData');
      setInitialData({});
    }
  }, [servicioPreseleccionado, serviciosPreSeleccionados, proveedorPreseleccionado, tipoProveedorPreseleccionado, fromProviderDetail, vehicle, descripcionPrellenada]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [vehiculosData, direccionesData, clienteData] = await Promise.all([
        vehicleService.getUserVehicles(),
        locationService.getUserAddresses(),
        userService.getClienteDetails().catch(() => null) // Si falla, intentar obtener desde vehículo
      ]);

      // Manejar diferentes formatos de respuesta
      let vehiculosArray = [];
      if (Array.isArray(vehiculosData)) {
        vehiculosArray = vehiculosData;
      } else if (vehiculosData && Array.isArray(vehiculosData.results)) {
        vehiculosArray = vehiculosData.results;
      } else if (vehiculosData && Array.isArray(vehiculosData.data)) {
        vehiculosArray = vehiculosData.data;
      }

      console.log('CrearSolicitudScreen: Vehículos cargados:', vehiculosArray.length);

      setVehiculos(vehiculosArray);
      setDirecciones(Array.isArray(direccionesData) ? direccionesData : []);

      // Obtener ID del cliente
      let clienteIdValue = null;
      if (clienteData && clienteData.id) {
        clienteIdValue = clienteData.id;
      } else if (vehiculosArray.length > 0 && vehiculosArray[0].cliente_detail?.id) {
        // Fallback: obtener desde el primer vehículo
        clienteIdValue = vehiculosArray[0].cliente_detail.id;
      }
      setClienteId(clienteIdValue);
      console.log('CrearSolicitudScreen: Cliente ID:', clienteIdValue);

      if (vehiculosArray.length === 0) {
        Alert.alert(
          'Sin vehículos',
          'Necesitas tener al menos un vehículo registrado para crear una solicitud.',
          [
            {
              text: 'Registrar vehículo',
              onPress: () => navigation.navigate(ROUTES.MIS_VEHICULOS || 'MisVehiculos')
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }

      if (!clienteIdValue) {
        console.warn('CrearSolicitudScreen: No se pudo obtener el ID del cliente');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos necesarios. Inténtalo de nuevo.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

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

      const solicitudData = {
        cliente: clienteId, // ID del cliente
        vehiculo: formData.vehiculo.id,
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

          // Navegar directamente a mis solicitudes
          // Como ambas pantallas están en el TabNavigator, usar navigate directamente
          // El TabNavigator manejará la navegación correctamente
          // Navigate to home which will show the active request
          navigation.navigate(ROUTES.HOME);
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
          navigation.navigate(ROUTES.HOME);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (vehiculos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
          <Ionicons name="car-outline" size={64} color={colors.text?.secondary || '#5D6F75'} />
          <Text style={styles.emptyTitle}>Sin vehículos registrados</Text>
          <Text style={styles.emptyText}>
            Necesitas tener al menos un vehículo para crear una solicitud
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Como el tab bar está oculto en esta pantalla, solo usar el safe area bottom
  const totalBottomPadding = insets.bottom + (spacing.md || 16);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + (spacing.sm || 8) }]}>
        <View style={styles.headerContent}>
          {/* Botón de retroceso eliminado del paso 1 del onboarding */}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nueva Solicitud</Text>
          </View>
        </View>
      </View>

      {creando && (
        <View style={styles.creatingOverlay}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
          <Text style={styles.creatingText}>Creando solicitud...</Text>
        </View>
      )}

      <FormularioSolicitud
        onSubmit={handleSubmit}
        initialData={initialData || {}}
        vehiculos={vehiculos}
        direcciones={direcciones}
        contentPaddingBottom={totalBottomPadding}
        onExit={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

// Función para crear estilos dinámicos basados en el tema
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA'
  },
  header: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderBottomWidth: borders.width?.thin || 1,
    borderBottomColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    paddingBottom: spacing.md || 16,
    // paddingTop se calcula dinámicamente con insets en el componente
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md || 16
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    letterSpacing: typography.letterSpacing?.normal || 0,
  },
  cancelButton: {
    padding: spacing.xs || 4,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borders.radius?.avatar?.sm || 20,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA'
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
    backgroundColor: colors.background?.default || '#F8F9FA'
  },
  emptyTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginTop: spacing.md || 16,
    marginBottom: spacing.sm || 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    textAlign: 'center',
    lineHeight: typography.fontSize?.md ? typography.fontSize.md * 1.5 : 24,
    paddingHorizontal: spacing.md || 16,
  },
  creatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  creatingText: {
    marginTop: spacing.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.background?.paper || '#FFFFFF',
    fontWeight: typography.fontWeight?.semibold || '600',
  }
});

export default CrearSolicitudScreen;

