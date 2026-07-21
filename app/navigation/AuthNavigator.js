import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import GuestLandingScreen from '../screens/guest/GuestLandingScreen';
import GuestVehicleResultsScreen from '../screens/guest/GuestVehicleResultsScreen';
import GuestServiceOfferScreen from '../screens/guest/GuestServiceOfferScreen';
import GuestSectionProvidersScreen from '../screens/guest/GuestSectionProvidersScreen';
import GuestSectionServicesScreen from '../screens/guest/GuestSectionServicesScreen';
import InformeServicioScreen from '../screens/guest/InformeServicioScreen';
import CotizacionPublicaScreen from '../screens/guest/CotizacionPublicaScreen';
import EscanearInformeServicioScreen from '../screens/guest/EscanearInformeServicioScreen';
import PublicVehicleFichaScreen from '../screens/guest/PublicVehicleFichaScreen';
import TransferenciaClaimScreen from '../screens/marketplace/TransferenciaClaimScreen';
import TermsScreen from '../screens/support/TermsScreen';
import PrivacyPolicyScreen from '../screens/support/PrivacyPolicyScreen';
import PublicProviderDetailScreen from '../screens/providers/PublicProviderDetailScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ROUTES } from '../utils/constants';
import {
  getPublicProviderFromWebPath,
  getInformeTokenFromWebPath,
  getCotizacionTokenFromWebPath,
  getMarketplaceVehicleIdFromWebPath,
  getTransferClaimTokenFromWebPath,
} from '../utils/publicListingRoute';
import { COLORS } from '../design-system/tokens';
import SplashScreen from '../components/utils/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STORAGE_KEY } from '../components/onboarding';

const Stack = createStackNavigator();

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
 * Navegador para autenticación. Si la URL es una ficha pública de proveedor (web), abre el detalle
 * primero — sin forzar login a visitantes sin app / sin cuenta.
 * Deep links de marketplace/vehicle abren la ficha pública de salud (sin datos sensibles).
 */
const AuthNavigator = ({ registerSuccess }) => {
  const publicProviderData = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;
  const informeTokenFromWeb = Platform.OS === 'web' ? getInformeTokenFromWebPath() : null;
  const cotizacionTokenFromWeb = Platform.OS === 'web' ? getCotizacionTokenFromWebPath() : null;
  const marketplaceVehicleIdFromWeb = Platform.OS === 'web' ? getMarketplaceVehicleIdFromWebPath() : null;
  const transferClaimTokenFromWeb = Platform.OS === 'web' ? getTransferClaimTokenFromWebPath() : null;

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
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
    if (marketplaceVehicleIdFromWeb) return ROUTES.MARKETPLACE_VEHICLE_DETAIL;
    if (transferClaimTokenFromWeb) return ROUTES.TRANSFERENCIA_CLAIM;
    if (informeTokenFromWeb) return ROUTES.INFORME_SERVICIO;
    if (cotizacionTokenFromWeb) return ROUTES.COTIZACION_PUBLICA;
    if (registerSuccess) return ROUTES.REGISTER;
    if (hasSeenOnboarding === false) return ROUTES.ONBOARDING;
    return ROUTES.GUEST_LANDING;
  }, [
    publicProviderData,
    marketplaceVehicleIdFromWeb,
    transferClaimTokenFromWeb,
    informeTokenFromWeb,
    cotizacionTokenFromWeb,
    registerSuccess,
    hasSeenOnboarding,
  ]);

  if (
    hasSeenOnboarding == null
    && !publicProviderData
    && !marketplaceVehicleIdFromWeb
    && !transferClaimTokenFromWeb
    && !informeTokenFromWeb
    && !cotizacionTokenFromWeb
    && !registerSuccess
  ) {
    return <SplashScreen />;
  }

  return (
    <>
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        // No usar opacity: progress en la card inicial: en Android release el progress puede
        // quedar en 0 un tiempo → pantalla "gris" (fondo nativo) y sin UI.
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
                  backgroundColor: '#0B0B0B',
                  flex: 1,
                  width: '100%',
                  height: '100vh',
                  minHeight: '100vh',
                  maxHeight: '100vh',
                  overflow: 'hidden',
                },
              }
            : { cardStyle: { backgroundColor: '#0B0B0B' } }
        }
      />
      <Stack.Screen
        name={ROUTES.GUEST_LANDING}
        component={GuestLandingScreen}
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
        name={ROUTES.GUEST_VEHICLE_RESULTS}
        component={GuestVehicleResultsScreen}
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
        name={ROUTES.GUEST_SERVICE_OFFER}
        component={GuestServiceOfferScreen}
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
        name={ROUTES.GUEST_SECTION_PROVIDERS}
        component={GuestSectionProvidersScreen}
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
        name={ROUTES.GUEST_SECTION_SERVICES}
        component={GuestSectionServicesScreen}
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
        name={ROUTES.INFORME_SERVICIO}
        component={InformeServicioScreen}
        initialParams={informeTokenFromWeb ? { token: informeTokenFromWeb } : undefined}
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
        name={ROUTES.COTIZACION_PUBLICA}
        component={CotizacionPublicaScreen}
        initialParams={cotizacionTokenFromWeb ? { token: cotizacionTokenFromWeb } : undefined}
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
        name={ROUTES.ESCANEAR_INFORME_SERVICIO}
        component={EscanearInformeServicioScreen}
        options={{ headerShown: false }}
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
        name={ROUTES.MARKETPLACE_VEHICLE_DETAIL}
        component={PublicVehicleFichaScreen}
        options={{
          headerShown: false,
          ...(Platform.OS === 'web'
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
            : {}),
        }}
        initialParams={
          marketplaceVehicleIdFromWeb
            ? { vehicleId: marketplaceVehicleIdFromWeb }
            : undefined
        }
      />
      <Stack.Screen
        name={ROUTES.TRANSFERENCIA_CLAIM}
        component={TransferenciaClaimScreen}
        options={{ headerShown: false }}
        initialParams={
          transferClaimTokenFromWeb
            ? { token: transferClaimTokenFromWeb }
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
    </>
  );
};

export default AuthNavigator;
