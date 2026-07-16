import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import GuestAirbnbServiceCard from './GuestAirbnbServiceCard';
import HomeSectionHeader from '../home/shared/HomeSectionHeader';
import { SPACING } from '../../design-system/tokens';
import {
  labelTipoServicioCatalogo,
  formatPrecioCatalogoServicio,
} from '../home/shared/providerCatalogSchedule';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import { H_PAD } from '../home/shared/homeLayoutConstants';

/**
 * Rail horizontal de servicios — proporciones Airbnb (media 1:1, ancho fijo por card).
 */
const GuestServicesSection = ({
  title,
  offers = [],
  onServicePress,
  spacingTop = false,
  onSeeAll,
}) => {
  const { width } = useWindowDimensions();
  const layoutW = Platform.OS === 'web' ? Math.min(width, 480) : width;
  /** ~2.15 cards visibles en mobile; en web panel estrecho. */
  const cardWidth = Math.max(148, Math.min(196, Math.floor((layoutW - H_PAD * 2) * 0.42)));

  const renderCard = useCallback(
    (item) => {
      /** "Servicios más solicitados": grupo con todas las ofertas (varios talleres/precios). */
      const isGroup = Array.isArray(item.ofertas);

      if (isGroup) {
        const desde = Number(item.precio_desde) || 0;
        const hasta = Number(item.precio_hasta) || 0;
        const tieneVariosPrecios = hasta > 0 && desde > 0 && hasta !== desde;
        const precioLabel = desde > 0
          ? (tieneVariosPrecios
              ? `Desde $${Math.round(desde).toLocaleString('es-CL')}`
              : `$${Math.round(desde).toLocaleString('es-CL')}`)
          : null;
        const total = item.total_proveedores || (item.ofertas?.length ?? 0);
        const metaLabel = total > 0 ? `${total} taller${total === 1 ? '' : 'es'} disponible${total === 1 ? '' : 's'}` : null;

        return (
          <GuestAirbnbServiceCard
            key={`svc-group-${item.servicio_id}`}
            width={cardWidth}
            servicio={{ nombre: item.nombre, fotos_servicio: item.fotos_servicio }}
            precioLabel={precioLabel}
            metaLabel={metaLabel}
            onPress={() => onServicePress?.(item)}
          />
        );
      }

      const precioInfo = labelPrecioServicioResuelto(item.servicio, { vehicle: null });
      const precioLabel = precioInfo.principal ?? formatPrecioCatalogoServicio(item.servicio);
      const key = `svc-${item.servicio_id}-${item.oferta_id ?? item.provider?.id}`;

      return (
        <GuestAirbnbServiceCard
          key={key}
          width={cardWidth}
          servicio={item.servicio}
          precioLabel={precioLabel}
          metaLabel={item.provider?.nombre}
          tipoLabel={labelTipoServicioCatalogo(item.servicio)}
          onPress={() => onServicePress?.(item)}
        />
      );
    },
    [cardWidth, onServicePress],
  );

  if (!offers.length) return null;

  return (
    <View style={[styles.section, spacingTop && styles.sectionTop]}>
      <HomeSectionHeader title={title} onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={Platform.OS !== 'web'}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
        style={Platform.OS === 'web' ? styles.carouselWeb : undefined}
      >
        {offers.map(renderCard)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTop: {
    marginTop: SPACING.sm,
  },
  row: {
    gap: SPACING.md,
    paddingRight: SPACING.md,
    alignItems: 'flex-start',
  },
  carouselWeb: {
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
  },
});

export default GuestServicesSection;
