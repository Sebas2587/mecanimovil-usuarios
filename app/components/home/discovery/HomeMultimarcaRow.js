import React from 'react';
import HomeProvidersCarouselSection from './HomeProvidersCarouselSection';

/**
 * Sección horizontal de proveedores multimarca.
 */
const HomeMultimarcaRow = ({
  title = 'Multimarca',
  providers = [],
  loading,
  onProviderPress,
  onSeeAll,
  userBrandName = null,
}) => {
  if (!loading && providers.length === 0) return null;

  return (
    <HomeProvidersCarouselSection
      title={title}
      cardFooterVariant="bookings"
      userBrandName={userBrandName}
      providers={providers}
      loading={loading}
      emptyRequiresAddress={false}
      hasSelectedAddress
      emptyTitle="Sin talleres multimarca cerca"
      emptyNoResultsMessage="Todavía no hay talleres multimarca disponibles en esta zona."
      emptyActionLabel={onSeeAll ? 'Explorar talleres' : null}
      onProviderPress={onProviderPress}
      onSeeAll={onSeeAll}
      seeAllWhen={!loading && providers.length > 0}
    />
  );
};

export default React.memo(HomeMultimarcaRow);
