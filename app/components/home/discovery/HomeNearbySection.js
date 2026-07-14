import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Sección «Cerca de ti»: proveedores geolocalizados, orden por distancia.
 */
const HomeNearbySection = ({
  selectedVehicle,
  hasSelectedAddress,
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
}) => {
  if (!selectedVehicle) return null;

  return (
    <HomeProvidersCarouselSection
      title="Cerca de ti"
      providers={providers}
      loading={loading}
      emptyRequiresAddress
      hasSelectedAddress={hasSelectedAddress}
      emptyNoAddressMessage="Agrega y selecciona una dirección para ver proveedores cercanos."
      emptyNoResultsMessage="No hay proveedores verificados en este radio para tu marca. Prueba otra dirección o crea una solicitud desde Servicios."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (hasSelectedAddress || providers.length > 0)}
    />
  );
};

export default React.memo(HomeNearbySection);
