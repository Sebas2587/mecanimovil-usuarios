import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import ProviderModal from '../modals/ProviderModal';
import ProviderPreviewCard from '../home/ProviderPreviewCard';
import { formatProviderForCard } from '../../utils/providerUtils';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

const GUTTER = SPACING.md;
const MIN_CARD = 160;

/**
 * Lista de proveedores (talleres / mecánicos) — mismo listing Airbnb que Destacados/Explore.
 */
const ProvidersList = ({
  providers = [],
  type = 'taller',
  title = 'Proveedores disponibles',
  onProviderSelect = null,
  showAsModal = true,
  userBrandName = null,
}) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth - SPACING.container.horizontal * 2, 560);
  const columns = Math.max(2, Math.floor(contentWidth / MIN_CARD));
  const cardWidth = Math.floor((contentWidth - GUTTER * (columns - 1)) / columns);

  const handleProviderPress = useCallback(
    (provider) => {
      setSelectedProvider(provider);
      if (showAsModal) {
        setModalVisible(true);
      } else if (onProviderSelect) {
        onProviderSelect(provider);
      }
    },
    [showAsModal, onProviderSelect],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const { id: _pid, ...card } = formatProviderForCard({
        ...item,
        _panelKind: type === 'taller' ? 'taller' : 'mecanico',
      });
      return (
        <View style={{ width: cardWidth, marginBottom: GUTTER }}>
          <ProviderPreviewCard
            {...card}
            provider={{ ...item, _panelKind: type === 'taller' ? 'taller' : 'mecanico' }}
            userBrandName={userBrandName}
            width={cardWidth}
            omitRightMargin
            cardFooterVariant="bookings"
            onPress={() => handleProviderPress(item)}
          />
        </View>
      );
    },
    [cardWidth, handleProviderPress, type, userBrandName],
  );

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      {providers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {`No se encontraron ${type === 'taller' ? 'talleres' : 'mecánicos'} disponibles`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item, index) => `${type}-${item.id ?? index}`}
          renderItem={renderItem}
          numColumns={columns}
          key={`providers-cols-${columns}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showAsModal ? (
        <ProviderModal
          visible={modalVisible}
          provider={selectedProvider}
          type={type}
          onClose={() => setModalVisible(false)}
          onSelect={onProviderSelect}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  list: {
    paddingBottom: SPACING.lg,
  },
  row: {
    gap: GUTTER,
  },
  empty: {
    paddingVertical: SPACING['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default React.memo(ProvidersList);
