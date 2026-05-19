import React from 'react';
import { Navigation } from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
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

  const marcaLabel = selectedVehicle.marca_nombre || 'marca';
  const modeloLabel = selectedVehicle.modelo_nombre || '';

  return (
    <HomeProvidersCarouselSection
      icon={<Navigation size={16} color={COLORS.primary[500]} />}
      title="Cerca de ti"
      hint={`Ordenados por cercanía desde tu dirección · ${marcaLabel} ${modeloLabel}.`.trim()}
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
