import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import { ROUTES } from '../utils/constants';
import { getMarketplaceVehicleIdFromWebPath } from '../utils/publicListingRoute';

const Stack = createStackNavigator();

/**
 * Navegador para autenticación. Si la URL es una ficha pública (web), abre el detalle
 * del marketplace primero — sin forzar login a visitantes sin app / sin cuenta.
 */
const AuthNavigator = ({ registerSuccess, marketplaceVehicleId: marketplaceVehicleIdProp }) => {
  const fromPath = Platform.OS === 'web' ? getMarketplaceVehicleIdFromWebPath() : null;
  const marketplaceVehicleId = marketplaceVehicleIdProp ?? fromPath;

  const initialRouteName = marketplaceVehicleId
    ? ROUTES.MARKETPLACE_VEHICLE_DETAIL
    : registerSuccess
      ? ROUTES.REGISTER
      : ROUTES.LOGIN;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
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
    </Stack.Navigator>
  );
};

export default AuthNavigator;
