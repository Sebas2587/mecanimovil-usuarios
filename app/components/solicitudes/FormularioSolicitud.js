import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InteractionManager, Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { ROUTES } from '../../utils/constants';
import VehicleSelector from '../vehicles/VehicleSelector';
import AddressSelector from '../forms/AddressSelector';
import * as serviceService from '../../services/service';
import * as providerService from '../../services/providers';
import * as categoriesService from '../../services/categories';
import { getMediaURL } from '../../services/api';
import VehicleHealthService from '../../services/vehicleHealthService';
import { getProviderSpecialty } from '../../utils/providerUtils';
import {
  Car as CarIcon,
  TriangleAlert as AlertTriangleIcon,
  Check as CheckIcon,
  CheckCircle2 as CheckCircle2Icon,
  Clock as ClockIcon,
  FileText as FileTextIcon,
  ChevronRight as ChevronRightIcon,
  ShieldAlert as ShieldAlertIcon,
  Star,
  MapPin,
  Eye,
  User as UserIcon,
  Search,
  Zap,
  CalendarDays,
  MapPinned,
  Send,
  Globe,
  Users,
  Building2,
  Wrench,
  Package,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GlassCard = ({ children, style, onPress, activeOpacity = 0.8 }) => {
  const content = (
    <View style={[glassCardBase, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

const glassCardBase = {
  backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
  padding: 16,
};

/**
 * Formulario multi-paso para crear una solicitud de servicio
 */
/** Nombre legible del componente de salud (evita mostrar IDs como "13" en UI). */
function resolveHealthComponentDisplayName(comp) {
  if (!comp) return 'Componente';
  const n = comp.nombre;
  if (typeof n === 'string' && n.trim()) return n.trim();
  const detail = comp.componente_detail;
  if (detail && typeof detail.nombre === 'string' && detail.nombre.trim()) return detail.nombre.trim();
  const nested = comp.componente;
  if (nested && typeof nested === 'object' && typeof nested.nombre === 'string' && nested.nombre.trim()) {
    return nested.nombre.trim();
  }
  if (typeof comp.componente_nombre === 'string' && comp.componente_nombre.trim()) {
    return comp.componente_nombre.trim();
  }
  if (typeof nested === 'string' && nested.trim() && Number.isNaN(Number(nested))) {
    return nested.replace(/_/g, ' ');
  }
  if (typeof comp.slug === 'string' && comp.slug.trim()) {
    return comp.slug.replace(/_/g, ' ');
  }
  return 'Componente';
}

const FormularioSolicitud = ({
  onSubmit,
  initialData = {},
  vehiculos = [],
  direcciones = [],
  contentPaddingBottom = 0,
  onExit = null,
  bloquearCambioVehiculo = false,
  isPreCompra = false,
}) => {
  // Pre-compra marketplace: skip vehicle selection (step 1), start at step 3
  const [pasoActual, setPasoActual] = useState(isPreCompra ? 3 : 1);
  const [formData, setFormData] = useState({
    vehiculo: initialData?.vehiculo || null,
    servicios_seleccionados: Array.isArray(initialData?.servicios_seleccionados) ? initialData.servicios_seleccionados : [],
    descripcion_problema: (initialData?.descripcion_problema && typeof initialData.descripcion_problema === 'string') ? initialData.descripcion_problema : '',
    urgencia: initialData?.urgencia || 'normal',
    requiere_repuestos: initialData?.requiere_repuestos !== undefined ? initialData.requiere_repuestos : true,
    tipo_solicitud: initialData?.tipo_solicitud || 'global',
    proveedores_dirigidos: Array.isArray(initialData?.proveedores_dirigidos) ? initialData.proveedores_dirigidos : [],
    direccion_usuario: initialData?.direccion_usuario || null,
    direccion_servicio_texto: (initialData?.direccion_servicio_texto && typeof initialData.direccion_servicio_texto === 'string') ? initialData.direccion_servicio_texto : '',
    detalles_ubicacion: (initialData?.detalles_ubicacion && typeof initialData.detalles_ubicacion === 'string') ? initialData.detalles_ubicacion : '',
    fecha_preferida: (initialData?.fecha_preferida && typeof initialData.fecha_preferida === 'string') ? initialData.fecha_preferida : '',
    hora_preferida: (initialData?.hora_preferida && typeof initialData.hora_preferida === 'string') ? initialData.hora_preferida : '',
    ubicacion_servicio: initialData?.ubicacion_servicio || null,
    sin_vehiculo_registrado: initialData?.sin_vehiculo_registrado === true
  });


  // Detectar si hay servicio o proveedor preseleccionado (needed before queries)
  const tieneServicioPreseleccionado = initialData?.servicios_seleccionados &&
    initialData.servicios_seleccionados.length > 0;
  const tieneProveedorPreseleccionado = initialData?.fromProviderDetail &&
    initialData?.proveedores_dirigidos &&
    initialData.proveedores_dirigidos.length > 0 &&
    initialData?.tipo_solicitud === 'dirigida';
  const flujoCuatroPasos = tieneProveedorPreseleccionado && tieneServicioPreseleccionado && !formData.sin_vehiculo_registrado;

  // ── TanStack Query for services, categories, and health ──
  const vehiculoId = formData.vehiculo?.id;

  const {
    data: serviciosDisponibles = [],
    isPending: serviciosQueryPending,
    isLoading: cargandoServicios,
  } = useQuery({
    queryKey: ['vehicleServices', vehiculoId],
    queryFn: () => serviceService.getServicesByVehiculo(vehiculoId),
    enabled: !!vehiculoId && !tieneServicioPreseleccionado,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    // 'always' refetch en cada montaje del query = parpadeos en paso 1; con staleTime basta refetch si está stale
    refetchOnMount: true,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const {
    data: categorias = [],
  } = useQuery({
    queryKey: ['mainCategories'],
    queryFn: categoriesService.getMainCategories,
    enabled: !!vehiculoId && !tieneServicioPreseleccionado,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [vistaServicios, setVistaServicios] = useState('categorias');

  const [proveedoresDisponibles, setProveedoresDisponibles] = useState({ talleres: [], mecanicos: [] });
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [cargandoPrecompra, setCargandoPrecompra] = useState(false);

  // Estados para selector de fecha y hora
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarSelectorHora, setMostrarSelectorHora] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(new Date());

  // (tieneServicioPreseleccionado, tieneProveedorPreseleccionado, flujoCuatroPasos defined above queries)

  const navigation = useNavigation();

  // Health components via TanStack Query (instant from cache when navigating back)
  const {
    data: healthComponentsQuery = [],
    isLoading: loadingHealth,
  } = useQuery({
    queryKey: ['vehicleHealthComponents', vehiculoId],
    queryFn: () => VehicleHealthService.getComponents(vehiculoId),
    enabled: !!vehiculoId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    select: (data) => {
      const results = Array.isArray(data) ? data : (data?.results || []);
      return results;
    },
    placeholderData: () => {
      const vehicleReport = formData.vehiculo?.health_report;
      return Array.isArray(vehicleReport) && vehicleReport.length > 0 ? vehicleReport : undefined;
    },
  });
  const healthComponents = healthComponentsQuery;

  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  // Ref para trackear si es la primera vez que se monta el componente
  // Esto evita limpiar servicios seleccionados manualmente cuando useFocusEffect
  // resetea initialData a {}
  const isInitialMount = React.useRef(true);
  const previousInitialDataRef = React.useRef(initialData);

  // Ref para hacer scroll a la sección de descripción del problema en el paso 2
  const descripcionProblemaRef = useRef(null);
  const paso2ScrollViewRef = useRef(null);
  const descripcionYPosition = useRef(0);

  // Sincronizar formData con initialData cuando cambia
  // IMPORTANTE: Solo sincronizar cuando hay datos reales en initialData (servicios preseleccionados)
  // NO limpiar servicios que el usuario seleccionó manualmente en el paso 2
  useEffect(() => {
    // Verificar si initialData está vacío o tiene servicios
    const initialDataVacio = !initialData || Object.keys(initialData).length === 0;
    const tieneServiciosEnInitialData = !initialDataVacio &&
      initialData?.servicios_seleccionados &&
      Array.isArray(initialData.servicios_seleccionados) &&
      initialData.servicios_seleccionados.length > 0;

    // Verificar si el initialData anterior tenía servicios preseleccionados
    const previousHadPreselection = previousInitialDataRef.current?.servicios_seleccionados &&
      Array.isArray(previousInitialDataRef.current.servicios_seleccionados) &&
      previousInitialDataRef.current.servicios_seleccionados.length > 0;

    console.log('🔄 FormularioSolicitud: Sincronizando con initialData', {
      initialDataVacio,
      tieneServiciosEnInitialData,
      serviciosEnInitialData: initialData?.servicios_seleccionados?.length || 0,
      isInitialMount: isInitialMount.current,
      previousHadPreselection
    });

    // Sincronizar formData con initialData
    setFormData(prev => {
      const cambios = {};
      let hayCambios = false;

      // CRÍTICO: Solo limpiar servicios si:
      // 1. Es el mount inicial Y initialData está vacío (usuario navega sin preselección)
      // 2. O si el initialData anterior TENÍA servicios preseleccionados y ahora no (cambio real de navegación)
      // NO limpiar si el usuario está seleccionando servicios manualmente (initialData siempre vacío)
      if (initialDataVacio || !tieneServiciosEnInitialData) {
        // Solo limpiar en el mount inicial si es realmente necesario
        // O si antes había preselección y ahora no (navegación diferente)
        const shouldClear = isInitialMount.current || previousHadPreselection;

        if (shouldClear && prev.servicios_seleccionados.length > 0) {
          // Verificar si los servicios actuales vienen de preselección o selección manual
          // Si el usuario los seleccionó manualmente (no hay previousHadPreselection), NO limpiar
          if (previousHadPreselection) {
            console.log('🧹 FormularioSolicitud: Limpiando servicios porque hubo cambio de preselección');
            cambios.servicios_seleccionados = [];
            hayCambios = true;
          } else {
            console.log('⏭️ FormularioSolicitud: NO limpiando servicios - fueron seleccionados manualmente');
          }
        }
      }
      // Si SÍ hay servicios en initialData, sincronizarlos (preselección desde navegación)
      else if (tieneServiciosEnInitialData) {
        const serviciosActuales = JSON.stringify(prev.servicios_seleccionados);
        const serviciosNuevos = JSON.stringify(initialData.servicios_seleccionados);
        if (serviciosActuales !== serviciosNuevos) {
          console.log('✅ FormularioSolicitud: Sincronizando servicios desde initialData (preselección)');
          cambios.servicios_seleccionados = initialData.servicios_seleccionados;
          hayCambios = true;
        }
      }

      // Sincronizar tipo_solicitud (solo si initialData no está vacío)
      if (!initialDataVacio && initialData?.tipo_solicitud !== undefined && prev.tipo_solicitud !== initialData.tipo_solicitud) {
        cambios.tipo_solicitud = initialData.tipo_solicitud;
        hayCambios = true;
      }

      // Sincronizar proveedores_dirigidos (solo si initialData no está vacío)
      if (!initialDataVacio && initialData?.proveedores_dirigidos !== undefined) {
        const proveedoresActuales = JSON.stringify(prev.proveedores_dirigidos);
        const proveedoresNuevos = JSON.stringify(initialData.proveedores_dirigidos);
        if (proveedoresActuales !== proveedoresNuevos) {
          cambios.proveedores_dirigidos = initialData.proveedores_dirigidos;
          hayCambios = true;
        }
      }

      // Sincronizar vehiculo solo si initialData tiene un valor explícito
      if (!initialDataVacio && initialData?.vehiculo !== undefined) {
        const vehiculoActual = prev.vehiculo?.id;
        const vehiculoNuevo = initialData.vehiculo?.id;
        if (vehiculoActual !== vehiculoNuevo) {
          cambios.vehiculo = initialData.vehiculo;
          hayCambios = true;
        }
      }

      // ── Campos adicionales (sincronizar solo cuando initialData NO está vacío) ──
      // Anteriormente un segundo useEffect duplicado manejaba estos campos, causando
      // actualizaciones de estado que competían y podían resetear selecciones del paso 1.
      if (!initialDataVacio) {
        if (initialData.sin_vehiculo_registrado === true && !prev.sin_vehiculo_registrado) {
          cambios.vehiculo = null;
          cambios.sin_vehiculo_registrado = true;
          hayCambios = true;
        } else if (initialData.sin_vehiculo_registrado === false && prev.sin_vehiculo_registrado) {
          cambios.sin_vehiculo_registrado = false;
          hayCambios = true;
        }
        if (initialData.descripcion_problema !== undefined && prev.descripcion_problema !== initialData.descripcion_problema) {
          cambios.descripcion_problema = initialData.descripcion_problema;
          hayCambios = true;
        }
        if (initialData.urgencia !== undefined && prev.urgencia !== initialData.urgencia) {
          cambios.urgencia = initialData.urgencia;
          hayCambios = true;
        }
        if (initialData.requiere_repuestos !== undefined && prev.requiere_repuestos !== initialData.requiere_repuestos) {
          cambios.requiere_repuestos = initialData.requiere_repuestos;
          hayCambios = true;
        }
        if (initialData.direccion_usuario !== undefined && prev.direccion_usuario !== initialData.direccion_usuario) {
          cambios.direccion_usuario = initialData.direccion_usuario;
          hayCambios = true;
        }
        if (initialData.direccion_servicio_texto !== undefined && prev.direccion_servicio_texto !== initialData.direccion_servicio_texto) {
          cambios.direccion_servicio_texto = initialData.direccion_servicio_texto;
          hayCambios = true;
        }
        if (initialData.detalles_ubicacion !== undefined && prev.detalles_ubicacion !== initialData.detalles_ubicacion) {
          cambios.detalles_ubicacion = initialData.detalles_ubicacion;
          hayCambios = true;
        }
        if (initialData.fecha_preferida !== undefined && prev.fecha_preferida !== initialData.fecha_preferida) {
          cambios.fecha_preferida = initialData.fecha_preferida;
          hayCambios = true;
        }
        if (initialData.hora_preferida !== undefined && prev.hora_preferida !== initialData.hora_preferida) {
          cambios.hora_preferida = initialData.hora_preferida;
          hayCambios = true;
        }
        if (initialData.ubicacion_servicio !== undefined && prev.ubicacion_servicio !== initialData.ubicacion_servicio) {
          cambios.ubicacion_servicio = initialData.ubicacion_servicio;
          hayCambios = true;
        }
      }

      return hayCambios ? { ...prev, ...cambios } : prev;
    });

    // Después del primer mount, marcar como no inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    // Guardar referencia al initialData actual para comparación futura
    previousInitialDataRef.current = initialData;
  }, [initialData]);

  // Limpiar servicios solo si cambia el vehículo (no en la primera asignación desde vacío → evita carreras con TanStack/re-renders)
  const previousVehiculoIdRef = useRef(undefined);
  useEffect(() => {
    const id = formData.vehiculo?.id;
    const prevId = previousVehiculoIdRef.current;
    previousVehiculoIdRef.current = id;

    if (tieneServicioPreseleccionado) return;
    if (prevId !== undefined && id !== prevId) {
      setFormData((p) => ({ ...p, servicios_seleccionados: [] }));
    }
  }, [formData.vehiculo?.id, tieneServicioPreseleccionado]);

  // Cargar proveedores cuando se selecciona "solo proveedores específicos"
  useEffect(() => {
    if (formData.tipo_solicitud !== 'dirigida') {
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
      return;
    }
    if (formData.sin_vehiculo_registrado && formData.servicios_seleccionados?.length > 0) {
      cargarProveedoresPorServicioSinVehiculo();
      return;
    }
    if (formData.vehiculo && formData.vehiculo.id) {
      cargarProveedoresPorVehiculo();
    } else {
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
    }
  }, [formData.tipo_solicitud, formData.vehiculo, formData.sin_vehiculo_registrado, formData.servicios_seleccionados]);

  // Recargar proveedores cuando cambien los servicios seleccionados (solo para solicitudes dirigidas)
  useEffect(() => {
    if (formData.tipo_solicitud !== 'dirigida' || !Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
      return;
    }
    if (formData.sin_vehiculo_registrado) {
      cargarProveedoresPorServicioSinVehiculo();
    } else if (formData.vehiculo && formData.vehiculo.id) {
      cargarProveedoresPorVehiculo();
    }
  }, [formData.servicios_seleccionados]);

  // Build recommendations from critical health components.
  // REGLA: Solo mostrar recomendaciones que estén asociadas a servicios disponibles del vehículo.
  // (Evita cards "Revisión sugerida" sin servicio clickeable).
  const healthRecommendations = React.useMemo(() => {
    if (!healthComponents?.length) return [];

    const availableById = new Map();
    if (Array.isArray(serviciosDisponibles)) {
      for (const s of serviciosDisponibles) {
        if (s?.id) availableById.set(s.id, s);
      }
    }

    const recs = [];
    const seenServiceIds = new Set();
    const critical = [...healthComponents]
      .filter((c) => {
        const level = c.nivel_alerta || c.status || 'OPTIMO';
        return level !== 'OPTIMO';
      })
      .sort(
        (a, b) =>
          (a.salud_porcentaje ?? a.salud ?? 100) - (b.salud_porcentaje ?? b.salud ?? 100)
      )
      .slice(0, 5);

    for (const comp of critical) {
      const compName = resolveHealthComponentDisplayName(comp);
      const compHealth = comp.salud_porcentaje ?? comp.salud ?? 0;
      const compLevel = comp.nivel_alerta || comp.status || 'ATENCION';
      const kmRest = comp.km_estimados_restantes ?? comp.km_restantes ?? null;
      const services = Array.isArray(comp.servicios_asociados) ? comp.servicios_asociados : [];

      for (const svcCandidate of services) {
        const svcId = svcCandidate?.id;
        if (!svcId || seenServiceIds.has(svcId)) continue;
        const svc = availableById.get(svcId);
        if (!svc) continue;

        seenServiceIds.add(svcId);
        recs.push({
          componentName: compName,
          componentHealth: compHealth,
          componentLevel: compLevel,
          kmRestantes: kmRest,
          service: svc,
        });
      }
    }

    return recs;
  }, [healthComponents, serviciosDisponibles]);

  /** Cargar talleres/mecánicos que ofrecen los servicios seleccionados sin vehículo (precompra) */
  const cargarProveedoresPorServicioSinVehiculo = async () => {
    const servicioIds = formData.servicios_seleccionados?.map(s => (typeof s === 'object' ? s.id : s)).filter(Boolean) || [];
    if (servicioIds.length === 0) {
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
      return;
    }
    setCargandoProveedores(true);
    try {
      const proveedores = await providerService.getProvidersByServicioOnly(servicioIds);
      setProveedoresDisponibles({
        talleres: Array.isArray(proveedores.talleres) ? proveedores.talleres : [],
        mecanicos: Array.isArray(proveedores.mecanicos) ? proveedores.mecanicos : [],
      });
      console.log('✅ Proveedores (sin vehículo) por servicio:', servicioIds, proveedores);
    } catch (e) {
      console.error('❌ Error cargando proveedores sin vehículo:', e);
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
    } finally {
      setCargandoProveedores(false);
    }
  };

  const cargarProveedoresPorVehiculo = async () => {
    if (!formData.vehiculo || !formData.vehiculo.id) {
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
      return;
    }

    setCargandoProveedores(true);
    try {
      // Extraer IDs de servicios seleccionados
      const servicioIds = formData.servicios_seleccionados?.map(s =>
        typeof s === 'object' ? s.id : s
      ).filter(id => id != null) || [];

      // Usar el nuevo endpoint que filtra por marca y servicios
      const proveedores = await providerService.getProvidersByVehiculoAndService(
        formData.vehiculo.id,
        servicioIds
      );

      setProveedoresDisponibles({
        talleres: Array.isArray(proveedores.talleres) ? proveedores.talleres : [],
        mecanicos: Array.isArray(proveedores.mecanicos) ? proveedores.mecanicos : []
      });

      console.log('✅ Proveedores filtrados cargados:', {
        vehiculo_id: formData.vehiculo.id,
        servicio_ids: servicioIds,
        talleres: proveedores.talleres?.length || 0,
        mecanicos: proveedores.mecanicos?.length || 0,
        filtros: proveedores.filtros_aplicados
      });

      // Si no hay proveedores disponibles, mostrar mensaje informativo
      const totalProveedores = (proveedores.talleres?.length || 0) + (proveedores.mecanicos?.length || 0);
      if (totalProveedores === 0) {
        console.warn(`⚠️ No se encontraron proveedores que atiendan la marca del vehículo${servicioIds.length > 0 ? ' y ofrezcan los servicios seleccionados' : ''}`);
      }
    } catch (error) {
      console.error('❌ Error cargando proveedores:', error);
      setProveedoresDisponibles({ talleres: [], mecanicos: [] });
    } finally {
      setCargandoProveedores(false);
    }
  };

  const toggleServicioSeleccionado = (servicio) => {
    const servicios = Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados : [];
    const existe = servicios.find(s => s && s.id === servicio.id);

    if (existe) {
      // Deseleccionar servicio: solo actualizar el estado
      setFormData({
        ...formData,
        servicios_seleccionados: servicios.filter(s => s.id !== servicio.id)
      });
    } else {
      // Seleccionar servicio: asegurar que tenga información de categoría
      // Si hay categoría seleccionada actualmente, agregarla al servicio
      let servicioConCategoria = { ...servicio };

      // Si el servicio no tiene categoria_nombre pero hay categoriaSeleccionada, agregarla
      if (!servicioConCategoria.categoria_nombre && categoriaSeleccionada) {
        servicioConCategoria.categoria_nombre = categoriaSeleccionada.nombre;
        servicioConCategoria.categoria_id = categoriaSeleccionada.id;
      }

      // Si el servicio tiene categorias_ids pero no categoria_nombre, buscar en categorías
      if (!servicioConCategoria.categoria_nombre && servicioConCategoria.categorias_ids && servicioConCategoria.categorias_ids.length > 0) {
        const primeraCategoriaId = servicioConCategoria.categorias_ids[0];
        const categoriaEncontrada = categorias.find(c => c.id === primeraCategoriaId);
        if (categoriaEncontrada) {
          servicioConCategoria.categoria_nombre = categoriaEncontrada.nombre;
        }
      }

      // Seleccionar servicio: actualizar el estado con el servicio que incluye categoría
      setFormData({
        ...formData,
        servicios_seleccionados: [...servicios, servicioConCategoria]
      });

      // Si estamos en el paso 2, hacer scroll automático a la sección de descripción del problema
      if (pasoActual === 2) {
        // Esperar a que todas las interacciones y animaciones terminen
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            if (paso2ScrollViewRef.current) {
              // Hacer scroll al final del ScrollView donde está la sección de descripción
              paso2ScrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 200);
        });
      }
    }
  };

  const toggleProveedorSeleccionado = (proveedor, tipo) => {
    // Prevenir cambios si hay proveedor preseleccionado (desde ProviderDetailScreen), salvo precompra sin vehículo
    if (tieneProveedorPreseleccionado && !formData.sin_vehiculo_registrado) {
      Alert.alert(
        'Proveedor preseleccionado',
        'El proveedor ya está preseleccionado desde el perfil del proveedor. No puedes modificarlo.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    const proveedores = formData.proveedores_dirigidos || [];
    // Obtener ID de usuario del proveedor (necesario para el backend)
    const usuarioId = proveedor.usuario?.id || proveedor.usuario || proveedor.id;

    const existe = proveedores.find(p => {
      const pUsuarioId = p.usuario?.id || p.usuario || p.id;
      return pUsuarioId === usuarioId && p.tipo === tipo;
    });

    if (existe) {
      setFormData({
        ...formData,
        proveedores_dirigidos: proveedores.filter(p => {
          const pUsuarioId = p.usuario?.id || p.usuario || p.id;
          return !(pUsuarioId === usuarioId && p.tipo === tipo);
        })
      });
    } else {
      // Limitar a 3 proveedores
      if (proveedores.length >= 3) {
        Alert.alert('Límite alcanzado', 'Solo puedes seleccionar hasta 3 proveedores');
        return;
      }
      // Guardar proveedor con usuario.id para facilitar el envío al backend
      setFormData({
        ...formData,
        proveedores_dirigidos: [...proveedores, { ...proveedor, tipo, usuario_id: usuarioId }]
      });
    }
  };

  // Ajustar total de pasos según el flujo
  // Si hay servicio + proveedor preseleccionados: 4 pasos (saltamos pasos 2 y 4)
  // Si hay solo servicio preseleccionado: 5 pasos (saltamos el paso 2)
  // Si NO hay preselecciones: 6 pasos (flujo normal)
  // Always 5 steps (skip step 2); 4 when provider also preselected
  // Pre-compra marketplace: 4 steps (3→4→5→6, skip vehicle & service selection)
  const totalPasos = isPreCompra ? 4 : flujoCuatroPasos ? 4 : 5;

  // Asegurar que cuando hay proveedor preseleccionado, tipo_solicitud permanezca como 'dirigida'
  // y los proveedores no cambien
  useEffect(() => {
    if (tieneProveedorPreseleccionado && !formData.sin_vehiculo_registrado) {
      // Forzar tipo_solicitud a 'dirigida' si está preseleccionado
      if (formData.tipo_solicitud !== 'dirigida') {
        console.log('🔒 Asegurando tipo_solicitud como "dirigida" (proveedor preseleccionado)');
        setFormData(prev => ({
          ...prev,
          tipo_solicitud: 'dirigida'
        }));
      }

      // Asegurar que los proveedores preseleccionados no cambien
      const proveedoresPreseleccionados = initialData?.proveedores_dirigidos || [];
      const proveedoresActuales = formData.proveedores_dirigidos || [];

      // Comparar si los proveedores han cambiado (comparando por usuario_id)
      const proveedoresCambiaron = proveedoresPreseleccionados.length !== proveedoresActuales.length ||
        proveedoresPreseleccionados.some((pPreseleccionado, index) => {
          const pActual = proveedoresActuales[index];
          if (!pActual) return true;

          const idPreseleccionado = pPreseleccionado.usuario?.id || pPreseleccionado.usuario || pPreseleccionado.usuario_id || pPreseleccionado.id;
          const idActual = pActual.usuario?.id || pActual.usuario || pActual.usuario_id || pActual.id;

          return idPreseleccionado !== idActual || pPreseleccionado.tipo !== pActual.tipo;
        });

      if (proveedoresCambiaron && proveedoresPreseleccionados.length > 0) {
        console.log('🔒 Restaurando proveedores preseleccionados (proveedor preseleccionado)');
        setFormData(prev => ({
          ...prev,
          proveedores_dirigidos: [...proveedoresPreseleccionados]
        }));
      }
    }
  }, [tieneProveedorPreseleccionado, formData.sin_vehiculo_registrado, formData.tipo_solicitud, formData.proveedores_dirigidos]);

  // Log informativo sobre el flujo detectado
  useEffect(() => {
    if (flujoCuatroPasos) {
      console.log('✅ FormularioSolicitud: Servicio y proveedor preseleccionados detectados');
      console.log('📊 Flujo optimizado: 4 pasos (saltando pasos 2 y 4 - selección de servicios y proveedores)');
      console.log('🎯 Servicio:', initialData.servicios_seleccionados[0]?.nombre);
      console.log('👤 Proveedor:', initialData.proveedores_dirigidos[0]?.nombre || 'Proveedor preseleccionado');
      console.log('📍 Origen: ProviderDetailScreen');
    } else if (tieneServicioPreseleccionado) {
      console.log('✅ FormularioSolicitud: Servicio preseleccionado detectado');
      console.log('📊 Flujo optimizado: 5 pasos (saltando paso 2 - selección de servicios)');
      console.log('🎯 Servicio:', initialData.servicios_seleccionados[0]?.nombre);
      console.log('📋 Servicios en formData:', Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados.length : 0, 'servicio(s)');
    } else {
      console.log('📋 FormularioSolicitud: Flujo normal de 6 pasos');
    }
  }, [tieneServicioPreseleccionado, tieneProveedorPreseleccionado]);

  // Si los servicios por ID llegaron async y el usuario ya quedó en paso 2, saltar a paso 3
  useEffect(() => {
    if (pasoActual !== 2) return;
    if (!formData.servicios_seleccionados?.length) return;
    if (!initialData?.servicios_seleccionados?.length) return;
    console.log('🚀 Servicios preseleccionados listos: saliendo del paso 2 → paso 3');
    setPasoActual(3);
  }, [
    pasoActual,
    formData.servicios_seleccionados,
    initialData?.servicios_seleccionados,
  ]);

  // Regla de negocio: precompra sin vehículo NO pregunta por repuestos.
  useEffect(() => {
    if (formData.sin_vehiculo_registrado && formData.requiere_repuestos !== false) {
      setFormData(prev => ({ ...prev, requiere_repuestos: false }));
    }
  }, [formData.sin_vehiculo_registrado, formData.requiere_repuestos]);

  const handleNext = () => {
    if (!validarPaso(pasoActual)) return;

    // Pre-compra marketplace: 3→4→5→6
    if (isPreCompra) {
      if (pasoActual === 6) { handleSubmit(); }
      else { setPasoActual(pasoActual + 1); }
      return;
    }

    // flujoCuatroPasos: 1→3→5→6 (skip step 2 and 4)
    if (flujoCuatroPasos) {
      if (pasoActual === 1) { setPasoActual(3); }
      else if (pasoActual === 3) { setPasoActual(5); }
      else if (pasoActual === 5) { setPasoActual(6); }
      else if (pasoActual === 6) { handleSubmit(); }
      else { setPasoActual(pasoActual + 1); }
      return;
    }

    // tieneServicioPreseleccionado: 1→3→4→5→6 (skip step 2)
    if (tieneServicioPreseleccionado) {
      if (pasoActual === 1) {
        if (formData.sin_vehiculo_registrado) {
          if (!formData.servicios_seleccionados?.length) {
            Alert.alert('Error', 'Debes tener el servicio seleccionado');
            return;
          }
          setPasoActual(3);
          return;
        }
        if (!formData.vehiculo) {
          Alert.alert('Error', 'Debes seleccionar un vehículo para continuar');
          return;
        }
        setPasoActual(3);
      } else if (pasoActual === 6) {
        handleSubmit();
      } else {
        setPasoActual(pasoActual + 1);
      }
      return;
    }

    // Unified normal flow: 1→3→4→5→6 (always skip step 2)
    if (pasoActual === 1) {
      if (!formData.vehiculo) {
        Alert.alert('Selecciona un vehículo', 'Debes seleccionar un vehículo para continuar.');
        return;
      }
      if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
        Alert.alert('Selecciona un servicio', 'Debes seleccionar al menos un servicio para continuar.');
        return;
      }
      if (!formData.descripcion_problema?.trim()) {
        setTempDescription(formData.descripcion_problema || '');
        setDescriptionModalVisible(true);
        return;
      }
      setPasoActual(3);
    } else if (pasoActual === 6) {
      handleSubmit();
    } else {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleBack = () => {
    if (pasoActual <= 1) return;

    // Pre-compra marketplace: back from first visible step exits the form
    if (isPreCompra && pasoActual === 3) {
      onExit?.();
      return;
    }

    // Precompra sin vehículo (generic): back from step 3 resets to normal
    if (formData.sin_vehiculo_registrado && pasoActual === 3) {
      setFormData(prev => ({
        ...prev,
        sin_vehiculo_registrado: false,
        servicios_seleccionados: [],
        tipo_solicitud: 'global',
        proveedores_dirigidos: [],
        requiere_repuestos: true,
      }));
      setPasoActual(1);
      return;
    }

    // flujoCuatroPasos: skip step 4 and 2 going back
    if (flujoCuatroPasos) {
      if (pasoActual === 3) { setPasoActual(1); }
      else if (pasoActual === 5) { setPasoActual(3); }
      else { setPasoActual(pasoActual - 1); }
      return;
    }

    // All flows: step 3 goes back to step 1 (skip step 2)
    if (pasoActual === 3) {
      setPasoActual(1);
    } else {
      setPasoActual(pasoActual - 1);
    }
  };

  const validarPaso = (paso) => {
    switch (paso) {
      case 1:
        // Precompra / sin vehículo
        if (formData.sin_vehiculo_registrado) {
          if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
            Alert.alert('Error', 'Para continuar sin vehículo debes tener un servicio seleccionado (ej. revisión precompra).');
            return false;
          }
          return true;
        }
        if (!formData.vehiculo) {
          Alert.alert('Error', 'Debes seleccionar un vehículo');
          return false;
        }
        // REGLA: si el vehículo no tiene servicios asociados, no permitir crear solicitud
        // (En este flujo, los "servicios disponibles" provienen del backend por vehículo).
        if (
          !tieneServicioPreseleccionado &&
          !!vehiculoId &&
          !cargandoServicios &&
          Array.isArray(serviciosDisponibles) &&
          serviciosDisponibles.length === 0
        ) {
          Alert.alert(
            'No disponible',
            'Este vehículo no tiene servicios asociados, por lo que no es posible crear una solicitud.'
          );
          return false;
        }
        // Si hay servicio preseleccionado, validar que exista
        if (tieneServicioPreseleccionado && (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0)) {
          Alert.alert('Error', 'El servicio preseleccionado no se cargó correctamente');
          return false;
        }
        return true;
      case 2:
        // Este paso se salta cuando hay servicio preseleccionado
        // Solo validar si estamos en flujo normal
        if (!tieneServicioPreseleccionado) {
          if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
            Alert.alert('Error', 'Debes seleccionar al menos un servicio');
            return false;
          }
          if (!formData.descripcion_problema.trim()) {
            Alert.alert('Error', 'Debes describir el problema');
            return false;
          }
        }
        return true;
      case 3:
        // Precompra sin vehículo: no exigir vehículo, pero sí comentario obligatorio
        if (formData.sin_vehiculo_registrado) {
          if (!formData.descripcion_problema || !formData.descripcion_problema.trim()) {
            Alert.alert(
              'Comentario requerido',
              'Para precompra sin vehículo debes indicar en el comentario el vehículo a inspeccionar.'
            );
            return false;
          }
          return true;
        }
        // Si hay servicio y proveedor preseleccionados, validar que haya vehículo seleccionado
        // (porque el paso 1 se saltó)
        if (flujoCuatroPasos) {
          if (!formData.vehiculo) {
            Alert.alert('Error', 'Debes seleccionar un vehículo para continuar');
            return false;
          }
          // Validar que el servicio preseleccionado exista
          if (!Array.isArray(formData.servicios_seleccionados) || formData.servicios_seleccionados.length === 0) {
            Alert.alert('Error', 'El servicio preseleccionado no se cargó correctamente');
            return false;
          }
        }
        return true; // Urgencia siempre tiene valor por defecto
      case 4:
        if (formData.tipo_solicitud === 'dirigida' && formData.proveedores_dirigidos.length === 0) {
          Alert.alert('Error', 'Debes seleccionar al menos un proveedor para solicitud dirigida');
          return false;
        }
        return true;
      case 5:
        if (!formData.direccion_usuario && !formData.direccion_servicio_texto) {
          Alert.alert('Error', 'Debes seleccionar o ingresar una dirección');
          return false;
        }
        return true;
      case 6:
        // Solo validar fecha si estamos intentando hacer submit (no al llegar al paso)
        // La validación se hace en handleSubmit, no aquí
        // Solo validar si hay algo en fecha_preferida (para detectar formato incorrecto)
        if (formData.fecha_preferida && formData.fecha_preferida.trim() !== '') {
          if (!validarFecha(formData.fecha_preferida)) {
            console.error('❌ Error: Fecha no válida:', formData.fecha_preferida);
            Alert.alert('Error', 'La fecha debe tener el formato YYYY-MM-DD y ser una fecha válida futura');
            return false;
          }
          // Validar hora solo si hay fecha válida y hora especificada
          if (formData.hora_preferida && formData.hora_preferida.trim() !== '' && !validarHora(formData.hora_preferida)) {
            Alert.alert('Error', 'La hora debe tener el formato HH:MM (ej: 14:30)');
            return false;
          }
        }
        // Permitir avanzar al paso 6 sin fecha (se validará en submit)
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    // Validar el paso actual (que debería ser el paso 6 para fecha/hora)
    if (!validarPaso(pasoActual)) {
      console.error('❌ Error: Validación del paso actual falló:', pasoActual);
      return;
    }

    // Validación específica de fecha antes de enviar
    if (!formData.fecha_preferida || formData.fecha_preferida.trim() === '') {
      Alert.alert('Error', 'Debes seleccionar una fecha preferida para el servicio');
      return;
    }

    if (!validarFecha(formData.fecha_preferida)) {
      console.error('❌ Error: Fecha no válida en submit:', formData.fecha_preferida);
      Alert.alert('Error', 'La fecha seleccionada no es válida. Por favor, selecciona una fecha nuevamente.');
      return;
    }

    // Si hay servicio preseleccionado y no hay descripción, usar descripción por defecto
    const datosFinales = formData && typeof formData === 'object' && !Array.isArray(formData)
      ? { ...formData }
      : {};
    const descripcionActual = String(datosFinales.descripcion_problema || '').trim();
    const debeAutogenerarDescripcion =
      !descripcionActual &&
      !formData.sin_vehiculo_registrado &&
      (
        tieneServicioPreseleccionado ||
        (Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0)
      );

    if (debeAutogenerarDescripcion) {
      const nombreServicio = formData.servicios_seleccionados?.[0]?.nombre || 'servicio seleccionado';
      datosFinales.descripcion_problema = `Solicitud de ${nombreServicio}`;
      console.log('📝 Descripción generada automáticamente:', datosFinales.descripcion_problema);
    }

    // Asegurar que fecha_preferida esté en formato YYYY-MM-DD
    if (datosFinales.fecha_preferida) {
      // Si ya está en formato correcto, validar
      if (validarFecha(datosFinales.fecha_preferida)) {
        // Ya está en formato YYYY-MM-DD, no hacer nada
        console.log('✅ Fecha en formato correcto:', datosFinales.fecha_preferida);
      } else {
        // Intentar convertir desde Date o otro formato
        try {
          // Intentar parsear como componentes para evitar desfase UTC
          const m = String(datosFinales.fecha_preferida).match(/(\d{4})-(\d{2})-(\d{2})/);
          if (m) {
            datosFinales.fecha_preferida = `${m[1]}-${m[2]}-${m[3]}`;
            console.log('🔧 Fecha extraída manualmente:', datosFinales.fecha_preferida);
          } else {
            const date = new Date(datosFinales.fecha_preferida);
            if (!isNaN(date.getTime())) {
              datosFinales.fecha_preferida = formatearFechaYYYYMMDD(date);
              console.log('🔧 Fecha convertida a YYYY-MM-DD:', datosFinales.fecha_preferida);
            } else {
              console.error('❌ Error: No se pudo convertir la fecha:', datosFinales.fecha_preferida);
              Alert.alert('Error', 'La fecha tiene un formato inválido. Por favor, selecciona una fecha nuevamente.');
              return;
            }
          }
        } catch (error) {
          console.error('❌ Error al convertir fecha:', error);
          Alert.alert('Error', 'La fecha tiene un formato inválido. Por favor, selecciona una fecha nuevamente.');
          return;
        }
      }
    }

    if (onSubmit) {
      onSubmit(datosFinales);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Seleccionar fecha';

    // Si la fecha está en formato YYYY-MM-DD, parsearla manualmente
    // para evitar problemas de zona horaria
    const regexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateString.match(regexYYYYMMDD);

    if (match) {
      const [, year, month, day] = match;
      // Crear fecha usando UTC para evitar problemas de zona horaria
      // Luego convertir los componentes directamente sin ajustes de zona horaria
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      return date.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC' // Forzar UTC para mantener la fecha correcta
      });
    }

    // Fallback para otros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Seleccionar fecha';
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Seleccionar hora';
    return timeString.substring(0, 5);
  };

  const handleVehiculoToggle = (vehiculo) => {
    // Si el vehículo ya está seleccionado, deseleccionarlo y limpiar datos relacionados
    if (formData.vehiculo?.id === vehiculo.id) {
      console.log('🔙 Deseleccionando vehículo y limpiando datos relacionados');
      setFormData(prev => ({
        ...prev,
        vehiculo: null,
        servicios_seleccionados: [], // Limpiar servicios al deseleccionar vehículo
      }));
      setCategoriaSeleccionada(null);
    } else {
      // Seleccionar nuevo vehículo: salir del modo "sin vehículo registrado"
      setFormData(prev => ({
        ...prev,
        vehiculo,
        sin_vehiculo_registrado: false,
        // Permitir nueva elección de servicio al volver al flujo con vehículo
        servicios_seleccionados: [],
        tipo_solicitud: 'global',
        proveedores_dirigidos: [],
      }));
    }
  };

  const handleDeseleccionarVehiculo = () => {
    console.log('🔙 Deseleccionando vehículo desde botón y limpiando datos relacionados');
    setFormData(prev => ({
      ...prev,
      vehiculo: null,
      servicios_seleccionados: [],
    }));
    setCategoriaSeleccionada(null);
  };

  const esNombreServicioPrecompra = (nombre) => {
    if (!nombre) return false;
    const n = String(nombre).toLowerCase();
    return n.includes('precompra') || n.includes('pre-compra') || n.includes('pre compra');
  };

  const activarPrecompraSinVehiculo = async () => {
    try {
      setCargandoPrecompra(true);
      let precompra = null;

      // 1) Búsqueda directa (evita depender de GET /servicios/ que en producción es paginado/corto)
      const busqueda = await serviceService.buscarServicios('precompra');
      const busArr = Array.isArray(busqueda) ? busqueda : busqueda?.results || [];
      precompra = busArr.find(s => s && esNombreServicioPrecompra(s.nombre)) || busArr[0];

      // 2) Lista paginada: primera página por si incluye el servicio
      if (!precompra) {
        const lista = await serviceService.getServices();
        const arr = Array.isArray(lista) ? lista : lista?.results || [];
        precompra = arr.find(s => s && esNombreServicioPrecompra(s.nombre));
      }

      // 3) Fallback por ID conocido en catálogo (Revisión precompra = 4 en logs Render/app)
      if (!precompra) {
        precompra = await serviceService.getServicioPorIdNested(4);
      }

      if (!precompra || !precompra.id) {
        Alert.alert(
          'Servicio no encontrado',
          'No se encontró el servicio de revisión precompra. Entra desde el perfil del proveedor que lo ofrece o contacta soporte.'
        );
        return;
      }
      setFormData(prev => ({
        ...prev,
        vehiculo: null,
        sin_vehiculo_registrado: true,
        requiere_repuestos: false,
        // Dirigida para cargar listado de talleres/mecánicos que ofrecen el servicio (sin vehiculo_id)
        tipo_solicitud: 'dirigida',
        proveedores_dirigidos: [],
        servicios_seleccionados: [
          {
            id: precompra.id,
            nombre: precompra.nombre,
            descripcion: precompra.descripcion || '',
            precio_referencia: precompra.precio_referencia,
          },
        ],
      }));
      setCategoriaSeleccionada(null);
      setPasoActual(3);
    } catch (e) {
      console.error('activarPrecompraSinVehiculo', e);
      Alert.alert('Error', 'No se pudo cargar el servicio de precompra. Intenta de nuevo.');
    } finally {
      setCargandoPrecompra(false);
    }
  };

  // ── Dashboard flow: Step 1 with vehicle tag, recommendations and categorized services ──
  const renderDashboardPaso1 = () => {
    const vehicle = formData.vehiculo;
    const vehiculosDisponibles = vehiculos && vehiculos.length > 0 ? vehiculos : [];

    const getScoreColor = (s) => {
      if (s >= 80) return '#10B981';
      if (s >= 60) return '#F59E0B';
      if (s >= 40) return '#F97316';
      return '#EF4444';
    };
    const getLevelColor = (level) => {
      if (level === 'CRITICO') return '#EF4444';
      if (level === 'URGENTE') return '#F97316';
      return '#F59E0B';
    };

    const categoriasConServicios = categorias.filter((cat) =>
      serviciosDisponibles.some((s) => {
        if (s.categorias_ids && Array.isArray(s.categorias_ids)) return s.categorias_ids.includes(cat.id);
        return s.categoria === cat.id;
      })
    );

    const serviciosFiltrados = categoriaSeleccionada
      ? serviciosDisponibles.filter((s) => {
          if (s.categorias_ids && Array.isArray(s.categorias_ids)) return s.categorias_ids.includes(categoriaSeleccionada.id);
          return s.categoria === categoriaSeleccionada.id;
        })
      : serviciosDisponibles;

    // Un solo ScrollView vertical vive en el padre (contenido del formulario). Anidar otro aquí
    // hacía que al cambiar altura (servicios/salud) Android/iOS resetearan el scroll y parecía un “reload”
    // que perdía contexto; el horizontal de categorías y el FlatList de recs se mantienen.
    return (
      <View style={{ paddingBottom: 24, paddingHorizontal: 16 }}>
        {/* ── Vehicle Selector / Tag ── */}
        {!vehicle ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={gs.sectionTitle}>Selecciona tu vehículo</Text>
            <Text style={gs.sectionSub}>Elige el vehículo para el cual necesitas el servicio</Text>
            {vehiculosDisponibles.map((v) => (
              <GlassCard
                key={v.id}
                style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => handleVehiculoToggle(v)}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <CarIcon size={22} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{v.marca_nombre} {v.modelo_nombre}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                    {v.year} · {v.patente} · {(v.kilometraje || 0).toLocaleString()} km
                  </Text>
                </View>
                <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
              </GlassCard>
            ))}

            {vehiculosDisponibles.length > 0 && (
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>
                  ¿Comprando un auto? Pide inspección precompra sin vehículo registrado.
                </Text>
                <GlassCard
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={activarPrecompraSinVehiculo}
                >
                  {cargandoPrecompra ? (
                    <ActivityIndicator color="#6EE7B7" />
                  ) : (
                    <>
                      <Search size={20} color="#6EE7B7" />
                      <Text style={{ color: '#6EE7B7', fontSize: 14, fontWeight: '600' }}>Inspección precompra</Text>
                    </>
                  )}
                </GlassCard>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Vehicle Tag */}
            <GlassCard style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.2)' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <CarIcon size={22} color="#60A5FA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>
                  {vehicle.marca_nombre} {vehicle.modelo_nombre}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                  {vehicle.year} · {vehicle.patente} · {(vehicle.kilometraje || 0).toLocaleString()} km
                </Text>
              </View>
              <View style={{ backgroundColor: getScoreColor(vehicle.health_score ?? 0) + '22', borderWidth: 1, borderColor: getScoreColor(vehicle.health_score ?? 0) + '55', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: getScoreColor(vehicle.health_score ?? 0), fontSize: 13, fontWeight: '700' }}>
                  {Math.round(vehicle.health_score ?? 0)}%
                </Text>
              </View>
              {vehiculosDisponibles.length > 1 && !bloquearCambioVehiculo && (
                <TouchableOpacity onPress={handleDeseleccionarVehiculo} style={{ padding: 4 }}>
                  <Ionicons name="swap-horizontal" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </GlassCard>

            {/* ── Recommendations (Horizontal Scroll) ── */}
            {loadingHealth && healthRecommendations.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingVertical: 12 }}>
                <ActivityIndicator size="small" color="#6EE7B7" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Analizando estado del vehículo...</Text>
              </View>
            ) : healthRecommendations.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldAlertIcon size={18} color="#F59E0B" />
                  <Text style={gs.sectionTitle}>Recomendaciones según desgaste</Text>
                </View>
                <Text style={[gs.sectionSub, { marginBottom: 12 }]}>Servicios sugeridos según el estado de tu vehículo</Text>

                <FlatList
                  horizontal
                  data={healthRecommendations}
                  keyExtractor={(_, idx) => `rec-${idx}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 8 }}
                  renderItem={({ item: rec }) => {
                    const svc = rec.service;
                    const isSelected = svc && Array.isArray(formData.servicios_seleccionados) &&
                      formData.servicios_seleccionados.some((s) => s.id === svc.id);
                    return (
                      <TouchableOpacity
                        style={[gs.recCard, isSelected && gs.recCardSelected]}
                        onPress={() => svc && toggleServicioSeleccionado(svc)}
                        activeOpacity={0.8}
                        disabled={!svc}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getLevelColor(rec.componentLevel) }} />
                          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={2}>
                            {svc?.nombre?.trim() ||
                              `Revisión sugerida (${rec.componentName})`}
                          </Text>
                          {isSelected && <CheckCircle2Icon size={18} color="#10B981" />}
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10, lineHeight: 17 }} numberOfLines={3}>
                          Desgaste estimado en «{rec.componentName}»: {Math.round(rec.componentHealth)}% de vida útil
                          {rec.kmRestantes != null
                            ? ` · ~${rec.kmRestantes.toLocaleString()} km hasta próx. revisión`
                            : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                          {svc?.precio_referencia != null && (
                            <Text style={{ color: '#6EE7B7', fontSize: 13, fontWeight: '700' }}>
                              ~${Number(svc.precio_referencia).toLocaleString('es-CL')}
                            </Text>
                          )}
                          {svc?.duracion_estimada && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <ClockIcon size={11} color="rgba(255,255,255,0.4)" />
                              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{svc.duracion_estimada}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : null}

            {/* ── Services Section ── */}
            <View style={{ marginBottom: 16 }}>
              <Text style={gs.sectionTitle}>Servicios disponibles</Text>
              <Text style={[gs.sectionSub, { marginBottom: 12 }]}>
                Selecciona los servicios que necesitas para tu {vehicle.marca_nombre} {vehicle.modelo_nombre}
              </Text>

              {/* Category Tabs */}
              {categoriasConServicios.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }} bounces={false}>
                  <TouchableOpacity
                    style={[gs.catTab, !categoriaSeleccionada && gs.catTabActive]}
                    onPress={() => setCategoriaSeleccionada(null)}
                  >
                    <Text style={[gs.catTabText, !categoriaSeleccionada && gs.catTabTextActive]}>Todos</Text>
                  </TouchableOpacity>
                  {categoriasConServicios.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[gs.catTab, categoriaSeleccionada?.id === cat.id && gs.catTabActive]}
                      onPress={() => setCategoriaSeleccionada(cat)}
                    >
                      <Text style={[gs.catTabText, categoriaSeleccionada?.id === cat.id && gs.catTabTextActive]}>{cat.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Service Cards */}
              {serviciosQueryPending ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#6EE7B7" />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 13 }}>Cargando servicios...</Text>
                </View>
              ) : serviciosFiltrados.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {serviciosFiltrados.map((servicio) => {
                    const isSelected = Array.isArray(formData.servicios_seleccionados) &&
                      formData.servicios_seleccionados.some((s) => s.id === servicio.id);
                    return (
                      <GlassCard
                        key={servicio.id}
                        style={[{ gap: 6 }, isSelected && { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.08)' }]}
                        onPress={() => toggleServicioSeleccionado(servicio)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={2}>{servicio.nombre}</Text>
                          {isSelected && <CheckCircle2Icon size={20} color="#10B981" />}
                        </View>
                        {servicio.descripcion ? (
                          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{servicio.descripcion}</Text>
                        ) : null}
                        {servicio.precio_referencia != null ? (
                          <Text style={{ color: '#6EE7B7', fontSize: 13, fontWeight: '600' }}>
                            Desde ${Number(servicio.precio_referencia).toLocaleString('es-CL')}
                          </Text>
                        ) : null}
                      </GlassCard>
                    );
                  })}
                </View>
              ) : (
                <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Wrench size={28} color="rgba(255,255,255,0.3)" />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 13 }}>No hay servicios disponibles para este vehículo</Text>
                </GlassCard>
              )}
            </View>

            {/* ── Selected Counter ── */}
            {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0 && (
              <View style={gs.selectedBadge}>
                <CheckCircle2Icon size={16} color="#10B981" />
                <Text style={{ color: '#6EE7B7', fontSize: 13, fontWeight: '600' }}>
                  {formData.servicios_seleccionados.length} servicio{formData.servicios_seleccionados.length !== 1 ? 's' : ''} seleccionado{formData.servicios_seleccionados.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const renderPaso1 = () => {
    // All non-precompra flows use the unified dashboard layout
    if (!formData.sin_vehiculo_registrado) {
      return renderDashboardPaso1();
    }

    // Flujo sin vehículo (precompra): no pedir auto registrado en este paso.
    if (formData.sin_vehiculo_registrado) {
      const nombreServicio = formData.servicios_seleccionados?.[0]?.nombre || 'servicio';
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.pasoTitle}>Servicio sin vehículo registrado</Text>
          <Text style={styles.pasoDescripcion}>
            Solicitas {nombreServicio} sin asociar un auto a tu cuenta. Continúa con urgencia, tipo de solicitud,
            dirección y fecha.
          </Text>
        </View>
      );
    }

    // Si no hay vehículos pasados como prop, usar VehicleSelector que los carga automáticamente
    const vehiculosDisponibles = vehiculos && vehiculos.length > 0 ? vehiculos : [];

    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>Selecciona tu vehículo</Text>
        <Text style={styles.pasoDescripcion}>
          Elige el vehículo para el cual necesitas el servicio
        </Text>

        {vehiculosDisponibles.length > 0 ? (
          <View style={styles.vehiculosList}>
            {vehiculosDisponibles.map((vehiculo) => (
              <TouchableOpacity
                key={vehiculo.id}
                style={[
                  styles.vehiculoCard,
                  formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardSeleccionado
                ]}
                onPress={() => handleVehiculoToggle(vehiculo)}
              >
                <View style={styles.vehiculoCardContent}>
                  <CarIcon
                    size={22}
                    color={formData.vehiculo?.id === vehiculo.id ? '#93C5FD' : 'rgba(255,255,255,0.4)'}
                  />
                  <View style={styles.vehiculoCardInfo}>
                    <Text style={[
                      styles.vehiculoCardNombre,
                      formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardNombreSeleccionado
                    ]}>
                      {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
                    </Text>
                    <Text style={styles.vehiculoCardDetalles}>
                      {vehiculo.year} • {vehiculo.patente || vehiculo.placa} • {vehiculo.kilometraje?.toLocaleString() || 0} km
                    </Text>
                  </View>
                  {formData.vehiculo?.id === vehiculo.id && (
                    <CheckCircle2Icon size={20} color="#6EE7B7" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <VehicleSelector
            onVehicleChange={(vehiculo) => {
              // Si se pasa null, deseleccionar
              if (!vehiculo) {
                handleDeseleccionarVehiculo();
              } else {
                setFormData(prev => ({ ...prev, vehiculo }));
              }
            }}
            currentVehicle={formData.vehiculo}
          />
        )}

        {/* Quien ya tiene autos registrados pero quiere precompra de OTRO auto no registrado */}
        {vehiculosDisponibles.length > 0 && !formData.sin_vehiculo_registrado && (
          <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={[styles.pasoDescripcion, { marginBottom: 8 }]}>
              ¿Vas a comprar un auto y aún no lo tienes en la app? Puedes pedir inspección precompra sin elegir un vehículo tuyo.
            </Text>
            <TouchableOpacity
              style={[styles.opcionCard, { marginBottom: 0 }]}
              onPress={activarPrecompraSinVehiculo}
              disabled={cargandoPrecompra}
              activeOpacity={0.7}
            >
              {cargandoPrecompra ? (
                <ActivityIndicator color="#6EE7B7" />
              ) : (
                <>
                  <Search size={22} color="#93C5FD" />
                  <View style={styles.opcionContent}>
                    <Text style={styles.opcionTitle}>Inspección precompra (auto no registrado)</Text>
                    <Text style={styles.opcionDescripcion}>
                      La solicitud no quedará ligada a ninguno de tus vehículos actuales
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {formData.vehiculo && (
          <View style={styles.vehiculoSeleccionado}>
            <View style={styles.vehiculoSeleccionadoContent}>
              <CheckCircle2Icon size={18} color="#6EE7B7" />
              <Text style={styles.vehiculoText}>
                {formData.vehiculo.marca_nombre} {formData.vehiculo.modelo_nombre} ({formData.vehiculo.year})
              </Text>
              <TouchableOpacity onPress={handleDeseleccionarVehiculo} style={styles.deseleccionarVehiculoButton} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderPaso2 = () => null;

  const renderPaso3 = () => {
    // Si hay servicio y proveedor preseleccionados pero no hay vehículo, mostrar selector de vehículo primero
    const necesitaSeleccionarVehiculo = tieneProveedorPreseleccionado &&
      tieneServicioPreseleccionado &&
      !formData.vehiculo &&
      !formData.sin_vehiculo_registrado;

    if (necesitaSeleccionarVehiculo) {
      return (
        <View style={styles.pasoContainer}>
          <Text style={styles.pasoTitle}>Selecciona tu vehículo</Text>
          <Text style={styles.pasoDescripcion}>Elige el vehículo para el cual necesitas el servicio</Text>

          {formData.proveedores_dirigidos.length > 0 && (
            <View style={[styles.infoBox, { marginBottom: 14 }]}>
              <Ionicons name="information-circle" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBoxText}>Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor seleccionado'}</Text>
              </View>
            </View>
          )}

          {vehiculos.length > 0 ? (
            <View style={styles.vehiculosList}>
              {vehiculos.map((vehiculo) => (
                <TouchableOpacity
                  key={vehiculo.id}
                  style={[styles.vehiculoCard, formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardSeleccionado]}
                  onPress={() => handleVehiculoToggle(vehiculo)}
                >
                  <View style={styles.vehiculoCardContent}>
                    <CarIcon size={22} color={formData.vehiculo?.id === vehiculo.id ? '#60A5FA' : 'rgba(255,255,255,0.3)'} />
                    <View style={styles.vehiculoCardInfo}>
                      <Text style={[styles.vehiculoCardNombre, formData.vehiculo?.id === vehiculo.id && styles.vehiculoCardNombreSeleccionado]}>
                        {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
                      </Text>
                      <Text style={styles.vehiculoCardDetalles}>{vehiculo.year} · {vehiculo.patente}</Text>
                    </View>
                    {formData.vehiculo?.id === vehiculo.id && <CheckCircle2Icon size={22} color="#60A5FA" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
              <CarIcon size={32} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
            </GlassCard>
          )}
        </View>
      );
    }

    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitle}>¿Qué tan urgente es?</Text>
        <Text style={styles.pasoDescripcion}>Selecciona el nivel de urgencia del servicio</Text>

        {tieneProveedorPreseleccionado && formData.proveedores_dirigidos.length > 0 && (
          <View style={[styles.infoBox, { marginBottom: 14 }]}>
            <Ionicons name="information-circle" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBoxText}>Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor'}</Text>
            </View>
          </View>
        )}

        <GlassCard
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
            formData.urgencia === 'normal' && { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.08)' }]}
          onPress={() => setFormData(prev => ({ ...prev, urgencia: 'normal' }))}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <ClockIcon size={20} color="#6EE7B7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.opcionTitle}>Normal</Text>
            <Text style={styles.opcionDescripcion}>Puede esperar unos días</Text>
          </View>
          {formData.urgencia === 'normal' && <CheckCircle2Icon size={22} color="#6EE7B7" />}
        </GlassCard>

        <GlassCard
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
            formData.urgencia === 'urgente' && { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' }]}
          onPress={() => setFormData(prev => ({ ...prev, urgencia: 'urgente' }))}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.opcionTitle}>Urgente</Text>
            <Text style={styles.opcionDescripcion}>Necesito el servicio lo antes posible</Text>
          </View>
          {formData.urgencia === 'urgente' && <CheckCircle2Icon size={22} color="#F59E0B" />}
        </GlassCard>

        {/* Precompra sin vehículo: comentario obligatorio para detallar el auto a inspeccionar */}
        {formData.sin_vehiculo_registrado && (
          <View style={styles.descripcionContainer}>
            <Text style={styles.descripcionLabel}>
              Comentario obligatorio: indica marca, modelo, año y observaciones del vehículo a inspeccionar
            </Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Ej: Chevrolet Sail 2016, 145.000 km, quiero revisar motor, caja y estado general antes de compra."
              value={formData.descripcion_problema || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion_problema: text || '' }))}
              textAlignVertical="top"
            />
          </View>
        )}

        <View style={{ marginVertical: 16 }} />

        {/* Repuestos selection */}
        {(() => {
          // Regla de negocio: en precompra sin vehículo no se muestra esta pregunta.
          if (formData.sin_vehiculo_registrado) {
            return null;
          }

          // Verificar si todos los servicios seleccionados son SOLO de "diagnóstico e inspección"
          const serviciosSeleccionados = Array.isArray(formData.servicios_seleccionados) ? formData.servicios_seleccionados : [];

          // Si no hay servicios seleccionados, mostrar la sección de repuestos
          if (serviciosSeleccionados.length === 0) {
            // Mostrar siempre si no hay servicios (caso por defecto)
          } else {
            // Buscar información de categoría en cada servicio seleccionado
            // Primero intentar desde el servicio seleccionado, luego buscar en serviciosDisponibles
            const todosSonDiagnosticoInspeccion = serviciosSeleccionados.every(servicioSeleccionado => {
              if (!servicioSeleccionado) return false;

              // Intentar obtener el nombre de la categoría desde diferentes fuentes
              let categoriaNombre = '';

              // 1. Desde el servicio seleccionado directamente
              categoriaNombre = servicioSeleccionado.categoria_nombre || '';

              // 2. Si no está en el servicio seleccionado, buscar en serviciosDisponibles
              if (!categoriaNombre && servicioSeleccionado.id) {
                const servicioCompleto = serviciosDisponibles.find(s => s.id === servicioSeleccionado.id);
                if (servicioCompleto) {
                  categoriaNombre = servicioCompleto.categoria_nombre || '';

                  // También buscar en categorías de las categorías cargadas
                  if (!categoriaNombre && servicioCompleto.categorias_ids && servicioCompleto.categorias_ids.length > 0) {
                    const categoriaId = servicioCompleto.categorias_ids[0];
                    const categoriaEncontrada = categorias.find(c => c.id === categoriaId);
                    if (categoriaEncontrada) {
                      categoriaNombre = categoriaEncontrada.nombre || '';
                    }
                  }
                }
              }

              // Normalizar el nombre de la categoría
              categoriaNombre = (categoriaNombre || '').toLowerCase().trim();

              // Debug log
              console.log('🔍 Verificando categoría de servicio:', {
                servicioId: servicioSeleccionado.id,
                servicioNombre: servicioSeleccionado.nombre,
                categoriaNombre: categoriaNombre,
                esDiagnostico: categoriaNombre.includes('diagnóstico') || categoriaNombre.includes('diagnostico') || categoriaNombre.includes('inspección') || categoriaNombre.includes('inspeccion')
              });

              // Verificar si contiene palabras clave de diagnóstico e inspección
              const esDiagnosticoInspeccion =
                categoriaNombre.includes('diagnóstico') ||
                categoriaNombre.includes('diagnostico') ||
                categoriaNombre.includes('inspección') ||
                categoriaNombre.includes('inspeccion') ||
                categoriaNombre === 'diagnóstico e inspección' ||
                categoriaNombre === 'diagnostico e inspeccion' ||
                categoriaNombre.startsWith('diagnóstico') ||
                categoriaNombre.startsWith('diagnostico');

              return esDiagnosticoInspeccion;
            });

            console.log('✅ Resultado verificación diagnóstico:', {
              totalServicios: serviciosSeleccionados.length,
              todosSonDiagnostico: todosSonDiagnosticoInspeccion
            });

            // Si TODOS los servicios son SOLO de diagnóstico e inspección, NO mostrar la sección
            if (todosSonDiagnosticoInspeccion) {
              return null; // No mostrar la sección de repuestos
            }
          }

          // Mostrar la sección de repuestos
          return (
            <>
              <Text style={styles.pasoTitle}>¿Necesitas repuestos?</Text>
              <Text style={styles.pasoDescripcion}>Selecciona si el servicio requiere repuestos o solo mano de obra</Text>

              <GlassCard
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
                  formData.requiere_repuestos === true && { borderColor: 'rgba(96,165,250,0.5)', backgroundColor: 'rgba(96,165,250,0.08)' }]}
                onPress={() => setFormData(prev => ({ ...prev, requiere_repuestos: true }))}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionTitle}>Con Repuestos</Text>
                  <Text style={styles.opcionDescripcion}>El servicio incluye repuestos y mano de obra</Text>
                </View>
                {formData.requiere_repuestos === true && <CheckCircle2Icon size={22} color="#60A5FA" />}
              </GlassCard>

              <GlassCard
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
                  formData.requiere_repuestos === false && { borderColor: 'rgba(168,85,247,0.5)', backgroundColor: 'rgba(168,85,247,0.08)' }]}
                onPress={() => setFormData(prev => ({ ...prev, requiere_repuestos: false }))}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={20} color="#A855F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionTitle}>Sin Repuestos</Text>
                  <Text style={styles.opcionDescripcion}>Solo necesito mano de obra</Text>
                </View>
                {formData.requiere_repuestos === false && <CheckCircle2Icon size={22} color="#A855F7" />}
              </GlassCard>
            </>
          );
        })()}
      </View>
    );
  };

  const navigateToProviderProfile = (proveedor, tipo) => {
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: proveedor.id,
      type: tipo,
      provider: proveedor,
      fromSolicitud: true,
    });
  };

  const renderProviderCard = (proveedor, tipo) => {
    const userId = proveedor.usuario?.id || proveedor.usuario || proveedor.id;
    const estaSeleccionado = formData.proveedores_dirigidos.some(p => {
      const pId = p.usuario?.id || p.usuario || p.usuario_id || p.id;
      return pId === userId && p.tipo === tipo;
    });

    const fotoUrl = proveedor?.usuario?.foto_perfil || proveedor?.foto_perfil;
    const hasPhoto = typeof fotoUrl === 'string' && fotoUrl.startsWith('http');
    const calificacion = parseFloat(proveedor?.calificacion_promedio || 0);
    const totalResenas = proveedor?.total_resenas ?? proveedor?.numero_de_calificaciones ?? 0;
    const specialtyText = getProviderSpecialty ? getProviderSpecialty(proveedor, null) : null;
    const direccion = proveedor?.direccion_fisica?.direccion_completa || proveedor?.direccion;

    return (
      <GlassCard
        key={`${tipo}-${proveedor.id}`}
        style={[{ padding: 0, overflow: 'hidden' }, estaSeleccionado && { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.06)' }]}
        onPress={() => toggleProveedorSeleccionado(proveedor, tipo)}
      >
        {/* Image Section (4:3 aspect) */}
        <View style={{ width: '100%', aspectRatio: 16 / 7, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          {hasPhoto ? (
            <Image source={{ uri: fotoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {tipo === 'taller' ? <Building2 size={32} color="rgba(255,255,255,0.2)" /> : <UserIcon size={32} color="rgba(255,255,255,0.2)" />}
            </View>
          )}
          {/* Type badge */}
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>
              {tipo === 'taller' ? 'Taller' : 'A domicilio'}
            </Text>
          </View>
          {/* Selection indicator */}
          {estaSeleccionado && (
            <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#10B981', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={14} color="#FFF" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ padding: 14, gap: 4 }}>
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
            {proveedor.nombre || (tipo === 'taller' ? 'Taller' : 'Mecánico')}
          </Text>
          {specialtyText && (
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} numberOfLines={1}>{specialtyText}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            {direccion ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                <MapPin size={12} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, flex: 1 }} numberOfLines={1}>{String(direccion)}</Text>
              </View>
            ) : <View />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              {calificacion > 0 ? (
                <>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{calificacion.toFixed(1)}</Text>
                  {totalResenas > 0 && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>({totalResenas})</Text>}
                </>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontStyle: 'italic' }}>Nuevo</Text>
              )}
            </View>
          </View>

          {/* View Profile link */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' }}
            onPress={() => navigateToProviderProfile(proveedor, tipo)}
            activeOpacity={0.7}
          >
            <Eye size={14} color="#60A5FA" />
            <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '600' }}>Ver perfil</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  const renderPaso4 = () => {
    if (tieneProveedorPreseleccionado && !formData.sin_vehiculo_registrado) return null;

    if (!formData.vehiculo && !formData.sin_vehiculo_registrado) {
      return (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <Text style={{ color: '#EF4444', fontSize: 14, textAlign: 'center', marginTop: 20 }}>Primero debes seleccionar un vehículo</Text>
        </View>
      );
    }

    const todosProveedores = [...proveedoresDisponibles.talleres, ...proveedoresDisponibles.mecanicos];

    return (
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text style={gs.sectionTitle}>Tipo de solicitud</Text>
        <Text style={[gs.sectionSub, { marginBottom: 14 }]}>¿Quieres que todos los proveedores vean tu solicitud o solo algunos específicos?</Text>

        {/* Global option */}
        <GlassCard
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
            formData.tipo_solicitud === 'global' && { borderColor: 'rgba(96,165,250,0.5)', backgroundColor: 'rgba(96,165,250,0.08)' }]}
          onPress={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'global', proveedores_dirigidos: [] }))}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="#60A5FA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>Abierta a Todos</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
              {formData.sin_vehiculo_registrado || !formData.vehiculo
                ? 'Todos los proveedores que ofrezcan el servicio'
                : `Todos los proveedores que atienden tu ${formData.vehiculo.marca_nombre}`}
            </Text>
          </View>
          {formData.tipo_solicitud === 'global' && <CheckCircle2Icon size={22} color="#60A5FA" />}
        </GlassCard>

        {/* Directed option */}
        <GlassCard
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
            formData.tipo_solicitud === 'dirigida' && { borderColor: 'rgba(168,85,247,0.5)', backgroundColor: 'rgba(168,85,247,0.08)' }]}
          onPress={() => setFormData(prev => ({ ...prev, tipo_solicitud: 'dirigida' }))}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#A855F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>Solo Proveedores Específicos</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>Selecciona hasta 3 proveedores</Text>
          </View>
          {formData.tipo_solicitud === 'dirigida' && <CheckCircle2Icon size={22} color="#A855F7" />}
        </GlassCard>

        {/* Provider list */}
        {formData.tipo_solicitud === 'dirigida' && (
          <View>
            <Text style={[gs.sectionSub, { marginBottom: 12 }]}>
              {Array.isArray(formData.servicios_seleccionados) && formData.servicios_seleccionados.length > 0
                ? (formData.sin_vehiculo_registrado || !formData.vehiculo
                    ? 'Proveedores que ofrecen el servicio'
                    : `Proveedores para tu ${formData.vehiculo.marca_nombre}`)
                : 'Proveedores disponibles'}
            </Text>

            {cargandoProveedores ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6EE7B7" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 13 }}>Cargando proveedores...</Text>
              </View>
            ) : todosProveedores.length === 0 ? (
              <GlassCard style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Building2 size={32} color="rgba(255,255,255,0.3)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10, fontSize: 13, textAlign: 'center' }}>
                  No hay proveedores disponibles. Prueba solicitud abierta a todos.
                </Text>
              </GlassCard>
            ) : (
              <View style={{ gap: 12 }}>
                {proveedoresDisponibles.talleres.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Building2 size={16} color="rgba(255,255,255,0.5)" />
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                        Talleres ({proveedoresDisponibles.talleres.length})
                      </Text>
                    </View>
                    {proveedoresDisponibles.talleres.map((t) => renderProviderCard(t, 'taller'))}
                  </>
                )}

                {proveedoresDisponibles.mecanicos.length > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 }}>
                      <Wrench size={16} color="rgba(255,255,255,0.5)" />
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                        Mecánicos a Domicilio ({proveedoresDisponibles.mecanicos.length})
                      </Text>
                    </View>
                    {proveedoresDisponibles.mecanicos.map((m) => renderProviderCard(m, 'mecanico'))}
                  </>
                )}
              </View>
            )}

            {formData.proveedores_dirigidos.length > 0 && (
              <View style={[gs.selectedBadge, { marginTop: 14 }]}>
                <CheckCircle2Icon size={16} color="#A855F7" />
                <Text style={{ color: '#C084FC', fontSize: 13, fontWeight: '600' }}>
                  {formData.proveedores_dirigidos.length} de 3 proveedores seleccionados
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPaso5 = () => (
    <View style={styles.pasoContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <MapPinned size={20} color="#6EE7B7" />
        <Text style={styles.pasoTitle}>Ubicación del servicio</Text>
      </View>
      <Text style={styles.pasoDescripcion}>Selecciona una dirección registrada o ingresa una nueva</Text>

      {tieneProveedorPreseleccionado && formData.proveedores_dirigidos.length > 0 && (
        <View style={[styles.infoBox, { marginBottom: 14 }]}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBoxText}>Solicitud dirigida a {formData.proveedores_dirigidos[0]?.nombre || 'proveedor'}</Text>
          </View>
        </View>
      )}

      <AddressSelector
        currentAddress={formData.direccion_usuario}
        glassStyle
        onAddressChange={(direccion) => {
          setFormData(prev => ({
            ...prev,
            direccion_usuario: direccion,
            direccion_servicio_texto: direccion?.direccion || '',
            ubicacion_servicio: direccion?.ubicacion || null
          }));
        }}
      />

      {formData.direccion_usuario && (
        <GlassCard style={{ marginTop: 12, borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={16} color="#6EE7B7" />
            <Text style={{ color: '#6EE7B7', fontSize: 14, fontWeight: '600', flex: 1 }}>{formData.direccion_usuario.direccion}</Text>
          </View>
          {formData.direccion_usuario.detalles && (
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginLeft: 24 }}>{formData.direccion_usuario.detalles}</Text>
          )}
        </GlassCard>
      )}

      <TextInput
        style={[styles.textInput, { marginTop: 14 }]}
        placeholder="Detalles adicionales (opcional)"
        value={formData.detalles_ubicacion}
        onChangeText={(text) => setFormData(prev => ({ ...prev, detalles_ubicacion: text }))}
        placeholderTextColor="rgba(255,255,255,0.25)"
      />
    </View>
  );

  const validarFecha = (fecha) => {
    if (!fecha) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) return false;
    const date = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today && !isNaN(date.getTime());
  };

  const validarHora = (hora) => {
    if (!hora) return true; // Hora es opcional
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(hora);
  };

  // Función auxiliar para formatear fecha a YYYY-MM-DD
  const formatearFechaYYYYMMDD = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('❌ Error: fecha inválida para formatear:', date);
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-11, necesitamos 1-12
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Funciones para el calendario
  const generarCalendario = () => {
    const year = mesCalendario.getFullYear();
    const month = mesCalendario.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendario = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Días del mes anterior
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const prevMonthDate = new Date(year, month, -i); // -i nos da los días del mes anterior
      const fechaStr = formatearFechaYYYYMMDD(prevMonthDate);
      calendario.push({
        day: prevMonthDate.getDate(),
        isCurrentMonth: false,
        date: prevMonthDate,
        fecha: fechaStr,
        disponible: false
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const fecha = new Date(year, month, day);
      const fechaStr = formatearFechaYYYYMMDD(fecha);
      calendario.push({
        day,
        isCurrentMonth: true,
        date: fecha,
        fecha: fechaStr,
        disponible: fecha >= hoy
      });
    }

    // Completar con días del siguiente mes
    const remainingDays = 42 - calendario.length;
    for (let day = 1; day <= remainingDays; day++) {
      const fecha = new Date(year, month + 1, day);
      const fechaStr = formatearFechaYYYYMMDD(fecha);
      calendario.push({
        day,
        isCurrentMonth: false,
        date: fecha,
        fecha: fechaStr,
        disponible: false
      });
    }

    return calendario;
  };

  const cambiarMes = (direccion) => {
    setMesCalendario(prev => {
      const nuevoMes = new Date(prev);
      nuevoMes.setMonth(prev.getMonth() + direccion);
      return nuevoMes;
    });
  };

  const seleccionarFecha = (fechaStr) => {
    console.log('📅 Fecha seleccionada:', fechaStr);
    // Validar que la fecha esté en formato YYYY-MM-DD
    const regexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexYYYYMMDD.test(fechaStr)) {
      console.error('❌ Error: Fecha no está en formato YYYY-MM-DD:', fechaStr);
      Alert.alert('Error', 'La fecha seleccionada tiene un formato inválido. Por favor, intenta nuevamente.');
      return;
    }
    console.log('✅ Fecha validada correctamente:', fechaStr);
    setFormData({ ...formData, fecha_preferida: fechaStr });
    setMostrarCalendario(false);
  };

  // Generar horas disponibles (cada 30 minutos de 8:00 a 20:00)
  const generarHorasDisponibles = () => {
    const horas = [];
    for (let hora = 8; hora < 20; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
        horas.push(horaStr);
      }
    }
    return horas;
  };

  const seleccionarHora = (hora) => {
    setFormData(prev => ({ ...prev, hora_preferida: hora }));
    setMostrarSelectorHora(false);
  };

  const diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const renderPaso6 = () => {
    const calendario = generarCalendario();
    const horasDisponibles = generarHorasDisponibles();

    return (
      <View style={styles.pasoContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CalendarDays size={20} color="#6EE7B7" />
          <Text style={styles.pasoTitle}>Fecha y hora preferida</Text>
        </View>
        <Text style={styles.pasoDescripcion}>¿Cuándo te gustaría recibir el servicio?</Text>

        {/* Date picker button */}
        <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }} onPress={() => setMostrarCalendario(true)}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} color="#60A5FA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Fecha</Text>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>
              {formData.fecha_preferida ? formatDate(formData.fecha_preferida) : 'Seleccionar fecha'}
            </Text>
          </View>
          <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
        </GlassCard>

        {/* Time picker button */}
        <GlassCard
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
            !formData.fecha_preferida && { opacity: 0.5 }]}
          onPress={() => {
            if (!formData.fecha_preferida) {
              Alert.alert('Selecciona fecha primero', 'Debes seleccionar una fecha antes de elegir la hora');
              return;
            }
            setMostrarSelectorHora(true);
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <ClockIcon size={20} color="#A855F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Hora (Opcional)</Text>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>
              {formData.hora_preferida ? formatTime(formData.hora_preferida) : 'Seleccionar hora'}
            </Text>
          </View>
          <ChevronRightIcon size={18} color="rgba(255,255,255,0.3)" />
        </GlassCard>

        {/* Preview */}
        {formData.fecha_preferida && validarFecha(formData.fecha_preferida) && (
          <View style={[gs.selectedBadge, { marginTop: 4, marginBottom: 0 }]}>
            <CheckCircle2Icon size={16} color="#10B981" />
            <Text style={{ color: '#6EE7B7', fontSize: 13, fontWeight: '600' }}>
              {formatDate(formData.fecha_preferida)}
              {formData.hora_preferida && validarHora(formData.hora_preferida) && ` a las ${formatTime(formData.hora_preferida)}`}
            </Text>
          </View>
        )}

        {/* Calendar Modal */}
        <Modal visible={mostrarCalendario} transparent animationType="slide" onRequestClose={() => setMostrarCalendario(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.descModal}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>Seleccionar Fecha</Text>
                <TouchableOpacity onPress={() => setMostrarCalendario(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-back" size={20} color="#60A5FA" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>{mesesNombres[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}</Text>
                <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-forward" size={20} color="#60A5FA" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarDaysHeader}>
                {diasSemana.map((dia, i) => (
                  <Text key={i} style={styles.calendarDayLabel}>{dia}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendario.map((dia, index) => {
                  const esSeleccionado = dia.fecha === formData.fecha_preferida;
                  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                  const esHoy = dia.date.getTime() === hoy.getTime();
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.calendarDay, esHoy && styles.calendarDayToday, esSeleccionado && styles.calendarDaySelected, !dia.disponible && { opacity: 0.3 }]}
                      onPress={() => dia.disponible && seleccionarFecha(dia.fecha)}
                      disabled={!dia.disponible}
                    >
                      <Text style={[styles.calendarDayText, !dia.isCurrentMonth && { opacity: 0.3 }, esSeleccionado && styles.calendarDayTextSelected]}>
                        {dia.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Time Modal */}
        <Modal visible={mostrarSelectorHora} transparent animationType="slide" onRequestClose={() => setMostrarSelectorHora(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.descModal}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>Seleccionar Hora</Text>
                <TouchableOpacity onPress={() => setMostrarSelectorHora(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                <View style={styles.timeGrid}>
                  {horasDisponibles.map((hora) => {
                    const sel = hora === formData.hora_preferida;
                    return (
                      <TouchableOpacity key={hora} style={[styles.timeButton, sel && styles.timeButtonSelected]} onPress={() => seleccionarHora(hora)}>
                        <Text style={[styles.timeButtonText, sel && styles.timeButtonTextSelected]}>{hora}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.descModalCancelBtn, { marginTop: 12 }]}
                onPress={() => { setFormData(prev => ({ ...prev, hora_preferida: '' })); setMostrarSelectorHora(false); }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' }}>Limpiar hora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderPaso = () => {
    switch (pasoActual) {
      case 1: return renderPaso1();
      case 2: return renderPaso2();
      case 3: return renderPaso3();
      case 4: return renderPaso4();
      case 5: return renderPaso5();
      case 6: return renderPaso6();
      default: return null;
    }
  };

  // Calcular el paso visual para mostrar en la barra de progreso
  // Cuando hay servicio y/o proveedor preseleccionado, mapear pasos reales a pasos visuales
  const getPasoVisual = () => {
    // Pre-compra marketplace: 4 visual steps (3→4→5→6)
    if (isPreCompra) {
      const mapaPasos = { 3: 1, 4: 2, 5: 3, 6: 4 };
      return mapaPasos[pasoActual] || pasoActual;
    }

    // flujoCuatroPasos: 4 visual steps (1→3→5→6)
    if (flujoCuatroPasos) {
      const mapaPasos = { 1: 1, 3: 2, 5: 3, 6: 4 };
      return mapaPasos[pasoActual] || pasoActual;
    }

    // All other flows: 5 visual steps (1→3→4→5→6)
    {
      const mapaPasos = {
        1: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5
      };
      return mapaPasos[pasoActual] || pasoActual;
    }

    return pasoActual;
  };

  const pasoVisual = getPasoVisual();

  const navBarBottomPad = (contentPaddingBottom || 0) + 10;
  const solicitudFooterClearance = 10 + 52 + navBarBottomPad;

  // Determinar si estamos en el último paso real
  const esUltimoPaso = () => {
    if (flujoCuatroPasos) {
      // Flujo de 4 pasos: 1→3→5→6 (paso 6 es el último)
      return pasoActual === 6;
    } else if (tieneServicioPreseleccionado) {
      // Flujo de 5 pasos: 1→3→4→5→6 (paso 6 es el último)
      return pasoActual === 6;
    } else {
      // Flujo normal de 6 pasos: 1→2→3→4→5→6 (paso 6 es el último)
      return pasoActual === 6;
    }
  };

  return (
    <View style={styles.container}>
      {/* Glass progress bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Paso {pasoVisual} de {totalPasos}</Text>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#007EA7', '#00A8E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${(pasoVisual / totalPasos) * 100}%` }]}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollMain}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom:
            20 +
            (pasoActual === 4 && formData.proveedores_dirigidos.length > 0 ? 12 : 0) +
            solicitudFooterClearance,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderPaso()}
      </ScrollView>

      {/* Glass navigation bar */}
      <View
        style={[
          styles.navBar,
          {
            paddingBottom: navBarBottomPad,
            position: Platform.OS === 'web' ? 'fixed' : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
        ]}
      >
        {pasoActual === 1 && onExit ? (
          <TouchableOpacity onPress={onExit} style={styles.navBackBtn} activeOpacity={0.8}>
            <Text style={styles.navBackText}>Salir</Text>
          </TouchableOpacity>
        ) : pasoActual > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.navBackBtn} activeOpacity={0.8}>
            <Text style={styles.navBackText}>Atrás</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity onPress={handleNext} style={{ flex: 2 }} activeOpacity={0.8}>
          <LinearGradient
            colors={['#007EA7', '#00A8E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navNextBtn}
          >
            {esUltimoPaso() && <Send size={16} color="#FFF" style={{ marginRight: 6 }} />}
            <Text style={styles.navNextText}>{esUltimoPaso() ? 'Crear Solicitud' : 'Siguiente'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Description Modal */}
      <Modal visible={descriptionModalVisible} transparent animationType="fade" onRequestClose={() => setDescriptionModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDescriptionModalVisible(false)}>
          <View style={styles.descModal} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <FileTextIcon size={22} color="#6EE7B7" />
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>Describe tu necesidad</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              Cuéntanos qué problema tienes para que los proveedores entiendan tu solicitud.
            </Text>
            <TextInput
              style={styles.descModalInput}
              multiline
              numberOfLines={5}
              placeholder="Ej: Mi auto hace un ruido al frenar..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={tempDescription}
              onChangeText={setTempDescription}
              textAlignVertical="top"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.descModalCancelBtn} onPress={() => setDescriptionModalVisible(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, opacity: tempDescription.trim() ? 1 : 0.4 }}
                onPress={() => {
                  if (tempDescription.trim()) {
                    setFormData((prev) => ({ ...prev, descripcion_problema: tempDescription.trim() }));
                    setDescriptionModalVisible(false);
                    setPasoActual(3);
                  }
                }}
                disabled={!tempDescription.trim()}
              >
                <LinearGradient colors={['#007EA7', '#00A8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Continuar</Text>
                  <ChevronRightIcon size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Glassmorphism shared styles ──
const gs = StyleSheet.create({
  sectionTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  sectionSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  recCard: {
    width: SCREEN_WIDTH * 0.7,
    marginRight: 12,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  recCardSelected: { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.08)' },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  catTabActive: { backgroundColor: 'rgba(96,165,250,0.15)', borderColor: 'rgba(96,165,250,0.4)' },
  catTabText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  catTabTextActive: { color: '#93C5FD', fontWeight: '600' },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollMain: {
    flex: 1,
    minHeight: 0,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  progressText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(3,7,18,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
    zIndex: 30,
  },
  navBackBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navBackText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  navNextBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 14,
  },
  navNextText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  descModal: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  descModalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    color: '#FFF',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  descModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // ── Step container & text ──
  pasoContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pasoTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  pasoDescripcion: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },

  // ── Option cards (urgency, repuestos, etc.) ──
  opcionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  opcionSeleccionada: {
    borderColor: 'rgba(96,165,250,0.5)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  opcionContent: { flex: 1 },
  opcionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  opcionDescripcion: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Vehicle cards ──
  vehiculosList: { gap: 10, marginBottom: 12 },
  vehiculoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  vehiculoCardSeleccionado: {
    borderColor: 'rgba(96,165,250,0.5)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  vehiculoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehiculoCardInfo: { flex: 1 },
  vehiculoCardNombre: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  vehiculoCardNombreSeleccionado: { color: '#93C5FD' },
  vehiculoCardDetalles: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },

  // ── Text inputs ──
  descripcionContainer: { marginTop: 16 },
  descripcionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    color: '#FFF',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // ── Info box ──
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(96,165,250,0.1)',
    borderLeftColor: '#60A5FA',
  },
  infoBoxText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBoxSubtext: {
    color: 'rgba(147,197,253,0.7)',
    fontSize: 12,
    marginTop: 2,
  },

  // ── Loading & empty ──
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },

  // ── Address selector ──
  addressContainer: { gap: 12 },
  inputContainer: { marginBottom: 12 },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    color: '#FFF',
    fontSize: 14,
  },

  // ── Vehicle selected badge ──
  vehiculoSeleccionado: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  vehiculoSeleccionadoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehiculoText: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  deseleccionarVehiculoButton: {
    padding: 4,
  },

  // ── Services grid (kept for legacy) ──
  serviciosGrid: { gap: 10 },

  // ── Calendar styles ──
  calendarContainer: { marginTop: 12 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: 'rgba(96,165,250,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.5)',
    borderRadius: 8,
  },
  calendarDayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayTextSelected: {
    color: '#93C5FD',
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: 'rgba(255,255,255,0.15)',
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },

  // ── Time selector ──
  timeContainer: { marginTop: 20 },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeButtonSelected: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderColor: 'rgba(96,165,250,0.4)',
  },
  timeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#93C5FD',
    fontWeight: '600',
  },

  // ── Provider styles (kept for compatibility) ──
  proveedoresContainer: { marginTop: 14 },
  proveedoresTitle: { color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  proveedoresSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 12, lineHeight: 17 },
  proveedoresList: { maxHeight: 400 },
  proveedoresListContent: { gap: 10 },
  proveedoresSectionTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  mecanicosSection: { marginTop: 16 },
  proveedorCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  proveedorCardSeleccionado: {
    borderColor: 'rgba(16,185,129,0.5)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  proveedorCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proveedorCardInfo: { flex: 1 },
  proveedorCardNombre: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  proveedorCardNombreSeleccionado: { color: '#6EE7B7' },
  proveedorCardDireccion: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  proveedorCardRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  proveedorCardRatingText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  proveedoresSeleccionadosBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginTop: 10,
    backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  proveedoresSeleccionadosText: { color: '#C084FC', fontSize: 13, fontWeight: '600' },

  // ── Avatar ──
  avatarContainer: { overflow: 'hidden' },
  avatarImage: { backgroundColor: 'rgba(255,255,255,0.05)' },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Precompra & misc ──
  cambiarServicioButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(96,165,250,0.1)',
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)',
    alignSelf: 'flex-start',
  },
  cambiarServicioButtonText: { color: '#93C5FD', fontSize: 13, fontWeight: '600' },
  servicioPreseleccionadoCard: {
    padding: 14, borderRadius: 14, marginBottom: 10,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  servicioPreseleccionadoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  servicioPreseleccionadoNombre: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
  servicioPreseleccionadoDescripcion: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 4 },
  servicioPreseleccionadoPrecio: { color: '#6EE7B7', fontSize: 13, fontWeight: '600' },
  serviciosPreseleccionadosContainer: { gap: 10, marginBottom: 12 },

  // ── Address (paso 5) ──
  direccionCard: {
    padding: 14, borderRadius: 14, marginBottom: 10,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  direccionCardSelected: { borderColor: 'rgba(96,165,250,0.5)', backgroundColor: 'rgba(96,165,250,0.08)' },
  direccionCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  direccionCardInfo: { flex: 1 },
  direccionCardNombre: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  direccionCardNombreSelected: { color: '#93C5FD' },
  direccionCardDireccion: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  direccionCardDetalle: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },

  // ── Service selector (paso 2 - unused now, kept for compat) ──
  vistaSelector: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  vistaButton: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  vistaButtonActiva: { backgroundColor: 'rgba(96,165,250,0.15)', borderColor: 'rgba(96,165,250,0.4)' },
  vistaButtonText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  vistaButtonTextActiva: { color: '#93C5FD', fontWeight: '600' },

  scrollView: { flex: 1 },
});

export default FormularioSolicitud;
