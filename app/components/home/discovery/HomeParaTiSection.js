import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Sección «Para ti»: proveedores destacados por KPI y marca del vehículo.
 */
const HomeParaTiSection = ({
  selectedVehicle,
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!selectedVehicle) return null;

  return (
    <HomeProvidersCarouselSection
      title="Para ti"
      userBrandName={selectedVehicle.marca_nombre || null}
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyNoAddressMessage=""
      emptyNoResultsMessage="Aún no hay talleres destacados para tu marca. Explora los más cercanos abajo o agenda un servicio."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (providers.length > 0 || !!selectedVehicle)}
    />
  );
};

export default React.memo(HomeParaTiSection);
