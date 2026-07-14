import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Sección horizontal de proveedores multimarca.
 */
const HomeMultimarcaRow = ({
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!loading && providers.length === 0) return null;

  return (
    <HomeProvidersCarouselSection
      title="Multimarca"
      cardFooterVariant="bookings"
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyNoResultsMessage="No hay proveedores multimarca disponibles en este momento."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && providers.length > 0}
    />
  );
};

export default React.memo(HomeMultimarcaRow);
