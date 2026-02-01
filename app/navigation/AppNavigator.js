import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '../utils/constants';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomHeader from '../components/navigation/Header/Header';
import { useChats } from '../context/ChatsContext';
import { useTheme } from '../design-system/theme/useTheme';

// Pantallas organizadas por funcionalidad
import UserPanelScreen from '../screens/main/UserPanelScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MisVehiculosScreen from '../screens/vehicles/MisVehiculosScreen';
import VehicleRegistrationScreen from '../screens/vehicles/VehicleRegistrationScreen';
// MisVehiculosListScreen removed - using MisVehiculosScreen
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

// Nuevas pantallas del flujo de carrito independiente
import CarritoScreen from '../screens/cart/CarritoScreen';
import OpcionesPagoScreen from '../screens/payment/OpcionesPagoScreen';
import ConfirmacionScreen from '../screens/confirmation/ConfirmacionScreen';
import PaymentCallbackScreen from '../screens/payment/PaymentCallbackScreen';
import MercadoPagoWebViewScreen from '../screens/payment/MercadoPagoWebViewScreen';
import HistorialPagosScreen from '../screens/payment/HistorialPagosScreen';
// CardInputScreen eliminada temporalmente - se reimplementará con Mercado Pago

// Pantallas de proveedores
import TalleresScreen from '../screens/providers/TalleresScreen';
import MecanicosScreen from '../screens/providers/MecanicosScreen';
import ProviderDetailScreen from '../screens/providers/ProviderDetailScreen';
import ProviderReviewsScreen from '../screens/providers/ProviderReviewsScreen';

// Pantallas de servicios
// ServiceDetailScreen y CategoryServicesScreen OBSOLETAS - Eliminadas del flujo
// import ServiceDetailScreen from '../screens/services/ServiceDetailScreen';
// import CategoryServicesScreen from '../screens/services/CategoryServicesScreen';
import CategoryServicesListScreen from '../screens/services/CategoryServicesListScreen';

// Pantallas de reseñas
import PendingReviewsScreen from '../screens/reviews/PendingReviewsScreen';
import CreateReviewScreen from '../screens/reviews/CreateReviewScreen';

// Pantallas de solicitudes públicas
import CrearSolicitudScreen from '../screens/solicitudes/CrearSolicitudScreen';
import MisSolicitudesScreen from '../screens/solicitudes/MisSolicitudesScreen';
import DetalleSolicitudScreen from '../screens/solicitudes/DetalleSolicitudScreen';
import SeleccionarServiciosScreen from '../screens/solicitudes/SeleccionarServiciosScreen';
import SeleccionarProveedoresScreen from '../screens/solicitudes/SeleccionarProveedoresScreen';
import ComparadorOfertasScreen from '../screens/solicitudes/ComparadorOfertasScreen';
// ChatOfertaScreen removed - consolidated into ChatDetailScreen
import ChatDetailScreen from '../screens/solicitudes/ChatDetailScreen';
import ChatsListScreen from '../screens/solicitudes/ChatsListScreen';
// Duplicate import removed
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';

// Nuevas Pantallas Core
import ServicesScreen from '../screens/services/ServicesScreen';
// Duplicate import removed
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import SellVehicleScreen from '../screens/marketplace/SellVehicleScreen';
import OffersListScreen from '../screens/solicitudes/OffersListScreen';
import TransferenciaVendedorScreen from '../screens/marketplace/TransferenciaVendedorScreen';
import TransferenciaCompradorScreen from '../screens/marketplace/TransferenciaCompradorScreen';
import TransferenciaExitoScreen from '../screens/marketplace/TransferenciaExitoScreen';

// Pantallas temporales para completar la navegación
// Estas pantallas deberán implementarse posteriormente

