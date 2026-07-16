import React, { useCallback, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { SPACING } from '../../design-system/tokens';
import ProviderPreviewCard from '../home/ProviderPreviewCard';
import { formatProviderForCard } from '../../utils/providerUtils';
import { getSpecialtyForBrandContext } from '../../utils/providerBrandCoverage';

const MIN_CARD_WIDTH = 220;
const GRID_GUTTER = SPACING.md;

function chunkRows(list, size) {
  const rows = [];
  for (let i = 0; i < list.length; i += size) {
    rows.push(list.slice(i, i + size));
  }
  return rows;
}

/**
 * Grid responsivo estilo Airbnb Explore (sin ScrollView propio — va dentro del padre).
 */
const GuestProvidersGrid = ({ providers = [], userBrandName, onProviderPress }) => {
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
      const { id: _pid, ...card } = formatProviderForCard(item);
      /** En sección de marca: badge = cobertura; specialty = servicios (no marcas). */
      const specialty = userBrandName
        ? getSpecialtyForBrandContext(item, card.serviceOffers)
        : card.specialty || null;
      return (
        <View key={`${item._panelKind}-${item.id}`} style={{ width: cardWidth }}>
          <ProviderPreviewCard
            {...card}
            provider={item}
            specialty={specialty}
            userBrandName={userBrandName}
            cardFooterVariant="bookings"
            omitRightMargin
            width={cardWidth}
            onPress={() => onProviderPress(item)}
          />
        </View>
      );
    },
    [onProviderPress, cardWidth, userBrandName],
  );

  const rows = chunkRows(providers, columns);

  return (
    <View style={styles.wrap} onLayout={onGridLayout}>
      {rows.map((row, rowIdx) => (
        <View key={`guest-grid-row-${rowIdx}`} style={styles.row}>
          {row.map(renderCard)}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`guest-ph-${i}`} style={{ width: cardWidth }} />
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

export default GuestProvidersGrid;
