import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import PublicProviderDetailScreen from '../screens/providers/PublicProviderDetailScreen';
import { ROUTES } from '../utils/constants';
import { getMarketplaceVehicleIdFromWebPath, getPublicProviderFromWebPath } from '../utils/publicListingRoute';

const Stack = createStackNavigator();

/**
 * Navegador para autenticación. Si la URL es una ficha pública (web), abre el detalle
 * del marketplace primero — sin forzar login a visitantes sin app / sin cuenta.
 */
const AuthNavigator = ({ registerSuccess, marketplaceVehicleId: marketplaceVehicleIdProp }) => {
  const fromVehiclePath = Platform.OS === 'web' ? getMarketplaceVehicleIdFromWebPath() : null;
  const marketplaceVehicleId = marketplaceVehicleIdProp ?? fromVehiclePath;
  const publicProviderData = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;

  const initialRouteName = publicProviderData
    ? ROUTES.PROVIDER_DETAIL
    : marketplaceVehicleId
      ? ROUTES.MARKETPLACE_VEHICLE_DETAIL
      : registerSuccess
        ? ROUTES.REGISTER
        : ROUTES.LOGIN;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        // No usar opacity: progress en la card inicial: en Android release el progress puede
        // quedar en 0 un tiempo → pantalla “gris” (fondo nativo) y sin UI.
        cardStyle: { backgroundColor: '#030712' },
      }}
    >
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen
        name={ROUTES.MARKETPLACE_VEHICLE_DETAIL}
        component={MarketplaceVehicleDetailScreen}
        options={{ headerShown: false }}
        initialParams={
          marketplaceVehicleId != null && !Number.isNaN(marketplaceVehicleId)
            ? { vehicleId: marketplaceVehicleId }
            : undefined
        }
      />
      {/* Mismo nombre que en AppNavigator + linking: provider/:type/:id → params type, id */}
      <Stack.Screen
        name={ROUTES.PROVIDER_DETAIL}
        component={PublicProviderDetailScreen}
        options={{
          headerShown: false,
          ...(Platform.OS === 'web'
            ? {
                /** La escena hace scroll; ScrollView interno + stack overflow:hidden rompe el wheel en Chrome normal. */
                cardStyle: {
                  backgroundColor: '#030712',
                  flex: 1,
                  maxHeight: '100vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                },
              }
            : {}),
        }}
        initialParams={
          publicProviderData
            ? { type: publicProviderData.providerType, id: publicProviderData.providerId }
            : undefined
        }
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
