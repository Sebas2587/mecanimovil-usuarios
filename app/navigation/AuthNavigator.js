import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TermsScreen from '../screens/support/TermsScreen';
import PrivacyPolicyScreen from '../screens/support/PrivacyPolicyScreen';
import MarketplaceVehicleDetailScreen from '../screens/marketplace/MarketplaceVehicleDetailScreen';
import PublicProviderDetailScreen from '../screens/providers/PublicProviderDetailScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ROUTES } from '../utils/constants';
import { getMarketplaceVehicleIdFromWebPath, getPublicProviderFromWebPath } from '../utils/publicListingRoute';
import { COLORS } from '../design-system/tokens';
import SplashScreen from '../components/utils/SplashScreen';
import PlatformAlertHost from '../components/common/PlatformAlertHost';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();
const HAS_SEEN_ONBOARDING_KEY = 'has_seen_onboarding_v1';

const authLegalHeaderOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: COLORS.background.default,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: COLORS.text.primary,
  headerTitleStyle: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  headerBackTitle: 'Volver',
};

/** Web: card acotada a viewport; el scroll lo maneja LegalDocumentView (evita doble scroll). */
const authLegalWebScreenOptions = Platform.OS === 'web'
  ? {
      cardStyle: {
        backgroundColor: COLORS.background.default,
        flex: 1,
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
    }
  : {};

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
    if (hasSeenOnboarding === false) return ROUTES.ONBOARDING;
    return ROUTES.LOGIN;
  }, [publicProviderData, marketplaceVehicleId, registerSuccess, hasSeenOnboarding]);

  if (hasSeenOnboarding == null && !publicProviderData && !marketplaceVehicleId && !registerSuccess) {
    return <SplashScreen />;
  }

  return (
    <>
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        // No usar opacity: progress en la card inicial: en Android release el progress puede
        // quedar en 0 un tiempo → pantalla “gris” (fondo nativo) y sin UI.
        cardStyle: { backgroundColor: COLORS.background.default },
      }}
    >
      <Stack.Screen
        name={ROUTES.ONBOARDING}
        component={OnboardingScreen}
        options={
          Platform.OS === 'web'
            ? {
                cardStyle: {
                  backgroundColor: COLORS.base?.inkBlack ?? '#0B1220',
                  flex: 1,
                  width: '100%',
                  height: '100vh',
                  minHeight: '100vh',
                  maxHeight: '100vh',
                  overflow: 'hidden',
                },
              }
            : undefined
        }
      />
      <Stack.Screen
        name={ROUTES.LOGIN}
        component={LoginScreen}
        options={
          Platform.OS === 'web'
            ? {
                cardStyle: {
                  backgroundColor: COLORS.background.default,
                  flex: 1,
                  maxHeight: '100vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                },
              }
            : undefined
        }
      />
      <Stack.Screen
        name={ROUTES.REGISTER}
        component={RegisterScreen}
        options={
          Platform.OS === 'web'
            ? {
                cardStyle: {
                  backgroundColor: COLORS.background.default,
                  flex: 1,
                  maxHeight: '100vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                },
              }
            : undefined
        }
      />
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
      <Stack.Screen
        name={ROUTES.TERMS}
        component={TermsScreen}
        options={{
          ...authLegalHeaderOptions,
          ...authLegalWebScreenOptions,
          title: 'Términos y Condiciones',
        }}
      />
      <Stack.Screen
        name={ROUTES.PRIVACY_POLICY}
        component={PrivacyPolicyScreen}
        options={{
          ...authLegalHeaderOptions,
          ...authLegalWebScreenOptions,
          title: 'Política de Privacidad',
        }}
      />
    </Stack.Navigator>
    <PlatformAlertHost />
    </>
  );
};

export default AuthNavigator;
