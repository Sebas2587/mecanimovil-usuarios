import React from 'react';
import { Sparkles } from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
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

  const marcaLabel = selectedVehicle.marca_nombre || 'marca';
  const modeloLabel = selectedVehicle.modelo_nombre || '';

  return (
    <HomeProvidersCarouselSection
      icon={<Sparkles size={16} color={COLORS.primary[500]} />}
      title="Para ti"
      hint={`Destacados para tu ${marcaLabel} ${modeloLabel} según desempeño en MecaniMóvil.`.trim()}
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyNoAddressMessage=""
      emptyNoResultsMessage="Aún no hay especialistas destacados para tu marca. Explora los más cercanos abajo o crea una solicitud."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && (providers.length > 0 || !!selectedVehicle)}
    />
  );
};

export default React.memo(HomeParaTiSection);
