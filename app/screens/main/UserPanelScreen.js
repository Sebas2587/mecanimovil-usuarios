import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';

// Hooks
import { useVehicles, useVehiclesHealth } from '../../hooks/useVehicles';
import { useMainAddress } from '../../hooks/useAddress';
import { useCategories } from '../../hooks/useCategories';
import { useNearbyTalleres, useNearbyMecanicos } from '../../hooks/useProviders';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useServicesHistory } from '../../hooks/useServices';
import { useUnreadCount } from '../../hooks/useNotifications';

// Componentes
import AddressSelector from '../../components/forms/AddressSelector';
import CategoryGridCard from '../../components/cards/CategoryGridCard';
import NearbyTallerCard from '../../components/cards/NearbyTallerCard';
import NearbyMecanicoCard from '../../components/cards/NearbyMecanicoCard';
import SolicitudCard from '../../components/solicitudes/SolicitudCard';
import Button from '../../components/base/Button/Button';
import UserPanelSkeleton from '../../components/utils/UserPanelSkeleton';

// Servicios
import * as vehicleService from '../../services/vehicle';
import * as locationService from '../../services/location';
import * as providerService from '../../services/providers';
import * as categoryService from '../../services/categories';
import { getMediaURL } from '../../services/api';
import websocketService from '../../services/websocketService';
import VehicleHealthService from '../../services/vehicleHealthService';

/**
 * Pantalla principal del usuario (Home/Dashboard)
 * Muestra información del usuario, vehículos, servicios, proveedores y solicitudes activas
 */
const UserPanelScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const queryClient = useQueryClient();

  // Design Tokens
  const colors = theme?.colors || {};
  const typography = theme?.typography || {}; // Simplified fallback handling
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};

  // Safe Typography & Borders (reusing logic from original)
  const safeTypography = (typography?.fontSize && typography?.fontWeight && typeof typography?.fontSize?.['2xl'] !== 'undefined')
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
      fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    };

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

  const baseTabBarHeight = Platform.OS === 'ios' ? 49 : 60;
  const tabBarHeight = baseTabBarHeight + insets.bottom;

  // Contextos
  const {
    solicitudesActivas = [],
    cargarSolicitudesActivas
  } = useSolicitudes();

  const isClient = user && (user.is_client === true || user.is_client === undefined);

  // --- Data Fetching with Hooks ---
  const { data: vehicles, isLoading: loadingVehicles, isRefetching: isRefetchingVehicles } = useVehicles();
  const { data: mainAddress, isLoading: loadingAddress } = useMainAddress(user?.id);
  const { data: categories, isLoading: loadingCategories } = useCategories(vehicles);
  const { data: nearbyTalleres, isLoading: loadingTalleres } = useNearbyTalleres(vehicles, mainAddress);
  const { data: nearbyMecanicos, isLoading: loadingMecanicos } = useNearbyMecanicos(vehicles, mainAddress);
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: servicesHistory } = useServicesHistory(user?.id);
  const vehiclesHealthQuery = useVehiclesHealth(vehicles);
  const { data: unreadNotifications } = useUnreadCount();

  // --- Local State ---
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [vehicleImages, setVehicleImages] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [urgentAlerts, setUrgentAlerts] = useState([]); // Keep legacy logic for now or refactor later

  // Set active vehicle
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      if (!activeVehicle || !vehicles.find(v => v.id === activeVehicle.id)) {
        setActiveVehicle(vehicles[0]);
      }
    } else {
      setActiveVehicle(null);
    }
  }, [vehicles]);

  // Resolve Profile Image
  const displayUser = userProfile || user;
  useEffect(() => {
    const resolveProfileImage = async () => {
      if (displayUser?.foto_perfil_url) {
        setProfileImageUrl(displayUser.foto_perfil_url);
      } else if (displayUser?.foto_perfil) {
        try {
          const url = await getMediaURL(displayUser.foto_perfil);
          setProfileImageUrl(url);
        } catch (e) {
          console.error("Error resolving profile image", e);
          setProfileImageUrl(null);
        }
      } else {
        setProfileImageUrl(null);
      }
    };
    resolveProfileImage();
  }, [displayUser]);

  // Resolve Vehicle Images
  useEffect(() => {
    const resolveVehicleImages = async () => {
      if (!vehicles || vehicles.length === 0) return;
      const map = {};
      let changed = false;

      await Promise.all(vehicles.map(async (v) => {
        if (v.foto) {
          try {
            const url = await getMediaURL(v.foto);
            if (url) {
              map[v.id] = url;
              changed = true;
            }
          } catch (e) { /* silent */ }
        }
      }));

      if (changed) setVehicleImages(prev => ({ ...prev, ...map }));
    };
    resolveVehicleImages();
  }, [vehicles]);

  // Urgent Alerts Logic (Legacy Adapter)
  // We can calculate this from vehiclesHealthQuery data on the fly?
  // UserPanelScreen logic was complex (virtual alerts etc).
  // Ideally this logic should be a function 'calculateAlerts(vehicles, healthData)'.
  // I will put it in a useEffect for now to update 'urgentAlerts' state, mimicking old behavior.
  useEffect(() => {
    if (!vehicles || !vehiclesHealthQuery.data) {
      setUrgentAlerts([]);
      return;
    }

    const allAlerts = [];
    vehiclesHealthQuery.data.forEach(item => {
      if (!item.health) return;
      const healthData = item.health;
      const alertsDirect = healthData.alertas || [];

      // Filter direct alerts
      const filteredDirect = alertsDirect.filter(a =>
        (a.activa === true || a.activa === undefined) && (!a.prioridad || a.prioridad >= 2)
      ).map(a => ({
        ...a,
        vehicle_id: item.vehicleId,
        vehicle_info: vehicles.find(v => v.id === item.vehicleId)
      }));

      // Virtual alerts
      const componentsUrgent = (healthData.componentes || []).filter(c =>
        c.requiere_servicio_inmediato || c.nivel_alerta === 'URGENTE' || c.nivel_alerta === 'CRITICO' || c.salud_porcentaje < 30
      );

      const virtualAlerts = componentsUrgent.filter(c => {
        const cId = c.id || c.componente_config?.id;
        return !filteredDirect.some(a => a.componente_salud_detail?.id === cId || a.componente_salud === cId);
      }).map(c => ({
        id: `virtual_${item.vehicleId}_${c.id}`,
        titulo: `${c.nombre || c.componente_config?.nombre || 'Componente'} requiere atención`,
        descripcion: c.mensaje_alerta || `Requiere mantenimiento (${c.salud_porcentaje?.toFixed(0) || 0}%)`,
        prioridad: c.nivel_alerta === 'CRITICO' ? 5 : 4,
        activa: true,
        componente_salud_detail: c,
        tipo_alerta: 'COMPONENTE_CRITICO',
        vehicle_id: item.vehicleId,
        vehicle_info: vehicles.find(v => v.id === item.vehicleId)
      }));

      allAlerts.push(...filteredDirect, ...virtualAlerts);
    });

    allAlerts.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    setUrgentAlerts(allAlerts);

  }, [vehicles, vehiclesHealthQuery.data]);


  // Navigation Handlers
  const handleAddressChange = (address) => {
    // Mutating address should invalidate query in useAddress.js (not implemented there yet but standard React Query flow)
    // Actually useAddress listens to 'mainAddress'. If we change it efficiently, we should invalidate 'mainAddress'.
    // But AddressSelector likely does the update. We should just invalidate.
    queryClient.invalidateQueries(['mainAddress']);
    queryClient.invalidateQueries(['nearbyTalleres']);
    queryClient.invalidateQueries(['nearbyMecanicos']);
  };

  const handleAddNewAddress = () => {
    navigation.navigate(ROUTES.ADD_ADDRESS, {
      onAddressAdded: async () => {
        queryClient.invalidateQueries(['mainAddress']);
      }
    });
  };

  const handleProviderPress = (provider, type) => {
    navigation.navigate(ROUTES.PROVIDER_DETAIL, { providerId: provider.id, providerType: type });
  };

  const handleCategoryPress = (category) => {
    const marcasIds = vehicles ? [...new Set(vehicles.map(v => v.marca).filter(Boolean))] : [];
    navigation.navigate(ROUTES.CATEGORY_SERVICES_LIST, {
      categoryId: category.id,
      categoryName: category.nombre,
      categoryDescription: category.descripcion,
      marcasIds: marcasIds,
      categoria: category
    });
  };

  const handleVehiclePress = useCallback((vehicle) => {
    navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: vehicle.id, vehicle });
  }, [navigation]);

  const handleAlertPress = useCallback((alerta) => {
    // Alert logic copied from original
    const targetVehicle = alerta.vehicle_info || activeVehicle;
    if (!targetVehicle) return;

    const serviciosRecomendados = alerta.servicios_recomendados_detail || alerta.servicios_recomendados || [];

    if (serviciosRecomendados.length > 0) {
      // Navigate logic
      try {
        navigation.navigate('TabNavigator', {
          screen: ROUTES.CREAR_SOLICITUD,
          params: { vehicle: targetVehicle, serviciosPreSeleccionados: serviciosRecomendados.map(s => s.id || s), alerta }
        });
      } catch (e) {
        navigation.navigate(ROUTES.CREAR_SOLICITUD, { vehicle: targetVehicle, serviciosPreSeleccionados: serviciosRecomendados.map(s => s.id || s), alerta });
      }
    } else {
      const compName = alerta.componente_salud_detail?.componente_config?.nombre || alerta.componente_salud_detail?.nombre || '';
      try {
        navigation.navigate('TabNavigator', {
          screen: ROUTES.CREAR_SOLICITUD,
          params: { vehicle: targetVehicle, descripcionPrellenada: `Mantenimiento: ${compName}. ${alerta.descripcion}`, alerta }
        });
      } catch (e) {
        navigation.navigate(ROUTES.CREAR_SOLICITUD, { vehicle: targetVehicle, descripcionPrellenada: `Mantenimiento: ${compName}. ${alerta.descripcion}`, alerta });
      }
    }
  }, [activeVehicle, navigation]);


  const onRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (refreshing) {
      console.log('[onRefresh] Already refreshing, skipping...');
      return;
    }

    setRefreshing(true);

    try {
      // 1. CANCEL all in-flight queries before invalidating
      // This prevents old requests from completing after new ones start
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      await queryClient.cancelQueries({ queryKey: ['mainAddress'] });
      await queryClient.cancelQueries({ queryKey: ['userProfile'] });
      await queryClient.cancelQueries({ queryKey: ['servicesHistory'] });
      await queryClient.cancelQueries({ queryKey: ['vehicleHealth'] });
      await queryClient.cancelQueries({ queryKey: ['nearbyTalleres'] });
      await queryClient.cancelQueries({ queryKey: ['nearbyMecanicos'] });
      await queryClient.cancelQueries({ queryKey: ['categories'] });

      console.log('[onRefresh] Cancelled in-flight requests');

      // 2. Invalidate queries to trigger refetch
      // Run critical queries first, then secondary ones
      await Promise.all([
        queryClient.invalidateQueries(['vehicles']),
        queryClient.invalidateQueries(['mainAddress']),
      ]);

      // Wait a bit before fetching non-critical data
      await new Promise(resolve => setTimeout(resolve, 100));

      await Promise.all([
        queryClient.invalidateQueries(['userProfile']),
        queryClient.invalidateQueries(['servicesHistory']),
        queryClient.invalidateQueries(['vehicleHealth']),
        isClient ? cargarSolicitudesActivas() : Promise.resolve()
      ]);

      // Note: nearbyTalleres and nearbyMecanicos will automatically refetch
      // when their dependencies (vehicles, address) update, thanks to React Query

      console.log('[onRefresh] Refresh complete');
    } catch (error) {
      console.error('[onRefresh] Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, isClient, cargarSolicitudesActivas, refreshing]);


  // Helper Renderers
  const getHealthColor = useCallback((percentage) => {
    if (!percentage && percentage !== 0) return colors.neutral?.gray?.[400] || '#9E9E9E';
    if (percentage >= 70) return colors.success?.[500] || '#10B981';
    if (percentage >= 40) return colors.warning?.[500] || '#F59E0B';
    if (percentage >= 20) return colors.error?.[500] || '#EF4444';
    return colors.error?.[600] || '#DC2626';
  }, [colors]);

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

  const renderVehicleItem = useCallback((vehicle) => {
    const healthItem = vehiclesHealthQuery.data?.find(h => h.vehicleId === vehicle.id);
    const healthPercentage = healthItem?.health?.salud_general_porcentaje || 0;
    const healthColor = getHealthColor(healthPercentage);

    // Calculate service count
    const vehicleServices = servicesHistory?.filter(
      s => (s.vehiculo_detail?.id === vehicle.id || s.vehiculo === vehicle.id) && s.estado === 'completado'
    ) || [];
    const serviceCount = vehicleServices.length;

    const imageUrl = vehicleImages[vehicle.id];

    return (
      <TouchableOpacity
        style={styles.vehicleItem}
        activeOpacity={0.7}
        onPress={() => handleVehiclePress(vehicle)}
      >
        <View style={styles.vehicleImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
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

        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleInfoLeft}>
            <Text style={styles.vehicleBrand} numberOfLines={1}>
              {vehicle.marca_nombre || vehicle.marca} {vehicle.modelo_nombre || vehicle.modelo}
            </Text>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleYear}>{vehicle.year}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.vehicleKm}>
                {vehicle.kilometraje?.toLocaleString() || 0} km
              </Text>
            </View>
            <View style={styles.serviceCountRow}>
              <Ionicons name="construct-outline" size={14} color={colors.text?.secondary || '#5D6F75'} />
              <Text style={styles.serviceCountText}>
                {serviceCount} {serviceCount === 1 ? 'servicio' : 'servicios'}
              </Text>
            </View>
          </View>
          <View style={styles.healthSection}>
            {renderCircularProgress(healthPercentage, healthColor)}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [vehiclesHealthQuery.data, servicesHistory, vehicleImages, getHealthColor, renderCircularProgress, handleVehiclePress, styles, colors]);

  // Loading State
  // Initial loading should be specific. If we have cached vehicles, we show them.
  // We utilize isLoading from hooks.
  const isInitialLoading = loadingVehicles && !vehicles;

  if (isInitialLoading) {
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
          { paddingBottom: tabBarHeight + (spacing?.lg || 20) }
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
        {/* Header */}
        <LinearGradient
          colors={[
            colors.accent?.[400] || colors.primary?.[400] || '#33BFE7',
            colors.primary?.[500] || colors.accent?.[500] || '#0061FF'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTopRow}>
            {/* Left: Profile Picture */}
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PROFILE)} style={[styles.profileButton, { marginRight: 12 }]}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImage} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={styles.profilePlaceholderWhite}>
                  <Ionicons name="person" size={24} color={colors.primary?.[500]} />
                </View>
              )}
            </TouchableOpacity>

            {/* Middle: Welcome Text */}
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Bienvenido</Text>
              {displayUser && (
                <Text style={styles.headerSubtitle}>
                  {displayUser.first_name || displayUser.username || 'Usuario'}
                </Text>
              )}
            </View>

            {/* Right: Notification Icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER)}
                style={{
                  width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 22
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                {(unreadNotifications?.unread_count > 0) && (
                  <View style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: colors.error?.[500] || '#EF4444',
                    borderRadius: 5,
                    width: 10,
                    height: 10,
                    borderWidth: 1,
                    borderColor: '#FFF'
                  }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.locationGlassContainer}>
            <AddressSelector currentAddress={mainAddress} onAddressChange={handleAddressChange} onAddNewAddress={handleAddNewAddress} glassStyle={true} />
          </View>
        </LinearGradient>

        {/* Welcome / Empty State */}
        {(!vehicles || vehicles.length === 0) && (
          <View style={styles.welcomeCardsContainer}>
            <Text style={styles.welcomeCardsTitle}>¡Bienvenido a MecaniMóvil!</Text>
            <Text style={styles.welcomeCardsSubtitle}>Para empezar, sigue estos sencillos pasos:</Text>
            <TouchableOpacity style={styles.welcomeCard} onPress={() => navigation.navigate(ROUTES.MIS_VEHICULOS)}>
              <View style={[styles.welcomeCardIconContainer, { backgroundColor: `${colors.primary?.[500]}15` }]}>
                <Ionicons name="car-outline" size={32} color={colors.primary?.[500]} />
              </View>
              <View style={styles.welcomeCardContent}>
                <Text style={styles.welcomeCardTitle}>Agrega tu primer vehículo</Text>
                <Text style={styles.welcomeCardDescription}>Registra tu vehículo para acceder a servicios personalizados</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text?.secondary} />
            </TouchableOpacity>
            {/* More cards can go here if categories exist */}
          </View>
        )}

        {/* Categories - Only show if vehicles exist */}
        {loadingCategories && !categories ? (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.loadingSectionContainer}>
              <ActivityIndicator size="small" color={colors.primary?.[500]} />
              <Text style={styles.loadingSectionText}>Cargando categorías...</Text>
            </View>
          </View>
        ) : categories && categories.length > 0 && vehicles && vehicles.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesHorizontal} bounces={false}>
              {categories.map(c => <CategoryGridCard key={c.id} category={c} onPress={handleCategoryPress} />)}
            </ScrollView>
          </View>
        )}

        {/* Vehicles */}
        {vehicles && vehicles.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <View style={styles.sectionHeaderLeft}><Text style={styles.sectionTitle}>Mis Vehículos</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehiclesHorizontal} bounces={false} snapToInterval={Dimensions.get('window').width - 32} snapToAlignment="start">
              {vehicles.map(v => (
                <View key={v.id} style={styles.vehicleCardWrapper}>{renderVehicleItem(v)}</View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Active Requests */}
        {isClient && solicitudesActivas && solicitudesActivas.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}>
              <View style={styles.sectionHeaderLeft}><Text style={styles.sectionTitle}>Mis Solicitudes Activas</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.MIS_SOLICITUDES)} style={styles.verTodasButton}>
                <Text style={styles.verTodasText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary?.[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.solicitudesHorizontal} bounces={false}>
              {solicitudesActivas.map(s => (
                <View key={s.id} style={styles.solicitudCardWrapper}>
                  <SolicitudCard solicitud={s} onPress={() => navigation.navigate(ROUTES.DETALLE_SOLICITUD, { solicitudId: s.id })} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Urgent Alerts Display (Simplified) - You might want to implement a MaintenanceAlertCard list here using urgentAlerts state */}
        {/* ... */}

        {/* Nearby Workshops - Only show if vehicles exist */}
        {vehicles && vehicles.length > 0 && nearbyTalleres && nearbyTalleres.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}><Text style={styles.sectionTitle}>Talleres Cercanos</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersHorizontal} bounces={false}>
              {nearbyTalleres.map(t => (
                <View key={t.id} style={styles.horizontalCardWrapper}>
                  <NearbyTallerCard taller={t} onPress={() => handleProviderPress(t, 'taller')} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Nearby Mechanics - Only show if vehicles exist */}
        {vehicles && vehicles.length > 0 && nearbyMecanicos && nearbyMecanicos.length > 0 && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.sectionHeaderWithPadding}><Text style={styles.sectionTitle}>Mecánicos Cercanos</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersHorizontal} bounces={false}>
              {nearbyMecanicos.map(m => (
                <View key={m.id} style={styles.horizontalCardWrapper}>
                  <NearbyMecanicoCard mecanico={m} onPress={() => handleProviderPress(m, 'mecanico')} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Address Warning */}
        {vehicles && vehicles.length > 0 && !mainAddress && (!nearbyTalleres || nearbyTalleres.length === 0) && (!nearbyMecanicos || nearbyMecanicos.length === 0) && (
          <View style={styles.sectionWithHorizontalScroll}>
            <View style={styles.addressWarningContainer}>
              <View style={[styles.addressWarningIconContainer, { backgroundColor: `${colors.warning?.[500]}15` }]}>
                <Ionicons name="location-outline" size={28} color={colors.warning?.[500]} />
              </View>
              <View style={styles.addressWarningContent}>
                <Text style={styles.addressWarningTitle}>Configura tu dirección</Text>
                <Text style={styles.addressWarningText}>Para ver los talleres y mecánicos disponibles, configura una dirección.</Text>
                <TouchableOpacity style={styles.addressWarningButton} onPress={handleAddNewAddress}>
                  <Text style={styles.addressWarningButtonText}>Agregar Dirección</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* App Features Guide - Always visible at the bottom */}
        <View style={styles.featuresGuideContainer}>
          <Text style={styles.featuresGuideTitle}>Con MecaniMóvil podrás:</Text>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="search" size={24} color="#0061FF" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Buscar mecánicos o talleres</Text>
              <Text style={styles.featureDescription}>
                Encuentra los más cercanos de acuerdo a la marca de tu auto.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="pulse" size={24} color="#10B981" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Control de métricas</Text>
              <Text style={styles.featureDescription}>
                Lleva el control de tu auto con las métricas de salud.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="checkbox-outline" size={24} color="#9333EA" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Ver checklist de servicios</Text>
              <Text style={styles.featureDescription}>
                Revisa el detalle de cada servicio realizado en tu auto.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={24} color="#D97706" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Ver y calificar</Text>
              <Text style={styles.featureDescription}>
                Evalúa a los talleres o mecánicos por su servicio.
              </Text>
            </View>
          </View>
        </View>

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
    marginRight: 0,
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
    marginTop: spacing?.md || 12,
    marginBottom: spacing?.xs || 4,
  },
  sectionHeaderWithPadding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.sm || 10,
    paddingHorizontal: spacing?.md || 16,
  },
  categoriesHorizontal: {
    paddingVertical: spacing?.xs || 4,
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
    gap: spacing?.md || 16,
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
    width: Dimensions.get('window').width - 48,
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
    fontSize: typography.fontSize?.lg || 18,
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
    fontSize: typography.fontSize?.sm || 12,
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
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
  },
  healthSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.base?.pureWhite || '#FFFFFF',
  },
  circularProgressValue: {
    fontSize: typography.fontSize?.sm || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  circularProgressLabel: {
    fontSize: 8,
    color: colors.text?.secondary || '#5D6F75',
    marginTop: 1,
  },
  addressWarningContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background?.paper || '#FFFFFF',
    marginHorizontal: spacing?.md || 16,
    borderRadius: borders.radius?.card?.md || 12,
    padding: spacing?.md || 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  addressWarningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borders.radius?.full || 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
  },
  addressWarningContent: {
    flex: 1,
  },
  addressWarningTitle: {
    fontSize: typography.fontSize?.md || 16,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: 2,
  },
  addressWarningText: {
    fontSize: typography.fontSize?.xs || 12,
    color: colors.text?.secondary || '#5D6F75',
    marginBottom: spacing?.sm || 8,
    lineHeight: 18,
  },
  addressWarningButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning?.[500] || '#F59E0B',
    paddingHorizontal: spacing?.md || 12,
    paddingVertical: spacing?.xs || 6,
    borderRadius: borders.radius?.button?.sm || 8,
  },
  addressWarningButtonText: {
    color: colors.text?.inverse || '#FFFFFF',
    fontSize: typography.fontSize?.xs || 12,
    fontWeight: typography.fontWeight?.bold || '700',
  },
  horizontalCardWrapper: {
    marginRight: spacing?.md || 16,
    width: 200,
  },
  solicitudCardWrapper: {
    marginRight: spacing?.md || 16,
    width: 280,
    minHeight: 200,
    alignSelf: 'flex-start',
  },
  loadingSectionContainer: {
    padding: spacing?.lg || 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing?.sm || 8,
  },
  loadingSectionText: {
    color: colors.text?.secondary || '#5D6F75',
    fontSize: typography.fontSize?.sm || 14,
  },
  // Features Guide Styles
  featuresGuideContainer: {
    marginTop: spacing?.xl || 32,
    marginHorizontal: spacing?.md || 16,
    marginBottom: spacing?.lg || 24,
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderRadius: borders.radius?.card?.lg || 16,
    padding: spacing?.lg || 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  featuresGuideTitle: {
    fontSize: typography.fontSize?.lg || 18,
    fontWeight: typography.fontWeight?.bold || '800',
    color: colors.text?.primary || '#00171F',
    marginBottom: spacing?.lg || 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.md || 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.fontSize?.md || 15,
    fontWeight: typography.fontWeight?.bold || '700',
    color: colors.text?.primary || '#00171F',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.text?.secondary || '#5D6F75',
    lineHeight: 18,
  },
});

export default UserPanelScreen;
