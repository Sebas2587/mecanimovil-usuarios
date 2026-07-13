import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

const HomeHighlightedRow = ({
  selectedVehicle,
  hasSelectedAddress = false,
  title,
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!selectedVehicle) return null;

  const marcaLabel = selectedVehicle.marca_nombre || 'marca';
  const resolvedTitle = title || `Destacados para tu ${marcaLabel}`;

  return (
    <HomeProvidersCarouselSection
      title={resolvedTitle}
      cardFooterVariant="bookings"
      userBrandName={selectedVehicle.marca_nombre || null}
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Elige una dirección para ver talleres recomendados cerca de ti."
      emptyNoResultsMessage="Aún no hay talleres que atiendan tu marca en esta zona. Explora «Cerca de ti» o agenda un servicio."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeHighlightedRow);
