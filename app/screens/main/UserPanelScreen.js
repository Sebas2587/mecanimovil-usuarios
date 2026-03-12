import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { ROUTES } from '../../utils/constants';

// Components
import PatrimonyCard from '../../components/home/PatrimonyCard';
import HomeVehicleCard from '../../components/home/HomeVehicleCard';
import ActiveRequestsCarousel from '../../components/home/ActiveRequestsCarousel';
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';
import AddressSelectionModal from '../../components/location/AddressSelectionModal';

// Hooks
import { useMainAddress, useSetMainAddress } from '../../hooks/useAddress';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useSolicitudes } from '../../context/SolicitudesContext';
import { useNearbyMecanicos, useNearbyTalleres } from '../../hooks/useProviders';
import { useQuery } from '@tanstack/react-query';

// Services
import { getUserVehicles } from '../../services/vehicle';

const UserPanelScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();
  const { data: mainAddress } = useMainAddress(user?.id);
  const { mutateAsync: setMainAddressMutation } = useSetMainAddress();

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalValue: 0,
    capitalGain: 0,
    fleetHealth: 100
  });

  // Design Tokens
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  const styles = getStyles(colors, typography, spacing, borders, insets);

  // Use TanStack Query for vehicles with proper caching
  const {
    data: vehiclesData,
    isLoading: vehiclesLoading,
    refetch: refetchVehicles,
    isRefetching: vehiclesRefetching
  } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes (was cacheTime in v4)
    refetchOnMount: true, // Will only refetch if data is stale (older than 5 min)
    refetchOnWindowFocus: false,
    select: useCallback((data) => Array.isArray(data) ? data : (data?.results || []), [])
  });

  // Stabilize vehicles array to prevent useEffect loop
  const vehicles = useMemo(() => vehiclesData || [], [vehiclesData]);

  // Use optimized hooks for providers (they already have caching)
  const {
    data: mechanics = [],
    isLoading: mechanicsLoading,
    refetch: refetchMechanics
  } = useNearbyMecanicos(vehicles, mainAddress);

  const {
    data: workshops = [],
    isLoading: workshopsLoading,
    refetch: refetchWorkshops
  } = useNearbyTalleres(vehicles, mainAddress);



  // Calculate stats when vehicles change
  React.useEffect(() => {
    if (vehicles.length > 0) {
      let totalVal = 0;
      let totalHealth = 0;
      let totalCapitalGain = 0;

      vehicles.forEach(v => {
        const suggested = v.precio_sugerido_final || 0;
        const market = v.precio_mercado_promedio || 0;
        const finalPrice = suggested > 0 ? suggested : market;
        totalVal += finalPrice;

        if (suggested > 0 && market > 0) {
          totalCapitalGain += (suggested - market);
        }

        totalHealth += (v.health_score || 0);
      });

      const avgHealth = vehicles.length > 0 ? Math.round(totalHealth / vehicles.length) : 0;

      setStats({
        totalValue: totalVal,
        capitalGain: totalCapitalGain,
        fleetHealth: avgHealth
      });
    } else {
      setStats({ totalValue: 0, capitalGain: 0, fleetHealth: 0 }); // Fix: 0% health if no vehicles
    }
  }, [vehicles]);

  // Manual refresh handler
  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetchVehicles(),
      refetchMechanics(),
      refetchWorkshops(),
      cargarSolicitudesActivas()
    ]);
  }, [refetchVehicles, refetchMechanics, refetchWorkshops, cargarSolicitudesActivas]);

  const isRefreshing = vehiclesRefetching;
  const isLoading = vehiclesLoading || mechanicsLoading || workshopsLoading;

  // Handle Address Selection
  const handleSelectAddress = async (address) => {
    try {
      await setMainAddressMutation(address.id);
      // Data will refresh due to useEffect dependency on mainAddress
    } catch (error) {
      console.error("Error setting main address", error);
    }
  };

  // Helper to format favorite for PreviewCard (favorites have marcas_atendidas_nombres, especialidades_nombres)
  const formatFavoriteForPreviewCard = (favorite) => {
    const specialty =
      favorite.marcas_atendidas_nombres?.length > 0
        ? favorite.marcas_atendidas_nombres.join(', ')
        : favorite.especialidades_nombres?.length > 0
          ? favorite.especialidades_nombres.join(', ')
          : 'Especialidad general';
    return {
      image: favorite.foto_perfil || favorite.usuario?.foto_perfil || favorite.foto_perfil_url,
      name: favorite.nombre,
      specialty,
      rating: favorite.calificacion_promedio != null ? parseFloat(favorite.calificacion_promedio).toFixed(1) : '0.0',
      reviews: favorite.numero_de_calificaciones ?? 0,
      distance: null,
      verified: favorite.verificado ?? false,
    };
  };

  // Helper to format provider data for PreviewCard
  const formatProviderData = (provider) => {
    // Get primary specialty or join names
    let specialty = "General";
    if (provider.especialidades && Array.isArray(provider.especialidades) && provider.especialidades.length > 0) {
      specialty = provider.especialidades[0].nombre || provider.especialidades.map(s => s.nombre).join(', ');
    }

    return {
      id: provider.id,
      name: provider.nombre,
      specialty: specialty,
      rating: provider.calificacion_promedio ? parseFloat(provider.calificacion_promedio).toFixed(1) : "0.0",
      reviews: provider.numero_de_calificaciones || 0,
      distance: provider.distancia_km ? `${provider.distancia_km.toFixed(1)} km` : null,
      verified: provider.verificado,
      image: provider.usuario?.foto_perfil || provider.usuario?.foto_perfil_url || provider.foto_perfil_url || provider.foto_perfil
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background?.default} />

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary?.[500]} />
        }
      >
        {/* Custom Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Hola, {user?.first_name || 'Conductor'} 👋</Text>

              {/* Location Selector */}
              <TouchableOpacity
                style={styles.locationSelector}
                onPress={() => setAddressModalVisible(true)}
              >
                <Ionicons name="location-outline" size={14} color={colors.primary?.[500]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {mainAddress ? `${mainAddress.etiqueta}` : 'Seleccionar ubicación'}
                  {mainAddress && <Text style={{ fontWeight: '400', color: colors.text.tertiary }}> ({mainAddress.direccion})</Text>}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.neutral?.gray?.[400]} />
              </TouchableOpacity>
            </View>

            {/* Avatar */}
            <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate(ROUTES.PROFILE)}>
              {user?.foto_perfil_url || user?.foto_perfil ? (
                <Image
                  source={{ uri: user.foto_perfil_url || user.foto_perfil }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatarImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary?.light || '#E0F2FE' }]}>
                  <Ionicons name="person" size={20} color={colors.primary?.main || '#003459'} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Patrimony Card */}
        <PatrimonyCard
          totalValue={stats.totalValue}
          capitalGain={stats.capitalGain}
          fleetHealth={stats.fleetHealth}
        />

        {/* 1.5 Active Requests — mismo patrón de sección que el resto del panel */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Solicitudes activas</Text>
            {solicitudesActivas && solicitudesActivas.length > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MIS_SOLICITUDES)}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {solicitudesActivas && solicitudesActivas.length > 0 ? (
            <ActiveRequestsCarousel requests={solicitudesActivas} />
          ) : (
            <View style={styles.emptySolicitudesCard}>
              <View style={styles.emptySolicitudesIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={colors.primary?.main || colors.primary?.[500] || '#003459'}
                />
              </View>
              <Text style={styles.emptySolicitudesTitle}>
                Aún no tienes solicitudes en curso
              </Text>
              <Text style={styles.emptySolicitudesSubtitle}>
                Crea una solicitud para recibir ofertas de talleres y mecánicos cercanos.
              </Text>
              <TouchableOpacity
                style={styles.emptySolicitudesCta}
                onPress={() => navigation.navigate(ROUTES.CREAR_SOLICITUD)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emptySolicitudesCtaText}>Nueva solicitud</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 2. My Vehicles Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus Vehículos</Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MIS_VEHICULOS)}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            snapToStart
            decelerationRate="fast"
          >
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <HomeVehicleCard
                  key={vehicle.id}
                  vehicle={{
                    id: vehicle.id,
                    marca: vehicle.marca_nombre || vehicle.marca,
                    modelo: vehicle.modelo_nombre || vehicle.modelo,
                    year: vehicle.year,
                    kilometraje: vehicle.kilometraje,
                    foto: vehicle.foto, // Serializer returns full URL
                    health: vehicle.health_score || 0, // Using 0 for uncalculated
                    estimatedPrice: vehicle.precio_sugerido_final || vehicle.precio_mercado_promedio || 0,
                    pendingAlerts: vehicle.pending_alerts_count || 0
                  }}
                  onPress={() => navigation.navigate(ROUTES.VEHICLE_PROFILE, { vehicleId: vehicle.id, vehicle: vehicle })}
                />
              ))
            ) : (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ color: '#6B7280' }}>No tienes vehículos registrados.</Text>
              </View>
            )}

            {/* Add New Vehicle Action Card - REMOVE PER REQUEST */}
            {/* <TouchableOpacity style={styles.addVehicleCard} onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}>
              <View style={styles.addIconContainer}>
                <Ionicons name="add" size={24} color={colors.primary?.[500]} />
              </View>
              <Text style={styles.addVehicleText}>Agregar</Text>
            </TouchableOpacity> */}
          </ScrollView>
        </View>

        {/* 2.5 Proveedores Favoritos */}
        {favorites.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Proveedores Favoritos</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.FAVORITE_PROVIDERS })}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {favorites.map((item) => {
                const formatted = formatFavoriteForPreviewCard(item);
                return (
                  <ProviderPreviewCard
                    key={`${item.id}-${item.type}`}
                    {...formatted}
                    onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: item.id, providerType: item.type, provider: item })}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 3. Mechanics Section */}
        {mechanics.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mecánicos a Domicilio</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MECANICOS)}>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral?.gray?.[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {mechanics.map((mech) => {
                const formatted = formatProviderData(mech);
                return (
                  <ProviderPreviewCard
                    key={mech.id}
                    {...formatted}
                    onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: mech.id, providerType: 'mecanico' })}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 4. Workshops Section */}
        {workshops.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Talleres Certificados</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.TALLERES)}>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral?.gray?.[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {workshops.map((workshop) => {
                const formatted = formatProviderData(workshop);
                return (
                  <ProviderPreviewCard
                    key={workshop.id}
                    {...formatted}
                    onPress={() => navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: workshop.id, providerType: 'taller' })}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* No Vehicles Warning Card */}
        {vehicles.length === 0 && !isLoading && (
          <View style={[styles.sectionContainer, { marginTop: 8, paddingHorizontal: 16 }]}>
            <View style={{
              backgroundColor: colors.background?.paper || '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.warning?.main ? `${colors.warning.main}40` : '#FCD34D', // Yellow/Gold border
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.warning?.light || '#FEF3C7', // Light yellow
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16
                }}>
                  <Ionicons name="car-sport" size={24} color={colors.warning?.main || '#D97706'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text?.primary || '#111827',
                    marginBottom: 4
                  }}>
                    Comienza en MecaniMóvil
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: colors.text?.secondary || '#4B5563',
                    marginBottom: 16,
                    lineHeight: 20
                  }}>
                    Para solicitar servicios, gestionar mantenimientos y usar todas las funciones, necesitas registrar un vehículo.
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary?.main || '#003459',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                      Agregar mi vehículo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />

      </ScrollView>

      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleSelectAddress}
        currentAddress={mainAddress}
      />
    </View>
  );
};

