import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestServicesGrid from '../../components/guest/GuestServicesGrid';
import ExploreSearchBar from '../../components/providers/explore/ExploreSearchBar';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Lista completa de servicios de una sección del guest landing (Airbnb “See all”).
 */
const GuestSectionServicesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const title = route.params?.title || 'Servicios';
  const offers = route.params?.offers || [];
  const patente = route.params?.patente || null;
  const vehicleData = route.params?.vehicleData || null;
  const vehicle = route.params?.vehicle || null;

  const [query, setQuery] = useState('');

  const filteredOffers = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return offers;
    return offers.filter((item) => {
      const name = normalizeSearch(
        item?.nombre || item?.servicio?.nombre || item?.servicio?.servicio_nombre || '',
      );
      return name.includes(q);
    });
  }, [offers, query]);

  const meta = useMemo(() => {
    const count = filteredOffers.length;
    const total = offers.length;
    const showingFiltered = Boolean(normalizeSearch(query)) && count !== total;
    if (showingFiltered) return `${count} de ${total} servicios`;
    if (route.params?.meta) return route.params.meta;
    return `${total} servicio${total === 1 ? '' : 's'}`;
  }, [route.params?.meta, offers.length, filteredOffers.length, query]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(ROUTES.GUEST_LANDING);
  }, [navigation]);

  const handleServicePress = useCallback(
    (item) => {
      const isGroup = Array.isArray(item?.ofertas);
      navigation.navigate(ROUTES.GUEST_SERVICE_OFFER, {
        group: isGroup ? item : null,
        offer: isGroup ? null : item,
        patente,
        vehicleData,
        vehicle,
      });
    },
    [navigation, patente, vehicleData, vehicle],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchWrap}>
        <ExploreSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre del servicio"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {offers.length === 0 ? (
          <Text style={styles.empty}>No hay servicios en esta sección.</Text>
        ) : filteredOffers.length === 0 ? (
          <Text style={styles.empty}>
            No encontramos servicios con “{query.trim()}”.
          </Text>
        ) : (
          <GuestServicesGrid
            offers={filteredOffers}
            onServicePress={handleServicePress}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    minHeight: 56,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  meta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  empty: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

export default GuestSectionServicesScreen;