// Componente temporal para pantallas no implementadas
const PlaceholderScreen = ({ title, icon }) => {
  const theme = useTheme();
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};

  return (
    <View style={[placeholderStyles.container, { backgroundColor: colors.background?.default || '#F8F9FA' }]}>
      <Ionicons name={icon} size={64} color={colors.primary?.[500] || '#003459'} />
      <Text style={[placeholderStyles.title, {
        color: colors.text?.primary || '#00171F',
        fontSize: typography.fontSize?.['2xl'] || 24,
      }]}>{title}</Text>
      <Text style={[placeholderStyles.text, {
        color: colors.text?.secondary || '#5D6F75',
        fontSize: typography.fontSize?.md || 16,
      }]}>Esta pantalla está en desarrollo</Text>
    </View>
  );
};

// Configuración común para los headers usando CustomHeader
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

// Configuración para la pantalla principal del perfil (con botón de retroceso)
const getProfileMainHeaderOptions = (title) => getHeaderOptions(title, { showBack: true });

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

// Stack de navegación para las pantallas del perfil
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <ProfileStack.Screen
        name="UserProfileMain"
        component={UserProfileScreen}
        options={getProfileMainHeaderOptions("Mi Perfil")}
      />
      <ProfileStack.Screen
        name={ROUTES.VEHICLES_LIST}
        component={MisVehiculosScreen}
        options={getHeaderOptions("Vehículos")}
      />
      <ProfileStack.Screen
        name="VehicleProviders"
        component={VehicleProvidersScreen}
        options={getHeaderOptions("Proveedores")}
      />
      <ProfileStack.Screen
        name={ROUTES.ACTIVE_APPOINTMENTS}
        component={ActiveAppointmentsScreen}
        options={getHeaderOptions("Mis Agendamientos")}
      />
      <ProfileStack.Screen
        name={ROUTES.APPOINTMENT_DETAIL}
        component={AppointmentDetailScreen}
        options={getHeaderOptions("Detalle del Agendamiento")}
      />
      <ProfileStack.Screen
        name={ROUTES.SERVICES_HISTORY}
        component={ServiceHistoryScreen}
        options={getHeaderOptions("Historial de Servicios")}
      />
      <ProfileStack.Screen
        name="PendingReviews"
        component={PendingReviewsScreen}
        options={getHeaderOptions("Calificaciones Pendientes")}
      />
      <ProfileStack.Screen
        name="CreateReview"
        component={CreateReviewScreen}
        options={getHeaderOptions("Dejar Reseña")}
      />
      <ProfileStack.Screen
        name={ROUTES.SUPPORT}
        component={SupportScreen}
        options={getHeaderOptions("Soporte")}
      />
      <ProfileStack.Screen
        name={ROUTES.TERMS}
        component={TermsScreen}
        options={getHeaderOptions("Términos y Condiciones")}
      />
      <ProfileStack.Screen
        name={ROUTES.EDIT_PROFILE}
        component={EditProfileScreen}
        options={getHeaderOptions("Editar Perfil")}
      />
      <ProfileStack.Screen
        name={ROUTES.HISTORIAL_PAGOS}
        component={HistorialPagosScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
};

