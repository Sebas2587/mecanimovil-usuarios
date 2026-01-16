import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';

// Componentes
import AddressSelector from '../../components/forms/AddressSelector';
import CategoryGridCard from '../../components/cards/CategoryGridCard';
// ServiceCard eliminado - ya no se usa (servicios populares eliminados)
// import ServiceCard from '../../components/ServiceCard';
import NearbyTallerCard from '../../components/cards/NearbyTallerCard';
import NearbyMecanicoCard from '../../components/cards/NearbyMecanicoCard';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import MaintenanceAlertCard from '../../components/cards/MaintenanceAlertCard';
import Button from '../../components/base/Button/Button';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';

// Servicios
import * as vehicleService from '../../services/vehicle';
import * as serviceService from '../../services/service';
import * as locationService from '../../services/location';
import * as providerService from '../../services/providers';
import * as categoryService from '../../services/categories';
import * as userService from '../../services/user';
import { getMediaURL } from '../../services/api';
import VehicleHealthService from '../../services/vehicleHealthService';
import websocketService from '../../services/websocketService';
// Servicios populares eliminados - causaban errores
// import { getPopularServices } from '../../services/personalizacion';

/**
 * Pantalla principal del usuario (Home/Dashboard)
 * Muestra información del usuario, vehículos, servicios, proveedores y solicitudes activas
 */
const UserPanelScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = theme?.colors || {};
  // Asegurar que typography tenga todas las propiedades necesarias
  const typography = theme?.typography && theme?.typography?.fontSize && theme?.typography?.fontWeight
    ? theme.typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
      fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    };
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || { radius: {}, width: {} };

  // Crear estilos dinámicos con los tokens del tema
  // Validar que typography tenga todas las propiedades necesarias
  const safeTypography = (typography?.fontSize && typography?.fontWeight && typeof typography?.fontSize?.['2xl'] !== 'undefined')
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
      fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    };

  // Validar que borders esté completamente inicializado
  const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined') ? borders : {
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
  const styles = UserPanelScreenStyles(colors, safeTypography, spacing, safeBorders);

  // Calcular altura del tab bar dinámicamente
  // Altura base del tab bar sin insets (los insets se manejan por separado)
  const baseTabBarHeight = Platform.OS === 'ios' ? 49 : 60;
  // Altura total incluyendo insets inferiores
  const tabBarHeight = baseTabBarHeight + insets.bottom;

  // Contextos
  const {
    solicitudesActivas = [],
    ofertasNuevasCount = 0, // Usar contador en lugar de array
    cargarSolicitudesActivas
  } = useSolicitudes();

  // Determinar si el usuario es cliente
  // Si is_client no está definido, asumir que es cliente (para compatibilidad con usuarios antiguos)
  const isClient = user && (user.is_client === true || user.is_client === undefined);

  // Cargar URL de foto de perfil cuando cambie el usuario
  useEffect(() => {
    // El backend ahora devuelve foto_perfil_url con la URL completa de cPanel
    if (user?.foto_perfil_url) {
      setProfileImageUrl(user.foto_perfil_url);
      console.log('✅ Foto de perfil cargada:', user.foto_perfil_url);
    } else if (user?.foto_perfil) {
      // Fallback: si no hay foto_perfil_url, construir URL con getMediaURL
      const loadProfileImage = async () => {
        try {
          const fullUrl = await getMediaURL(user.foto_perfil);
          setProfileImageUrl(fullUrl);
          console.log('✅ Foto de perfil cargada (fallback):', fullUrl);
        } catch (error) {
          console.error('Error cargando URL de foto de perfil:', error);
          setProfileImageUrl(null);
        }
      };
      loadProfileImage();
    } else {
      setProfileImageUrl(null);
    }
  }, [user?.foto_perfil_url, user?.foto_perfil]);

  // Debug: Verificar valores
  useEffect(() => {
    console.log('UserPanelScreen - user:', user ? { id: user.id, is_client: user.is_client, foto_perfil: user.foto_perfil } : 'null');
    console.log('UserPanelScreen - profileImageUrl:', profileImageUrl);
    console.log('UserPanelScreen - isClient:', isClient);
    console.log('UserPanelScreen - solicitudesActivas:', Array.isArray(solicitudesActivas) ? solicitudesActivas.length : 0);
    console.log('UserPanelScreen - ofertasNuevasCount:', ofertasNuevasCount);
    console.log('UserPanelScreen - activeVehicle:', activeVehicle ? { id: activeVehicle.id, marca: activeVehicle.marca_nombre } : 'null');
    console.log('UserPanelScreen - urgentAlerts:', Array.isArray(urgentAlerts) ? urgentAlerts.length : 0);
    console.log('UserPanelScreen - loadingAlerts:', loadingAlerts);
  }, [user, profileImageUrl, isClient, solicitudesActivas, ofertasNuevasCount, activeVehicle, urgentAlerts, loadingAlerts]);

  // Estados
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [categories, setCategories] = useState([]);
  // Servicios populares eliminados - causaban errores
  // const [services, setServices] = useState([]);
  const [nearbyTalleres, setNearbyTalleres] = useState([]);
  const [nearbyMecanicos, setNearbyMecanicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [urgentAlerts, setUrgentAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [vehiclesData, setVehiclesData] = useState({}); // { vehicleId: { health, serviceCount, imageUrl } }
  const [loadingVehiclesData, setLoadingVehiclesData] = useState(false);

  // Cargar datos iniciales solo al montar
  useEffect(() => {
    loadInitialData();
  }, []); // Sin dependencias - solo al montar

  // En focus, actualizar solo datos críticos (optimizado)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // Si ya se cargó una vez, solo actualizar lo esencial en background
      if (hasLoadedOnce) {
        console.log('🔄 UserPanel - Focus: Actualizando datos críticos (optimizado)');

        // OPTIMIZACIÓN: Solo recargar vehículos si realmente cambió algo
        // Usar cache cuando sea posible
        try {
          const userVehicles = await vehicleService.getUserVehicles(); // Usa cache automático
          
          // Solo actualizar si hay cambios significativos
          const vehiclesChanged = userVehicles.length !== vehicles.length ||
            !userVehicles.every((v, i) => vehicles[i]?.id === v.id);
          
          if (vehiclesChanged) {
            setVehicles(userVehicles);

            // Establecer vehículo activo si hay vehículos disponibles
            if (userVehicles.length > 0) {
              const currentActive = activeVehicle &&
                userVehicles.find(v => v.id === activeVehicle.id)
                ? activeVehicle
                : userVehicles[0];

              if (!activeVehicle || activeVehicle.id !== currentActive.id) {
                setActiveVehicle(currentActive);
              }
            } else {
              setActiveVehicle(null);
            }

            // Solo recargar categorías si cambió el número de vehículos
            if (userVehicles.length > 0) {
              const marcasIds = [...new Set(userVehicles.map(v => v.marca).filter(Boolean))];
              categoryService.getCategoriesByVehicleBrands(marcasIds)
                .then((categoriesData) => setCategories(categoriesData || []))
                .catch((err) => console.warn('⚠️ Error cargando categorías:', err));
            } else {
              setCategories([]);
            }
          }
        } catch (err) {
          console.error('Error recargando vehículos:', err);
        }

        // OPTIMIZACIÓN: Actualizar solicitudes y alertas en background sin bloquear
        if (isClient && cargarSolicitudesActivas) {
          cargarSolicitudesActivas().catch((err) => 
            console.warn('⚠️ Error actualizando solicitudes:', err)
          );
        }
        
        // Recargar alertas (usa cache si no es crítico)
        loadUrgentAlerts(false).catch((err) => 
          console.warn('⚠️ Error actualizando alertas:', err)
        );
      } else {
        // Primera vez que la pantalla recibe focus - cargar todo
        console.log('🚀 UserPanel - Focus inicial: Cargando datos completos');
        loadInitialData();
      }
    });

    return unsubscribe;
  }, [navigation, hasLoadedOnce, isClient, cargarSolicitudesActivas, loadUrgentAlerts, activeVehicle, vehicles.length]);

  // Función para cargar proveedores cercanos (definida antes de loadInitialData)
  // Filtra por marca del vehículo usando el endpoint proveedores_filtrados
  const loadNearbyProviders = useCallback(async (userVehicles, address) => {
    try {
      // Cargar talleres cercanos (filtrados por marca)
      const talleres = await providerService.getWorkshopsForUserVehicles(userVehicles);
      setNearbyTalleres(Array.isArray(talleres) ? talleres.slice(0, 5) : []); // Máximo 5

      // Cargar mecánicos cercanos (filtrados por marca)
      const mecanicos = await providerService.getMechanicsForUserVehicles(userVehicles);
      setNearbyMecanicos(Array.isArray(mecanicos) ? mecanicos.slice(0, 5) : []); // Máximo 5
    } catch (err) {
      console.error('Error cargando proveedores cercanos:', err);
      // No es crítico, continuar sin proveedores cercanos
      setNearbyTalleres([]);
      setNearbyMecanicos([]);
    }
  }, []);

  // Función para cargar datos de vehículos (salud, servicios, imágenes)
  // OPTIMIZACIÓN: Carga en paralelo cuando sea posible
  const loadVehiclesData = useCallback(async (vehiclesList, forceRefresh = false) => {
    const data = {};

    // OPTIMIZACIÓN: Cargar historial de servicios y salud de vehículos en paralelo
    const [historyResult, ...healthResults] = await Promise.allSettled([
      userService.getServicesHistory(), // Historial una sola vez
      ...vehiclesList.map(vehicle => 
        VehicleHealthService.getVehicleHealth(vehicle.id, forceRefresh)
          .catch(err => {
            console.warn(`Error cargando salud de vehículo ${vehicle.id}:`, err);
            return null;
          })
      ),
    ]);

    // Procesar historial de servicios
    let allServices = [];
    if (historyResult.status === 'fulfilled') {
      const history = historyResult.value;
      allServices = Array.isArray(history?.results)
        ? history.results
        : Array.isArray(history)
          ? history
          : [];
    }

    // Procesar cada vehículo en paralelo (imágenes)
    const vehicleDataPromises = vehiclesList.map(async (vehicle, index) => {
      try {
        // Salud del vehículo (ya cargada en paralelo)
        const healthResult = healthResults[index];
        const health = healthResult?.status === 'fulfilled' ? healthResult.value : null;

        // Filtrar servicios del vehículo
        const vehicleServices = allServices.filter(
          (solicitud) =>
            solicitud.vehiculo_detail?.id?.toString() === vehicle.id.toString() ||
            solicitud.vehiculo?.toString() === vehicle.id.toString()
        );

        const serviceCount = vehicleServices.filter(s => s.estado === 'completado').length;

        // Cargar imagen del vehículo (si es necesario construir URL)
        let imageUrl = null;
        if (vehicle.foto) {
          try {
            // Si la foto ya viene como URL completa del servidor, usarla directamente
            if (vehicle.foto.startsWith('http://') || vehicle.foto.startsWith('https://')) {
              imageUrl = vehicle.foto;
            } else {
              // Si viene como ruta relativa, construir URL completa
              imageUrl = await getMediaURL(vehicle.foto);
            }
          } catch (err) {
            console.warn(`Error cargando imagen de vehículo ${vehicle.id}:`, err);
          }
        }

        return { vehicleId: vehicle.id, health, serviceCount, imageUrl };
      } catch (error) {
        console.error(`Error procesando vehículo ${vehicle.id}:`, error);
        return { vehicleId: vehicle.id, health: null, serviceCount: 0, imageUrl: null };
      }
    });

    const vehicleDataResults = await Promise.allSettled(vehicleDataPromises);
    
    // Construir objeto de datos
    vehicleDataResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { vehicleId, ...vehicleData } = result.value;
        data[vehicleId] = vehicleData;
      }
    });

    setVehiclesData(data);
  }, []);

  // Función para cargar alertas urgentes de mantenimiento de TODOS los vehículos
  // OPTIMIZACIÓN: Por defecto usa cache, solo forceRefresh cuando sea necesario
  const loadUrgentAlerts = useCallback(async (forceRefresh = false) => {
    if (!vehicles || vehicles.length === 0) {
      console.log('⚠️ loadUrgentAlerts: No hay vehículos');
      setUrgentAlerts([]);
      return;
    }

    try {
      setLoadingAlerts(true);
      console.log('🔍 Cargando alertas para todos los vehículos:', vehicles.length, forceRefresh ? '(forzando refresh)' : '');

      // Cargar alertas de todos los vehículos en paralelo
      const alertasPromesas = vehicles.map(async (vehicle) => {
        try {
          const healthData = await VehicleHealthService.getVehicleHealth(vehicle.id, forceRefresh);
          const alertasDirectas = Array.isArray(healthData?.alertas) ? healthData.alertas : [];

          // También obtener componentes con alertas críticas/urgentes que no tengan alerta explícita
          const componentesUrgentes = (healthData?.componentes || []).filter(
            comp => comp.requiere_servicio_inmediato ||
              comp.nivel_alerta === 'URGENTE' ||
              comp.nivel_alerta === 'CRITICO' ||
              comp.salud_porcentaje < 30
          );

          // Filtrar alertas activas (cualquier prioridad si es activa)
          const alertasFiltradas = alertasDirectas.filter(
            alerta => {
              // Verificar si está activa explícitamente
              const esActiva = alerta.activa === true || alerta.activa === undefined;

              // Si tiene prioridad, incluir si es >= 2 (al menos media-baja)
              // Si no tiene prioridad pero está activa, incluirla
              const tienePrioridadSuficiente = !alerta.prioridad || alerta.prioridad >= 2;

              return esActiva && tienePrioridadSuficiente;
            }
          );

          // Si hay componentes urgentes sin alertas, crear alertas virtuales para ellos
          const alertasVirtuales = componentesUrgentes
            .filter(comp => {
              // Solo si no hay una alerta directa para este componente
              const componenteId = comp.id || comp.componente_config?.id;
              return !alertasFiltradas.some(a =>
                a.componente_salud_detail?.id === comp.id ||
                a.componente_salud === comp.id
              );
            })
            .map(comp => ({
              id: `virtual_${vehicle.id}_${comp.id}`,
              titulo: `${comp.nombre || comp.componente_config?.nombre || 'Componente'} requiere atención`,
              descripcion: comp.mensaje_alerta || `El ${comp.nombre || 'componente'} tiene una salud del ${comp.salud_porcentaje?.toFixed(0) || 0}% y requiere mantenimiento.`,
              prioridad: comp.nivel_alerta === 'CRITICO' ? 5 : comp.nivel_alerta === 'URGENTE' ? 4 : 3,
              activa: true,
              componente_salud_detail: comp,
              tipo_alerta: 'COMPONENTE_CRITICO',
              // AGREGAR INFORMACIÓN DEL VEHÍCULO
              vehicle_id: vehicle.id,
              vehicle_info: {
                id: vehicle.id,
                marca_nombre: vehicle.marca_nombre || vehicle.marca,
                modelo_nombre: vehicle.modelo_nombre || vehicle.modelo,
                year: vehicle.year,
              }
            }));

          // Agregar información del vehículo a las alertas directas
          const alertasConVehiculo = alertasFiltradas.map(alerta => ({
            ...alerta,
            vehicle_id: vehicle.id,
            vehicle_info: {
              id: vehicle.id,
              marca_nombre: vehicle.marca_nombre || vehicle.marca,
              modelo_nombre: vehicle.modelo_nombre || vehicle.modelo,
              year: vehicle.year,
            }
          }));

          return [...alertasConVehiculo, ...alertasVirtuales];
        } catch (error) {
          console.error(`❌ Error cargando alertas para vehículo ${vehicle.id}:`, error);
          return [];
        }
      });

      const todasLasAlertas = await Promise.all(alertasPromesas);
      const alertasCombinadas = todasLasAlertas.flat();

      // Ordenar por prioridad (más urgente primero)
      alertasCombinadas.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));

      console.log('🚨 Alertas combinadas de todos los vehículos:', {
        total: alertasCombinadas.length,
        porVehiculo: alertasCombinadas.reduce((acc, a) => {
          const vehicleId = a.vehicle_id;
          acc[vehicleId] = (acc[vehicleId] || 0) + 1;
          return acc;
        }, {})
      });

      setUrgentAlerts(alertasCombinadas);
    } catch (error) {
      console.error('❌ Error cargando alertas urgentes:', error);
      setUrgentAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, [vehicles]); // Depender de vehicles en lugar de activeVehicle

  // Cargar alertas cuando cambien los vehículos (cuando se carguen o cambie la cantidad)
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      console.log('🔄 Vehículos disponibles, cargando alertas:', vehicles.length);
      loadUrgentAlerts();
    } else {
      setUrgentAlerts([]);
    }
  }, [vehicles?.length, loadUrgentAlerts]); // Cargar cuando cambie el número de vehículos o se carguen inicialmente

  // Listener de WebSocket para actualizaciones de salud
  useEffect(() => {
    const handleHealthUpdate = (message) => {
      if (message.type === 'salud_vehiculo_actualizada' && message.vehicle_id) {
        console.log('🔄 [UserPanel] Actualización de salud recibida para vehículo:', message.vehicle_id);

        // Invalidar cache del vehículo
        VehicleHealthService.invalidateCache(message.vehicle_id);

        // Recargar alertas para todos los vehículos (fuerza refresh)
        if (vehicles && vehicles.length > 0) {
          loadUrgentAlerts(true);
        }
      }
    };

    // Registrar handler
    websocketService.onMessage('salud_vehiculo_actualizada', handleHealthUpdate);

    // Cleanup
    return () => {
      websocketService.offMessage('salud_vehiculo_actualizada', handleHealthUpdate);
    };
  }, [vehicles, loadUrgentAlerts]);

  const loadInitialData = useCallback(async () => {
    try {
      console.log('📦 UserPanel - Iniciando carga de datos (optimizado)');
      setLoading(true);
      setError(null);

      // OPTIMIZACIÓN: Cargar datos independientes en paralelo
      const [userVehicles, mainAddress, userProfileResult] = await Promise.allSettled([
        vehicleService.getUserVehicles(), // Usa cache automático
        locationService.getMainAddress(),
        user?.id ? userService.getUserProfile(user.id) : Promise.resolve(null),
      ]);

      // Procesar vehículos
      const vehicles = userVehicles.status === 'fulfilled' ? userVehicles.value : [];
      setVehicles(vehicles);

      // Establecer vehículo activo si hay vehículos disponibles
      if (vehicles.length > 0) {
        const currentActive = activeVehicle &&
          vehicles.find(v => v.id === activeVehicle.id)
          ? activeVehicle
          : vehicles[0];

        if (!activeVehicle || activeVehicle.id !== currentActive.id) {
          setActiveVehicle(currentActive);
          console.log('🚗 Vehículo activo establecido:', currentActive.id, currentActive.marca_nombre);
        }
      } else {
        setActiveVehicle(null);
      }

      // Procesar dirección
      const address = mainAddress.status === 'fulfilled' ? mainAddress.value : null;
      setCurrentAddress(address);

      // Procesar perfil de usuario (no crítico)
      if (userProfileResult.status === 'fulfilled' && userProfileResult.value) {
        try {
          updateProfile({ ...userProfileResult.value, _skipBackendUpdate: true });
          console.log('✅ Perfil de usuario actualizado en contexto');
        } catch (err) {
          console.warn('⚠️ Error actualizando perfil (no crítico):', err);
        }
      }

      // OPTIMIZACIÓN: Cargar categorías, proveedores y solicitudes en paralelo
      const parallelTasks = [];

      // Categorías
      if (vehicles.length > 0) {
        const marcasIds = [...new Set(vehicles.map(v => v.marca).filter(Boolean))];
        parallelTasks.push(
          categoryService.getCategoriesByVehicleBrands(marcasIds).then(
            (categoriesData) => setCategories(categoriesData || []),
            (err) => {
              console.warn('⚠️ Error cargando categorías:', err);
              setCategories([]);
            }
          )
        );
      } else {
        setCategories([]);
      }

      // Proveedores cercanos (en paralelo si hay vehículos y dirección)
      if (vehicles.length > 0 && address) {
        parallelTasks.push(
          Promise.allSettled([
            providerService.getWorkshopsForUserVehicles(vehicles),
            providerService.getMechanicsForUserVehicles(vehicles),
          ]).then(([talleresResult, mecanicosResult]) => {
            setNearbyTalleres(
              talleresResult.status === 'fulfilled' && Array.isArray(talleresResult.value)
                ? talleresResult.value.slice(0, 5)
                : []
            );
            setNearbyMecanicos(
              mecanicosResult.status === 'fulfilled' && Array.isArray(mecanicosResult.value)
                ? mecanicosResult.value.slice(0, 5)
                : []
            );
          }).catch((err) => {
            console.error('Error cargando proveedores cercanos:', err);
            setNearbyTalleres([]);
            setNearbyMecanicos([]);
          })
        );
      } else {
        setNearbyTalleres([]);
        setNearbyMecanicos([]);
      }

      // Solicitudes activas (no crítico, en paralelo)
      const currentIsClient = user && (user.is_client === true || user.is_client === undefined);
      if (currentIsClient && cargarSolicitudesActivas) {
        parallelTasks.push(
          cargarSolicitudesActivas().catch((err) => {
            console.warn('⚠️ Error cargando solicitudes activas:', err);
          })
        );
      }

      // Esperar que todas las tareas paralelas terminen
      await Promise.allSettled(parallelTasks);

      // Cargar datos de vehículos en background (no bloquea el render inicial)
      if (vehicles.length > 0) {
        // No esperar, dejar que cargue en background
        loadVehiclesData(vehicles, false).catch((err) => {
          console.warn('⚠️ Error cargando datos de vehículos:', err);
        });
      }

      // Marcar que ya se cargó una vez
      setHasLoadedOnce(true);
      console.log('✅ UserPanel - Datos cargados exitosamente (paralelo)');
    } catch (err) {
      console.error('❌ Error cargando datos iniciales:', err);
      setError('No se pudieron cargar los datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias - usar estados directamente cuando sea necesario

  const onRefresh = useCallback(async () => {
    console.log('🔄 UserPanel - Pull to refresh');
    setRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  }, [loadInitialData]);

  const handleAddressChange = (address) => {
    setCurrentAddress(address);
    // Recargar proveedores con la nueva dirección
    if (activeVehicle && address) {
      loadNearbyProviders([activeVehicle], address);
    }
  };

  const handleAddNewAddress = () => {
    console.log('🆕 Navegando a agregar nueva dirección');
    navigation.navigate(ROUTES.ADD_ADDRESS, {
      onAddressAdded: async (newAddress) => {
        console.log('✅ Nueva dirección agregada:', newAddress);
        // Si es la dirección principal o es la primera, establecerla como activa
        if (newAddress.es_principal || !currentAddress) {
          setCurrentAddress(newAddress);
          // Recargar proveedores si hay vehículo activo
          if (activeVehicle && newAddress) {
            loadNearbyProviders([activeVehicle], newAddress);
          }
        }
        // La dirección ya está guardada en el backend, el AddressSelector la recargará
      },
      onGoBack: () => {
        // Cuando se cierra la pantalla, volver a UserPanel
        // Verificar que se puede navegar hacia atrás antes de hacerlo
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    });
  };

  // handleServicePress eliminado - ya no se usa (servicios populares eliminados)
  // const handleServicePress = (service) => {
  //   navigation.navigate(ROUTES.SERVICE_DETAIL, { serviceId: service.id });
  // };

  const handleProviderPress = (provider, type) => {
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: provider.id,
      providerType: type
    });
  };

  const handleCategoryPress = (category) => {
    console.log('📂 Navegando a categoría:', category.nombre);
    const marcasIds = [...new Set(vehicles.map(v => v.marca).filter(Boolean))];
    navigation.navigate(ROUTES.CATEGORY_SERVICES_LIST, {
      categoryId: category.id,
      categoryName: category.nombre,
      categoryDescription: category.descripcion,
      marcasIds: marcasIds,
      categoria: category // Pasar objeto completo también
    });
  };

  // Función para obtener color según porcentaje de salud
  const getHealthColor = useCallback((percentage) => {
    if (!percentage) return colors.neutral?.gray?.[400] || '#9E9E9E';
    if (percentage >= 70) return colors.success?.[500] || '#10B981';
    if (percentage >= 40) return colors.warning?.[500] || '#F59E0B';
    if (percentage >= 20) return colors.error?.[500] || '#EF4444';
    return colors.error?.[600] || '#DC2626';
  }, [colors]);

  // Función para renderizar rueda circular de salud
  const renderCircularProgress = useCallback((percentage, healthColor) => {
    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgressCircle, { borderColor: healthColor }]}>
          <Text style={[styles.circularProgressValue, { color: healthColor }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={styles.circularProgressLabel}>Salud</Text>
        </View>
      </View>
    );
  }, [styles]);

  // Función para manejar navegación a salud del vehículo
  const handleVehiclePress = useCallback((vehicle) => {
    navigation.navigate(ROUTES.VEHICLE_HEALTH, {
      vehicleId: vehicle.id,
      vehicle,
    });
  }, [navigation]);

  // Función para renderizar card de vehículo
  const renderVehicleItem = useCallback((vehicle) => {
    const vehicleData = vehiclesData[vehicle.id] || {};
    const healthPercentage = vehicleData.health?.salud_general_porcentaje || 0;
    const serviceCount = vehicleData.serviceCount || 0;
    const healthColor = getHealthColor(healthPercentage);

    return (
      <TouchableOpacity
        style={styles.vehicleItem}
        activeOpacity={0.7}
        onPress={() => handleVehiclePress(vehicle)}
      >
        {/* Imagen del vehículo */}
        <View style={styles.vehicleImageContainer}>
          {vehicleData.imageUrl ? (
            <Image
              source={{ uri: vehicleData.imageUrl }}
              style={styles.vehicleImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.vehicleImagePlaceholder}>
              <Ionicons name="car-sport" size={36} color={colors.neutral?.gray?.[400] || '#9CA3AF'} />
            </View>
          )}
        </View>

        {/* Información del vehículo */}
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleInfoLeft}>
            {/* Marca y modelo */}
            <Text style={styles.vehicleBrand} numberOfLines={1}>
              {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
            </Text>

            {/* Año y km */}
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleYear}>{vehicle.year}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.vehicleKm}>
                {vehicle.kilometraje?.toLocaleString() || 0} km
              </Text>
            </View>

            {/* Servicios */}
            <View style={styles.serviceCountRow}>
              <Ionicons name="construct-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.serviceCountText}>
                {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
              </Text>
            </View>
          </View>

          {/* Rueda de salud */}
          <View style={styles.healthSection}>
            {renderCircularProgress(healthPercentage, healthColor)}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [vehiclesData, getHealthColor, renderCircularProgress, handleVehiclePress, styles, colors]);

  // Función para manejar el tap en una alerta de mantenimiento
  const handleAlertPress = useCallback((alerta) => {
    // Usar el vehículo de la alerta si está disponible, sino el activo
    const targetVehicle = alerta.vehicle_info
      ? vehicles.find(v => v.id === alerta.vehicle_id) || activeVehicle
      : activeVehicle;

    if (!targetVehicle) {
      console.warn('⚠️ No se encontró vehículo para la alerta');
      return;
    }

    // Obtener servicios recomendados de la alerta
    const serviciosRecomendados = alerta.servicios_recomendados_detail ||
      alerta.servicios_recomendados || [];

    if (serviciosRecomendados.length > 0) {
      // Si tiene servicios específicos, navegar a crear solicitud con esos servicios pre-seleccionados
      // IMPORTANTE: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
      try {
        navigation.navigate('TabNavigator', {
          screen: ROUTES.CREAR_SOLICITUD,
          params: {
            vehicle: targetVehicle,
            serviciosPreSeleccionados: serviciosRecomendados.map(s => s.id || s),
            alerta: alerta,
          },
        });
        console.log('✅ Navegación exitosa a CREAR_SOLICITUD con servicios desde alerta');
      } catch (error) {
        console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
        // Fallback: intentar navegación directa
        navigation.navigate(ROUTES.CREAR_SOLICITUD, {
          vehicle: targetVehicle,
          serviciosPreSeleccionados: serviciosRecomendados.map(s => s.id || s),
          alerta: alerta,
        });
      }
    } else {
      // Si no tiene servicios específicos, buscar categoría basada en el componente
      const componenteNombre = alerta.componente_salud_detail?.componente_config?.nombre ||
        alerta.componente_salud_detail?.nombre ||
        '';

      // Mapeo de componentes a categorías comunes
      const componenteToCategory = {
        'Aceite Motor': 'Cambio de Aceite',
        'Filtro de Aire': 'Filtros',
        'Filtro de Aceite': 'Filtros',
        'Batería': 'Batería',
        'Neumáticos': 'Neumáticos',
        'Pastillas de Freno': 'Frenos',
        'Amortiguadores': 'Suspensión',
      };

      // Buscar categoría que coincida
      const categoriaNombre = componenteToCategory[componenteNombre] || componenteNombre;

      // Navegar a crear solicitud con descripción pre-rellenada
      // IMPORTANTE: CREAR_SOLICITUD está en el TabNavigator, necesitamos usar navegación anidada
      try {
        navigation.navigate('TabNavigator', {
          screen: ROUTES.CREAR_SOLICITUD,
          params: {
            vehicle: targetVehicle,
            descripcionPrellenada: `Servicio de mantenimiento: ${componenteNombre}. ${alerta.descripcion || ''}`,
            alerta: alerta,
          },
        });
        console.log('✅ Navegación exitosa a CREAR_SOLICITUD desde alerta sin servicios específicos');
      } catch (error) {
        console.error('❌ Error navegando a CREAR_SOLICITUD:', error);
        // Fallback: intentar navegación directa
        navigation.navigate(ROUTES.CREAR_SOLICITUD, {
          vehicle: targetVehicle,
          descripcionPrellenada: `Servicio de mantenimiento: ${componenteNombre}. ${alerta.descripcion || ''}`,
          alerta: alerta,
        });
      }
    }
  }, [activeVehicle, vehicles, navigation]);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <UserPanelSkeleton tabBarHeight={tabBarHeight} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: tabBarHeight + (spacing?.lg || 20) // Tab bar height (incluye insets) + padding extra
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
      >
        {/* Header con Gradiente */}
        <LinearGradient
          colors={[
            colors.accent?.[400] || colors.primary?.[400] || '#33BFE7',
            colors.primary?.[500] || colors.accent?.[500] || '#0061FF'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* Fila superior: Bienvenido + Foto perfil */}
          <View style={styles.headerTopRow}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Bienvenido</Text>
              {user && (
                <Text style={styles.headerSubtitle}>
                  {user.first_name || user.username || 'Usuario'}
                </Text>
              )}
            </View>

            {/* Foto de perfil del usuario */}
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.PROFILE)}
              activeOpacity={0.7}
              style={styles.profileButton}
            >
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  onError={() => {
                    console.log('❌ Error cargando foto de perfil:', profileImageUrl);
                    setProfileImageUrl(null);
                  }}
                />
              ) : (
                <View style={styles.profilePlaceholderWhite}>
                  <Ionicons name="person" size={24} color={colors.primary?.[500] || '#003459'} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Selector de Dirección - Estilo Glass */}
          <View style={styles.locationGlassContainer}>
            <AddressSelector
              currentAddress={currentAddress}
              onAddressChange={handleAddressChange}
              onAddNewAddress={handleAddNewAddress}
              glassStyle={true}
            />
          </View>
        </LinearGradient>

        {/* Cards Informativas para Usuarios Nuevos */}
        {vehicles.length === 0 && !loading && (
          <View style={styles.welcomeCardsContainer}>
            <Text style={styles.welcomeCardsTitle}>¡Bienvenido a MecaniMóvil!</Text>
            <Text style={styles.welcomeCardsSubtitle}>
              Para empezar, sigue estos sencillos pasos:
            </Text>

            {/* Card 1: Agregar Vehículo */}
            <TouchableOpacity
              style={styles.welcomeCard}
              activeOpacity={0.7}
              onPress={() => {
                try {
                  navigation.navigate('TabNavigator', {
                    screen: ROUTES.MIS_VEHICULOS,
                  });
                } catch (error) {
                  navigation.navigate(ROUTES.MIS_VEHICULOS);
                }
              }}
            >
              <View style={[styles.welcomeCardIconContainer, { backgroundColor: `${colors.primary?.[500] || '#003459'}15` }]}>
                <Ionicons name="car-outline" size={32} color={colors.primary?.[500] || '#003459'} />
              </View>
              <View style={styles.welcomeCardContent}>
                <Text style={styles.welcomeCardTitle}>Agrega tu primer vehículo</Text>
                <Text style={styles.welcomeCardDescription}>
                  Registra tu vehículo para acceder a servicios personalizados y recomendaciones
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text?.secondary || '#5D6F75'} />
            </TouchableOpacity>

            {/* Card 2: Explorar Servicios - Solo aparece cuando hay categorías */}
            {categories.length > 0 && categories[0] && (
              <TouchableOpacity
                style={styles.welcomeCard}
                activeOpacity={0.7}
                onPress={() => handleCategoryPress(categories[0])}
              >
                <View style={[styles.welcomeCardIconContainer, { backgroundColor: `${colors.secondary?.[500] || '#007EA7'}15` }]}>
                  <Ionicons name="construct-outline" size={32} color={colors.secondary?.[500] || '#007EA7'} />
                </View>
                <View style={styles.welcomeCardContent}>
                  <Text style={styles.welcomeCardTitle}>Explora servicios disponibles</Text>
                  <Text style={styles.welcomeCardDescription}>
                    Descubre todos los servicios mecánicos que tenemos para tu vehículo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text?.secondary || '#5D6F75'} />
              </TouchableOpacity>
            )}

            {/* Card 3: Crear Solicitud - Solo aparece cuando hay categorías */}
            {categories.length > 0 && (
              <TouchableOpacity
                style={styles.welcomeCard}
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    navigation.navigate('TabNavigator', {
                      screen: ROUTES.CREAR_SOLICITUD,
                    });
                  } catch (error) {
                    navigation.navigate(ROUTES.CREAR_SOLICITUD);
                  }
                }}
              >
                <View style={[styles.welcomeCardIconContainer, { backgroundColor: `${colors.accent?.[500] || '#00A8E8'}15` }]}>
                  <Ionicons name="add-circle-outline" size={32} color={colors.accent?.[500] || '#00A8E8'} />
                </View>
                <View style={styles.welcomeCardContent}>
                  <Text style={styles.welcomeCardTitle}>Crea tu primera solicitud</Text>
                  <Text style={styles.welcomeCardDescription}>
                    Solicita un servicio y recibe ofertas de múltiples proveedores
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text?.secondary || '#5D6F75'} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Categorías de Servicios */}
        {categories.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <Text style={styles.categoriesSectionTitle}>Servicios Disponibles</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesHorizontal}
              bounces={false}
              decelerationRate="fast"
            >
              {categories.map((category) => (
                <CategoryGridCard
                  key={category.id}
                  category={category}
                  onPress={handleCategoryPress}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sección: Mis Vehículos */}
        {vehicles.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Mis Vehículos</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehiclesHorizontal}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={Dimensions.get('window').width - 32}
              snapToAlignment="start"
            >
              {vehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleCardWrapper}>
                  {renderVehicleItem(vehicle)}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* NUEVA SECCIÓN: Mis Solicitudes Activas - Solo se muestra si hay solicitudes activas */}
        {isClient && Array.isArray(solicitudesActivas) && solicitudesActivas.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Mis Solicitudes Activas</Text>
                {/* El badge de ofertas nuevas ahora se muestra en cada SolicitudCard individualmente */}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.MIS_SOLICITUDES)}
                style={styles.verTodasButton}
              >
                <Text style={styles.verTodasText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary?.[500] || '#3B82F6'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.solicitudesHorizontal}
              bounces={false}
              decelerationRate="fast"
            >
              {solicitudesActivas.map((solicitud) => (
                <View key={solicitud.id} style={styles.solicitudCardWrapper}>
                  <SolicitudCard
                    solicitud={solicitud}
                    onPress={() => navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: solicitud.id })}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Servicios Populares - ELIMINADO - causaba errores */}

        {/* Talleres Cercanos */}
        {nearbyTalleres.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <Text style={styles.sectionTitle}>Talleres Cercanos</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.TALLERES)}
                style={styles.verTodasButton}
              >
                <Text style={styles.verTodasText}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary?.[500] || '#3B82F6'} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.providersHorizontal}
              bounces={false}
              decelerationRate="fast"
            >
              {nearbyTalleres.map((taller) => (
                <View key={taller.id} style={styles.horizontalCardWrapper}>
                  <NearbyTallerCard
                    taller={taller}
                    onPress={() => handleProviderPress(taller, 'taller')}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Mecánicos Cercanos */}
        {nearbyMecanicos.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <Text style={styles.sectionTitle}>Mecánicos Cercanos</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.MECANICOS)}
                style={styles.verTodasButton}
              >
                <Text style={styles.verTodasText}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary?.[500] || '#3B82F6'} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.providersHorizontal}
              bounces={false}
              decelerationRate="fast"
            >
              {nearbyMecanicos.map((mecanico) => (
                <View key={mecanico.id} style={styles.horizontalCardWrapper}>
                  <NearbyMecanicoCard
                    mecanico={mecanico}
                    onPress={() => handleProviderPress(mecanico, 'mecanico')}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Aviso cuando no hay dirección configurada pero sí hay vehículos */}
        {vehicles.length > 0 && !currentAddress && nearbyTalleres.length === 0 && nearbyMecanicos.length === 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.addressWarningContainer}>
              <View style={[styles.addressWarningIconContainer, { backgroundColor: `${colors.warning?.[500] || '#F59E0B'}15` }]}>
                <Ionicons name="location-outline" size={28} color={colors.warning?.[500] || '#F59E0B'} />
              </View>
              <View style={styles.addressWarningContent}>
                <Text style={styles.addressWarningTitle}>
                  Configura tu dirección
                </Text>
                <Text style={styles.addressWarningText}>
                  Para ver los talleres y mecánicos disponibles según la marca de tu vehículo, necesitas configurar una dirección.
                </Text>
                <TouchableOpacity
                  style={styles.addressWarningButton}
                  onPress={handleAddNewAddress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.base?.pureWhite || '#FFFFFF'} style={{ marginRight: spacing?.xs || 6 }} />
                  <Text style={styles.addressWarningButtonText}>Agregar Dirección</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Mensaje de error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Reintentar"
              onPress={loadInitialData}
              type="secondary"
              small
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const UserPanelScreenStyles = (colors, typography, spacing, borders) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    // El paddingBottom se calcula dinámicamente con insets en contentContainerStyle
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  loadingText: {
    marginTop: spacing?.md || 16,
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.primary || '#00171F',
  },
  header: {
    paddingHorizontal: spacing?.md || 16,
    paddingTop: spacing?.lg || 20,
    paddingBottom: spacing?.lg || 20,
    borderBottomLeftRadius: borders.radius?.card?.xl || 24,
    borderBottomRightRadius: borders.radius?.card?.xl || 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.md || 16,
  },
  headerContent: {
    flex: 1,
  },
  locationGlassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borders.radius?.card?.md || 12,
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: spacing?.xs || 4,
  },
  headerTitle: {
    fontSize: typography.fontSize?.sm || 14,
    fontWeight: typography.fontWeight?.medium || '500',
    color: colors.base?.pureWhite || '#FFFFFF',
    opacity: 0.9,
  },
  headerSubtitle: {
    fontSize: typography.fontSize?.['2xl'] || 24,
    color: colors.base?.pureWhite || '#FFFFFF',
    marginTop: spacing?.xs || 4,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.base?.pureWhite || '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background?.default || '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.base?.pureWhite || '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  section: {
    marginTop: spacing?.md || 16,
    paddingHorizontal: spacing?.md || 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.sm || 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing?.sm || 8,
  },
  sectionHeaderIcon: {
    marginRight: 0, // El gap del contenedor maneja el espaciado
  },
  sectionTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
  },
  categoriesSectionTitle: {
    fontSize: typography.fontSize?.['2xl'] || 24,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.sm || 8,
  },
  ofertasNuevasBadge: {
    backgroundColor: colors.error?.[500] || '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ofertasNuevasText: {
    color: colors.text?.inverse || '#FFFFFF',
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  verTodasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verTodasText: {
    color: colors.primary?.[500] || '#003459',
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  verMasButton: {
    padding: spacing?.md || 16,
    alignItems: 'center',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.md || 8,
    marginHorizontal: spacing?.md || 16,
    marginTop: spacing?.sm || 8,
  },
  verMasText: {
    color: colors.primary?.[500] || '#003459',
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
  horizontalList: {
    paddingRight: spacing?.md || 16,
  },
  serviceCardWrapper: {
    marginRight: spacing?.sm || 8,
    width: 200,
  },
  welcomeCardsContainer: {
    paddingHorizontal: spacing?.md || 16,
    paddingTop: spacing?.lg || 24,
    paddingBottom: spacing?.md || 16,
  },
  welcomeCardsTitle: {
    fontSize: typography.fontSize?.['2xl'] || 24,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.xs || 4,
  },
  welcomeCardsSubtitle: {
    fontSize: typography.fontSize?.md || 16,
    color: colors.text?.secondary || '#5D6F75',
    marginBottom: spacing?.lg || 24,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing?.md || 16,
    marginBottom: spacing?.md || 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borders.radius?.full || 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
  },
  welcomeCardContent: {
    flex: 1,
  },
  welcomeCardTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.semibold || '600',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.xs || 4,
  },
  welcomeCardDescription: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: 20,
  },
  errorContainer: {
    padding: spacing?.md || 16,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error?.[500] || '#EF4444',
    fontSize: typography.fontSize?.md || 16,
    marginBottom: spacing?.sm || 8,
    textAlign: 'center',
  },
  sectionWithHorizontalScroll: {
    marginTop: spacing?.md || 12, // Reducido de lg (20) a md (12)
    marginBottom: spacing?.xs || 4,
  },
  sectionHeaderWithPadding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.sm || 10, // Reducido de md (16) a sm (10)
    paddingHorizontal: spacing?.md || 16,
  },
  categoriesHorizontal: {
    paddingVertical: spacing?.xs || 4, // Reducido de sm (8) a xs (4)
    paddingLeft: spacing?.md || 16,
    paddingRight: spacing?.md || 16,
    alignItems: 'center',
  },
  alertsHorizontal: {
    paddingVertical: spacing?.xs || 4,
    paddingLeft: spacing?.md || 16,
    paddingRight: 0,
  },
  providersHorizontal: {
    paddingVertical: spacing?.sm || 8,
    paddingLeft: spacing?.md || 16,
    paddingRight: spacing?.md || 16,
    alignItems: 'flex-start',
  },
  solicitudesHorizontal: {
    paddingVertical: spacing?.sm || 8,
    paddingLeft: spacing?.md || 16,
    paddingRight: spacing?.md || 16,
    alignItems: 'flex-start',
  },
  vehiclesList: {
    paddingHorizontal: spacing?.md || 16,
    gap: spacing?.sm || 12,
    paddingBottom: spacing?.xs || 4,
  },
  vehiclesHorizontal: {
    paddingLeft: spacing?.md || 16,
    paddingRight: spacing?.md || 16,
    paddingVertical: spacing?.xs || 4,
  },
  vehicleCardWrapper: {
    width: Dimensions.get('window').width - 48, // Ancho de pantalla menos márgenes (16 + 16 + 16 de gap)
    marginRight: spacing?.md || 16,
  },
  vehicleItem: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.lg || 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    height: 120,
  },
  vehicleImageContainer: {
    width: 120,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral?.gray?.[100] || '#F3F4F6',
  },
  vehicleInfo: {
    flex: 1,
    padding: spacing?.md || 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfoLeft: {
    flex: 1,
    marginRight: spacing?.sm || 10,
  },
  vehicleTitleContainer: {
    flex: 1,
  },
  vehicleBrand: {
    fontSize: typography.fontSize?.lg || 18, // Mismo tamaño que SolicitudCard title
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.xs || 4,
    lineHeight: 24,
  },
  vehicleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.xs || 6,
  },
  vehicleYear: {
    fontSize: typography.fontSize?.sm || 12, // Mismo tamaño que vehicleBadgeText
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  separator: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginHorizontal: spacing?.xs || 6,
  },
  vehicleKm: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  serviceCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing?.xs || 6,
  },
  serviceCountText: {
    fontSize: typography.fontSize?.sm || 12, // Mismo tamaño que infoText
    color: colors.text?.secondary || '#5D6F75',
    fontWeight: typography.fontWeight?.regular || '400',
  },
  healthSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    flexShrink: 0,
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  circularProgressValue: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  circularProgressLabel: {
    fontSize: typography.fontSize?.xs || 10,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: 2,
    fontWeight: typography.fontWeight?.medium || '500',
  },
  solicitudCardWrapper: {
    width: 300, // Mismo ancho que MaintenanceAlertCard
    marginRight: spacing.md || 16,
  },
  horizontalCardWrapper: {
    width: 180,
    marginRight: spacing.md || 16,
  },
  alertBadge: {
    backgroundColor: colors.error?.[500] || '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  alertBadgeText: {
    color: colors.text?.inverse || '#FFFFFF',
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  alertLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing?.md || 16,
    gap: spacing?.sm || 8,
  },
  alertLoadingText: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
  },
  noAlertsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing?.lg || 24,
    backgroundColor: colors.neutral?.gray?.[50] || '#F9FAFB',
    borderRadius: borders.radius?.md || 8,
    marginHorizontal: spacing?.md || 16,
  },
  noAlertsText: {
    fontSize: typography.fontSize?.sm || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: spacing?.sm || 8,
    textAlign: 'center',
  },
  locationBadgeContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing?.md || 16,
    marginTop: spacing?.sm || 8,
    marginBottom: spacing?.xs || 4,
    borderRadius: borders.radius?.md || 8,
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: spacing?.xs || 4,
    shadowColor: colors.base?.inkBlack || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: borders.width?.thin || 1,
    borderColor: colors.border?.light || '#E5E7EB',
  },
  addressWarningContainer: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing?.md || 16,
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing?.lg || 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addressWarningIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borders.radius?.full || 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
    flexShrink: 0,
  },
  addressWarningContent: {
    flex: 1,
    paddingTop: spacing?.xs || 2,
  },
  addressWarningTitle: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.sm || 8,
    lineHeight: 26,
  },
  addressWarningText: {
    fontSize: typography.fontSize?.base || 14,
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: 20,
    marginBottom: spacing?.lg || 20,
  },
  addressWarningButton: {
    backgroundColor: colors.primary?.[500] || '#003459',
    borderRadius: borders.radius?.button?.md || 12,
    paddingVertical: spacing?.sm || 10,
    paddingHorizontal: spacing?.md || 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary?.[500] || '#003459',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addressWarningButtonText: {
    color: colors.text?.inverse || '#FFFFFF',
    fontSize: typography.fontSize?.base || 14,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
});

export default UserPanelScreen;
