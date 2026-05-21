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
      icon={<Navigation size={16} color={COLORS.primary[500]} />}
      title={resolvedTitle}
      hint="Más cerca de tu dirección."
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Selecciona una dirección arriba para ver proveedores cercanos."
      emptyNoResultsMessage="No hay proveedores verificados en este radio. Prueba otra dirección."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeNearbyRow);
