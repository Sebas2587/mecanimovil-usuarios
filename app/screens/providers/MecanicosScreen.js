import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  SafeAreaView,
  StatusBar,
  FlatList,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

// Servicios
import * as locationService from '../../services/location';
import * as vehicleService from '../../services/vehicle';
import * as vehicleServiceValidator from '../../utils/vehicleServiceValidator';
import * as providerService from '../../services/providers';
import websocketService from '../../services/websocketService';

// Componentes
import AddressSelectionModal from '../../components/location/AddressSelectionModal';
import FiltersModal from '../../components/modals/FiltersModal';
import VehicleValidationMessage from '../../components/vehicles/VehicleValidationMessage';
import NearbyMecanicoCard from '../../components/cards/NearbyMecanicoCard';
import SearchBar from '../../components/forms/SearchBar';
import Header from '../../components/navigation/Header/Header';
import Card from '../../components/base/Card/Card';
import Badge from '../../components/base/Badge/Badge';

// Utilidades
import { ROUTES } from '../../utils/constants';
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';
import { useTheme } from '../../design-system/theme/useTheme';
import { formatProviderForCard } from '../../utils/providerUtils';

const MecanicosScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
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

  // Estados principales
  const [mecanicos, setMecanicos] = useState([]);
  const [filteredMecanicos, setFilteredMecanicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [websocketConnected, setWebsocketConnected] = useState(false);

  // Estados de filtros y búsqueda
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarca, setSelectedMarca] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [selectedComuna, setSelectedComuna] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  // Estados de ubicación
  const [currentAddress, setCurrentAddress] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Función para ordenar mecánicos por estado de conexión (conectados primero) y distancia
  const ordenarMecanicosPorEstado = useCallback((mecanicos) => {
    return [...mecanicos].sort((a, b) => {
      // Primero por estado de conexión (conectados primero)
      const aConectado = a.esta_conectado || a.status === 'online';
      const bConectado = b.esta_conectado || b.status === 'online';

      if (aConectado && !bConectado) return -1;
      if (!aConectado && bConectado) return 1;

      // Si ambos tienen el mismo estado de conexión, ordenar por distancia
      const aDistance = parseFloat(a.distance) || 999;
      const bDistance = parseFloat(b.distance) || 999;

      return aDistance - bDistance;
    });
  }, []);

  // ELIMINADO: Funciones de recálculo innecesarias que causaban inconsistencias
  // El backend ya proporciona distancias precisas calculadas con PostGIS
  // Solo recargar datos del backend si cambia la dirección

  // Función para actualizar el estado de conexión de un mecánico específico
  const actualizarEstadoMecanico = useCallback((mecanicoId, status, estaConectado) => {
    console.log(`🔄 Actualizando estado de mecánico ${mecanicoId}: ${status} (${estaConectado ? 'Conectado' : 'Desconectado'})`);

    setMecanicos(prevMecanicos => {
      const mecanicosActualizados = prevMecanicos.map(mecanico => {
        if (mecanico.id === mecanicoId) {
          const oldStatus = mecanico.status;
          if (oldStatus !== status) {
            console.log(`🔄 Estado de ${mecanico.nombre} cambió: ${oldStatus} → ${status}`);
          }
          return {
            ...mecanico,
            status: status,
            esta_conectado: estaConectado,
            ultima_conexion: estaConectado ? new Date().toISOString() : mecanico.ultima_conexion
          };
        }
        return mecanico;
      });

      // Reordenar la lista después de actualizar el estado
      return ordenarMecanicosPorEstado(mecanicosActualizados);
    });
  }, [ordenarMecanicosPorEstado]);

  // Función para filtrar mecánicos por búsqueda
  const filtrarMecanicos = useCallback(() => {
    let filtrados = [...mecanicos];

    // Filtrar por búsqueda de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtrados = filtrados.filter(mecanico =>
        mecanico.nombre?.toLowerCase().includes(query) ||
        mecanico.direccion?.toLowerCase().includes(query) ||
        mecanico.especialidades_nombres?.some(esp => esp.toLowerCase().includes(query))
      );
    }

    // Filtrar por comuna
    if (selectedComuna) {
      filtrados = filtrados.filter(mecanico => {
        // Verificar si el mecánico tiene zonas de servicio que incluyan la comuna seleccionada
        if (mecanico.zonas_servicio && mecanico.zonas_servicio.length > 0) {
          return mecanico.zonas_servicio.some(zona =>
            zona.activa && zona.comunas?.some(comuna =>
              comuna.toLowerCase().includes(selectedComuna.toLowerCase())
            )
          );
        }
        return false;
      });
    }

    setFilteredMecanicos(filtrados);
  }, [mecanicos, searchQuery, selectedComuna]);

  // Aplicar filtros cuando cambien los datos
  useEffect(() => {
    filtrarMecanicos();
  }, [filtrarMecanicos]);

  // Configurar WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await websocketService.connect();
        setWebsocketConnected(true);

        websocketService.onMessage('mechanic_status_update', (data) => {
          console.log('📨 Actualización de estado recibida en MecanicosScreen:', data);
          actualizarEstadoMecanico(
            data.proveedor_id,
            data.status || 'offline',
            data.is_online || false
          );
        });

        websocketService.onMessage('current_statuses', (data) => {
          console.log('📋 Estados actuales recibidos en MecanicosScreen:', data);
          if (data.statuses) {
            data.statuses.forEach(status => {
              actualizarEstadoMecanico(
                status.proveedor_id,
                status.status,
                status.is_online
              );
            });
          }
        });

        // Suscribirse a los mecánicos cuando estén cargados
        if (mecanicos.length > 0) {
          const mecanicoIds = mecanicos.map(mecanico => mecanico.id);
          websocketService.subscribeToMechanics(mecanicoIds);
        }

      } catch (error) {
        console.error('❌ Error configurando WebSocket:', error);
      }
    };

    setupWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, [mecanicos.length, actualizarEstadoMecanico]);

  // Inicializar y cargar datos
  useEffect(() => {
    initializeAndLoadData();
  }, []);

  // Recargar cuando la pantalla gana foco para respetar la dirección activa actual
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          console.log('🔄 MecanicosScreen: useFocusEffect ejecutándose...');

          // Cargar vehículos del usuario
          const userVehicles = await vehicleService.getUserVehicles();

          const routeAddress = route?.params?.address || null;
          if (routeAddress) {
            console.log('📍 MecanicosScreen: Usando dirección del route:', routeAddress.direccion);
            await locationService.setActiveAddress(routeAddress);
            setCurrentAddress(routeAddress);
            await loadInitialData(routeAddress, userVehicles);
          } else {
            console.log('📍 MecanicosScreen: Validando dirección existente...');
            // Usar validación para asegurar dirección válida
            const validAddress = await locationService.ensureValidAddress();
            if (validAddress) {
              setCurrentAddress(validAddress);
              await loadInitialData(validAddress, userVehicles);
            } else {
              console.warn('⚠️ MecanicosScreen: No hay direcciones válidas disponibles');
              setCurrentAddress(null);
            }
          }
        } catch (e) {
          console.warn('❌ MecanicosScreen: Error en useFocusEffect:', e);
        }
      })();
    }, [])
  );

  // Función para inicializar y cargar datos
  const initializeAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔧 Inicializando pantalla de mecánicos...');

      // Cargar vehículos del usuario primero
      const userVehicles = await vehicleService.getUserVehicles();
      console.log('🚗 Vehículos del usuario:', userVehicles.length);

      // Usar dirección pasada por navegación si existe
      const routeAddress = route?.params?.address || null;
      if (routeAddress) { try { await locationService.setActiveAddress(routeAddress); } catch { } }
      const address = routeAddress
        || await locationService.getActiveAddress()
        || await locationService.getMainAddress();
      if (address) { try { await locationService.setActiveAddress(address); } catch { } }
      setCurrentAddress(address);

      if (address) {
        const coords = await locationService.geocodeAddress(address.direccion);
        if (coords) {
          setUserLocation(coords);
        }
      }

      // Cargar datos iniciales usando la dirección efectiva y vehículos
      await loadInitialData(address, userVehicles);

    } catch (error) {
      console.error('❌ Error inicializando MecanicosScreen:', error);
      setError('Error al cargar los mecánicos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar datos iniciales (acepta dirección explícita para evitar condiciones de carrera)
  const loadInitialData = async (addressParam = null, userVehiclesParam = null) => {
    try {
      console.log('🔧 Cargando mecánicos...');

      const effectiveAddress = addressParam
        || currentAddress
        || await locationService.getActiveAddress()
        || await locationService.getMainAddress();
      if (effectiveAddress) { try { await locationService.setActiveAddress(effectiveAddress); } catch { } }

      // Obtener vehículos del usuario si no se proporcionaron
      let userVehicles = userVehiclesParam;
      if (!userVehicles || userVehicles.length === 0) {
        userVehicles = await vehicleService.getUserVehicles();
      }

      // Si el usuario tiene vehículos, usar la función que filtra por marcas
      let mecanicosData = [];
      if (userVehicles && userVehicles.length > 0) {
        console.log('🚗 Filtrando mecánicos por vehículos del usuario:', userVehicles.length);
        mecanicosData = await providerService.getMechanicsForUserVehicles(userVehicles);
      } else {
        // Si no tiene vehículos, buscar todos los mecánicos cercanos
        console.log('⚠️ Usuario sin vehículos, mostrando todos los mecánicos cercanos');
        const baseAddress = effectiveAddress || { direccion: 'Santiago, Chile' };
        mecanicosData = await providerService.getMecanicosRealmenteCercanos(baseAddress, 10);
      }

      if (mecanicosData && Array.isArray(mecanicosData)) {
        console.log(`🔧 ${mecanicosData.length} mecánicos cargados`);

        // Los mecánicos ya vienen con distancias calculadas por el backend (PostGIS)
        console.log('📍 Usando distancias del backend (PostGIS) - más precisas que recálculos locales');

        // Aplicar ordenamiento por estado de conexión y distancia
        const mecanicosOrdenados = ordenarMecanicosPorEstado(mecanicosData);
        setMecanicos(mecanicosOrdenados);
        setFilteredMecanicos(mecanicosOrdenados);
      } else {
        console.log('🔧 No se encontraron mecánicos');
        setMecanicos([]);
        setFilteredMecanicos([]);
      }

    } catch (error) {
      console.error('❌ Error cargando mecánicos:', error);
      setError('Error al cargar los mecánicos. Intenta de nuevo.');
    }
  };

  // Función para manejar refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const userVehicles = await vehicleService.getUserVehicles();
      const routeAddress = route?.params?.address || null;
      if (routeAddress) { try { await locationService.setActiveAddress(routeAddress); } catch { } }
      const address = routeAddress
        || await locationService.getActiveAddress()
        || await locationService.getMainAddress();
      if (address) { try { await locationService.setActiveAddress(address); } catch { } }
      setCurrentAddress(address);
      await loadInitialData(address, userVehicles);
    } catch (error) {
      console.error('❌ Error en refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddressChange = async (address) => {
    try {
      // No need to set active address globally if we just want to filter this screen, 
      // but for consistency with Home, let's do it.
      await locationService.setActiveAddress(address);
    } catch { }
    setCurrentAddress(address);
    setAddressModalVisible(false); // Close modal

    setLoading(true);
    try {
      const coords = await locationService.geocodeAddress(address.direccion);
      if (coords) {
        setUserLocation(coords);
        setLocationError(null);
      }

      // Obtener vehículos del usuario para filtrar por marcas
      const userVehicles = await vehicleService.getUserVehicles();
      // Recargar mecánicos con nueva ubicación
      await loadInitialData(address, userVehicles);
      console.log('📍 Mecánicos recargados con nueva ubicación');
    } catch (error) {
      console.error('❌ Error cambiando dirección:', error);
      setLocationError('Error al cambiar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar búsqueda manual
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  // Función para limpiar búsqueda
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Función para manejar selección de mecánico
  const handleMecanicoPress = useCallback((mecanico) => {
    console.log('🔧 Mecánico seleccionado:', mecanico.nombre);
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      provider: mecanico,
      providerId: mecanico.id,
      providerType: 'mecanico',
      isNearby: true,
      distance: mecanico.distance ? `${mecanico.distance}km` : 'Distancia no disponible'
    });
  }, [navigation]);

  // Función para manejar retry
  const handleRetry = () => {
    setError(null);
    initializeAndLoadData();
  };

  // Función para manejar filtros
  const handleApplyFilters = (filters) => {
    setSelectedMarca(filters.selectedMarca);
    setSelectedModelo(filters.selectedModelo);
    setSelectedComuna(filters.selectedComuna);
    setShowFiltersModal(false);
  };

  // Crear estilos dinámicos
  const styles = createStyles(colors, typography, spacing, borders);

  // Función para refrescar
  const onRefresh = React.useCallback(() => {
    handleRefresh();
  }, []);

  // Función para renderizar items
  const renderItem = ({ item }) => (
    <View style={styles.createdCardContainer}>
      <ProviderPreviewCard
        {...formatForPreviewCard(item)}
        width="100%"
        onPress={() => handleMecanicoPress(item)}
      />
    </View>
  );

  const formatForPreviewCard = formatProviderForCard;

  return (
    <View style={styles.container}>

      {/* Location Filter Section (UserPanel Style) */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setAddressModalVisible(true)}
        >
          <Ionicons name="location-outline" size={14} color={colors.primary?.[500]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {currentAddress ? `${currentAddress.etiqueta}` : 'Seleccionar ubicación'}
            {currentAddress && <Text style={{ fontWeight: '400', color: colors.text?.tertiary }}> ({currentAddress.direccion})</Text>}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.neutral?.gray?.[400]} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#3B82F6'} />
        </View>
      ) : (
        <FlatList
          data={mecanicos}
          numColumns={2}
          key={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.neutral?.gray?.[300] || '#D1D5DB'} />
              <Text style={styles.emptyText}>
                No se encontraron mecánicos
              </Text>
            </View>
          }
        />
      )}
      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleAddressChange}
        currentAddress={currentAddress}
      />
    </View>
  );
};

// Función para crear estilos dinámicos
const createStyles = (colors, typography, spacing, borders) => {
  const safeColors = colors || {};
  const safeTypography = typography || {};
  const safeSpacing = spacing || {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: safeColors.background?.default || '#F3F4F6',
    },
    filterSection: {
      backgroundColor: safeColors.background?.paper || '#FFFFFF',
      paddingHorizontal: safeSpacing.md || 16,
      paddingVertical: safeSpacing.sm || 8,
      borderBottomWidth: 1,
      borderBottomColor: safeColors.border?.light || '#E5E7EB',
    },
    locationSelector: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationText: {
      fontSize: safeTypography.fontSize?.sm || 14,
      color: safeColors.text?.secondary || '#4B5563',
      marginHorizontal: 4,
      maxWidth: 200,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: safeSpacing.md || 16,
    },
    createdCardContainer: {
      flex: 1,
      margin: 6,
      maxWidth: '47%'
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      textAlign: 'center',
      color: safeColors.text?.secondary || '#4B5563',
      fontSize: safeTypography.fontSize?.md || 16,
      marginTop: safeSpacing.md || 16,
    },
  });
};

export default MecanicosScreen;
