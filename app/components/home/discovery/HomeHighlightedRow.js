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
      hint="Especialistas en la marca de tu auto, ordenados por rendimiento (KPI)."
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Selecciona una dirección para ver destacados en tu ciudad."
      emptyNoResultsMessage="No hay especialistas en la marca de tu auto en tu zona. Revisa «Cerca de ti» (multimarca y especialistas) o crea una solicitud."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeHighlightedRow);
