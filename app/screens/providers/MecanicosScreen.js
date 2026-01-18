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
import AddressSelector from '../../components/forms/AddressSelector';
import FiltersModal from '../../components/modals/FiltersModal';
import VehicleValidationMessage from '../../components/vehicles/VehicleValidationMessage';
import NearbyMecanicoCard from '../../components/cards/NearbyMecanicoCard';
import SearchBar from '../../components/forms/SearchBar';
import Header from '../../components/navigation/Header/Header';
import Card from '../../components/base/Card/Card';
import Badge from '../../components/base/Badge/Badge';

// Utilidades
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';

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

  // Función para manejar cambio de dirección
  const handleAddressChange = async (address) => {
    try { await locationService.setActiveAddress(address); } catch { }
    setCurrentAddress(address);
    setLoading(true);

    try {
      const coords = await locationService.geocodeAddress(address.direccion);
      if (coords) {
        setUserLocation(coords);
        setLocationError(null);
      }

      // Obtener vehículos del usuario para filtrar por marcas
      const userVehicles = await vehicleService.getUserVehicles();
      // Recargar mecánicos con nueva ubicación - el backend calculará las distancias
      await loadInitialData(address, userVehicles);
      console.log('📍 Mecánicos recargados con distancias precisas del backend (PostGIS)');
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

    // Navegar a los detalles del mecánico
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      provider: mecanico,
      type: 'mecanico',
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
  <TouchableOpacity
    onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: item.id, type: 'mecanico' })}
    activeOpacity={0.9}
  >
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        {item.imagen ? (
          <Image
            source={{ uri: item.imagen }}
            style={[styles.image, { borderRadius: borders.radius?.card?.md || 12 }]}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { borderRadius: borders.radius?.card?.md || 12 }]}>
            <Ionicons name="person" size={32} color={colors.text?.secondary || '#9CA3AF'} />
          </View>
        )}
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.name, {
              color: colors.text?.primary || '#111827',
              fontSize: typography.fontSize?.lg || 18
            }]}>
              {item.nombre}
            </Text>
            <Badge
              content={item.rating?.toFixed(1) || '0.0'}
              type="warning"
              size="sm"
              icon="star"
            />
          </View>

          <Text style={[styles.specialty, {
            color: colors.primary?.['600'] || '#2563EB',
            fontSize: typography.fontSize?.sm || 14,
            fontWeight: typography.fontWeight?.medium || '500'
          }]}>
            {item.especialidad || 'Mecánica General'}
          </Text>

          <View style={styles.detailsRow}>
            <Text style={[styles.distance, {
              color: colors.text?.secondary || '#4B5563',
              fontSize: typography.fontSize?.xs || 12
            }]}>
              <Ionicons name="location-outline" size={12} color={colors.text?.secondary || '#4B5563'} /> {item.distancia || item.distance || 'N/A'}
            </Text>
            <Text style={[styles.reviews, {
              color: colors.text?.secondary || '#4B5563',
              fontSize: typography.fontSize?.xs || 12
            }]}>
              {item.reviews || 0} reseñas
            </Text>
          </View>

          <View style={styles.footerRow}>
            <Badge
              content={item.disponible ? 'Disponible' : 'Ocupado'}
              type={item.disponible ? 'success' : 'neutral'}
              size="sm"
              variant="soft"
            />
          </View>
        </View>
      </View>
    </Card>
  </TouchableOpacity>
  );

  return (
  <View style={[styles.container, { backgroundColor: colors.background?.default || '#F3F4F6' }]}>
    <Header title="Mecánicos" showBack />

    <View style={[styles.searchContainer, {
      backgroundColor: colors.background?.paper || '#FFF',
      padding: spacing.md || 16
    }]}>
      <View style={[styles.searchBar, {
        backgroundColor: colors.background?.default || '#F3F4F6',
        borderRadius: borders.radius?.full || 9999
      }]}>
        <Ionicons name="search" size={20} color={colors.text?.secondary || '#9CA3AF'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, {
            color: colors.text?.primary || '#111827',
            fontSize: typography.fontSize?.md || 16
          }]}
          placeholder="Buscar mecánicos..."
          placeholderTextColor={colors.text?.secondary || '#9CA3AF'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>

    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary?.[500] || '#3B82F6'} />
      </View>
    ) : (
      <FlatList
        data={mecanicos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { padding: spacing.md || 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.neutral?.gray?.[300] || '#D1D5DB'} />
            <Text style={[styles.emptyText, {
              color: colors.text?.secondary || '#4B5563',
              fontSize: typography.fontSize?.md || 16,
              marginTop: spacing.md || 16
            }]}>
              No se encontraron mecánicos
            </Text>
          </View>
        }
      />
    )}
  </View>
  );
};

