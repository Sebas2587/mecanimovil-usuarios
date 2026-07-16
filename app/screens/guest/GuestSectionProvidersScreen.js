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
import GuestProvidersGrid from '../../components/guest/GuestProvidersGrid';
import ExploreSearchBar from '../../components/providers/explore/ExploreSearchBar';
import { buildBrandSeeAllMeta } from '../../utils/providerSectionAllocation';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Lista completa de talleres de una sección del guest landing (Airbnb “See all”).
 *
 * - Secciones de marca: catálogo completo (solapes permitidos entre marcas).
 * - Buscador simple por nombre de taller (filtro local).
 */
const GuestSectionProvidersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const title = route.params?.title || 'Talleres';
  const providers = route.params?.providers || [];
  const brandName = route.params?.brandName || route.params?.userBrandName || null;
  const userBrandName = route.params?.userBrandName || brandName || null;

  const [query, setQuery] = useState('');

  const filteredProviders = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return providers;
    return providers.filter((p) => {
      const name = normalizeSearch(p?.nombre || p?.name || '');
      return name.includes(q);
    });
  }, [providers, query]);

  const meta = useMemo(() => {
    const count = filteredProviders.length;
    const total = providers.length;
    const showingFiltered = Boolean(normalizeSearch(query)) && count !== total;

    if (brandName) {
      const base = buildBrandSeeAllMeta(brandName, showingFiltered ? count : total);
      return showingFiltered ? `${count} de ${total} · ${brandName}` : base;
    }
    if (showingFiltered) return `${count} de ${total} talleres`;
    if (route.params?.meta) return route.params.meta;
    return `${total} taller${total === 1 ? '' : 'es'}`;
  }, [route.params?.meta, brandName, providers.length, filteredProviders.length, query]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(ROUTES.GUEST_LANDING);
  }, [navigation]);

  const handleProviderPress = useCallback(
    (item) => {
      const type = item._panelKind === 'mecanico' ? 'mecanico' : 'taller';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, { type, id: item.id });
    },
    [navigation],
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
          placeholder="Buscar por nombre del taller"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {providers.length === 0 ? (
          <Text style={styles.empty}>No hay talleres en esta sección.</Text>
        ) : filteredProviders.length === 0 ? (
          <Text style={styles.empty}>
            No encontramos talleres con “{query.trim()}”.
          </Text>
        ) : (
          <GuestProvidersGrid
            providers={filteredProviders}
            userBrandName={userBrandName}
            onProviderPress={handleProviderPress}
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

export default GuestSectionProvidersScreen;
