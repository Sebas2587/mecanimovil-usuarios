import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ROUTES } from '../utils/constants';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarPlus, ClipboardList } from 'lucide-react-native';
import AppHeader from '../components/navigation/AppHeader';
import ProfileTabIcon from '../components/navigation/ProfileTabIcon';
import { COLORS, TYPOGRAPHY, BORDERS, SPACING } from '../design-system/tokens';
import { useAuth } from '../context/AuthContext';
import { useTripTracking } from '../context/TripTrackingContext';
import { queryClient } from '../config/queryClient';
import { navigateAgendarDesdeTab } from '../components/home/shared/homeScheduleNavigation';
import AgendarTabScreen from '../screens/main/AgendarTabScreen';
import ActividadScreen from '../screens/main/ActividadScreen';
import RegistrarViajeScreen from '../screens/trip/RegistrarViajeScreen';
import { TalleresRedirect, MecanicosRedirect } from './LegacyExploreRedirect';

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
import CalendarioProveedorScreen from '../screens/booking/CalendarioProveedorScreen';
import SupportScreen from '../screens/support/SupportScreen';
import TermsScreen from '../screens/support/TermsScreen';
import PrivacyPolicyScreen from '../screens/support/PrivacyPolicyScreen';
import OpcionesPagoScreen from '../screens/payment/OpcionesPagoScreen';
import ConfirmacionScreen from '../screens/confirmation/ConfirmacionScreen';
import PaymentCallbackScreen from '../screens/payment/PaymentCallbackScreen';
import MercadoPagoWebViewScreen from '../screens/payment/MercadoPagoWebViewScreen';
import HistorialPagosScreen from '../screens/payment/HistorialPagosScreen';
import FavoriteProvidersScreen from '../screens/profile/FavoriteProvidersScreen';
import ExploreProvidersScreen from '../screens/providers/ExploreProvidersScreen';
import ProviderDetailScreen from '../screens/providers/ProviderDetailScreen';
import ProviderReviewsScreen from '../screens/providers/ProviderReviewsScreen';
import PendingReviewsScreen from '../screens/reviews/PendingReviewsScreen';
import CreateReviewScreen from '../screens/reviews/CreateReviewScreen';
import CrearSolicitudScreen from '../screens/solicitudes/CrearSolicitudScreen';
import MisSolicitudesScreen from '../screens/solicitudes/MisSolicitudesScreen';
import DetalleSolicitudScreen from '../screens/solicitudes/DetalleSolicitudScreen';
import ComparadorOfertasScreen from '../screens/solicitudes/ComparadorOfertasScreen';
import ChatDetailScreen from '../screens/solicitudes/ChatDetailScreen';
import ChatsListScreen from '../screens/solicitudes/ChatsListScreen';
import NotificationCenterScreen from '../screens/notifications/NotificationCenterScreen';
import TransferenciaResumenScreen from '../screens/marketplace/TransferenciaResumenScreen';
import TransferenciaVendedorScreen from '../screens/marketplace/TransferenciaVendedorScreen';
import TransferenciaCompradorScreen from '../screens/marketplace/TransferenciaCompradorScreen';
import TransferenciaExitoScreen from '../screens/marketplace/TransferenciaExitoScreen';

const getHeaderOptions = (title, options = {}) => ({
  headerShown: true,
  header: ({ navigation }) => (
    <AppHeader
      title={title}
      onBack={options.showBack === false ? undefined : () => navigation.goBack()}
      rightComponent={options.rightComponent}
      backgroundColor={options.backgroundColor || COLORS.background.default}
    />
  ),
});

const getProfileTabHeader = (title) =>
  getHeaderOptions(title, { showBack: false });

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

