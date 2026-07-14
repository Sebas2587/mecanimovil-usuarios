import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Proveedores con al menos una oferta en panel_servicios.
 */
const HomeOffersRow = ({ selectedVehicle, providers = [], loading, onProviderPress, onSeeAll }) => {
  if (!selectedVehicle || (!loading && providers.length === 0)) return null;

  return (
    <HomeProvidersCarouselSection
      title="Ofertas de hoy"
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyNoAddressMessage=""
      emptyNoResultsMessage=""
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && providers.length > 0}
    />
  );
};

export default React.memo(HomeOffersRow);
