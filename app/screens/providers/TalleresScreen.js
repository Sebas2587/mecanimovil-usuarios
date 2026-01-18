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
import AddressSelector from '../../components/forms/AddressSelector';
import FiltersModal from '../../components/modals/FiltersModal';
import VehicleValidationMessage from '../../components/vehicles/VehicleValidationMessage';
import NearbyTallerCard from '../../components/cards/NearbyTallerCard';
import SearchBar from '../../components/forms/SearchBar';

// Utilidades
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';

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
    setLoading(true);
    try {
      const coords = await locationService.geocodeAddress(address.direccion);
      if (coords) {
        setUserLocation(coords);
        setLocationError(null);
      }
      // Obtener vehículos del usuario para filtrar por marcas
      const userVehicles = await vehicleService.getUserVehicles();
      // Recargar talleres con nueva ubicación - el backend calculará las distancias
      await loadInitialData(address, userVehicles);
      console.log('📍 Talleres recargados con distancias precisas del backend (PostGIS)');
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
      type: 'taller',
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={effectiveColors.primary?.[500] || SAFE_COLORS.primary[500]} />
        <Text style={styles.loadingText}>Cargando talleres...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={effectiveColors.error?.[500] || SAFE_COLORS.error[500]} />
        <Text style={styles.errorTitle}>Error al cargar talleres</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: effectiveColors.background?.default || SAFE_COLORS.background.default },
    scrollView: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: effectiveSpacing.lg || SAFE_SPACING.lg, paddingVertical: effectiveSpacing.md || SAFE_SPACING.md, backgroundColor: effectiveColors.background?.paper || SAFE_COLORS.background.paper, borderBottomWidth: effectiveBorders.width?.thin || SAFE_BORDERS.width.thin, borderBottomColor: effectiveColors.border?.light || SAFE_COLORS.border.light },
    backButton: { marginRight: effectiveSpacing.md || SAFE_SPACING.md, padding: effectiveSpacing.xs || SAFE_SPACING.xs },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: effectiveTypography.fontSize?.['2xl'] || SAFE_TYPOGRAPHY.fontSize['2xl'], color: effectiveColors.text?.primary || SAFE_COLORS.text.primary },
    headerSubtitle: { fontSize: effectiveTypography.fontSize?.sm || SAFE_TYPOGRAPHY.fontSize.sm, color: effectiveColors.text?.secondary || SAFE_COLORS.text.secondary, marginTop: effectiveSpacing.xxs || SAFE_SPACING.xxs },
    filterButton: { padding: effectiveSpacing.sm || SAFE_SPACING.sm, borderRadius: effectiveBorders.radius?.md || SAFE_BORDERS.radius.md, backgroundColor: effectiveColors.neutral?.gray?.[300] || SAFE_COLORS.neutral.gray[300] },
    locationBadgeContainer: {
      backgroundColor: effectiveColors.background?.paper || SAFE_COLORS.background.paper,
      marginHorizontal: effectiveSpacing.md || SAFE_SPACING.md,
      marginTop: effectiveSpacing.sm || SAFE_SPACING.sm,
      marginBottom: effectiveSpacing.xs || SAFE_SPACING.xs,
      borderRadius: effectiveBorders.radius?.md || SAFE_BORDERS.radius.md,
      paddingHorizontal: effectiveSpacing.sm || SAFE_SPACING.sm,
      paddingVertical: effectiveSpacing.xs || SAFE_SPACING.xs,
      shadowColor: effectiveColors.base?.inkBlack || SAFE_COLORS.base.inkBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: effectiveBorders.width?.thin || SAFE_BORDERS.width.thin,
      borderColor: effectiveColors.border?.light || SAFE_COLORS.border.light,
    },
    searchContainer: {
      paddingHorizontal: effectiveSpacing.md || SAFE_SPACING.md,
      paddingVertical: effectiveSpacing.sm || SAFE_SPACING.sm,
      backgroundColor: effectiveColors.background?.paper || SAFE_COLORS.background.paper,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: effectiveColors.background?.default || SAFE_COLORS.background.default },
    loadingText: { marginTop: effectiveSpacing.sm || SAFE_SPACING.sm, fontSize: effectiveTypography.fontSize?.md || SAFE_TYPOGRAPHY.fontSize.md, color: effectiveColors.text?.secondary || SAFE_COLORS.text.secondary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: effectiveColors.background?.default || SAFE_COLORS.background.default, paddingHorizontal: effectiveSpacing.lg || SAFE_SPACING.lg },
    errorTitle: { fontSize: effectiveTypography.fontSize?.xl || SAFE_TYPOGRAPHY.fontSize.xl, color: effectiveColors.text?.primary || SAFE_COLORS.text.primary, marginTop: effectiveSpacing.md || SAFE_SPACING.md, marginBottom: effectiveSpacing.sm || SAFE_SPACING.sm },
    errorMessage: { fontSize: effectiveTypography.fontSize?.md || SAFE_TYPOGRAPHY.fontSize.md, color: effectiveColors.text?.secondary || SAFE_COLORS.text.secondary, textAlign: 'center', marginBottom: effectiveSpacing.lg || SAFE_SPACING.lg },
    retryButton: { backgroundColor: effectiveColors.primary?.[500] || SAFE_COLORS.primary[500], paddingHorizontal: effectiveSpacing['2xl'] || SAFE_SPACING['2xl'], paddingVertical: effectiveSpacing.sm || SAFE_SPACING.sm, borderRadius: effectiveBorders.radius?.full || SAFE_BORDERS.radius.full },
    retryButtonText: { color: effectiveColors.text?.inverse || SAFE_COLORS.text.inverse, fontSize: effectiveTypography.fontSize?.md || SAFE_TYPOGRAPHY.fontSize.md },
    content: {
      paddingHorizontal: effectiveSpacing.md || SAFE_SPACING.md,
      paddingTop: effectiveSpacing.md || SAFE_SPACING.md,
      paddingBottom: effectiveSpacing.md || SAFE_SPACING.md,
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    cardContainer: {
      width: '48%',
      marginBottom: effectiveSpacing.md || SAFE_SPACING.md,
    },
    noTalleresContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: effectiveSpacing.lg || SAFE_SPACING.lg, paddingVertical: effectiveSpacing['2xl'] || SAFE_SPACING['2xl'] },
    noTalleresTitle: { fontSize: effectiveTypography.fontSize?.xl || SAFE_TYPOGRAPHY.fontSize.xl, color: effectiveColors.text?.primary || SAFE_COLORS.text.primary, marginTop: effectiveSpacing.md || SAFE_SPACING.md, marginBottom: effectiveSpacing.sm || SAFE_SPACING.sm },
    noTalleresMessage: { fontSize: effectiveTypography.fontSize?.md || SAFE_TYPOGRAPHY.fontSize.md, color: effectiveColors.text?.secondary || SAFE_COLORS.text.secondary, textAlign: 'center', marginBottom: effectiveSpacing.lg || SAFE_SPACING.lg },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={effectiveColors.background?.default || SAFE_COLORS.background.default} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[effectiveColors.primary?.[500] || SAFE_COLORS.primary[500]]} tintColor={effectiveColors.primary?.[500] || SAFE_COLORS.primary[500]} />}
      >
        {/* Selector de Dirección - Badge Style (igual que UserPanelScreen) */}
        <View style={styles.locationBadgeContainer}>
          <AddressSelector
            currentAddress={currentAddress}
            onAddressChange={handleAddressChange}
            onAddNewAddress={() => navigation.navigate(ROUTES.ADD_ADDRESS)}
          />
        </View>

        {/* Buscador mejorado */}
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="Buscar talleres por nombre, dirección o especialidad..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {validationError && (
          <VehicleValidationMessage title="Vehículo requerido" message={validationError} actionText="Agregar vehículo" actionRoute={ROUTES.MIS_VEHICULOS} icon="car-outline" />
        )}

        <View style={styles.content}>
          {filteredTalleres.length > 0 ? (
            <View style={styles.cardsGrid}>
              {filteredTalleres.map((taller, index) => (
                <View key={taller.id} style={styles.cardContainer}>
                  <NearbyTallerCard taller={taller} onPress={() => handleTallerPress(taller)} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noTalleresContainer}>
              <Ionicons name="construct-outline" size={60} color={effectiveColors.text?.secondary || SAFE_COLORS.text.secondary} />
              <Text style={styles.noTalleresTitle}>No hay talleres disponibles</Text>
              <Text style={styles.noTalleresMessage}>
                {searchQuery.trim()
                  ? `No se encontraron talleres que coincidan con "${searchQuery}"`
                  : 'No se encontraron talleres en tu área. Intenta cambiar tu ubicación o ampliar el radio de búsqueda.'
                }
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
    </SafeAreaView>
  );
};

export default TalleresScreen; 
