import React from 'react';
import { Tag } from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Proveedores con al menos una oferta en panel_servicios.
 */
const HomeOffersRow = ({ selectedVehicle, providers = [], loading, onProviderPress, onSeeAll }) => {
  if (!selectedVehicle || (!loading && providers.length === 0)) return null;

  return (
    <HomeProvidersCarouselSection
      icon={<Tag size={16} color={COLORS.warning.main} />}
      title="Ofertas de hoy"
      hint="Precios publicados para tu vehículo · sin abrir la ficha."
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
