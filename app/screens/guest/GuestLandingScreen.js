import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Car,
  ChevronDown,
  MapPin,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Gauge,
  RotateCcw,
  TrendingUp,
  CalendarCheck,
  Bell,
  Search,
  AlertTriangle,
} from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS, GRADIENTS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import GuestAddressPicker from '../../components/guest/GuestAddressPicker';
import GuestSearchBar from '../../components/guest/GuestSearchBar';
import GuestSearchSuggestions from '../../components/guest/GuestSearchSuggestions';
import GuestServicesSection from '../../components/guest/GuestServicesSection';
import GuestScheduleGateModal from '../../components/guest/GuestScheduleGateModal';
import GuestLandingFeedSkeleton from '../../components/utils/GuestLandingFeedSkeleton';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import HomeProvidersCarouselSection from '../../components/home/discovery/HomeProvidersCarouselSection';
import { consultarPatentePublica } from '../../services/vehicle';
import { getGuestBrowseProviders, getGuestProvidersByMarca } from '../../services/providers';
import { getMainCategories } from '../../services/categories';
import { buscarServiciosPublico, getServiciosMasSolicitados } from '../../services/service';
import { savePendingGuestIntent, savePendingGuestScheduleIntent } from '../../utils/guestIntent';
import { formatGuestValorLabel, mapPublicDataToPrefill } from '../../utils/guestExploreUtils';
import { showAlert } from '../../utils/platformAlert';
import {
  allocateProvidersToSections,
  previewSectionProviders,
  resolveProvidersForSeeAll,
  buildBrandSeeAllMeta,
  sectionShouldShowSeeAll,
  SECTION_PREVIEW_LIMIT,
} from '../../utils/providerSectionAllocation';
import { filterProvidersBySearchQuery, providerStableKey } from '../../utils/exploreProviderUtils';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const FEATURES = [
  { icon: Search, title: 'Consulta tu patente gratis', description: 'Sin registro, resultados al instante.' },
  { icon: ShieldCheck, title: 'Talleres verificados', description: 'Perfiles con calificaciones reales cerca de ti.' },
  { icon: TrendingUp, title: 'Valor de mercado', description: 'Estimación actualizada solo con tu patente.' },
  { icon: HeartPulse, title: 'Salud de tu vehículo', description: 'Historial y métricas al registrar tu auto.' },
  { icon: CalendarCheck, title: 'Agenda en minutos', description: 'Reserva servicios sin llamadas ni filas.' },
  { icon: Bell, title: 'Recordatorios inteligentes', description: 'Nunca más olvides una mantención.' },
];

const STEPS = [
  { title: 'Ingresa tu patente', description: 'Te mostramos talleres, servicios y valor estimado al instante, sin registrarte.' },
  { title: 'Explora sin compromiso', description: 'Filtra por categoría y compara talleres cerca de tu dirección.' },
  { title: 'Regístrate para agendar', description: 'Guarda tu auto, agenda servicios y lleva su historial completo.' },
];

function mergeProviderPool(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const p of list || []) {
      const key = providerStableKey(p);
      if (key && !map.has(key)) map.set(key, p);
    }
  }
  return Array.from(map.values());
}

/**
 * Resultados de búsqueda → grupos por servicio (todas sus ofertas/talleres), igual
 * forma que "servicios más solicitados". Nunca representa el servicio con un único
 * taller "adivinado": el detalle (GuestServiceOfferScreen) muestra todos los talleres.
 */
function mapSearchServiciosToOffers(servicios) {
  return (servicios || [])
    .filter((item) => Array.isArray(item?.ofertas) && item.ofertas.length > 0)
    .map((item) => ({
      servicio_id: item.servicio_id,
      nombre: item.nombre,
      fotos_servicio: item.foto ? [{ imagen_url: item.foto }] : [],
      precio_desde: item.precio_desde,
      precio_hasta: item.precio_hasta,
      total_proveedores: item.total_proveedores,
      ofertas: item.ofertas || [],
    }));
}

const GuestLandingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const initialPatente = route.params?.patente || '';
  const initialVehicleData = route.params?.vehicleData || null;

  const [patente, setPatente] = useState(initialPatente);
  const [vehicleData, setVehicleData] = useState(initialVehicleData);
  const [patenteLoading, setPatenteLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const [browseProviders, setBrowseProviders] = useState([]);
  const [marcaProviders, setMarcaProviders] = useState([]);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [loadingMarca, setLoadingMarca] = useState(false);
  const [hasLoadedBrowseOnce, setHasLoadedBrowseOnce] = useState(false);

  const [categories, setCategories] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestServices, setSuggestServices] = useState([]);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [searchServiceResults, setSearchServiceResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [scheduleGateVisible, setScheduleGateVisible] = useState(false);
  const [pendingScheduleOffer, setPendingScheduleOffer] = useState(null);
  const searchDebounceRef = useRef(null);

  const hasVehicleResults = Boolean(vehicleData && (vehicleData.marca_nombre || vehicleData.marca_id));
  const plateRegisteredInApp = Boolean(vehicleData?.registered_in_app);
  const normalizedPatente = patente.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const marcaId = vehicleData?.marca_id;
  const marcaNombre = vehicleData?.marca_nombre || 'tu marca';
  const valorLabel = useMemo(() => formatGuestValorLabel(vehicleData), [vehicleData]);

  const handlePatenteChange = useCallback((text) => {
    setPatente(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }, []);

  const loadBrowseProviders = useCallback(async () => {
    setLoadingBrowse(true);
    try {
      const list = await getGuestBrowseProviders({
        lat: selectedAddress?.latitud,
        lng: selectedAddress?.longitud,
        dist: 30,
        limit: 72,
      });
      setBrowseProviders(list);
    } finally {
      setLoadingBrowse(false);
      setHasLoadedBrowseOnce(true);
    }
  }, [selectedAddress?.latitud, selectedAddress?.longitud]);

  const loadMarcaProviders = useCallback(async () => {
    if (!marcaId) {
      setMarcaProviders([]);
      return;
    }
    setLoadingMarca(true);
    try {
      const list = await getGuestProvidersByMarca({
        marcaId,
        marcaNombre,
        lat: selectedAddress?.latitud,
        lng: selectedAddress?.longitud,
        dist: 30,
        limit: 48,
      });
      setMarcaProviders(list);
    } finally {
      setLoadingMarca(false);
    }
  }, [marcaId, marcaNombre, selectedAddress?.latitud, selectedAddress?.longitud]);

  useEffect(() => {
    loadBrowseProviders();
  }, [loadBrowseProviders]);

  useEffect(() => {
    if (hasVehicleResults) loadMarcaProviders();
    else setMarcaProviders([]);
  }, [hasVehicleResults, loadMarcaProviders]);

  useEffect(() => {
    let mounted = true;
    getMainCategories().then((cats) => {
      if (mounted) setCategories((cats || []).slice(0, 10));
    });
    /** Demanda real (solicitudes históricas), no un ranking por precio del catálogo. */
    getServiciosMasSolicitados(12).then((list) => {
      if (mounted) setPopularServices(list || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  /** Debounce sugerencias Airbnb al escribir en “Buscar”. */
  useEffect(() => {
    const q = searchText.trim();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!q) {
      setSuggestServices([]);
      setSuggestLoading(false);
      setAppliedSearchQuery('');
      setSearchServiceResults([]);
      return undefined;
    }

    setSuggestLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await buscarServiciosPublico(q);
        setSuggestServices(mapSearchServiciosToOffers(results));
      } catch {
        setSuggestServices([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 320);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchText]);

  const mergedProviders = useMemo(
    () => mergeProviderPool([browseProviders, marcaProviders]),
    [browseProviders, marcaProviders],
  );

  const suggestProviders = useMemo(() => {
    const q = searchText.trim();
    if (!q || q.length < 2) return [];
    return filterProvidersBySearchQuery(mergedProviders, q).slice(0, 5);
  }, [mergedProviders, searchText]);

  const textFilteredProviders = useMemo(() => {
    if (!appliedSearchQuery.trim()) return mergedProviders;
    return filterProvidersBySearchQuery(mergedProviders, appliedSearchQuery);
  }, [mergedProviders, appliedSearchQuery]);

  const { sections: allocatedSections } = useMemo(
    () =>
      allocateProvidersToSections(textFilteredProviders, {
        marcaId: hasVehicleResults ? marcaId : undefined,
        marcaNombre: hasVehicleResults ? marcaNombre : undefined,
        categories,
        /** Sin patente: mostrar marcas con ≥1 especialista (descubrimiento Airbnb). */
        minBrandSectionSize: hasVehicleResults ? 2 : 1,
        maxBrandSections: 10,
        prioritizeBrandSections: true,
      }),
    [textFilteredProviders, hasVehicleResults, marcaId, marcaNombre, categories],
  );

  /**
   * Servicios realmente más solicitados (demanda histórica del backend), con TODOS
   * los talleres/mecánicos que lo ofrecen y su propio precio — no un único taller
   * "adivinado" ni un ranking por precio de catálogo.
   */
  const popularServiceOffers = useMemo(
    () =>
      popularServices.map((item) => ({
        servicio_id: item.servicio_id,
        nombre: item.nombre,
        fotos_servicio: item.foto ? [{ imagen_url: item.foto }] : [],
        precio_desde: item.precio_desde,
        precio_hasta: item.precio_hasta,
        total_proveedores: item.total_proveedores,
        ofertas: item.ofertas || [],
      })),
    [popularServices],
  );

  const searchServiceOffers = useMemo(
    () => (appliedSearchQuery.trim() ? mapSearchServiciosToOffers(searchServiceResults) : []),
    [appliedSearchQuery, searchServiceResults],
  );

  const showSuggestions =
    searchFocused && searchText.trim().length >= 2;

  const handlePatenteSubmit = useCallback(async () => {
    if (normalizedPatente.length < 6) {
      showAlert('Patente inválida', 'Ingresa una patente válida de 6 caracteres.');
      return;
    }
    Keyboard.dismiss();
    setPatenteLoading(true);
    try {
      const data = await consultarPatentePublica(normalizedPatente);
      setVehicleData(data);
      if (data?.registered_in_app) {
        showAlert(
          'Patente ya registrada',
          'Este vehículo ya está en Mecanimovil. Inicia sesión con tu cuenta para acceder a su historial y agendar servicios.',
        );
      }
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'No pudimos consultar la patente. Intenta nuevamente.';
      showAlert('Sin resultados', msg);
    } finally {
      setPatenteLoading(false);
    }
  }, [normalizedPatente]);

  const persistGuestVehicleIntent = useCallback(async () => {
    if (!normalizedPatente || !vehicleData) return;
    const prefill = mapPublicDataToPrefill(vehicleData, normalizedPatente);
    await savePendingGuestIntent({ patente: normalizedPatente, vehicleData: prefill });
  }, [normalizedPatente, vehicleData]);

  const handleLoginWithIntent = useCallback(async () => {
    await persistGuestVehicleIntent();
    navigation.navigate(ROUTES.LOGIN);
  }, [navigation, persistGuestVehicleIntent]);

  const navigateToServiceOffer = useCallback(
    (item) => {
      setSearchFocused(false);
      Keyboard.dismiss();
      /** "Servicios más solicitados" trae TODAS las ofertas (varios talleres/precios). */
      const isGroup = Array.isArray(item?.ofertas);
      navigation.navigate(ROUTES.GUEST_SERVICE_OFFER, {
        group: isGroup ? item : null,
        offer: isGroup ? null : item,
        patente: normalizedPatente || null,
        vehicleData: mapPublicDataToPrefill(vehicleData, normalizedPatente),
      });
    },
    [navigation, normalizedPatente, vehicleData],
  );

  const handleSearchTextSubmit = useCallback(async () => {
    const q = searchText.trim();
    Keyboard.dismiss();
    setSearchFocused(false);
    if (!q) {
      setAppliedSearchQuery('');
      setSearchServiceResults([]);
      return;
    }
    setAppliedSearchQuery(q);
    setSuggestLoading(true);
    try {
      const results = await buscarServiciosPublico(q);
      setSearchServiceResults(results);
      setSuggestServices(mapSearchServiciosToOffers(results));
      const offers = mapSearchServiciosToOffers(results);
      if (offers.length === 1) {
        navigateToServiceOffer(offers[0]);
      }
    } finally {
      setSuggestLoading(false);
    }
  }, [searchText, navigateToServiceOffer]);

  const handleResetPatente = useCallback(() => {
    setVehicleData(null);
    setPatente('');
    setMarcaProviders([]);
  }, []);

  /**
   * Airbnb “See all”:
   * - Feed: lista exclusiva (sin duplicar talleres entre secciones).
   * - Ver todos (marca): catálogo completo de especialistas que atienden esa marca.
   */
  const navigateToSection = useCallback(
    (section) => {
      const brandName = section.brandName || null;
      const seeAllProviders = resolveProvidersForSeeAll(section, textFilteredProviders);
      navigation.navigate(ROUTES.GUEST_SECTION_PROVIDERS, {
        title: section.title,
        meta: brandName
          ? buildBrandSeeAllMeta(brandName, seeAllProviders.length)
          : section.meta || `${seeAllProviders.length} talleres`,
        providers: seeAllProviders,
        userBrandName: brandName || (hasVehicleResults ? marcaNombre : null),
        brandName,
      });
    },
    [navigation, hasVehicleResults, marcaNombre, textFilteredProviders],
  );

  const handleRegister = useCallback(async () => {
    if (plateRegisteredInApp) {
      showAlert(
        'Patente ya registrada',
        'Este vehículo ya está en Mecanimovil. Inicia sesión para acceder a tu garaje o contacta soporte si crees que es un error.',
      );
      return;
    }
    const prefill = mapPublicDataToPrefill(vehicleData, normalizedPatente);
    await savePendingGuestIntent({ patente: normalizedPatente, vehicleData: prefill });
    navigation.navigate(ROUTES.REGISTER);
  }, [navigation, normalizedPatente, vehicleData, plateRegisteredInApp]);

  const handleProviderPress = useCallback(
    (item) => {
      setSearchFocused(false);
      const type = item._panelKind === 'mecanico' ? 'mecanico' : 'taller';
      navigation.navigate(ROUTES.PROVIDER_DETAIL, { type, id: item.id });
    },
    [navigation],
  );

  const handleServicePress = useCallback(
    (offer) => {
      navigateToServiceOffer(offer);
    },
    [navigateToServiceOffer],
  );

  const handleScheduleRegister = useCallback(async () => {
    if (!pendingScheduleOffer) return;
    if (plateRegisteredInApp) {
      showAlert(
        'Patente ya registrada',
        'Este vehículo ya está en Mecanimovil. Inicia sesión para agendar con tu cuenta.',
      );
      setScheduleGateVisible(false);
      return;
    }
    const prefill = mapPublicDataToPrefill(vehicleData, normalizedPatente);
    await savePendingGuestScheduleIntent({
      patente: normalizedPatente || undefined,
      vehicleData: prefill || undefined,
      provider: pendingScheduleOffer.provider,
      providerType: pendingScheduleOffer.providerType,
      servicio: pendingScheduleOffer.servicio,
      ofertaServicioId: pendingScheduleOffer.oferta_id,
    });
    setScheduleGateVisible(false);
    navigation.navigate(ROUTES.REGISTER);
  }, [navigation, normalizedPatente, pendingScheduleOffer, vehicleData, plateRegisteredInApp]);

  const handleScheduleLogin = useCallback(async () => {
    if (pendingScheduleOffer) {
      const prefill = mapPublicDataToPrefill(vehicleData, normalizedPatente);
      await savePendingGuestScheduleIntent({
        patente: normalizedPatente || undefined,
        vehicleData: prefill || undefined,
        provider: pendingScheduleOffer.provider,
        providerType: pendingScheduleOffer.providerType,
        servicio: pendingScheduleOffer.servicio,
        ofertaServicioId: pendingScheduleOffer.oferta_id,
      });
    }
    setScheduleGateVisible(false);
    navigation.navigate(ROUTES.LOGIN);
  }, [navigation, normalizedPatente, pendingScheduleOffer, vehicleData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadBrowseProviders(),
      hasVehicleResults ? loadMarcaProviders() : Promise.resolve(),
      getServiciosMasSolicitados(12).then((list) => setPopularServices(list || [])),
    ]);
    if (appliedSearchQuery.trim()) {
      const results = await buscarServiciosPublico(appliedSearchQuery);
      setSearchServiceResults(results);
    }
    setRefreshing(false);
  }, [loadBrowseProviders, loadMarcaProviders, hasVehicleResults, appliedSearchQuery]);

  const addressLabel = selectedAddress?.direccion
    ? selectedAddress.direccion
    : 'Agrega tu dirección para ver talleres cercanos';

  const providersLoading = loadingBrowse && !hasLoadedBrowseOnce;
  const showFooter = hasVehicleResults;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <GuestGradientButton
          title="Iniciar sesión"
          size="compact"
          onPress={handleLoginWithIntent}
          style={styles.loginBtn}
          accessibilityLabel="Iniciar sesión"
        />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (showFooter ? 130 : 32) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
        }
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroBadge}>
            <Sparkles size={13} color={COLORS.primary[600]} strokeWidth={2.25} />
            <Text style={styles.heroBadgeText}>Explora sin registrarte</Text>
          </View>
          <Text style={styles.heroTitle}>¿Qué necesita tu auto?</Text>
          <Text style={styles.heroSubtitle}>
            Descubre talleres verificados, servicios y valor estimado — sin registrarte.
          </Text>

          <View style={styles.searchBlock}>
            <GuestSearchBar
              patente={patente}
              onPatenteChange={handlePatenteChange}
              searchText={searchText}
              onSearchTextChange={setSearchText}
              onPatenteSubmit={handlePatenteSubmit}
              onSearchTextSubmit={handleSearchTextSubmit}
              onSearchFocus={() => setSearchFocused(true)}
              onSearchBlur={() => {
                // Delay so suggestion taps register before panel closes
                setTimeout(() => setSearchFocused(false), 180);
              }}
              patenteLoading={patenteLoading}
              searchLoading={suggestLoading}
              patenteDisabled={normalizedPatente.length < 6}
            />

            <GuestSearchSuggestions
              visible={showSuggestions}
              loading={suggestLoading}
              query={searchText.trim()}
              serviceOffers={suggestServices}
              providers={suggestProviders}
              onSelectService={navigateToServiceOffer}
              onSelectProvider={handleProviderPress}
              onSeeAllResults={handleSearchTextSubmit}
            />
          </View>
          <TouchableOpacity
            style={styles.addressPill}
            onPress={() => setAddressModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Cambiar dirección de servicio"
          >
            <MapPin size={15} color={COLORS.primary[500]} strokeWidth={2.25} />
            <Text style={styles.addressText} numberOfLines={1}>
              {addressLabel}
            </Text>
            <ChevronDown size={15} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          {hasVehicleResults ? (
            <View style={styles.compactSearchBar}>
              <View style={styles.compactPatenteChip}>
                <Car size={14} color={COLORS.primary[600]} />
                <Text style={styles.compactPatenteText}>{normalizedPatente}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={handleResetPatente}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Buscar otra patente"
              >
                <RotateCcw size={13} color={COLORS.primary[600]} strokeWidth={2.25} />
                <Text style={styles.changeBtnText}>Buscar otra patente</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.trustRow}>
            <TrustPill icon={Sparkles} label="Consulta gratis" />
            <TrustPill icon={ShieldCheck} label="Talleres verificados" />
          </View>
        </View>

        {hasVehicleResults ? (
          <View style={styles.vehicleBlock}>
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleIconWrap}>
                <Car size={22} color={COLORS.primary[500]} />
              </View>
              <View style={styles.vehicleTextCol}>
                <Text style={styles.vehicleTitle} numberOfLines={1}>
                  {vehicleData.marca_nombre || '—'} {vehicleData.modelo_nombre || ''}
                </Text>
                <Text style={styles.vehicleSub} numberOfLines={1}>
                  {normalizedPatente}
                  {vehicleData.year ? ` · ${vehicleData.year}` : ''}
                  {vehicleData.color ? ` · ${vehicleData.color}` : ''}
                </Text>
              </View>
            </View>

            {valorLabel ? (
              <View style={styles.valorCard}>
                <View style={styles.valorHeader}>
                  <LinearGradient
                    colors={GRADIENTS.guestCta}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.valorIconWrap}
                  >
                    <TrendingUp size={18} color={COLORS.base.white} strokeWidth={2.25} />
                  </LinearGradient>
                  <View style={styles.valorHeaderText}>
                    <Text style={styles.valorTitle}>Valor estimado de tu auto</Text>
                    <Text style={styles.valorSubtitle}>
                      Rango de mercado según marca, modelo y año detectados en la patente
                    </Text>
                  </View>
                </View>
                <Text style={styles.valorValue}>{valorLabel}</Text>
                <Text style={styles.valorHint}>
                  Es una referencia, no una tasación oficial. Al registrarte puedes seguir su evolución.
                </Text>
              </View>
            ) : null}

            {plateRegisteredInApp ? (
              <View style={styles.registeredAlertBanner}>
                <AlertTriangle size={18} color={COLORS.warning.main} strokeWidth={2.25} />
                <View style={styles.registeredAlertTextCol}>
                  <Text style={styles.registeredAlertTitle}>Patente ya registrada</Text>
                  <Text style={styles.registeredAlertBody}>
                    Este auto ya está en Mecanimovil. Inicia sesión para ver su historial y agendar — no podrás
                    registrarlo de nuevo.
                  </Text>
                </View>
              </View>
            ) : (
            <View style={styles.registerBanner}>
              <View style={styles.bannerRow}>
                <HeartPulse size={17} color={COLORS.primary[500]} />
                <Text style={styles.bannerText}>
                  Regístrate para ver salud del vehículo, historial y agendar con un tap.
                </Text>
              </View>
              <View style={styles.bannerRow}>
                <Gauge size={17} color={COLORS.primary[500]} />
                <Text style={styles.bannerText}>
                  Lleva el control de mantenciones, kilometraje y valor de tu auto.
                </Text>
              </View>
            </View>
            )}
          </View>
        ) : null}

        {!appliedSearchQuery.trim() && popularServiceOffers.length > 0 ? (
          <GuestServicesSection
            title="Servicios más solicitados"
            offers={popularServiceOffers}
            onServicePress={handleServicePress}
          />
        ) : null}

        {appliedSearchQuery.trim() && searchServiceOffers.length > 0 ? (
          <GuestServicesSection
            title={`Servicios para "${appliedSearchQuery}"`}
            offers={searchServiceOffers}
            onServicePress={handleServicePress}
            spacingTop
          />
        ) : null}

        {providersLoading || (loadingMarca && hasVehicleResults) ? (
          <GuestLandingFeedSkeleton />
        ) : allocatedSections.length === 0 ? (
          <Text style={styles.emptyText}>
            {appliedSearchQuery.trim()
              ? 'No encontramos talleres ni servicios para tu búsqueda.'
              : selectedAddress
                ? 'No hay talleres cerca. Prueba otra dirección.'
                : 'No hay talleres disponibles por ahora. Intenta más tarde.'}
          </Text>
        ) : (
          allocatedSections.map((section, idx) => (
            <HomeProvidersCarouselSection
              key={section.key}
              title={section.title}
              providers={previewSectionProviders(section.providers, SECTION_PREVIEW_LIMIT)}
              loading={false}
              onProviderPress={handleProviderPress}
              onSeeAll={() => navigateToSection(section)}
              seeAllWhen={sectionShouldShowSeeAll(section, SECTION_PREVIEW_LIMIT)}
              spacingTop={idx > 0}
              userBrandName={section.brandName || (hasVehicleResults ? marcaNombre : null)}
            />
          ))
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Todo lo que puedes hacer con Mecanimovil</Text>
          <Text style={styles.infoSectionSubtitle}>
            Desde encontrar el taller correcto hasta llevar el control completo de tu auto.
          </Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Cómo funciona</Text>
          <View style={styles.stepsList}>
            {STEPS.map((step, idx) => (
              <StepRow key={step.title} index={idx + 1} isLast={idx === STEPS.length - 1} {...step} />
            ))}
          </View>
        </View>
      </ScrollView>

      {showFooter ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
          {plateRegisteredInApp ? (
            <>
              <GuestGradientButton title="Iniciar sesión" onPress={handleLoginWithIntent} />
              <TouchableOpacity onPress={handleLoginWithIntent} style={styles.footerSecondary}>
                <Text style={styles.footerSecondaryText}>Accede a tu vehículo registrado</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <GuestGradientButton title="Regístrate para agendar" onPress={handleRegister} />
              <TouchableOpacity onPress={handleRegister} style={styles.footerSecondary}>
                <Text style={styles.footerSecondaryText}>Registrar mi auto y llevar el control</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}

      <GuestAddressPicker
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSelectAddress={setSelectedAddress}
        currentAddress={selectedAddress}
      />

      <GuestScheduleGateModal
        visible={scheduleGateVisible}
        servicioNombre={
          pendingScheduleOffer?.servicio?.nombre ||
          pendingScheduleOffer?.servicio?.servicio_nombre ||
          null
        }
        providerNombre={pendingScheduleOffer?.provider?.nombre || null}
        onClose={() => setScheduleGateVisible(false)}
        onRegister={handleScheduleRegister}
        onLogin={handleScheduleLogin}
      />
    </KeyboardAvoidingView>
  );
};

function TrustPill({ icon: IconCmp, label }) {
  return (
    <View style={styles.trustPill}>
      <IconCmp size={14} color={COLORS.primary[600]} />
      <Text style={styles.trustPillText}>{label}</Text>
    </View>
  );
}

function FeatureCard({ icon: IconCmp, title, description }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <IconCmp size={20} color={COLORS.primary[500]} strokeWidth={2.1} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

function StepRow({ index, title, description, isLast }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndicatorCol}>
        <PrimaryGradientFill style={styles.stepCircle}>
          <Text style={styles.stepCircleText}>{index}</Text>
        </PrimaryGradientFill>
        {!isLast ? <View style={styles.stepConnector} /> : null}
      </View>
      <View style={styles.stepTextCol}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  logo: {
    width: 132,
    height: 34,
  },
  loginBtn: {
    flexShrink: 0,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    flexGrow: 1,
  },
  heroWrap: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    overflow: 'visible',
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginBottom: SPACING.md,
  },
  heroBadgeText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
    fontSize: 12,
    letterSpacing: 0.2,
  },
  heroTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
    maxWidth: 520,
  },
  searchBlock: {
    position: 'relative',
    zIndex: 30,
    marginBottom: SPACING.md,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
    minWidth: 0,
    paddingVertical: 2,
  },
  addressText: {
    ...TYPOGRAPHY.styles.captionBold,
    flexShrink: 1,
    color: COLORS.text.primary,
  },
  compactSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  compactPatenteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.base.soft,
    borderRadius: BORDERS.radius.button.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  compactPatenteText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[700],
    letterSpacing: 1.5,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.button.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
    backgroundColor: COLORS.base.soft,
  },
  changeBtnText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  trustPillText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  vehicleBlock: {
    marginBottom: SPACING.md,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  vehicleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  vehicleSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  valorCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.cardElevated,
  },
  valorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  valorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  valorTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  valorSubtitle: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  valorValue: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  valorHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  registerBanner: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  registeredAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.background.warning,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.warning[200],
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  registeredAlertTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  registeredAlertTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.warning.dark,
  },
  registeredAlertBody: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bannerText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  providerSection: {
    marginBottom: SPACING.xl,
  },
  sectionSpaced: {
    marginTop: SPACING.lg,
  },
  sectionMeta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  sectionMetaSpaced: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    marginBottom: SPACING.sm,
  },
  chipsRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxWidth: 200,
  },
  chipActive: {
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  chipText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  chipTextActive: {
    color: COLORS.base.white,
  },
  loader: {
    marginVertical: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  infoSection: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
  },
  infoSectionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  infoSectionSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    maxWidth: 520,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  featureCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  stepsList: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepCircleText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.base.white,
  },
  stepConnector: {
    flex: 1,
    minHeight: 28,
    width: 2,
    backgroundColor: COLORS.primary[100],
    marginVertical: 4,
  },
  stepTextCol: {
    flex: 1,
    paddingBottom: SPACING.lg,
    minWidth: 0,
  },
  stepTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    fontSize: 15,
    marginBottom: 2,
  },
  stepDescription: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 19,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background.default,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    ...SHADOWS.lg,
  },
  footerSecondary: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerSecondaryText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
});

export default GuestLandingScreen;
