import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../utils/constants';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, Car, ShoppingBag } from 'lucide-react-native';
import CustomHeader from '../components/navigation/Header/Header';
import { useTheme } from '../design-system/theme/useTheme';

import UserPanelScreen from '../screens/main/UserPanelScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MisVehiculosScreen from '../screens/vehicles/MisVehiculosScreen';
import VehicleRegistrationScreen from '../screens/vehicles/VehicleRegistrationScreen';
import AddAddressScreen from '../screens/vehicles/AddAddressScreen';
import VehicleProvidersScreen from '../screens/vehicles/VehicleProvidersScreen';
import VehicleHistoryScreen from '../screens/vehicles/VehicleHistoryScreen';
import VehicleHealthScreen from '../screens/vehicles/VehicleHealthScreen';
import VehicleProfileScreen from '../screens/vehicles/VehicleProfileScreen';
import ActiveAppointmentsScreen from '../screens/appointments/ActiveAppointmentsScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import ServiceHistoryScreen from '../screens/appointments/ServiceHistoryScreen';
import MisCitasScreen from '../screens/appointments/MisCitasScreen';
import DateTimePickerScreen from '../screens/booking/DateTimePickerScreen';
import BookingCartScreen from '../screens/booking/BookingCartScreen';
import BookingConfirmationScreen from '../screens/booking/BookingConfirmationScreen';
import SupportScreen from '../screens/support/SupportScreen';
import TermsScreen from '../screens/support/TermsScreen';

import CarritoScreen from '../screens/cart/CarritoScreen';
import OpcionesPagoScreen from '../screens/payment/OpcionesPagoScreen';
import ConfirmacionScreen from '../screens/confirmation/ConfirmacionScreen';
import PaymentCallbackScreen from '../screens/payment/PaymentCallbackScreen';
import MercadoPagoWebViewScreen from '../screens/payment/MercadoPagoWebViewScreen';
import HistorialPagosScreen from '../screens/payment/HistorialPagosScreen';
import FavoriteProvidersScreen from '../screens/profile/FavoriteProvidersScreen';

import TalleresScreen from '../screens/providers/TalleresScreen';
import MecanicosScreen from '../screens/providers/MecanicosScreen';
import ProviderDetailScreen from '../screens/providers/ProviderDetailScreen';
import ProviderReviewsScreen from '../screens/providers/ProviderReviewsScreen';

import CategoryServicesListScreen from '../screens/services/CategoryServicesListScreen';

import PendingReviewsScreen from '../screens/reviews/PendingReviewsScreen';
import CreateReviewScreen from '../screens/reviews/CreateReviewScreen';

import CrearSolicitudScreen from '../screens/solicitudes/CrearSolicitudScreen';
import MisSolicitudesScreen from '../screens/solicitudes/MisSolicitudesScreen';
import DetalleSolicitudScreen from '../screens/solicitudes/DetalleSolicitudScreen';
import SeleccionarServiciosScreen from '../screens/solicitudes/SeleccionarServiciosScreen';
import SeleccionarProveedoresScreen from '../screens/solicitudes/SeleccionarProveedoresScreen';
import ComparadorOfertasScreen from '../screens/solicitudes/ComparadorOfertasScreen';
import ChatDetailScreen from '../screens/solicitudes/ChatDetailScreen';
import ChatsListScreen from '../screens/solicitudes/ChatsListScreen';
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';

import ServicesScreen from '../screens/services/ServicesScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import SellVehicleScreen from '../screens/marketplace/SellVehicleScreen';
import OffersListScreen from '../screens/solicitudes/OffersListScreen';
import TransferenciaVendedorScreen from '../screens/marketplace/TransferenciaVendedorScreen';
import TransferenciaCompradorScreen from '../screens/marketplace/TransferenciaCompradorScreen';
import TransferenciaExitoScreen from '../screens/marketplace/TransferenciaExitoScreen';

const getHeaderOptions = (title, options = {}) => ({
  headerShown: true,
  header: ({ navigation }) => (
    <CustomHeader
      title={title}
      showBack={options.showBack !== undefined ? options.showBack : true}
      onBackPress={options.onBackPress}
      showProfile={options.showProfile || false}
      notificationBadge={options.notificationBadge || 0}
      leftComponent={options.leftComponent}
      rightComponent={options.rightComponent}
      backgroundColor={options.backgroundColor}
      titleColor={options.titleColor}
      style={options.headerStyle}
    />
  ),
});

const DARK_GLASS_HEADER = {
  backgroundColor: '#030712',
  titleColor: '#F9FAFB',
};

const PROFILE_HEADER_NO_DIVIDER = {
  borderBottomWidth: 0,
  borderBottomColor: 'transparent',
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0,
};