const ProfileStackNavigator = ({ tabRoot = false }) => (
  <ProfileStack.Navigator screenOptions={{ headerShown: true }}>
    <ProfileStack.Screen
      name="UserProfileMain"
      component={UserProfileScreen}
      options={tabRoot ? getProfileTabHeader('Cuenta') : getHeaderOptions('Cuenta')}
    />
    <ProfileStack.Screen name={ROUTES.EDIT_PROFILE} component={EditProfileScreen} options={getHeaderOptions('Editar perfil')} />
    <ProfileStack.Screen name={ROUTES.VEHICLES_LIST} component={MisVehiculosScreen} options={getHeaderOptions('Mis vehículos')} />
    <ProfileStack.Screen name="VehicleProviders" component={VehicleProvidersScreen} options={getHeaderOptions('Proveedores')} />
    <ProfileStack.Screen name={ROUTES.ACTIVE_APPOINTMENTS} component={ActiveAppointmentsScreen} options={getHeaderOptions('Mis agendamientos')} />
    <ProfileStack.Screen name={ROUTES.APPOINTMENT_DETAIL} component={AppointmentDetailScreen} options={getHeaderOptions('Detalle del agendamiento')} />
    <ProfileStack.Screen name={ROUTES.SERVICES_HISTORY} component={ServiceHistoryScreen} options={getHeaderOptions('Historial de servicios')} />
    <ProfileStack.Screen name="PendingReviews" component={PendingReviewsScreen} options={getHeaderOptions('Calificaciones pendientes')} />
    <ProfileStack.Screen name="CreateReview" component={CreateReviewScreen} options={getHeaderOptions('Dejar reseña')} />
    <ProfileStack.Screen name={ROUTES.SUPPORT} component={SupportScreen} options={getHeaderOptions('Soporte')} />
    <ProfileStack.Screen name={ROUTES.TERMS} component={TermsScreen} options={getHeaderOptions('Términos y condiciones')} />
    <ProfileStack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} options={getHeaderOptions('Política de privacidad')} />
    <ProfileStack.Screen name={ROUTES.HISTORIAL_PAGOS} component={HistorialPagosScreen} options={getHeaderOptions('Historial de pagos')} />
    <ProfileStack.Screen name={ROUTES.FAVORITE_PROVIDERS} component={FavoriteProvidersScreen} options={getHeaderOptions('Favoritos')} />
  </ProfileStack.Navigator>
);

const HomeStack = createStackNavigator();

const HomeNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="UserPanel" component={UserPanelScreen} />
    <HomeStack.Screen
      name={ROUTES.EXPLORE_PROVIDERS}
      component={ExploreProvidersScreen}
      options={({ route }) =>
        getHeaderOptions(route.params?.categoryName || 'Explorar proveedores')
      }
    />
    <HomeStack.Screen name={ROUTES.TALLERES} component={TalleresRedirect} options={{ headerShown: false }} />
    <HomeStack.Screen name={ROUTES.MECANICOS} component={MecanicosRedirect} options={{ headerShown: false }} />
  </HomeStack.Navigator>
);

const AirbnbTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedVehicle } = useTripTracking();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[tabStyles.container, { paddingBottom: bottomPad, minHeight: 60 + bottomPad }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;
        const isAgendar = route.name === ROUTES.AGENDAR_TAB;
        const isProfile = route.name === ROUTES.PROFILE;

        const onPress = () => {
          if (isAgendar) {
            navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            navigateAgendarDesdeTab(
              navigation.getParent(),
              user?.id,
              queryClient,
              selectedVehicle,
            );
            return;
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let IconComponent = Home;
        let iconSize = 22;
        if (route.name === ROUTES.ACTIVIDAD) IconComponent = ClipboardList;
        else if (isAgendar) {
          IconComponent = CalendarPlus;
          iconSize = 24;
        }

        const color = isFocused ? COLORS.primary[500] : COLORS.text.tertiary;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [
              tabStyles.tab,
              isAgendar && tabStyles.tabCenter,
              pressed && tabStyles.tabPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
          >
            {isProfile ? (
              <ProfileTabIcon focused={isFocused} />
            ) : (
              <IconComponent size={iconSize} color={color} strokeWidth={isFocused ? 2.25 : 2} />
            )}
            <Text
              numberOfLines={1}
              style={[
                tabStyles.label,
                TYPOGRAPHY.styles.small,
                {
                  color,
                  fontFamily: isFocused
                    ? TYPOGRAPHY.fontFamily.semibold
                    : TYPOGRAPHY.fontFamily.medium,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    gap: 2,
  },
  tabCenter: {
    flex: 1.1,
  },
  tabPressed: { opacity: 0.88 },
  label: { textAlign: 'center' },
});

const ProfileTabNavigator = () => <ProfileStackNavigator tabRoot />;

const TabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <AirbnbTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name={ROUTES.HOME} component={HomeNavigator} options={{ tabBarLabel: 'Inicio' }} />
    <Tab.Screen
      name={ROUTES.AGENDAR_TAB}
      component={AgendarTabScreen}
      options={{ tabBarLabel: 'Agendar' }}
      listeners={({ navigation }) => ({
        tabPress: (e) => e.preventDefault(),
      })}
    />
    <Tab.Screen name={ROUTES.ACTIVIDAD} component={ActividadScreen} options={{ tabBarLabel: 'Actividad' }} />
    <Tab.Screen name={ROUTES.PROFILE} component={ProfileTabNavigator} options={{ tabBarLabel: 'Cuenta' }} />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
    <Stack.Screen name="TabNavigator" component={TabNavigator} />

    <Stack.Screen name={ROUTES.REGISTRAR_VIAJE} component={RegistrarViajeScreen} options={getHeaderOptions('Registrar viaje')} />
    <Stack.Screen name={ROUTES.CREAR_SOLICITUD} component={CrearSolicitudScreen} />
    <Stack.Screen name={ROUTES.PROVIDER_DETAIL} component={ProviderDetailScreen} />
    <Stack.Screen name={ROUTES.PROVIDER_REVIEWS} component={ProviderReviewsScreen} options={getHeaderOptions('Reseñas')} />
    <Stack.Screen name={ROUTES.ADD_ADDRESS} component={AddAddressScreen} />
    <Stack.Screen name={ROUTES.MIS_SOLICITUDES} component={MisSolicitudesScreen} />
    <Stack.Screen name={ROUTES.DETALLE_SOLICITUD} component={DetalleSolicitudScreen} />
    <Stack.Screen name={ROUTES.COMPARADOR_OFERTAS} component={ComparadorOfertasScreen} />
    <Stack.Screen name={ROUTES.CALENDARIO_PROVEEDOR} component={CalendarioProveedorScreen} />
    <Stack.Screen name={ROUTES.CHATS_LIST} component={ChatsListScreen} options={getHeaderOptions('Mensajes')} />
    <Stack.Screen name={ROUTES.CHAT_DETAIL} component={ChatDetailScreen} />
    <Stack.Screen name={ROUTES.VEHICLE_PROFILE} component={VehicleProfileScreen} />
    <Stack.Screen name={ROUTES.VEHICLE_HEALTH} component={VehicleHealthScreen} options={getHeaderOptions('Salud del vehículo')} />
    <Stack.Screen name={ROUTES.VEHICLE_HISTORY} component={VehicleHistoryScreen} />
    <Stack.Screen name={ROUTES.MY_VEHICLES} component={MisVehiculosScreen} options={getHeaderOptions('Mis vehículos')} />
    <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} />
    <Stack.Screen name={ROUTES.NOTIFICATION_CENTER} component={NotificationCenterScreen} options={getHeaderOptions('Notificaciones')} />
    <Stack.Screen name={ROUTES.APPOINTMENT_DETAIL} component={AppointmentDetailScreen} options={getHeaderOptions('Detalle del agendamiento')} />
    <Stack.Screen name={ROUTES.SERVICES_HISTORY} component={ServiceHistoryScreen} options={getHeaderOptions('Historial de servicios')} />
    <Stack.Screen name="OpcionesPago" component={OpcionesPagoScreen} />
    <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} />
    <Stack.Screen name="PaymentCallback" component={PaymentCallbackScreen} />
    <Stack.Screen name="MercadoPagoWebView" component={MercadoPagoWebViewScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_RESUMEN} component={TransferenciaResumenScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_VENDEDOR} component={TransferenciaVendedorScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_COMPRADOR} component={TransferenciaCompradorScreen} />
    <Stack.Screen name={ROUTES.TRANSFERENCIA_EXITO} component={TransferenciaExitoScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
