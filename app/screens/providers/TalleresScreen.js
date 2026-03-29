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
  StatusBar
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
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';

// Utilidades
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
import { formatProviderForCard } from '../../utils/providerUtils';

const TalleresScreen = () => {
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
  const [talleres, setTalleres] = useState([]);
  const [filteredTalleres, setFilteredTalleres] = useState([]);
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

  const ordenarTalleresPorEstado = useCallback((talleres) => {
    return [...talleres].sort((a, b) => {
      const aConectado = a.esta_conectado || a.status === 'online';
      const bConectado = b.esta_conectado || b.status === 'online';
      if (aConectado && !bConectado) return -1;
      if (!aConectado && bConectado) return 1;
      const aDistance = parseFloat(a.distance) || 999;
      const bDistance = parseFloat(b.distance) || 999;
      return aDistance - bDistance;
    });
  }, []);

  // ELIMINADO: Funciones de recálculo innecesarias que causaban inconsistencias
  // El backend ya proporciona distancias precisas calculadas con PostGIS
  // Solo recargar datos del backend si cambia la dirección

  const actualizarEstadoTaller = useCallback((tallerId, status, estaConectado) => {
    console.log(`🔄 Actualizando estado de taller ${tallerId}: ${status} (${estaConectado ? 'Conectado' : 'Desconectado'})`);
    setTalleres(prevTalleres => {
      const talleresActualizados = prevTalleres.map(taller => {
        if (taller.id === tallerId) {
          const oldStatus = taller.status;
          if (oldStatus !== status) {
            console.log(`🔄 Estado de ${taller.nombre} cambió: ${oldStatus} → ${status}`);
          }
          return {
            ...taller,
            status: status,
            esta_conectado: estaConectado,
            ultima_conexion: estaConectado ? new Date().toISOString() : taller.ultima_conexion
          };
        }
        return taller;
      });
      return ordenarTalleresPorEstado(talleresActualizados);
    });
  }, [ordenarTalleresPorEstado]);

  const filtrarTalleres = useCallback(() => {
    let filtrados = [...talleres];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtrados = filtrados.filter(taller =>
        taller.nombre?.toLowerCase().includes(query) ||
        (taller.direccion_fisica?.direccion_completa || taller.direccion)?.toLowerCase().includes(query) ||
        taller.especialidades_nombres?.some(esp => esp.toLowerCase().includes(query))
      );
    }
    if (selectedComuna) {
      filtrados = filtrados.filter(taller => {
        if (taller.zonas_servicio && taller.zonas_servicio.length > 0) {
          return taller.zonas_servicio.some(zona =>
            zona.activa && zona.comunas?.some(comuna =>
              comuna.toLowerCase().includes(selectedComuna.toLowerCase())
            )
          );
        }
        return false;
      });
    }
    setFilteredTalleres(filtrados);
  }, [talleres, searchQuery, selectedComuna]);

  useEffect(() => { filtrarTalleres(); }, [filtrarTalleres]);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await websocketService.connect();
        setWebsocketConnected(true);
        websocketService.onMessage('mechanic_status_update', (data) => {
          console.log('📨 Actualización de estado recibida en TalleresScreen:', data);
          actualizarEstadoTaller(
            data.proveedor_id,
            data.status || 'offline',
            data.is_online || false
          );
        });
        websocketService.onMessage('current_statuses', (data) => {
          console.log('📋 Estados actuales recibidos en TalleresScreen:', data);
          if (data.statuses) {
            data.statuses.forEach(status => {
              actualizarEstadoTaller(status.proveedor_id, status.status, status.is_online);
            });
          }
        });
        if (talleres.length > 0) {
          const tallerIds = talleres.map(taller => taller.id);
          websocketService.subscribeToMechanics(tallerIds);
        }
      } catch (error) {
        console.error('❌ Error configurando WebSocket:', error);
      }
    };
    setupWebSocket();
    return () => { websocketService.disconnect(); };
  }, [talleres.length, actualizarEstadoTaller]);

  useEffect(() => { initializeAndLoadData(); }, []);

  // Recargar cuando gana foco para respetar dirección activa actual
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          console.log('🔄 TalleresScreen: useFocusEffect ejecutándose...');

          // Cargar vehículos del usuario
          const userVehicles = await vehicleService.getUserVehicles();

          const routeAddress = route?.params?.address || null;
          if (routeAddress) {
            console.log('📍 TalleresScreen: Usando dirección del route:', routeAddress.direccion);
            await locationService.setActiveAddress(routeAddress);
            setCurrentAddress(routeAddress);
            await loadInitialData(routeAddress, userVehicles);
          } else {
            console.log('📍 TalleresScreen: Validando dirección existente...');
            // Usar validación para asegurar dirección válida
            const validAddress = await locationService.ensureValidAddress();
            if (validAddress) {
              setCurrentAddress(validAddress);
              await loadInitialData(validAddress, userVehicles);
            } else {
              console.warn('⚠️ TalleresScreen: No hay direcciones válidas disponibles');
              setCurrentAddress(null);
            }
          }
        } catch (e) {
          console.warn('❌ TalleresScreen: Error en useFocusEffect:', e);
        }
      })();
    }, [])
  );

  const initializeAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🏪 Inicializando pantalla de talleres...');

      // Cargar vehículos del usuario primero
      const userVehicles = await vehicleService.getUserVehicles();
      console.log('🚗 Vehículos del usuario:', userVehicles.length);

      const routeAddress = route?.params?.address || null;
      if (routeAddress) { try { await locationService.setActiveAddress(routeAddress); } catch { } }
      const address = routeAddress
        || await locationService.getActiveAddress()
        || await locationService.getMainAddress();
      if (address) { try { await locationService.setActiveAddress(address); } catch { } }
      setCurrentAddress(address);
      if (address) {
        const coords = await locationService.geocodeAddress(address.direccion);
        if (coords) { setUserLocation(coords); }
      }
      await loadInitialData(address, userVehicles);
    } catch (error) {
      console.error('❌ Error inicializando TalleresScreen:', error);
      setError('Error al cargar los talleres. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async (addressParam = null, userVehiclesParam = null) => {
    try {
      console.log('🏪 Cargando talleres...');
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
      let talleresData = [];
      if (userVehicles && userVehicles.length > 0) {
        console.log('🚗 Filtrando talleres por vehículos del usuario:', userVehicles.length);
        talleresData = await providerService.getWorkshopsForUserVehicles(userVehicles);
      } else {
        // Si no tiene vehículos, buscar todos los talleres cercanos
        console.log('⚠️ Usuario sin vehículos, mostrando todos los talleres cercanos');
        const baseAddress = effectiveAddress || { direccion: 'Santiago, Chile' };
        talleresData = await providerService.getTalleresRealmenteCercanos(baseAddress, 10);
      }

      if (talleresData && Array.isArray(talleresData)) {
        console.log(`🏪 ${talleresData.length} talleres cargados`);
        // Los talleres ya vienen con distancias calculadas por el backend (PostGIS)
        console.log('📍 Usando distancias del backend (PostGIS) - más precisas que recálculos locales');
        const talleresOrdenados = ordenarTalleresPorEstado(talleresData);
        setTalleres(talleresOrdenados);
        setFilteredTalleres(talleresOrdenados);
      } else {
        console.log('🏪 No se encontraron talleres');
        setTalleres([]);
        setFilteredTalleres([]);
      }
    } catch (error) {
      console.error('❌ Error cargando talleres:', error);
      setError('Error al cargar los talleres. Intenta de nuevo.');
    }
  };

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
    try { await locationService.setActiveAddress(address); } catch { }
    setCurrentAddress(address);
    setAddressModalVisible(false);

    setLoading(true);
    try {
      const coords = await locationService.geocodeAddress(address.direccion);
      if (coords) {
        setUserLocation(coords);
        setLocationError(null);
      }
      // Obtener vehículos del usuario para filtrar por marcas
      const userVehicles = await vehicleService.getUserVehicles();
      // Recargar talleres con nueva ubicación
      await loadInitialData(address, userVehicles);
      console.log('📍 Talleres recargados con nueva ubicación');
    } catch (error) {
      console.error('❌ Error cambiando dirección:', error);
      setLocationError('Error al cambiar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => { setSearchQuery(text); };
  const clearSearch = () => { setSearchQuery(''); };
  const handleTallerPress = useCallback((taller) => {
    console.log('🏪 Taller seleccionado:', taller.nombre);
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      provider: taller,
      providerId: taller.id,
      providerType: 'taller',
      isNearby: true,
      distance: taller.distance ? `${taller.distance}km` : 'Distancia no disponible'
    });
  }, [navigation]);
  const handleRetry = () => { setError(null); initializeAndLoadData(); };
  const handleApplyFilters = (filters) => {
    setSelectedMarca(filters.selectedMarca);
    setSelectedModelo(filters.selectedModelo);
    setSelectedComuna(filters.selectedComuna);
    setShowFiltersModal(false);
  };

  const formatForPreviewCard = formatProviderForCard;

  const styles = React.useMemo(() =>
    createStyles(colors, typography, spacing, borders),
    [colors, typography, spacing, borders]
  );

  // Defensive check - prevent rendering if styles aren't ready
  if (!styles) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  // Early returns for loading and error states - AFTER styles is defined
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary?.[500] || '#3B82F6'} />
          <Text style={styles.loadingText}>Cargando talleres...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error?.[500] || '#EF4444'} />
          <Text style={styles.errorTitle}>Error al cargar talleres</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default || '#F3F4F6'} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary?.[500] || '#3B82F6']} tintColor={colors.primary?.[500] || '#3B82F6'} />}
      >

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

        {validationError && (
          <VehicleValidationMessage title="Vehículo requerido" message={validationError} actionText="Agregar vehículo" actionRoute={ROUTES.MIS_VEHICULOS} icon="car-outline" />
        )}

        <View style={styles.content}>
          {filteredTalleres.length > 0 ? (
            <View style={styles.cardsGrid}>
              {filteredTalleres.map((taller, index) => (
                <View key={taller.id} style={styles.cardContainer}>
                  <ProviderPreviewCard
                    {...formatForPreviewCard(taller)}
                    width="100%"
                    onPress={() => handleTallerPress(taller)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noTalleresContainer}>
              <Ionicons name="construct-outline" size={60} color={colors.text?.secondary || '#4B5563'} />
              <Text style={styles.noTalleresTitle}>No hay talleres disponibles</Text>
              <Text style={styles.noTalleresMessage}>
                No se encontraron talleres en tu área. Intenta cambiar tu ubicación o ampliar el radio de búsqueda.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={{ sortBy: 'distancia', selectedMarca, selectedModelo, selectedComuna }}
        type="taller"
      />

      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleAddressChange}
        currentAddress={currentAddress}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors, typography, spacing, borders) => {
  const safeColors = colors || {};
  const safeTypography = typography || {};
  const safeSpacing = spacing || {};
  const safeBorders = borders || {};

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: safeColors.background?.default || '#F3F4F6' },
    scrollView: { flex: 1 },
    // UserPanel location styles
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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: safeColors.background?.default || '#F3F4F6' },
    loadingText: { marginTop: safeSpacing.sm || 8, fontSize: safeTypography.fontSize?.md || 16, color: safeColors.text?.secondary || '#6B7280' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: safeColors.background?.default || '#F3F4F6', paddingHorizontal: safeSpacing.lg || 24 },
    errorTitle: { fontSize: safeTypography.fontSize?.xl || 20, color: safeColors.text?.primary || '#111827', marginTop: safeSpacing.md || 16, marginBottom: safeSpacing.sm || 8 },
    errorMessage: { fontSize: safeTypography.fontSize?.md || 16, color: safeColors.text?.secondary || '#6B7280', textAlign: 'center', marginBottom: safeSpacing.lg || 24 },
    retryButton: { backgroundColor: safeColors.secondary?.[500] || '#007EA7', paddingHorizontal: safeSpacing['2xl'] || 48, paddingVertical: safeSpacing.sm || 8, borderRadius: safeBorders.radius?.full || 9999 },
    retryButtonText: { color: safeColors.text?.inverse || '#FFFFFF', fontSize: safeTypography.fontSize?.md || 16 },
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
    noTalleresContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: safeSpacing.lg || 24, paddingVertical: safeSpacing['2xl'] || 48 },
    noTalleresTitle: { fontSize: safeTypography.fontSize?.xl || 20, color: safeColors.text?.primary || '#111827', marginTop: safeSpacing.md || 16, marginBottom: safeSpacing.sm || 8 },
    noTalleresMessage: { fontSize: safeTypography.fontSize?.md || 16, color: safeColors.text?.secondary || '#6B7280', textAlign: 'center', marginBottom: safeSpacing.lg || 24 },
  });
};

export default TalleresScreen;