const getStyles = (colors, typography, spacing, borders, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || '#F8F9FA',
  },
  scrollContent: {
    paddingTop: insets.top + (spacing.sm || 8),
    paddingBottom: insets.bottom,
  },
  headerContainer: {
    paddingHorizontal: spacing.md || 16,
    marginBottom: spacing.xs || 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
    marginRight: 16,
  },
  greetingText: {
    fontSize: typography.fontSize?.xl || 20,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#111827',
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#4B5563',
    marginHorizontal: 4,
    maxWidth: 200,
  },
  avatarButton: {
    position: 'relative',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error?.main || '#EF4444',
    borderWidth: 2,
    borderColor: colors.background?.default || '#F8F9FA',
  },
  sectionContainer: {
    marginBottom: spacing.lg || 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md || 16,
    marginBottom: spacing.sm || 12,
  },
  sectionTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#111827',
  },
  seeAllText: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.primary?.main || '#003459',
    fontWeight: typography.fontWeight?.medium || '500',
  },
  horizontalList: {
    paddingHorizontal: spacing.md || 16,
  },
  addVehicleCard: {
    width: 80,
    backgroundColor: 'rgba(0, 52, 89, 0.05)',
    borderRadius: borders.radius?.lg || 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 52, 89, 0.1)',
    borderStyle: 'dashed',
  },
  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 52, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addVehicleText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary?.[500],
  },
  /* Empty state solicitudes activas — alineado a tarjetas del panel */
  emptySolicitudesCard: {
    marginHorizontal: spacing.md || 16,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.lg || 16,
    padding: spacing.lg || 20,
    borderWidth: 1,
    borderColor: colors.neutral?.gray?.[200] || '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptySolicitudesIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary?.light || 'rgba(0, 52, 89, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md || 16,
  },
  emptySolicitudesTitle: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#111827',
    textAlign: 'center',
    marginBottom: spacing.xs || 8,
  },
  emptySolicitudesSubtitle: {
    fontSize: typography.fontSize?.sm || 14,
    color: colors.text?.secondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg || 20,
    paddingHorizontal: spacing.sm || 8,
  },
  emptySolicitudesCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary?.main || colors.primary?.[500] || '#003459',
    paddingVertical: spacing.sm || 12,
    paddingHorizontal: spacing.lg || 20,
    borderRadius: borders.radius?.button?.md || 12,
  },
  emptySolicitudesCtaText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.sm || 15,
    fontWeight: typography.fontWeight?.semibold || '600',
  },
});

export default UserPanelScreen;
