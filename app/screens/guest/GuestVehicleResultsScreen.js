import { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ROUTES } from '../../utils/constants';

/**
 * Compat: redirige a la landing unificada (sin navegación entre pantallas).
 */
const GuestVehicleResultsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    navigation.replace(ROUTES.GUEST_LANDING, {
      patente: route.params?.patente,
      vehicleData: route.params?.vehicleData,
    });
  }, [navigation, route.params?.patente, route.params?.vehicleData]);

  return null;
};

export default GuestVehicleResultsScreen;
