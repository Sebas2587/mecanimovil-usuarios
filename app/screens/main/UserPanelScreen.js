import React, { useState, useCallback } from 'react';
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
    data: vehicles = [],
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
    select: (data) => Array.isArray(data) ? data : (data?.results || [])
  });

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

        {/* 1.5 Active Requests Carousel */}
        <View style={styles.sectionContainer}>
          {solicitudesActivas && solicitudesActivas.length > 0 ? (
            <ActiveRequestsCarousel requests={solicitudesActivas} />
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
              <Text style={{ color: colors.text?.secondary || '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
                No tienes solicitudes de servicio activas.
              </Text>
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

        {/* 3. Mechanics Section */}
        {mechanics.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mecánicos a Domicilio</Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SEARCH_PROVIDERS, { type: 'mechanic' })}>
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
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.SEARCH_PROVIDERS, { type: 'workshop' })}>
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
  }
});

export default UserPanelScreen;