// Función para crear estilos dinámicos
const createStyles = (colors, typography, spacing, borders) => {
  // Valores fallback seguros
  const safeColors = colors || {
    background: { default: '#F3F4F6', paper: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#4B5563', inverse: '#FFFFFF' },
    primary: { 500: '#3B82F6' },
    border: { light: '#E5E7EB' }
  };
  const safeTypography = typography || {
    fontSize: { xs: 10, sm: 12, md: 16, lg: 18, xl: 20, '2xl': 24 },
    fontWeight: { medium: '500', bold: '700' }
  };
  const safeSpacing = spacing || { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 };
  const safeBorders = borders || {
    radius: { full: 9999, card: { md: 12 } },
    width: { thin: 1 }
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: safeBorders.width?.thin || 1,
      borderColor: safeColors.border?.light || '#E5E7EB',
    },
    searchContainer: {
      paddingHorizontal: safeSpacing.md || 16,
      paddingVertical: safeSpacing.sm || 8,
      backgroundColor: safeColors.background?.paper || '#FFFFFF',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: safeSpacing.md || 16,
    },
    searchIcon: {
      marginRight: safeSpacing.sm || 8,
    },
    searchInput: {
      flex: 1,
    },
    listContent: {
      // Estilos definidos inline
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: safeSpacing.xl || 32,
    },
    emptyText: {
      // Estilos definidos inline
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: safeColors.background?.default || '#F3F4F6',
    },
    loadingText: {
      marginTop: safeSpacing.sm || 8,
      fontSize: safeTypography.fontSize?.md || 16,
      color: safeColors.text?.secondary || '#4B5563',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: safeColors.background?.default || '#F3F4F6',
      paddingHorizontal: safeSpacing.lg || 24,
    },
    errorTitle: {
      fontSize: safeTypography.fontSize?.xl || 20,
      color: safeColors.text?.primary || '#111827',
      marginTop: safeSpacing.md || 16,
      marginBottom: safeSpacing.sm || 8,
    },
    errorMessage: {
      fontSize: safeTypography.fontSize?.md || 16,
      color: safeColors.text?.secondary || '#4B5563',
      textAlign: 'center',
      marginBottom: safeSpacing.lg || 24,
    },
    retryButton: {
      backgroundColor: safeColors.primary?.[500] || '#3B82F6',
      paddingHorizontal: safeSpacing['2xl'] || 48,
      paddingVertical: safeSpacing.sm || 8,
      borderRadius: safeBorders.radius?.full || 9999,
    },
    retryButtonText: {
      color: safeColors.text?.inverse || '#FFFFFF',
      fontSize: safeTypography.fontSize?.md || 16,
    },
    content: {
      paddingHorizontal: safeSpacing.md || 16,
      paddingTop: safeSpacing.md || 16,
      paddingBottom: safeSpacing.md || 16,
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    cardContainer: {
      width: '48%',
      marginBottom: safeSpacing.md || 16,
    },
    card: {
      // Estilos definidos inline
    },
    cardContent: {
      // Estilos definidos inline
    },
    image: {
      width: 80,
      height: 80,
    },
    imagePlaceholder: {
      backgroundColor: safeColors.background?.default || '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContainer: {
      // Estilos definidos inline
    },
    headerRow: {
      // Estilos definidos inline
    },
    name: {
      // Estilos definidos inline
    },
    specialty: {
      // Estilos definidos inline
    },
    detailsRow: {
      // Estilos definidos inline
    },
    distance: {
      // Estilos definidos inline
    },
    reviews: {
      // Estilos definidos inline
    },
    footerRow: {
      // Estilos definidos inline
    },
    noMecanicosContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: safeSpacing.lg || 24,
      paddingVertical: safeSpacing['2xl'] || 48,
    },
    noMecanicosTitle: {
      fontSize: safeTypography.fontSize?.xl || 20,
      color: safeColors.text?.primary || '#111827',
      marginTop: safeSpacing.md || 16,
      marginBottom: safeSpacing.sm || 8,
    },
    noMecanicosMessage: {
      fontSize: safeTypography.fontSize?.md || 16,
      color: safeColors.text?.secondary || '#4B5563',
      textAlign: 'center',
      marginBottom: safeSpacing.lg || 24,
    },
  });
};

export default MecanicosScreen; 