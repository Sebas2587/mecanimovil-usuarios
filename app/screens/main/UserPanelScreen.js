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

// Services
import { getUserVehicles } from '../../services/vehicle';
import { getMechanicsForUserVehicles, getWorkshopsForUserVehicles } from '../../services/providers';

const UserPanelScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [workshops, setWorkshops] = useState([]);

  const [stats, setStats] = useState({
    totalValue: 0,
    capitalGain: 0,
    fleetHealth: 100
  });

  const [isAddressModalVisible, setAddressModalVisible] = useState(false);

  // Address Hooks
  const { data: mainAddress } = useMainAddress(user?.id);
  const { mutateAsync: setMainAddressMutation } = useSetMainAddress();

  // Active Requests Context
  const { solicitudesActivas, cargarSolicitudesActivas } = useSolicitudes();

  // Design Tokens
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  const styles = getStyles(colors, typography, spacing, borders, insets);

  const fetchUserData = useCallback(async () => {
    try {
      // 1. Fetch User Vehicles
      const vehicleList = await getUserVehicles();
      setVehicles(vehicleList || []);

      // 2. Fetch Providers (Filtered by User Vehicles)
      if (vehicleList && vehicleList.length > 0) {
        // Parallel fetch for mechanics and workshops
        const [mechanicsData, workshopsData] = await Promise.all([
          getMechanicsForUserVehicles(vehicleList),
          getWorkshopsForUserVehicles(vehicleList),
          cargarSolicitudesActivas()
        ]);

        setMechanics(mechanicsData || []);
        setWorkshops(workshopsData || []);

        // Calculate Stats
        let totalVal = 0;
        let totalHealth = 0;
        let totalCapitalGain = 0;

        vehicleList.forEach(v => {
          // Suggested Price (Our val)
          const suggested = v.precio_sugerido_final || 0;
          // Market Average (Base val)
          const market = v.precio_mercado_promedio || 0;

          // Total Value for Patrimony is the Suggested Price (what they can sell for)
          // If suggested is 0 (uncalculated), fallback to market
          const finalPrice = suggested > 0 ? suggested : market;
          totalVal += finalPrice;

          // Capital Gain = Value added by certification/health
          // Only calculate if we have both values
          if (suggested > 0 && market > 0) {
            totalCapitalGain += (suggested - market);
          }

          totalHealth += (v.health_score || 0);
        });

        const avgHealth = vehicleList.length > 0 ? Math.round(totalHealth / vehicleList.length) : 0;

        setStats({
          totalValue: totalVal,
          capitalGain: totalCapitalGain,
          fleetHealth: avgHealth
        });
      } else {
        setStats({ totalValue: 0, capitalGain: 0, fleetHealth: 100 });
        setMechanics([]);
        setWorkshops([]);
      }

    } catch (error) {
      console.error("Error fetching user dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial Fetch
  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Refetch when address changes
  React.useEffect(() => {
    if (mainAddress) {
      fetchUserData();
    }
  }, [mainAddress, fetchUserData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [fetchUserData]);

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
      image: provider.foto_perfil
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary?.[500]} />
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

            {/* Avatar + Notification */}
            <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate(ROUTES.PROFILE)}>
              <Image
                source={{ uri: user?.foto_perfil_url || user?.foto_perfil || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop' }}
                style={styles.avatarImage}
                contentFit="cover"
              />
              <View style={styles.notificationBadge} />
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
        <View style={{ marginTop: 24 }}>
          <ActiveRequestsCarousel requests={solicitudesActivas} />
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

            {/* Add New Vehicle Action Card */}
            <TouchableOpacity style={styles.addVehicleCard} onPress={() => navigation.navigate(ROUTES.CREAR_VEHICULO)}>
              <View style={styles.addIconContainer}>
                <Ionicons name="add" size={24} color={colors.primary?.[500]} />
              </View>
              <Text style={styles.addVehicleText}>Agregar</Text>
            </TouchableOpacity>
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
        visible={isAddressModalVisible}
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
