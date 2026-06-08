import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ServicePhotosCarousel from './ServicePhotosCarousel';
import { providerServiceCardStyles as styles } from './providerServiceCardStyles';

/**
 * Card de servicio en catálogo de proveedor (grid 2 columnas).
 * Coinbase: categoría sobre imagen (arriba-derecha), badge repuestos, título, precio.
 */
export default function ProviderCatalogServiceCard({
  servicio,
  tipoLabel,
  precioLabel,
  precioSubtitulo,
  onPress,
  disabled = false,
  imageHeight = 120,
  footer = null,
}) {
  const nombre = servicio?.nombre || servicio?.servicio_nombre || 'Servicio Profesional';
  const categoria = servicio?.categoria || null;
  const fotos = Array.isArray(servicio?.fotos_servicio) ? servicio.fotos_servicio : [];
  const hasPhotos = fotos.length > 0;
  const conRepuestos = tipoLabel === 'Con repuestos';

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.88, disabled }
    : {};

  return (
    <Wrapper style={styles.serviceCardShell} {...wrapperProps}>
      <View style={[styles.mediaWrap, !hasPhotos && styles.mediaWrapCompact]}>
        {hasPhotos ? (
          <ServicePhotosCarousel photos={fotos} height={imageHeight} />
        ) : (
          <View style={[styles.mediaPlaceholder, { height: imageHeight * 0.55 }]} />
        )}
        {categoria ? (
          <View style={styles.categoryOverlay} pointerEvents="none">
            <Text style={styles.categoryOverlayText} numberOfLines={1}>
              {categoria}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.serviceCardBody}>
        <View
          style={[
            styles.serviceTipoBadge,
            conRepuestos ? styles.serviceTipoBadgeCon : styles.serviceTipoBadgeSin,
          ]}
        >
          <Text
            style={[
              styles.serviceTipoBadgeText,
              conRepuestos ? styles.serviceTipoBadgeTextCon : styles.serviceTipoBadgeTextSin,
            ]}
          >
            {tipoLabel}
          </Text>
        </View>

        <Text style={styles.serviceName} numberOfLines={2}>
          {nombre}
        </Text>

        {precioLabel ? (
          <Text style={styles.servicePrice}>{precioLabel}</Text>
        ) : null}
        {precioSubtitulo ? (
          <Text style={styles.servicePriceHint} numberOfLines={2}>
            {precioSubtitulo}
          </Text>
        ) : null}

        {footer}
      </View>
    </Wrapper>
  );
}