const getDarkGlassHeaderOptions = (title) =>
  getHeaderOptions(title, {
    showBack: true,
    ...DARK_GLASS_HEADER,
    headerStyle: PROFILE_HEADER_NO_DIVIDER,
  });

const getProfileMainHeaderOptions = (title) =>
  getHeaderOptions(title, {
    showBack: true,
    ...DARK_GLASS_HEADER,
    headerStyle: PROFILE_HEADER_NO_DIVIDER,
  });

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: true }}>
    <ProfileStack.Screen name="UserProfileMain" component={UserProfileScreen} options={getProfileMainHeaderOptions("Mi Perfil")} />
    <ProfileStack.Screen name={ROUTES.EDIT_PROFILE} component={EditProfileScreen} options={getDarkGlassHeaderOptions("Editar Perfil")} />
    <ProfileStack.Screen name={ROUTES.VEHICLES_LIST} component={MisVehiculosScreen} options={getHeaderOptions("Vehículos")} />
    <ProfileStack.Screen name="VehicleProviders" component={VehicleProvidersScreen} options={getHeaderOptions("Proveedores")} />
    <ProfileStack.Screen name={ROUTES.ACTIVE_APPOINTMENTS} component={ActiveAppointmentsScreen} options={getHeaderOptions("Mis Agendamientos")} />
    <ProfileStack.Screen name={ROUTES.APPOINTMENT_DETAIL} component={AppointmentDetailScreen} options={getHeaderOptions("Detalle del Agendamiento")} />
    <ProfileStack.Screen name={ROUTES.SERVICES_HISTORY} component={ServiceHistoryScreen} options={getHeaderOptions("Historial de Servicios")} />
    <ProfileStack.Screen name="PendingReviews" component={PendingReviewsScreen} options={getDarkGlassHeaderOptions("Calificaciones Pendientes")} />
    <ProfileStack.Screen name="CreateReview" component={CreateReviewScreen} options={getDarkGlassHeaderOptions("Dejar Reseña")} />
    <ProfileStack.Screen name={ROUTES.SUPPORT} component={SupportScreen} options={getDarkGlassHeaderOptions("Soporte")} />
    <ProfileStack.Screen name={ROUTES.TERMS} component={TermsScreen} options={getDarkGlassHeaderOptions("Términos y Condiciones")} />
    <ProfileStack.Screen name={ROUTES.HISTORIAL_PAGOS} component={HistorialPagosScreen} options={getDarkGlassHeaderOptions("Historial de Pagos")} />
    <ProfileStack.Screen name={ROUTES.FAVORITE_PROVIDERS} component={FavoriteProvidersScreen} options={getDarkGlassHeaderOptions("Proveedores Favoritos")} />
  </ProfileStack.Navigator>
);

const HomeStack = createStackNavigator();

const HomeNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="UserPanel" component={UserPanelScreen} />
    <HomeStack.Screen name={ROUTES.TALLERES} component={TalleresScreen} options={getHeaderOptions("Talleres")} />
    <HomeStack.Screen name={ROUTES.MECANICOS} component={MecanicosScreen} options={getHeaderOptions("Mecánicos a Domicilio")} />
  </HomeStack.Navigator>
);

