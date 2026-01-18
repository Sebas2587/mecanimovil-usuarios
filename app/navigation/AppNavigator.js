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
import MisVehiculosListScreen from '../screens/vehicles/MisVehiculosListScreen';
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
import SeleccionMetodoPagoScreen from '../screens/payment/SeleccionMetodoPagoScreen';
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
import ChatOfertaScreen from '../screens/solicitudes/ChatOfertaScreen';
import ChatsListScreen from '../screens/solicitudes/ChatsListScreen';

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

// Componente personalizado para el Tab Bar con forma curva y botón flotante
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { totalMensajesNoLeidos } = useChats();
  const { width } = Dimensions.get('window');
  const theme = useTheme();
  
  // Extraer valores del tema de forma segura
  const colors = theme?.colors || {};
  const typography = theme?.typography || {};
  const spacing = theme?.spacing || {};
  const borders = theme?.borders || {};
  
  // Asegurar que typography tenga todas las propiedades necesarias
  const safeTypography = typography?.fontSize && typography?.fontWeight
    ? typography
    : {
      fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24 },
      fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
    };
  
  const safeBottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, 5);
  const tabBarHeight = Platform.OS === 'ios' ? 60 + safeBottomInset : 65 + Math.max(insets.bottom - 5, 0);
  
  // Color del gradiente para etiquetas activos usando el sistema de diseño
  const gradientTextColor = colors.primary?.[500] || colors.accent?.[500] || '#0061FF';
  const primaryColor = colors.primary?.[500] || '#003459';
  const textLightColor = colors.text?.secondary || colors.neutral?.gray?.[600] || '#7C8F97';
  
  // IMPORTANTE: El tab bar debe estar visible para las pantallas principales
  // EXCEPCIÓN: CREAR_SOLICITUD puede ocultar el tab bar para mejorar la UX
  const currentRoute = state.routes[state.index];
  const currentRouteOptions = descriptors[currentRoute.key]?.options;
  
  // Lista de rutas principales que normalmente muestran el tab bar
  const mainRoutes = [ROUTES.HOME, ROUTES.MIS_VEHICULOS, ROUTES.CHATS_LIST, ROUTES.MIS_SOLICITUDES];
  const isMainRoute = mainRoutes.includes(currentRoute.name);
  
  // CREAR_SOLICITUD puede ocultar el tab bar si está configurado explícitamente
  const isCrearSolicitud = currentRoute.name === ROUTES.CREAR_SOLICITUD;
  const shouldHideTabBar = currentRouteOptions?.tabBarStyle?.display === 'none' || 
                          (isCrearSolicitud && currentRouteOptions?.tabBarStyle?.display === 'none');
  
  // Si el tab bar debe estar oculto, no renderizar nada
  if (shouldHideTabBar) {
    return null;
  }
  
  // Crear estilos dinámicos
  const styles = createTabBarStyles(colors, safeTypography, spacing, borders, primaryColor, textLightColor);
  
  // Índice del botón central (CREAR_SOLICITUD)
  const centerIndex = 2;
  
  // Calcular posición del botón central
  const centerButtonLeft = width / 2 - 30;

  return (
    <View style={styles.tabBarContainer}>
      {/* Forma curva superior usando SVG path o View con border radius */}
      <View style={[styles.tabBarCurve, { paddingBottom: Math.max(safeBottomInset, 8) }]}>
        <View style={styles.tabBarContent}>
          {/* Tabs izquierdos (antes del botón central) */}
          {state.routes.slice(0, centerIndex).map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

            const isFocused = state.index === index;
            const isLastLeftTab = index === centerIndex - 1;
            let iconName;
            if (route.name === ROUTES.HOME) {
              iconName = isFocused ? 'home' : 'home-outline';
            } else if (route.name === ROUTES.MIS_VEHICULOS) {
              iconName = isFocused ? 'car-sport' : 'car-sport-outline';
            }

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

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tabButton,
                  isLastLeftTab && styles.tabButtonBeforeCenter
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.tabIconContainer}>
                  <Ionicons 
                    name={iconName} 
                    size={24} 
                    color={isFocused ? primaryColor : textLightColor} 
                  />
                </View>
                <Text 
                  style={[
                    styles.tabLabel,
                    { 
                      color: isFocused ? gradientTextColor : textLightColor,
                      fontSize: safeTypography.fontSize?.xs || 11,
                      fontWeight: safeTypography.fontWeight?.semibold || '600',
                    }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          {/* Botón central flotante */}
          {(() => {
            const centerRoute = state.routes[centerIndex];
            const { options } = descriptors[centerRoute.key];
            const isFocused = state.index === centerIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: centerRoute.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(centerRoute.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: centerRoute.key,
              });
            };

            return (
              <TouchableOpacity
                key={centerRoute.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[styles.centerButtonContainer, { left: centerButtonLeft }]}
                activeOpacity={0.7}
              >
                  <LinearGradient
                    colors={[
                      colors.accent?.[400] || colors.primary?.[400] || '#33BFE7',
                      colors.primary?.[500] || colors.accent?.[500] || '#0061FF'
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.centerButton}
                  >
                    <Ionicons name="add" size={32} color="#FFFFFF" style={{ fontWeight: 'bold' }} />
                  </LinearGradient>
              </TouchableOpacity>
            );
          })()}
          
          {/* Tabs derechos (después del botón central) */}
          {state.routes.slice(centerIndex + 1).map((route, index) => {
            const actualIndex = centerIndex + 1 + index;
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

            const isFocused = state.index === actualIndex;
            const isFirstRightTab = index === 0;
            let iconName;
            if (route.name === ROUTES.CHATS_LIST) {
              iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === ROUTES.MIS_SOLICITUDES) {
              iconName = isFocused ? 'document-text' : 'document-text-outline';
            }

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

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tabButton,
                  isFirstRightTab && styles.tabButtonAfterCenter
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.tabIconContainer}>
                  {route.name === ROUTES.CHATS_LIST && totalMensajesNoLeidos > 0 ? (
                    <View style={styles.iconWithBadge}>
                      <Ionicons 
                        name={iconName} 
                        size={24} 
                        color={isFocused ? primaryColor : textLightColor} 
                      />
                      <View style={[styles.tabBadge, { backgroundColor: colors.error?.[500] || '#FF6B6B' }]}>
                        <Text style={styles.tabBadgeText}>
                          {totalMensajesNoLeidos > 99 ? '99+' : totalMensajesNoLeidos}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Ionicons 
                      name={iconName} 
                      size={24} 
                      color={isFocused ? primaryColor : textLightColor} 
                    />
                  )}
                </View>
                <Text 
                  style={[
                    styles.tabLabel,
                    { 
                      color: isFocused ? gradientTextColor : textLightColor,
                      fontSize: safeTypography.fontSize?.xs || 11,
                      fontWeight: safeTypography.fontWeight?.semibold || '600',
                    }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

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
        component={MisVehiculosListScreen}
        options={{ tabBarLabel: 'Vehículos' }}
      />
      <Tab.Screen
        name={ROUTES.CREAR_SOLICITUD}
        component={CrearSolicitudScreen}
        options={{
          tabBarLabel: 'Crear',
          tabBarStyle: { display: 'none' }, // Ocultar tab bar en CREAR_SOLICITUD para mejorar UX
        }}
      />
      <Tab.Screen
        name={ROUTES.CHATS_LIST}
        component={ChatsListScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen
        name={ROUTES.MIS_SOLICITUDES}
        component={MisSolicitudesScreen}
        options={{ tabBarLabel: 'Solicitudes' }}
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
        options={getHeaderOptions("Servicios Disponibles", { showProfile: true })}
      />

      <Stack.Screen
        name={ROUTES.MY_VEHICLES}
        component={MisVehiculosScreen}
        options={getHeaderOptions("Mis Vehículos", { showProfile: true })}
      />

      {/* Pantallas de perfil - Ahora accesibles desde el header en lugar del tab */}
      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="SeleccionMetodoPago"
        component={SeleccionMetodoPagoScreen}
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
      <Stack.Screen
        name={ROUTES.CHAT_OFERTA}
        component={ChatOfertaScreen}
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

// Función para crear estilos dinámicos del Tab Bar
const createTabBarStyles = (colors, typography, spacing, borders, primaryColor, textLightColor) => StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
    width: '100%',
  },
  tabBarCurve: {
    backgroundColor: colors.background?.paper || '#FFFFFF',
    borderTopLeftRadius: borders.radius?.card?.xl || 20,
    borderTopRightRadius: borders.radius?.card?.xl || 20,
    paddingTop: spacing.sm || 10,
    overflow: 'visible',
    minHeight: 60,
    borderTopWidth: borders.width?.thin || 1,
    borderTopColor: colors.neutral?.gray?.[200] || '#D7DFE3',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs || 4,
    paddingBottom: spacing.xs || 8,
    minHeight: 60,
    position: 'relative',
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs || 8,
    paddingBottom: spacing.xs || 4,
    minWidth: 60,
    paddingHorizontal: spacing.xs || 4,
  },
  tabIconContainer: {
    marginBottom: spacing.xs || 4,
  },
  iconWithBadge: {
    position: 'relative',
  },
  tabLabel: {
    marginTop: 2,
    textAlign: 'center',
    // fontSize y fontWeight se aplican dinámicamente
  },
  centerButtonContainer: {
    position: 'absolute',
    top: -32,
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  tabButtonBeforeCenter: {
    paddingRight: spacing.lg || 30,
    marginRight: spacing.sm || 10,
  },
  tabButtonAfterCenter: {
    paddingLeft: spacing.lg || 30,
    marginLeft: spacing.sm || 10,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: borders.radius?.avatar?.full || 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: primaryColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: borders.radius?.badge?.md || 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs || 4,
    borderWidth: 2,
    borderColor: colors.background?.paper || '#FFFFFF',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize?.xs || 10,
    fontWeight: typography.fontWeight?.bold || '700',
  },
});

export default AppNavigator; 