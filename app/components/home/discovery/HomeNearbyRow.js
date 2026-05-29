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
      hint="Especialistas en tu marca y talleres multimarca dentro de 5 km, ordenados por distancia."
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Selecciona una dirección arriba para ver proveedores cercanos."
      emptyNoResultsMessage="No hay proveedores compatibles con tu vehículo dentro de 5 km. Prueba otra dirección o usa «Ver todos»."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeNearbyRow);
