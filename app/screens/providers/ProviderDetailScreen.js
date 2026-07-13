import React, { useLayoutEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Share,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Share2,
  Heart,
  MessageCircle,
  MapPin,
  Globe,
  Star,
  Camera,
  Building2,
  Wrench,
} from 'lucide-react-native';

import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '../../utils/constants';
import BackButton from '../../components/navigation/BackButton';
import { getUserVehicles } from '../../services/vehicle';
import { navigateCrearSolicitudConProveedorYServicio } from '../../components/home/shared/homeScheduleNavigation';
import {
  formatPrecioCatalogoServicio,
  labelTipoServicioCatalogo,
  resolveServicioId,
} from '../../components/home/shared/providerCatalogSchedule';
import { buildPublicProviderUrl, buildDeepLinkProviderUrl } from '../../config/publicListing';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import ProviderCatalogServiceCard from '../../components/provider/ProviderCatalogServiceCard';
import ProviderScheduleSection from '../../components/provider/ProviderScheduleSection';
import ProviderTeamSection from '../../components/provider/ProviderTeamSection';
import ReviewCard from '../../components/reviews/ReviewCard';

import {
  useProviderDetails,
  useProviderServices,
  useProviderWeeklySchedule,
  useProviderTeam,
  useProviderDocuments,
  useProviderReviews,
  useProviderCompletedJobs,
} from '../../hooks/useProviders';
import { getPublicProviderFromWebPath } from '../../utils/publicListingRoute';
import { filtrarServiciosCatalogoPerfilProveedor } from '../../utils/servicioVehiculoCompat';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import { resolveVehiclePanelSeleccionado } from '../../utils/vehiclePanelContext';
import { useAuth } from '../../context/AuthContext';
import ServicioTarifasPorMarca from '../../components/provider/ServicioTarifasPorMarca';
import { isProviderMultimarca, mergeProviderKpiBadge } from '../../utils/providerUtils';
import { goBackFromProviderProfile } from '../../utils/navigationBack';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS, withOpacity } from '../../design-system/tokens';
import { providerServiceCardStyles as svcCard } from '../../components/provider/providerServiceCardStyles';
import SectionHeader from '../../components/base/SectionHeader/SectionHeader';
import StickyFooterCTA from '../../components/base/StickyFooterCTA/StickyFooterCTA';
import Button from '../../components/base/Button/Button';
import HeroImageGradientScrim from '../../components/vehicles/HeroImageGradientScrim';

const SCREEN_W = Dimensions.get('window').width;
const HERO_HEIGHT = 220;

const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

/** Divisor hairline entre secciones — patrón Airbnb. */
const Divider = () => <View style={styles.divider} />;

