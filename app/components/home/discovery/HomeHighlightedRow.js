import React from 'react';
import { Sparkles } from 'lucide-react-native';
import { COLORS } from '../../../design-system/tokens';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

const HomeHighlightedRow = ({
  selectedVehicle,
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
      icon={<Sparkles size={16} color={COLORS.primary[500]} />}
      title={resolvedTitle}
      hint="Ordenados por desempeño en MecaniMóvil."
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyNoAddressMessage=""
      emptyNoResultsMessage="Aún no hay especialistas destacados. Revisa «Cerca de ti» o crea una solicitud."
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && providers.length > 0}
    />
  );
};

export default React.memo(HomeHighlightedRow);
