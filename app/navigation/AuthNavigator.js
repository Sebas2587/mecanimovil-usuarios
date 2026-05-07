import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import PublicProviderDetailScreen from '../screens/providers/PublicProviderDetailScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ROUTES } from '../utils/constants';
import { getMarketplaceVehicleIdFromWebPath, getPublicProviderFromWebPath } from '../utils/publicListingRoute';
import { COLORS } from '../design-system/tokens';
import SplashScreen from '../components/utils/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();
const HAS_SEEN_ONBOARDING_KEY = 'has_seen_onboarding_v1';

/**
 * Navegador para autenticación. Si la URL es una ficha pública (web), abre el detalle
 * del marketplace primero — sin forzar login a visitantes sin app / sin cuenta.
 */
const AuthNavigator = ({ registerSuccess, marketplaceVehicleId: marketplaceVehicleIdProp }) => {
  const fromVehiclePath = Platform.OS === 'web' ? getMarketplaceVehicleIdFromWebPath() : null;
  const marketplaceVehicleId = marketplaceVehicleIdProp ?? fromVehiclePath;
  const publicProviderData = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (Platform.OS === 'web') {
        if (mounted) setHasSeenOnboarding(true);
        return;
      }
      try {
        const v = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
        if (mounted) setHasSeenOnboarding(v === 'true');
      } catch {
        if (mounted) setHasSeenOnboarding(true);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const initialRouteName = useMemo(() => {
    if (publicProviderData) return ROUTES.PROVIDER_DETAIL;
    if (marketplaceVehicleId) return ROUTES.MARKETPLACE_VEHICLE_DETAIL;
    if (registerSuccess) return ROUTES.REGISTER;
    if (Platform.OS !== 'web' && hasSeenOnboarding === false) return ROUTES.ONBOARDING;
    return ROUTES.LOGIN;
  }, [publicProviderData, marketplaceVehicleId, registerSuccess, hasSeenOnboarding]);

  if (hasSeenOnboarding == null && Platform.OS !== 'web' && !publicProviderData && !marketplaceVehicleId && !registerSuccess) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        // No usar opacity: progress en la card inicial: en Android release el progress puede
        // quedar en 0 un tiempo → pantalla “gris” (fondo nativo) y sin UI.
        cardStyle: { backgroundColor: COLORS.background.default },
      }}
    >
      <Stack.Screen name={ROUTES.ONBOARDING} component={OnboardingScreen} />
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
                  backgroundColor: COLORS.background.default,
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
