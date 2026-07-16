import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ROUTES } from '../utils/constants';
import { EXPLORE_FILTER_ALL } from '../components/providers/explore';
import { COLORS } from '../design-system/tokens';

/**
 * Redirige rutas legacy Talleres/Mecánicos → ExploreProviders (filtro Todos).
 */
const LegacyExploreRedirect = ({ initialFilter = EXPLORE_FILTER_ALL }) => {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const params = route.params || {};
    navigation.replace(ROUTES.EXPLORE_PROVIDERS, {
      ...params,
      initialTab: EXPLORE_FILTER_ALL,
      categoryId: params.categoryId ?? undefined,
    });
  }, [navigation, route.params, initialFilter]);

  return <View style={{ flex: 1, backgroundColor: COLORS.background.default }} />;
};

export const TalleresRedirect = () => <LegacyExploreRedirect />;
export const MecanicosRedirect = () => <LegacyExploreRedirect />;

export default LegacyExploreRedirect;
