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
      hint="Mejor KPI en tu ciudad (hasta 5 km desde tu dirección)."
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Selecciona una dirección para ver destacados en tu ciudad."
      emptyNoResultsMessage="No hay especialistas destacados en tu ciudad. Prueba «Ver todos» o revisa «Cerca de ti»."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeHighlightedRow);
