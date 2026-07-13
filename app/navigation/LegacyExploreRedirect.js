import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ROUTES } from '../utils/constants';
import { EXPLORE_TAB_TALLER, EXPLORE_TAB_MECANICO } from '../components/providers/explore';
import { COLORS } from '../design-system/tokens';

/**
 * Redirige rutas legacy Talleres/Mecánicos → ExploreProviders
 */
const LegacyExploreRedirect = ({ initialTab = 'all' }) => {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const params = route.params || {};
    navigation.replace(ROUTES.EXPLORE_PROVIDERS, {
      ...params,
      initialTab: params.initialTab || initialTab,
    });
  }, [navigation, route.params, initialTab]);

  return <View style={{ flex: 1, backgroundColor: COLORS.background.default }} />;
};

export const TalleresRedirect = () => (
  <LegacyExploreRedirect initialTab={EXPLORE_TAB_TALLER} />
);

export const MecanicosRedirect = () => (
  <LegacyExploreRedirect initialTab={EXPLORE_TAB_MECANICO} />
);

export default LegacyExploreRedirect;