// ── Glassmorphism Tab Bar ──
const GlassTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom, 8), height: 64 + Math.max(insets.bottom, 0) }]}>
      {Platform.OS === 'ios' && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        let IconComponent = Home;
        if (route.name === ROUTES.MIS_VEHICULOS) IconComponent = Car;
        else if (route.name === ROUTES.MARKETPLACE) IconComponent = ShoppingBag;

        const color = isFocused ? '#6EE7B7' : 'rgba(255,255,255,0.35)';

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={tabStyles.tab} activeOpacity={0.7}>
            {isFocused && <View style={tabStyles.activeIndicator} />}
            <IconComponent size={22} color={color} />
            <Text style={[tabStyles.label, { color, fontWeight: isFocused ? '600' : '400' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(3,7,18,0.85)' : 'rgba(3,7,18,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    gap: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6EE7B7',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

// ── Tab Navigator (3 tabs: Panel, Mis Autos, Marketplace) ──
const TabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name={ROUTES.HOME} component={HomeNavigator} options={{ tabBarLabel: 'Panel' }} />
    <Tab.Screen name={ROUTES.MIS_VEHICULOS} component={MisVehiculosScreen} options={{ tabBarLabel: 'Mis Autos' }} />
    <Tab.Screen name={ROUTES.MARKETPLACE} component={MarketplaceScreen} options={{ tabBarLabel: 'Marketplace' }} />
  </Tab.Navigator>
);

// ── Root Stack Navigator ──
const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TabNavigator" component={TabNavigator} />

    {/* CrearSolicitud - full screen (accessed from UserPanel quick actions) */}
    <Stack.Screen name={ROUTES.CREAR_SOLICITUD} component={CrearSolicitudScreen} />

    {/* ProviderDetail - accessible from any screen (solicitud flow, talleres, etc.) */}
    <Stack.Screen name={ROUTES.PROVIDER_DETAIL} component={ProviderDetailScreen} />
    <Stack.Screen name={ROUTES.PROVIDER_REVIEWS} component={ProviderReviewsScreen} options={getHeaderOptions("Comentarios del Proveedor")} />

    {/* Address */}
    <Stack.Screen name={ROUTES.ADD_ADDRESS} component={AddAddressScreen} />

    {/* Solicitudes */}
    <Stack.Screen name={ROUTES.MIS_SOLICITUDES} component={MisSolicitudesScreen} />
    <Stack.Screen name={ROUTES.DETALLE_SOLICITUD} component={DetalleSolicitudScreen} />
    <Stack.Screen name={ROUTES.SELECCIONAR_SERVICIOS} component={SeleccionarServiciosScreen} />
    <Stack.Screen name={ROUTES.SELECCIONAR_PROVEEDORES} component={SeleccionarProveedoresScreen} />
    <Stack.Screen name={ROUTES.COMPARADOR_OFERTAS} component={ComparadorOfertasScreen} options={getHeaderOptions("Comparar Ofertas", { ...DARK_GLASS_HEADER, headerStyle: PROFILE_HEADER_NO_DIVIDER })} />

    {/* Chats */}
    <Stack.Screen name={ROUTES.CHATS_LIST} component={ChatsListScreen} />
    <Stack.Screen name={ROUTES.CHAT_DETAIL} component={ChatDetailScreen} />

    {/* Vehicle screens */}
    <Stack.Screen name={ROUTES.VEHICLE_PROFILE} component={VehicleProfileScreen} />
    <Stack.Screen name={ROUTES.VEHICLE_HEALTH} component={VehicleHealthScreen} />
    <Stack.Screen name={ROUTES.VEHICLE_HISTORY} component={VehicleHistoryScreen} />
    <Stack.Screen name={ROUTES.MY_VEHICLES} component={MisVehiculosScreen} options={getHeaderOptions("Mis Vehículos", { showProfile: true })} />
    <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />

    {/* Profile */}
    <Stack.Screen name={ROUTES.PROFILE} component={ProfileStackNavigator} />
    <Stack.Screen
      name={ROUTES.NOTIFICATION_CENTER}
      component={NotificationCenterScreen}
      options={getHeaderOptions('Notificaciones', { showBack: true, ...DARK_GLASS_HEADER })}
    />

    {/* Appointments */}
    <Stack.Screen name={ROUTES.APPOINTMENT_DETAIL} component={AppointmentDetailScreen} options={getHeaderOptions("Detalle del Agendamiento")} />
    <Stack.Screen name={ROUTES.SERVICES_HISTORY} component={ServiceHistoryScreen} options={getHeaderOptions("Historial de Servicios")} />

    {/* Services */}
    <Stack.Screen name={ROUTES.CATEGORY_SERVICES_LIST} component={CategoryServicesListScreen} options={getHeaderOptions("Servicios Disponibles", { showProfile: false })} />
    <Stack.Screen name={ROUTES.SERVICES_HUB} component={ServicesScreen} />

    {/* Payment */}
    <Stack.Screen name="Carrito" component={CarritoScreen} />
    <Stack.Screen name="OpcionesPago" component={OpcionesPagoScreen} />
    <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
    <Stack.Screen name="PaymentCallback" component={PaymentCallbackScreen} />
    <Stack.Screen name="MercadoPagoWebView" component={MercadoPagoWebViewScreen} options={{ presentation: 'modal' }} />

    {/* Booking */}
    <Stack.Screen name="DateTimePicker" component={DateTimePickerScreen} />
    <Stack.Screen name="BookingCart" component={BookingCartScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />

    {/* Marketplace (detail screens) */}
    <Stack.Screen name={ROUTES.MARKETPLACE_VEHICLE_DETAIL} component={MarketplaceVehicleDetailScreen} />
    <Stack.Screen name={ROUTES.SELL_VEHICLE} component={SellVehicleScreen} />
    <Stack.Screen name={ROUTES.OFFERS_LIST} component={OffersListScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_VENDEDOR} component={TransferenciaVendedorScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_COMPRADOR} component={TransferenciaCompradorScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_EXITO} component={TransferenciaExitoScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
