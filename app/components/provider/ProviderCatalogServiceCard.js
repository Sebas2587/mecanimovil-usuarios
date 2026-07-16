import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens';
import ServicePhotosCarousel from './ServicePhotosCarousel';
import { providerServiceCardStyles as styles } from './providerServiceCardStyles';

/**
 * Card de servicio en catálogo de proveedor (grid 2 columnas, patrón Airbnb).
 * Zonas fijas (título, precio, tag repuestos) para alinear contenido entre cards de la misma fila.
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
  const footerNodes = React.useMemo(() => {
    if (footer == null) return [];
    const nodes = Array.isArray(footer)
      ? footer
      : React.Children.toArray(footer);
    return nodes.filter(Boolean);
  }, [footer]);
  const cardContent = (
    <>
      <View style={[styles.mediaWrap, { height: imageHeight }]}>
        {hasPhotos ? (
          <ServicePhotosCarousel photos={fotos} height={imageHeight} />
        ) : (
          <View style={[styles.mediaPlaceholder, { height: imageHeight }]}>
            <Wrench size={24} color={COLORS.neutral.gray[400]} strokeWidth={1.75} />
          </View>
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

        {tipoLabel ? (
          <View style={styles.tipoTagRow}>
            <View
              style={[
                styles.serviceTipoTag,
                conRepuestos ? styles.serviceTipoTagCon : styles.serviceTipoTagSin,
              ]}
            >
              <Text
                style={[
                  styles.serviceTipoTagText,
                  conRepuestos ? styles.serviceTipoTagTextCon : styles.serviceTipoTagTextSin,
                ]}
              >
                {tipoLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {footerNodes.length > 0 ? (
          <View style={styles.footerBlock}>{footerNodes}</View>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.serviceCardShell}
        onPress={onPress}
        activeOpacity={0.88}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={nombre}
      >
        <View style={styles.serviceCardInner}>{cardContent}</View>
      </TouchableOpacity>
    );
  }

  return <View style={styles.serviceCardShell}>{cardContent}</View>;
}
