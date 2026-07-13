import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, useWindowDimensions } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { formatProviderForCard } from '../../utils/providerUtils';
import ProviderPreviewCard from '../../components/home/ProviderPreviewCard';

const GUTTER = SPACING.md;

const FavoriteProvidersScreen = () => {
  const navigation = useNavigation();
  const { favorites } = useFavorites();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth - SPACING.md * 2, 560);
  const columns = 2;
  const cardWidth = Math.floor((contentWidth - GUTTER * (columns - 1)) / columns);

  const rows = useMemo(() => {
    const list = favorites || [];
    const out = [];
    for (let i = 0; i < list.length; i += columns) {
      out.push(list.slice(i, i + columns));
    }
    return out;
  }, [favorites]);

  const handlePress = (item) => {
    navigation.navigate(ROUTES.PROVIDER_DETAIL, {
      providerId: item.id,
      providerType: item.type,
      provider: item,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color={COLORS.neutral.gray[300]} />
            <Text style={styles.emptyMessage}>No hay proveedores favoritos</Text>
          </View>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={`fav-row-${rowIdx}`} style={styles.row}>
              {row.map((item) => {
                const formatted = formatProviderForCard({
                  ...item,
                  _panelKind: item.type === 'taller' ? 'taller' : 'mecanico',
                });
                const { id: _id, ...card } = formatted;
                return (
                  <View key={`${item.id}-${item.type}`} style={{ width: cardWidth }}>
                    <ProviderPreviewCard
                      {...card}
                      provider={item}
                      width={cardWidth}
                      omitRightMargin
                      cardFooterVariant="bookings"
                      onPress={() => handlePress(item)}
                    />
                  </View>
                );
              })}
              {row.length < columns ? <View style={{ width: cardWidth }} /> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  emptyMessage: {
    ...TYPOGRAPHY.styles.body,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default FavoriteProvidersScreen;