// Componente personalizado para el Tab Bar estilo Flat (Airbnb-like)
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { totalMensajesNoLeidos } = useChats();
  const theme = useTheme();

  // Color Palette extraction
  const colors = theme?.colors || {};
  const primaryColor = colors.primary?.[500] || '#003459'; // Deep Space Blue
  const inactiveColor = colors.text?.hint || '#7C8F97';    // Neutral Gray
  const backgroundColor = colors.background?.paper || '#FFFFFF';
  const borderColor = colors.neutral?.gray?.[200] || '#D7DFE3';

  // Determine visibility
  const currentRoute = state.routes[state.index];
  const currentRouteOptions = descriptors[currentRoute.key]?.options;
  const isCrearSolicitud = currentRoute.name === ROUTES.CREAR_SOLICITUD;
  const shouldHideTabBar = currentRouteOptions?.tabBarStyle?.display === 'none' ||
    (isCrearSolicitud && currentRouteOptions?.tabBarStyle?.display === 'none');

  if (shouldHideTabBar) return null;

  return (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: backgroundColor,
        borderTopColor: borderColor,
        // Use safe area insets for both platforms. 
        // If insets.bottom is 0 (old androids with physical buttons or some states), add minimal padding.
        paddingBottom: Math.max(insets.bottom, 10),
        height: 60 + Math.max(insets.bottom, 0),
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Icon Mapping
        let iconName;
        if (route.name === ROUTES.HOME) {
          iconName = isFocused ? 'home' : 'home-outline';
        } else if (route.name === ROUTES.MIS_VEHICULOS) {
          iconName = isFocused ? 'car-sport' : 'car-sport-outline';
        } else if (route.name === ROUTES.CREAR_SOLICITUD) {
          iconName = isFocused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === ROUTES.MARKETPLACE) {
          iconName = isFocused ? 'pricetags' : 'pricetags-outline';
        } else if (route.name === ROUTES.CHATS_LIST) {
          iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
        }

        const color = isFocused ? primaryColor : inactiveColor;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              {route.name === ROUTES.CHATS_LIST && totalMensajesNoLeidos > 0 ? (
                <View>
                  <Ionicons name={iconName} size={24} color={color} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalMensajesNoLeidos > 99 ? '99+' : totalMensajesNoLeidos}
                    </Text>
                  </View>
                </View>
              ) : (
                <Ionicons name={iconName} size={24} color={color} />
              )}
            </View>
            <Text style={[
              styles.tabLabel,
              { color: color, fontWeight: isFocused ? '600' : '500' }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

// Navegador de pestañas inferior
const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={UserPanelScreen}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name={ROUTES.MIS_VEHICULOS}
        component={MisVehiculosScreen}
        options={{ tabBarLabel: 'Vehículos' }}
      />
      <Tab.Screen
        name={ROUTES.CREAR_SOLICITUD}
        component={CrearSolicitudScreen}
        options={{
          tabBarLabel: 'Crear',
          // Removed tabBarStyle restriction since it's now handled by the custom component logic if needed,
          // but we generally want it visible now as a regular tab unless specifically hidden.
        }}
      />
      <Tab.Screen
        name={ROUTES.MARKETPLACE}
        component={MarketplaceScreen}
        options={{ tabBarLabel: 'Marketplace' }}
      />
      <Tab.Screen
        name={ROUTES.CHATS_LIST}
        component={ChatsListScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
    </Tab.Navigator>
  );
};

// Navegador principal de la aplicación
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TabNavigator" component={TabNavigator} />
      <Stack.Screen name={ROUTES.ADD_ADDRESS} component={AddAddressScreen} />

      {/* Nuevas pantallas de categorías */}
      <Stack.Screen
        name={ROUTES.TALLERES}
        component={TalleresScreen}
        options={getHeaderOptions("Talleres", { showProfile: true })}
      />
      <Stack.Screen
        name={ROUTES.MECANICOS}
        component={MecanicosScreen}
        options={getHeaderOptions("Mecánicos a Domicilio", { showProfile: true })}
      />
      <Stack.Screen
        name={ROUTES.PROVIDER_DETAIL}
        component={ProviderDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.PROVIDER_REVIEWS}
        component={ProviderReviewsScreen}
        options={getHeaderOptions("Comentarios del Proveedor")}
      />
      {/* Rutas OBSOLETAS - Comentadas para futuro cleanup */}
      {/* <Stack.Screen 
        name={ROUTES.SERVICE_DETAIL} 
        component={ServiceDetailScreen} 
        options={{ headerShown: false }}
      /> */}

      {/* Nueva ruta para lista simple de servicios por categoría */}
      <Stack.Screen
        name={ROUTES.CATEGORY_SERVICES_LIST}
        component={CategoryServicesListScreen}
        options={getHeaderOptions("Servicios Disponibles", { showProfile: false })}
      />

      <Stack.Screen
        name={ROUTES.MY_VEHICLES}
        component={MisVehiculosScreen}
        options={getHeaderOptions("Mis Vehículos", { showProfile: true })}
      />

      <Stack.Screen
        name="VehicleRegistration"
        component={VehicleRegistrationScreen}
        options={{ headerShown: false }}
      />

      {/* Pantallas de perfil - Ahora accesibles desde el header en lugar del tab */}
      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name={ROUTES.NOTIFICATION_CENTER}
        component={NotificationCenterScreen}
        options={getHeaderOptions("Notificaciones", { showBack: true })}
      />

      {/* Ruta AgendamientoScreen eliminada - flujo antiguo de agendamiento */}
      <Stack.Screen
        name={ROUTES.APPOINTMENT_DETAIL}
        component={AppointmentDetailScreen}
        options={getHeaderOptions("Detalle del Agendamiento")}
      />
      <Stack.Screen
        name={ROUTES.SERVICES_HISTORY}
        component={ServiceHistoryScreen}
        options={getHeaderOptions("Historial de Servicios")}
      />
      <Stack.Screen
        name={ROUTES.VEHICLE_HISTORY}
        component={VehicleHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.VEHICLE_HEALTH}
        component={VehicleHealthScreen}
        options={getHeaderOptions("Salud del Vehículo", { showProfile: false })}
      />
      <Stack.Screen
        name={ROUTES.VEHICLE_PROFILE}
        component={VehicleProfileScreen}
        options={getHeaderOptions("Perfil del Vehículo", { showProfile: false })}
      />
      {/* Nuevo flujo de carrito independiente */}
      <Stack.Screen
        name="Carrito"
        component={CarritoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OpcionesPago"
        component={OpcionesPagoScreen}
        options={{ headerShown: false }}
      />
      {/* CardInput eliminada temporalmente - se reimplementará con Mercado Pago */}
      <Stack.Screen
        name="Confirmacion"
        component={ConfirmacionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PaymentCallback"
        component={PaymentCallbackScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MercadoPagoWebView"
        component={MercadoPagoWebViewScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />

      <Stack.Screen
        name="DateTimePicker"
        component={DateTimePickerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingCart"
        component={BookingCartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{ headerShown: false }}
      />

      {/* Rutas de solicitudes públicas */}
      {/* NOTA: CREAR_SOLICITUD y MIS_SOLICITUDES están en el Tab Navigator, no duplicar aquí */}
      <Stack.Screen
        name={ROUTES.DETALLE_SOLICITUD}
        component={DetalleSolicitudScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.SELECCIONAR_SERVICIOS}
        component={SeleccionarServiciosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.SELECCIONAR_PROVEEDORES}
        component={SeleccionarProveedoresScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.COMPARADOR_OFERTAS}
        component={ComparadorOfertasScreen}
        options={{ headerShown: false }}
      />
      {/* ChatOfertaScreen removed */}
      <Stack.Screen
        name={ROUTES.CHAT_DETAIL}
        component={ChatDetailScreen}
        options={{ headerShown: false }}
      />

      {/* Nuevas Pantallas Core */}
      <Stack.Screen
        name={ROUTES.SERVICES_HUB}
        component={ServicesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.MARKETPLACE}
        component={MarketplaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.MARKETPLACE_VEHICLE_DETAIL}
        component={MarketplaceVehicleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.SELL_VEHICLE}
        component={SellVehicleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.OFFERS_LIST}
        component={OffersListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.TRANSFERENCIA_VENDEDOR}
        component={TransferenciaVendedorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.TRANSFERENCIA_COMPRADOR}
        component={TransferenciaCompradorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.TRANSFERENCIA_EXITO}
        component={TransferenciaExitoScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Estilos para PlaceholderScreen
const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '700',
  },
  text: {
    textAlign: 'center',
  },
});

export default AppNavigator;