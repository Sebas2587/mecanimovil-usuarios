import React from 'react';
import ProviderPreviewCard from '../home/ProviderPreviewCard';

/**
 * Alias canónico de listing Airbnb.
 * Toda card de proveedor/taller/mecánico en listados debe pasar por
 * ProviderPreviewCard — este wrapper solo adapta la API legacy de ProviderCard.
 */
const ProviderCard = ({
  name,
  imageUri,
  rating,
  reviewCount,
  distanceLabel,
  specialtyTag,
  priceLabel,
  onPress,
  width,
  provider,
  userBrandName,
  verified,
  kpiBadge,
  omitRightMargin = true,
}) => (
  <ProviderPreviewCard
    provider={provider}
    name={name}
    image={imageUri}
    rating={rating}
    reviews={reviewCount}
    distance={distanceLabel}
    specialty={specialtyTag || priceLabel || null}
    onPress={onPress}
    width={width}
    userBrandName={userBrandName}
    verified={verified}
    kpiBadge={kpiBadge}
    omitRightMargin={omitRightMargin}
    cardFooterVariant="bookings"
  />
);

export default React.memo(ProviderCard);
