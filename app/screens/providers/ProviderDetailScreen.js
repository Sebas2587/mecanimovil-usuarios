import React, { useLayoutEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
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
  Camera,
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

import ProviderHeader from '../../components/provider/ProviderHeader';
import ProviderAboutSection from '../../components/provider/ProviderAboutSection';
import ProviderVehicleCoverageSection from '../../components/provider/ProviderVehicleCoverageSection';
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
import ServicioTarifasPorMarca, { tarifasMuestranDesglose } from '../../components/provider/ServicioTarifasPorMarca';
import {
  isProviderMultimarca,
  mergeProviderKpiBadge,
  resolveToAbsoluteMediaUrl,
  buildProviderAvatarUri,
} from '../../utils/providerUtils';
import { goBackFromProviderProfile } from '../../utils/navigationBack';
import { useFavorites } from '../../context/FavoritesContext';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS, withOpacity } from '../../design-system/tokens';
import { providerServiceCardStyles as svcCard, chunkCatalogServiceRows } from '../../components/provider/providerServiceCardStyles';
import SectionHeader from '../../components/base/SectionHeader/SectionHeader';
import StickyFooterCTA from '../../components/base/StickyFooterCTA/StickyFooterCTA';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import { formatProviderStreetAddress } from '../../utils/formatProviderStreetAddress';
import HeroImageGradientScrim from '../../components/vehicles/HeroImageGradientScrim';
import { shareProviderProfile } from '../../utils/shareProviderProfile';

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
        <BackButton onPress={onBack} color={COLORS.text.inverse} style={heroStyles.iconButton} />

        <View style={heroStyles.rightActions}>
          {onShare ? (
            <TouchableOpacity
              style={heroStyles.iconButton}
              onPress={onShare}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Compartir perfil"
            >
              <Share2 size={18} color={COLORS.text.inverse} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
          {onToggleFavorite ? (
            <TouchableOpacity
              style={heroStyles.iconButton}
              onPress={onToggleFavorite}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart
                size={18}
                color={isFavorite ? COLORS.brand.magenta : COLORS.text.inverse}
                fill={isFavorite ? COLORS.brand.magenta : 'transparent'}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(COLORS.base.inkBlack, 0.35),
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
  const hasTrustDocuments = (documents?.length ?? 0) > 0;
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
      const abs = resolveToAbsoluteMediaUrl(uri);
      if (abs && !urls.includes(abs)) urls.push(abs);
    };
    // Solo fotos del taller/proveedor (portada, portafolio, perfil).
    // Nunca fotos de configuración de servicios de Django (`servicio.foto` / fotos_servicio).
    push(provider?.foto_portada_url || provider?.foto_portada);
    (provider?.portafolio || []).forEach((item) => {
      push(
        item?.imagen_url
          || item?.image
          || item?.url
          || item?.foto
          || item?.imagen,
      );
    });
    push(buildProviderAvatarUri(provider));
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

  const firstSchedulableService = useMemo(
    () => serviciosVisibles.find((s) => resolveServicioId(s)),
    [serviciosVisibles],
  );

  /** Solo invitados: usuarios logueados agendan desde las cards del catálogo. */
  const showStickyCta = Boolean(
    !user && vehicleForSchedule?.id && firstSchedulableService,
  );

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

  const handleStickyCta = useCallback(() => {
    if (firstSchedulableService) {
      handleScheduleService(firstSchedulableService);
    }
  }, [firstSchedulableService, handleScheduleService]);

  const handleShare = async () => {
    if (!idToLoad) return;
    await shareProviderProfile(provider, providerType, idToLoad);
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

        <ProviderAboutSection
          description={provider?.descripcion}
          providerType={providerType === 'taller' ? 'taller' : 'mecanico'}
        />

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

          const display =
            formatProviderStreetAddress(provider, { variant: 'full' }) ||
            'Este taller aún no ha publicado su dirección.';

          return (
            <View style={styles.section}>
              <SectionHeader
                title="Dirección del Taller"
              />
              <Card variant="outlined">
                <View style={[styles.iconRow, styles.addressRow]}>
                  <MapPin size={18} color={COLORS.icon.active} strokeWidth={2} />
                  <Text style={[TYPOGRAPHY.styles.body, styles.bodyText]}>{display}</Text>
                </View>
              </Card>
            </View>
          );
        })()}

        <Divider />

        <ProviderVehicleCoverageSection
          provider={provider}
          servicios={provider?.servicios || serviciosVisibles}
        />

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

        {hasTrustDocuments ? (
          <>
            <Divider />
            <TrustSection documents={documents} />
          </>
        ) : null}

        {(provider.servicios?.length > 0 || serviciosVisibles.length > 0) && (
          <>
            <Divider />
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
                {chunkCatalogServiceRows(serviciosVisibles).map((row, rowIdx) => (
                  <View key={`svc-row-${rowIdx}`} style={svcCard.servicesRow}>
                    {row.map((servicio, colIdx) => {
                      const idx = rowIdx * 2 + colIdx;
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
                      const footerContent = [];
                      if (tarifasMuestranDesglose(tarifasUsuario)) {
                        footerContent.push(
                          <ServicioTarifasPorMarca
                            key="tarifas"
                            tarifas={tarifasUsuario}
                            soloSiVarias
                          />,
                        );
                      }
                      if (servicio.duracion_estimada) {
                        footerContent.push(
                          <Text key="duracion" style={svcCard.serviceMeta}>
                            ~{servicio.duracion_estimada}
                          </Text>,
                        );
                      }

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
                          footer={footerContent.length > 0 ? footerContent : null}
                        />
                      );
                    })}
                    {row.length === 1 ? <View style={svcCard.serviceCardSpacer} /> : null}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <ProviderCompletedJobsSection jobs={completedJobs} />
        <PortfolioCarousel portfolio={provider.portafolio || []} />
      </ScrollView>

      {showStickyCta ? (
        <StickyFooterCTA style={styles.footerBar}>
          <GuestGradientButton
            title="Agendar servicio"
            onPress={handleStickyCta}
            fullWidth
            accessibilityLabel="Agendar servicio con este proveedor"
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
    color: COLORS.buttonSecondary.outlineText,
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
  addressRow: {
    alignItems: 'flex-start',
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
    backgroundColor: COLORS.neutral.gray[50],
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  multimarcaBadgeTitle: {
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  multimarcaBadgeSub: {
    color: COLORS.text.secondary,
  },
  tagBadgeEspecialista: {
    backgroundColor: COLORS.badge.especialista.background,
    borderColor: COLORS.badge.especialista.border,
  },
  tagTextEspecialista: {
    color: COLORS.badge.especialista.text,
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
