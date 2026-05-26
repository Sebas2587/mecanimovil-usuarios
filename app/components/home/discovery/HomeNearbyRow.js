import React from 'react';
import { Navigation } from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

const HomeNearbyRow = ({
  selectedVehicle,
  title,
  hasSelectedAddress,
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!selectedVehicle) return null;

  const resolvedTitle = title || 'Cerca de ti';

  return (
    <HomeProvidersCarouselSection
      title={resolvedTitle}
      hint="Ordenados por distancia desde tu dirección."
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Selecciona una dirección arriba para ver proveedores cercanos."
      emptyNoResultsMessage="No hay talleres ni mecánicos con ubicación registrada dentro de 5 km. Prueba otra dirección o amplía tu zona en Explorar."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeNearbyRow);
