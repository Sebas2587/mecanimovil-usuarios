import React, { useCallback, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { SPACING } from '../../design-system/tokens';
import GuestAirbnbServiceCard from './GuestAirbnbServiceCard';
import {
  labelTipoServicioCatalogo,
  formatPrecioCatalogoServicio,
} from '../home/shared/providerCatalogSchedule';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';

const MIN_CARD_WIDTH = 160;
const GRID_GUTTER = SPACING.md;

function chunkRows(list, size) {
  const rows = [];
  for (let i = 0; i < list.length; i += size) {
    rows.push(list.slice(i, i + size));
  }
  return rows;
}

function formatGroupCard(item) {
  const desde = Number(item.precio_desde) || 0;
  const hasta = Number(item.precio_hasta) || 0;
  const tieneVariosPrecios = hasta > 0 && desde > 0 && hasta !== desde;
  const precioLabel = desde > 0
    ? (tieneVariosPrecios
        ? `Desde $${Math.round(desde).toLocaleString('es-CL')}`
        : `$${Math.round(desde).toLocaleString('es-CL')}`)
    : null;
  const uniqueProviders = new Set(
    (item.ofertas || [])
      .map((o) => {
        const id = o?.provider?.id ?? o?.provider_id;
        if (id == null) return null;
        return `${o.provider_type || o.provider?.tipo || 'taller'}-${id}`;
      })
      .filter(Boolean),
  );
  const total = uniqueProviders.size || Number(item.total_proveedores) || 0;
  const metaLabel = total > 0
    ? `${total} taller${total === 1 ? '' : 'es'} disponible${total === 1 ? '' : 's'}`
    : null;

  return {
    key: `svc-group-${item.servicio_id}`,
    servicio: {
      nombre: item.nombre,
      foto: item.foto,
      fotos_servicio: item.fotos_servicio,
    },
    precioLabel,
    metaLabel,
    tipoLabel: null,
  };
}

/**
 * Grid responsivo de servicios (Airbnb “See all”).
 */
const GuestServicesGrid = ({ offers = [], onServicePress }) => {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(null);

  const onGridLayout = useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setMeasuredWidth((prev) => (prev === w ? prev : w));
  }, []);

  const availableWidth = measuredWidth ?? windowWidth - SPACING.lg * 2;
  const columns = Math.max(2, Math.floor(availableWidth / MIN_CARD_WIDTH));
  const cardWidth = Math.floor((availableWidth - GRID_GUTTER * (columns - 1)) / columns);

  const renderCard = useCallback(
    (item) => {
      const isGroup = Array.isArray(item.ofertas);
      if (isGroup) {
        const card = formatGroupCard(item);
        return (
          <View key={card.key} style={{ width: cardWidth }}>
            <GuestAirbnbServiceCard
              width={cardWidth}
              servicio={card.servicio}
              precioLabel={card.precioLabel}
              metaLabel={card.metaLabel}
              onPress={() => onServicePress?.(item)}
            />
          </View>
        );
      }

      const precioInfo = labelPrecioServicioResuelto(item.servicio, { vehicle: null });
      const precioLabel = precioInfo.principal ?? formatPrecioCatalogoServicio(item.servicio);
      const key = `svc-${item.servicio_id}-${item.oferta_id ?? item.provider?.id}`;

      return (
        <View key={key} style={{ width: cardWidth }}>
          <GuestAirbnbServiceCard
            width={cardWidth}
            servicio={item.servicio}
            precioLabel={precioLabel}
            metaLabel={item.provider?.nombre}
            tipoLabel={labelTipoServicioCatalogo(item.servicio)}
            onPress={() => onServicePress?.(item)}
          />
        </View>
      );
    },
    [cardWidth, onServicePress],
  );

  const rows = chunkRows(offers, columns);

  return (
    <View style={styles.wrap} onLayout={onGridLayout}>
      {rows.map((row, rowIdx) => (
        <View key={`guest-svc-grid-row-${rowIdx}`} style={styles.row}>
          {row.map(renderCard)}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`guest-svc-ph-${i}`} style={{ width: cardWidth }} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GUTTER,
    marginBottom: GRID_GUTTER,
  },
});

export default React.memo(GuestServicesGrid);