const ProviderHeroGallery = ({
  images,
  onBack,
  onShare,
  onToggleFavorite,
  isFavorite,
}) => {
  const insets = useSafeAreaInsets();
  const carouselRef = useRef(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const handleCarouselScroll = useCallback((event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    setCarouselIndex(index);
  }, []);

  return (
    <View style={heroStyles.wrap}>
      <FlatList
        ref={carouselRef}
        data={images}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleCarouselScroll}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        renderItem={({ item: uri }) => (
          <Image
            source={{ uri }}
            style={{ width: SCREEN_W, height: HERO_HEIGHT }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
      />

      <HeroImageGradientScrim intensity="default" />

      {images.length > 1 ? (
        <View style={heroStyles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[heroStyles.dot, i === carouselIndex && heroStyles.dotActive]}
            />
          ))}
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={heroStyles.photoPill}>
          <Camera size={12} color={COLORS.text.inverse} strokeWidth={2} />
          <Text style={heroStyles.photoPillText}>
            {carouselIndex + 1}/{images.length}
          </Text>
        </View>
      ) : null}

      <View style={[heroStyles.topBar, { paddingTop: insets.top + SPACING.xs }]}>
        <BackButton onPress={onBack} />

        <View style={heroStyles.rightActions}>
          {onShare ? (
            <TouchableOpacity style={heroStyles.iconButton} onPress={onShare} activeOpacity={0.85}>
              <Share2 size={20} color={COLORS.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
          {onToggleFavorite ? (
            <TouchableOpacity
              style={heroStyles.iconButton}
              onPress={onToggleFavorite}
              activeOpacity={0.85}
            >
              <Heart
                size={20}
                color={isFavorite ? COLORS.error.main : COLORS.text.primary}
                fill={isFavorite ? COLORS.error.main : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const heroStyles = StyleSheet.create({
  wrap: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.neutral.gray[200],
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.xs,
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  dots: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: withOpacity(COLORS.text.inverse, 0.45),
  },
  dotActive: {
    backgroundColor: COLORS.text.inverse,
    width: 18,
  },
  photoPill: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.container.horizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.55),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.full,
    zIndex: 5,
  },
  photoPillText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

const ProviderDetailScreen = () => {
  const route = useRoute();
  const { user } = useAuth();
  const { data: vehiclesQuery = [] } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: getUserVehicles,
    staleTime: 1000 * 60 * 5,
  });

  const userVehicles = useMemo(() => {
    if (Array.isArray(vehiclesQuery)) return vehiclesQuery;
    return vehiclesQuery?.results || [];
  }, [vehiclesQuery]);

  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const servicesSectionY = useRef(0);
  const params = route.params || {};
  const {
    provider: initialProvider,
    providerId,
    id: paramId,
    type,
    providerType: paramProviderType,
    vehicle: vehicleFromRoute,
  } = params;

  const webParsed = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;
  const idToLoad = providerId ?? paramId ?? initialProvider?.id ?? webParsed?.providerId;
  const providerType =
    type ||
    paramProviderType ||
    webParsed?.providerType ||
    (initialProvider?.tipo === 'taller' ? 'taller' : 'mecanico');

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = getPublicProviderFromWebPath();
    if (!w) return;
    const pid = params.id ?? params.providerId;
    const ptype = params.type ?? params.providerType;
    const sameId = Number(pid) === w.providerId;
    const sameType =
      String(ptype || '')
        .toLowerCase()
        .replace('proveedor', 'taller') === w.providerType;
    if (sameId && sameType) return;
    navigation.setParams({ type: w.providerType, id: w.providerId });
  }, [navigation, params.id, params.providerId, params.type, params.providerType]);

  const queryClient = useQueryClient();

  // Invalida el query de servicios (fotos) cada vez que la pantalla recibe foco.
  // Esto cubre tanto mount/unmount del stack como regreso desde otra pantalla.
  useFocusEffect(
    useCallback(() => {
      if (idToLoad && providerType) {
        queryClient.invalidateQueries({ queryKey: ['providerServices', providerType, idToLoad] });
      }
    }, [queryClient, idToLoad, providerType])
  );

  const userVehiclesActivos = useMemo(
    () => userVehicles.filter((v) => v?.id && v.is_active !== false),
    [userVehicles],
  );

  const panelSelectedVehicleId = user?.id
    ? queryClient.getQueryData(['panelSelectedVehicleId', user.id])
    : null;

  const vehicleForSchedule = useMemo(
    () =>
      resolveVehiclePanelSeleccionado({
        vehicleFromRoute,
        vehicles: userVehiclesActivos,
        panelSelectedVehicleId,
      }),
    [vehicleFromRoute, userVehiclesActivos, panelSelectedVehicleId],
  );

  const { data: details, isLoading: loadingDetails } = useProviderDetails(idToLoad, providerType);
  const { data: services } = useProviderServices(
    idToLoad,
    providerType,
    null,
    vehicleForSchedule,
  );
  const { data: schedule } = useProviderWeeklySchedule(idToLoad, providerType);
  const { data: equipoPublico = [] } = useProviderTeam(
    providerType === 'taller' ? idToLoad : null,
  );
  const tieneEquipoPublico = providerType === 'taller' && equipoPublico.length > 0;
  const { data: documents } = useProviderDocuments(idToLoad, providerType);
  const { data: reviewsData } = useProviderReviews(idToLoad, providerType);
  const { data: completedJobs = [] } = useProviderCompletedJobs(idToLoad, providerType);

  const provider = useMemo(() => {
    const kpi_badge = mergeProviderKpiBadge(
      initialProvider?.kpi_badge,
      details?.kpi_badge,
    );
    const base = {
      ...initialProvider,
      ...details,
      kpi_badge,
      servicios: services || initialProvider?.servicios || [],
    };
    const totalRev = Number(reviewsData?.total_reviews ?? 0);
    const avg = reviewsData?.rating_average;
    if (totalRev > 0 && avg != null && Number.isFinite(Number(avg))) {
      return {
        ...base,
        calificacion_promedio: Number(avg),
        numero_de_calificaciones: totalRev,
      };
    }
    return base;
  }, [initialProvider, details, services, reviewsData]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(idToLoad, providerType);
  const handleToggleFavorite = () => toggleFavorite(provider, providerType);

  const esMultimarcaProveedor = useMemo(() => isProviderMultimarca(provider), [provider]);

  const serviciosVisibles = useMemo(() => {
    const todos = provider?.servicios || [];
    return filtrarServiciosCatalogoPerfilProveedor(todos, {
      provider,
      vehicle: vehicleForSchedule,
      vehicles: userVehiclesActivos,
    });
  }, [provider, provider?.servicios, vehicleForSchedule, userVehiclesActivos]);

  const heroImages = useMemo(() => {
    const urls = [];
    const push = (uri) => {
      if (uri && typeof uri === 'string' && !urls.includes(uri)) urls.push(uri);
    };
    push(provider?.foto_portada);
    (provider?.portafolio || []).forEach((item) => {
      push(item?.image || item?.url || item?.foto);
    });
    (provider?.servicios || []).forEach((svc) => {
      push(svc?.foto || svc?.imagen || svc?.foto_servicio);
    });
    // Sin fotos reales del proveedor no se muestra hero (nada de imágenes stock).
    return urls;
  }, [provider]);

  const servicesHint = useMemo(() => {
    if (userVehiclesActivos.length === 0) {
      return 'Registra un vehículo para ver precios de tu marca y agendar con este proveedor.';
    }
    if (userVehiclesActivos.length > 1) {
      return 'Precios según tus vehículos. Al agendar se usa el vehículo seleccionado en el inicio.';
    }
    const marca =
      userVehiclesActivos[0].marca_nombre || userVehiclesActivos[0].marca?.nombre || 'vehículo';
    return `Precio para tu ${marca}. Toca un servicio para agendar.`;
  }, [userVehiclesActivos]);

  const showStickyCta = serviciosVisibles.length > 0;

  const handleStickyCta = useCallback(() => {
    scrollRef.current?.scrollTo({ y: servicesSectionY.current, animated: true });
  }, []);

  const handleScheduleService = useCallback(
    (servicio) => {
      if (!vehicleForSchedule?.id) {
        Alert.alert(
          'Selecciona un vehículo',
          'Elige un vehículo en el inicio de la app para agendar con este proveedor.',
        );
        return;
      }
      if (!resolveServicioId(servicio)) {
        Alert.alert('Servicio no disponible', 'No pudimos identificar este servicio. Intenta de nuevo.');
        return;
      }
      navigateCrearSolicitudConProveedorYServicio(navigation, {
        vehicle: vehicleForSchedule,
        provider,
        providerType,
        servicio,
      });
    },
    [vehicleForSchedule, provider, providerType, navigation],
  );

  const handleShare = async () => {
    if (!idToLoad) return;
    try {
      const webUrl = buildPublicProviderUrl(providerType, idToLoad);
      const deepUrl = buildDeepLinkProviderUrl(providerType, idToLoad);

      const isTaller = providerType === 'taller';
      const titleSpec = isTaller ? 'Taller especializado' : 'Mecánico a domicilio';

      const zonasComunas = provider?.zonas_servicio
        ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
        : [];
      const comunasRaw =
        zonasComunas.length > 0
          ? zonasComunas
          : provider.comunas_cobertura_nombres ||
            provider.comunas_cobertura?.map((c) => c?.nombre || c) ||
            [];
      const comunasArr = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];
      let comunasText = '';
      if (comunasArr.length > 0) {
        comunasText =
          comunasArr.length > 3
            ? `Atiende en ${comunasArr.slice(0, 3).join(', ')} y más comunas.`
            : `Atiende en ${comunasArr.join(', ')}.`;
      } else {
        comunasText = isTaller
          ? provider.comuna
            ? `Atiende en ${provider.comuna}.`
            : ''
          : 'Atiende a domicilio.';
      }

      const marcasArr = provider.marcas_atendidas_nombres || ['Multimarca'];
      const marcasText =
        marcasArr.length > 6 ? `${marcasArr.slice(0, 6).join(', ')}...` : marcasArr.join(', ');

      const messageTexto = `Conoce a ${provider.nombre}, ${titleSpec}.\n${comunasText}\nEspecialista en: ${marcasText}\n\nVer en la web:\n${webUrl}\n\nAbrir en la app:\n${deepUrl}`;

      if (Platform.OS === 'web') {
        await Share.share({ message: messageTexto, title: 'MecaniMóvil', url: webUrl });
      } else {
        await Share.share({ message: messageTexto, url: webUrl });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSeeAllReviews = () => {
    navigation.navigate(ROUTES.PROVIDER_REVIEWS, { providerId: idToLoad, providerType });
  };

  const handleBack = useCallback(() => {
    goBackFromProviderProfile(navigation, { fallbackRoute: ROUTES.HOME });
  }, [navigation]);

  if (idToLoad === undefined || idToLoad === null || idToLoad === '') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>
          No pudimos cargar este perfil. El enlace puede estar incompleto o caducado.
        </Text>
        <Button
          title="Ir al inicio"
          type="primary"
          variant="text"
          onPress={() => navigation.navigate(ROUTES.HOME)}
          style={styles.linkBtn}
        />
      </View>
    );
  }

  if (loadingDetails && !initialProvider) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          showStickyCta && styles.scrollContentWithFooter,
        ]}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      >
        {/* Hero solo con fotos reales del proveedor; si no hay, la pantalla
            abre directo con el bloque de título y los controles van arriba. */}
        {heroImages.length > 0 ? (
          <>
            <ProviderHeroGallery
              images={heroImages}
              onBack={handleBack}
              onShare={handleShare}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={favorite}
            />
            <ProviderHeader
              provider={provider}
              providerType={providerType}
              useWeeklyAvailabilityBadge
              weeklyHorarios={schedule}
              showBackButton={false}
            />
          </>
        ) : (
          <ProviderHeader
            provider={provider}
            providerType={providerType}
            useWeeklyAvailabilityBadge
            weeklyHorarios={schedule}
            showBackButton
            onBack={handleBack}
            onShare={handleShare}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={favorite}
          />
        )}

        <Divider />

        {/* Cobertura / Dirección */}
        {(() => {
          const resolvedType =
            providerType || (provider?.tipo === 'taller' ? 'taller' : 'mecanico');
          const isTaller = resolvedType === 'taller';

          if (!isTaller) {
            const zonasComunas = provider?.zonas_servicio
              ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
              : [];
            const comunasRaw =
              zonasComunas.length > 0
                ? zonasComunas
                : provider.comunas_cobertura_nombres ||
                  provider.comunas_cobertura?.map((c) => c?.nombre || c) ||
                  provider.comunas_nombres ||
                  provider.comunas ||
                  provider.cobertura_comunas ||
                  [];
            const comunas = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];

            return (
              <View style={styles.section}>
                <SectionHeader
                  title="Comunas de Cobertura"
                  icon={<MapPin size={18} color={COLORS.primary[500]} strokeWidth={2} />}
                />
                {comunas.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {comunas.map((c, i) => (
                      <View key={`${c}-${i}`} style={styles.tagBadge}>
                        <MapPin size={12} color={COLORS.text.secondary} strokeWidth={2} />
                        <Text style={styles.tagText}>{String(c)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Card variant="outlined">
                    <Text style={[TYPOGRAPHY.styles.body, styles.bodyMutedText]}>
                      Cobertura no disponible.
                    </Text>
                  </Card>
                )}
              </View>
            );
          }

          const addr =
            provider.direccion_fisica?.direccion_completa ||
            provider.direccion_fisica?.direccion ||
            [provider.direccion_fisica?.calle, provider.direccion_fisica?.numero]
              .filter(Boolean)
              .join(' ') ||
            provider.direccion_taller ||
            provider.direccion ||
            null;
          const comuna = provider.direccion_fisica?.comuna || provider.comuna || '';
          // Si `direccion` ya trae comuna/ciudad completos, no duplicar
          const addrAlreadyHasComuna =
            comuna &&
            addr &&
            String(addr).toLowerCase().includes(String(comuna).toLowerCase());
          const display = addrAlreadyHasComuna
            ? addr
            : [addr, comuna].filter(Boolean).join(', ') || 'Dirección no disponible.';

          return (
            <View style={styles.section}>
              <SectionHeader
                title="Dirección del Taller"
                icon={<Building2 size={18} color={COLORS.primary[500]} strokeWidth={2} />}
              />
              <Card variant="outlined">
                <View style={styles.iconRow}>
                  <MapPin size={18} color={COLORS.primary[500]} strokeWidth={2} />
                  <Text style={[TYPOGRAPHY.styles.body, styles.bodyText]}>{display}</Text>
                </View>
              </Card>
            </View>
          );
        })()}

        <Divider />

        {/* Cobertura de marcas */}
        {(() => {
          const tipoCobertura = provider?.tipo_cobertura_marca;
          const esMultimarca = tipoCobertura === 'multimarca'
            || (!tipoCobertura && !(provider.marcas_atendidas_nombres?.length > 0));
          return (
            <View style={styles.section}>
              <SectionHeader
                title={esMultimarca ? 'Cobertura de Marcas' : 'Especialidad en Marcas'}
                icon={<Wrench size={18} color={COLORS.primary[500]} strokeWidth={2} />}
              />
              {esMultimarca ? (
                <View style={styles.multimarcaBadge}>
                  <Globe size={28} color={COLORS.primary[500]} strokeWidth={1.75} />
                  <View>
                    <Text style={[TYPOGRAPHY.styles.h5, styles.multimarcaBadgeTitle]}>
                      Proveedor Multimarca
                    </Text>
                    <Text style={[TYPOGRAPHY.styles.caption, styles.multimarcaBadgeSub]}>
                      Atiende vehículos de cualquier marca
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.tagsRow}>
                  {(provider.marcas_atendidas_nombres || []).map((brand, i) => (
                    <View key={i} style={[styles.tagBadge, styles.tagBadgeEspecialista]}>
                      <Star
                        size={12}
                        color={COLORS.secondary[600]}
                        fill={COLORS.secondary[500]}
                        strokeWidth={2}
                      />
                      <Text style={[styles.tagText, styles.tagTextEspecialista]}>{brand}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        <Divider />

        {tieneEquipoPublico ? (
          <ProviderTeamSection miembros={equipoPublico} />
        ) : (
          <ProviderScheduleSection horarios={schedule || []} />
        )}

        <Divider />

        {/* Reviews */}
        <View style={styles.section}>
          <SectionHeader
            title="Opiniones"
            actionLabel={reviewsData?.reviews?.length > 0 ? 'Ver todas' : undefined}
            onAction={reviewsData?.reviews?.length > 0 ? handleSeeAllReviews : undefined}
          />

          {reviewsData?.reviews?.length > 0 ? (
            <TouchableOpacity onPress={handleSeeAllReviews} activeOpacity={0.9}>
              <ReviewCard review={reviewsData.reviews[0]} />
            </TouchableOpacity>
          ) : (
            <Card variant="outlined">
              <View style={styles.iconRow}>
                <MessageCircle size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                <Text style={[TYPOGRAPHY.styles.body, styles.bodyMutedText]}>
                  Este proveedor aún no ha recibido opiniones.
                </Text>
              </View>
            </Card>
          )}
        </View>

        <Divider />

        <TrustSection documents={documents || []} />

        <Divider />

        {/* SECCIÓN DE SERVICIOS */}
        {(provider.servicios?.length > 0 || serviciosVisibles.length > 0) && (
          <View
            style={[styles.section, styles.sectionLast]}
            onLayout={(e) => {
              servicesSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <SectionHeader title="Servicios Profesionales" hint={servicesHint} />
            {userVehiclesActivos.length === 0 ? (
              <Text style={[TYPOGRAPHY.styles.caption, styles.noVehicleHint]}>
                Agrega un vehículo en tu perfil para ver precios y agendar.
              </Text>
            ) : !vehicleForSchedule?.id ? (
              <Text style={[TYPOGRAPHY.styles.caption, styles.noVehicleHint]}>
                Selecciona un vehículo activo en el inicio para agendar.
              </Text>
            ) : null}
            {serviciosVisibles.length === 0 ? (
              <Text style={[TYPOGRAPHY.styles.caption, styles.noVehicleHint]}>
                {userVehiclesActivos.length > 0
                  ? 'Este proveedor no tiene precio para ninguno de tus vehículos registrados en estos servicios.'
                  : 'Registra un vehículo para ver los servicios disponibles con precios para tu marca.'}
              </Text>
            ) : null}
            <View style={svcCard.servicesGrid}>
              {serviciosVisibles.map((servicio, idx) => {
                const servicioId = resolveServicioId(servicio);
                const canSchedule = !!vehicleForSchedule?.id && !!servicioId;
                const tarifasUsuario = servicio._tarifas_usuario || [];
                const precioInfo = labelPrecioServicioResuelto(servicio, {
                  vehicle: vehicleForSchedule,
                  vehicles: userVehiclesActivos,
                });
                const precioLabel =
                  precioInfo.principal
                  ?? formatPrecioCatalogoServicio(servicio, {
                    vehicle: vehicleForSchedule,
                    vehicles: userVehiclesActivos,
                  });
                const tipoLabel = labelTipoServicioCatalogo(servicio);

                return (
                  <ProviderCatalogServiceCard
                    key={`${servicio.oferta_id || servicioId || idx}-${servicio.tipo_servicio || 'o'}`}
                    servicio={servicio}
                    tipoLabel={tipoLabel}
                    precioLabel={precioLabel}
                    precioSubtitulo={precioInfo.subtitulo}
                    onPress={() => handleScheduleService(servicio)}
                    disabled={!canSchedule}
                    imageHeight={120}
                    footer={(
                      <>
                        {tarifasUsuario.length > 1 ? (
                          <ServicioTarifasPorMarca
                            tarifas={tarifasUsuario}
                            soloSiVarias={false}
                          />
                        ) : null}
                        {servicio.duracion_estimada ? (
                          <Text style={svcCard.serviceMeta}>
                            ~{servicio.duracion_estimada}
                          </Text>
                        ) : null}
                      </>
                    )}
                  />
                );
              })}
            </View>
          </View>
        )}

        <ProviderCompletedJobsSection jobs={completedJobs} />
        <PortfolioCarousel portfolio={provider.portafolio || []} />
      </ScrollView>

      {showStickyCta ? (
        <StickyFooterCTA style={styles.footerBar}>
          <Button
            title="Solicitar servicio"
            type="primary"
            size="lg"
            onPress={handleStickyCta}
            fullWidth
          />
        </StickyFooterCTA>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 0,
        overflow: 'auto',
      },
      default: {},
    }),
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  scrollContentWithFooter: {
    paddingBottom: 120,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginHorizontal: SPACING.container.horizontal,
    marginVertical: SPACING.lg,
  },
  footerBar: {
    backgroundColor: COLORS.background.paper,
  },
  section: {
    paddingHorizontal: SPACING.container.horizontal,
  },
  sectionLast: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  sectionHint: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    marginBottom: 12,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: 16,
    ...SHADOWS.sm,
  },
  bodyText: {
    flex: 1,
    color: COLORS.text.primary,
  },
  bodyMutedText: {
    flex: 1,
    color: COLORS.text.secondary,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
  },
  providerTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  multimarcaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  multimarcaBadgeTitle: {
    color: COLORS.primary[600],
    marginBottom: 2,
  },
  multimarcaBadgeSub: {
    color: COLORS.primary[500],
  },
  tagBadgeEspecialista: {
    backgroundColor: COLORS.secondary[50],
    borderColor: COLORS.secondary[200],
  },
  tagTextEspecialista: {
    color: COLORS.secondary[700],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  tagText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  noVehicleHint: {
    color: COLORS.warning.dark,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: 12,
    lineHeight: 18,
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  linkBtn: {
    marginTop: SPACING.sm,
  },
});

export default ProviderDetailScreen;
