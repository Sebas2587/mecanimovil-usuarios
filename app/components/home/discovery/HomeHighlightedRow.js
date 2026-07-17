import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Destacados especialistas de la marca — vacío Airbnb (sin card):
 * título de sección + mensaje quieto + enlace «Explorar talleres».
 */
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
      emptyNoAddressTitle="Elige dónde te atienden"
      emptyNoAddressMessage="Agrega o selecciona una dirección para ver especialistas cerca de ti."
      emptyTitle={`Sin especialistas ${marcaLabel} cerca`}
      emptyNoResultsMessage={`Todavía no encontramos talleres especializados en ${marcaLabel} en tu zona.`}
      emptyActionLabel="Explorar talleres"
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && providers.length > 0}
    />
  );
};

export default React.memo(HomeHighlightedRow);
