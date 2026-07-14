import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MapPin, Globe, Star, Smartphone, Apple, Play } from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
import { getAppStoreUrl, getPlayStoreUrl } from '../../config/publicListing';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import ProviderCatalogServiceCard from '../../components/provider/ProviderCatalogServiceCard';
import ProviderScheduleSection from '../../components/provider/ProviderScheduleSection';
import ProviderTeamSection from '../../components/provider/ProviderTeamSection';
import Button from '../../components/base/Button/Button';
import SectionHeader from '../../components/base/SectionHeader/SectionHeader';

import { fetchPublicProviderFicha, getProviderReviews } from '../../services/providers';
import {
  getPublicProviderFromWebPath,
  normalizeProviderRouteParams,
  parsePublicProviderFromUrl,
} from '../../utils/publicListingRoute';

import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { providerServiceCardStyles as svcCard } from '../../components/provider/providerServiceCardStyles';
import {
  formatPrecioCatalogoServicio,
  labelTipoServicioCatalogo,
} from '../../components/home/shared/providerCatalogSchedule';
import { filtrarServiciosCatalogoPerfilProveedor } from '../../utils/servicioVehiculoCompat';
import { labelPrecioServicioResuelto } from '../../utils/ofertaResolucionMarca';
import { isProviderMultimarca } from '../../utils/providerUtils';
import { goBackFromProviderProfile } from '../../utils/navigationBack';
import { useProviderTeam } from '../../hooks/useProviders';
import { shareProviderProfile } from '../../utils/shareProviderProfile';
import { formatProviderStreetAddress } from '../../utils/formatProviderStreetAddress';

const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

/** Divisor hairline entre secciones — patrón Airbnb. */
const Divider = () => <View style={styles.divider} />;

const PublicProviderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const params = route.params || {};
  const normalizedFromRoute = useMemo(
    () => normalizeProviderRouteParams(params),
    [params.id, params.providerId, params.type, params.providerType]
  );

  const [fromLink, setFromLink] = useState(null);

  const webFromLocation = Platform.OS === 'web' ? getPublicProviderFromWebPath() : null;

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

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (normalizedFromRoute.providerId != null) {
      setFromLink(null);
      return undefined;
    }
    let alive = true;
    const apply = (url) => {
      const parsed = url ? parsePublicProviderFromUrl(url) : null;
      if (parsed && alive) {
        setFromLink({ providerType: parsed.type, providerId: parsed.id });
      }
    };
    Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener('url', (e) => apply(e?.url));
    return () => {
      alive = false;
      sub.remove();
    };
  }, [normalizedFromRoute.providerId]);

  const providerId =
    webFromLocation?.providerId ??
    normalizedFromRoute.providerId ??
    fromLink?.providerId ??
    null;
  const providerType =
    webFromLocation?.providerType ??
    (normalizedFromRoute.providerId != null ? normalizedFromRoute.providerType : null) ??
    fromLink?.providerType ??
    'taller';

  const [details, setDetails] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(async () => {
    if (providerId == null || providerId === '' || !providerType) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [ficha, reviewsRes] = await Promise.all([
        fetchPublicProviderFicha(providerId, providerType),
        getProviderReviews(providerId, providerType).catch(() => null),
      ]);
      const { detail, servicios: svc, documents: docs } = ficha;
      setDetails(detail);
      setServicios(Array.isArray(svc) ? svc : []);
      setDocuments(Array.isArray(docs) ? docs : []);
      setReviewsSummary(reviewsRes && typeof reviewsRes === 'object' ? reviewsRes : null);
    } catch (e) {
      setLoadError('No se pudo cargar esta ficha. Revisa tu conexión o el enlace.');
      setDetails(null);
      setServicios([]);
      setDocuments([]);
      setReviewsSummary(null);
    } finally {
      setLoading(false);
    }
  }, [providerId, providerType]);

  useEffect(() => {
    reload();
  }, [reload]);

  const { data: equipoPublico = [] } = useProviderTeam(
    providerType === 'taller' ? providerId : null,
  );
  const tieneEquipoPublico = providerType === 'taller' && equipoPublico.length > 0;

  const handleShare = useCallback(async () => {
    if (providerId == null || providerId === '' || !providerType || !details) return;
    await shareProviderProfile(details, providerType, providerId);
  }, [providerId, providerType, details]);

  const completedJobs = [];
  const provider = useMemo(() => {
    const base = { ...details, servicios };
    const totalRev = Number(reviewsSummary?.total_reviews ?? 0);
    const avg = reviewsSummary?.rating_average;
    if (totalRev > 0 && avg != null && Number.isFinite(Number(avg))) {
      return {
        ...base,
        calificacion_promedio: Number(avg),
        numero_de_calificaciones: totalRev,
      };
    }
    return base;
  }, [details, servicios, reviewsSummary]);

  const esMultimarcaProveedor = useMemo(() => isProviderMultimarca(provider), [provider]);

  const serviciosVisibles = useMemo(
    () =>
      filtrarServiciosCatalogoPerfilProveedor(provider?.servicios || [], {
        provider,
        vehicle: null,
      }),
    [provider, provider?.servicios],
  );

  const handleBack = useCallback(() => {
    goBackFromProviderProfile(navigation, { fallbackRoute: ROUTES.LOGIN });
  }, [navigation]);

  if (providerId == null || providerId === '' || !providerType) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>Enlace de perfil no válido o incompleto.</Text>
        <Button
          title="Ir a iniciar sesión"
          type="primary"
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          style={styles.fallbackPrimaryButton}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.bodyTextCenter}>Cargando información del especialista...</Text>
      </View>
    );
  }

  if (loadError || !details) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>
          {loadError ||
            'No se pudo cargar la ficha del especialista. Comprueba tu conexión e inténtalo de nuevo.'}
        </Text>
        <Button
          title="Reintentar"
          type="primary"
          onPress={() => reload()}
          style={styles.fallbackPrimaryButton}
        />
        <Button
          title="Iniciar sesión"
          type="primary"
          variant="text"
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          style={styles.fallbackLinkButton}
        />
      </View>
    );
  }

  const profileBody = (
    <>
      <ProviderHeader
        provider={provider}
        providerType={providerType}
        useWeeklyAvailabilityBadge
        weeklyHorarios={provider?.horarios_semanales}
        showBackButton
        onBack={handleBack}
        onShare={handleShare}
      />

      <View style={styles.bannerWrap}>
        <View style={styles.downloadBanner}>
          <View style={styles.downloadBannerTitleRow}>
            <Smartphone size={20} color={COLORS.primary[500]} strokeWidth={2} />
            <Text style={styles.downloadBannerTitle}>Consigue MecaniMóvil</Text>
          </View>
          <Text style={styles.downloadBannerSub}>
            Descarga la app para solicitar servicios, chatear con el especialista y agendar.
          </Text>
          <View style={styles.downloadBannerActions}>
            <Button
              title="App Store"
              type="primary"
              size="sm"
              iconNode={<Apple size={18} color={COLORS.text.onPrimary} strokeWidth={2} />}
              onPress={() => Linking.openURL(getAppStoreUrl()).catch(() => {})}
              style={styles.downloadBannerBtn}
            />
            <Button
              title="Google Play"
              type="secondary"
              size="sm"
              iconNode={<Play size={18} color={COLORS.text.primary} strokeWidth={2} />}
              onPress={() => Linking.openURL(getPlayStoreUrl()).catch(() => {})}
              style={styles.downloadBannerBtn}
            />
          </View>
        </View>
      </View>

      <Divider />

      {/* Cobertura / Dirección */}
      {(() => {
        const isTaller = providerType === 'taller';

        if (!isTaller) {
          const zonasComunas = provider?.zonas_servicio
            ? provider.zonas_servicio.flatMap((z) => z.comunas || [])
            : [];
          const comunasRaw =
            zonasComunas.length > 0
              ? zonasComunas
              : provider.comunas_cobertura_nombres ||
                provider.comunas_cobertura?.map((c) => c?.nombre || c) ||
                [];
          const comunas = Array.isArray(comunasRaw) ? comunasRaw.filter(Boolean) : [];

          return (
            <View style={styles.section}>
              <SectionHeader
                title="Comunas de cobertura"
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
                <Card>
                  <Text style={styles.bodyMutedText}>Cobertura no disponible.</Text>
                </Card>
              )}
            </View>
          );
        }

        const display =
          formatProviderStreetAddress(provider) ||
          'Este taller aún no ha publicado su dirección.';

        return (
          <View style={styles.section}>
            <SectionHeader
              title="Dirección del taller"
              icon={<MapPin size={18} color={COLORS.primary[500]} strokeWidth={2} />}
            />
            <Card>
              <View style={styles.iconRow}>
                <MapPin size={18} color={COLORS.primary[500]} strokeWidth={2} />
                <Text style={styles.bodyText}>{display}</Text>
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
              title={esMultimarca ? 'Cobertura de marcas' : 'Especialidad en marcas'}
              icon={<Globe size={18} color={COLORS.primary[500]} strokeWidth={2} />}
            />

            {esMultimarca ? (
              <View style={styles.multimarcaBadge}>
                <View style={styles.multimarcaBadgeIconWrap}>
                  <Globe size={22} color={COLORS.primary[500]} strokeWidth={2} />
                </View>
                <View style={styles.multimarcaBadgeText}>
                  <Text style={styles.multimarcaBadgeTitle}>Proveedor multimarca</Text>
                  <Text style={styles.multimarcaBadgeSub}>Atiende vehículos de cualquier marca</Text>
                </View>
              </View>
            ) : (
              <View style={styles.tagsRow}>
                {(provider.marcas_atendidas_nombres || []).map((brand, i) => (
                  <View key={i} style={[styles.tagBadge, styles.tagBadgeSpecialista]}>
                    <Star
                      size={12}
                      color={COLORS.primary[600]}
                      fill={COLORS.primary[500]}
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
        <ProviderScheduleSection horarios={details?.horarios_semanales || []} />
      )}

      <Divider />

      <TrustSection documents={documents || []} />

      <Divider />

      {serviciosVisibles.length > 0 ? (
        <View style={[styles.section, styles.sectionLast]}>
          <SectionHeader title="Servicios" />
          {esMultimarcaProveedor ? (
            <Text style={styles.sectionHint}>
              Precios orientativos. Inicia sesión para agendar según tu vehículo.
            </Text>
          ) : (
            <Text style={styles.sectionHint}>
              Servicios activos. Inicia sesión para solicitar presupuesto.
            </Text>
          )}
          <View style={svcCard.servicesGrid}>
            {serviciosVisibles.map((servicio, idx) => {
              const precioInfo = labelPrecioServicioResuelto(servicio, { vehicle: null });
              const precioLabel =
                precioInfo.principal ?? formatPrecioCatalogoServicio(servicio);
              return (
                <ProviderCatalogServiceCard
                  key={`${servicio.oferta_id || servicio.id || idx}-${servicio.tipo_servicio || 'o'}`}
                  servicio={servicio}
                  tipoLabel={labelTipoServicioCatalogo(servicio)}
                  precioLabel={precioLabel}
                  precioSubtitulo={precioInfo.subtitulo}
                  imageHeight={110}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <ProviderCompletedJobsSection jobs={completedJobs} />
      <PortfolioCarousel portfolio={provider.portafolio || []} />

      <View style={[styles.section, styles.ctaSection]}>
        <Card style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>¿Necesitas un servicio?</Text>
          <Text style={styles.ctaText}>
            Inicia sesión para pedir presupuestos, chatear y agendar con este especialista.
          </Text>
          <Button
            title="Iniciar sesión"
            type="primary"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
          />
        </Card>
      </View>
    </>
  );

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.containerWebFlow]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      {Platform.OS === 'web' ? (
        <View style={styles.scrollContent}>{profileBody}</View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {profileBody}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  containerWebFlow: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    minHeight: '100%',
    alignSelf: 'stretch',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  bannerWrap: {
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.md,
  },
  downloadBanner: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  downloadBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  downloadBannerTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  downloadBannerSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  downloadBannerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  downloadBannerBtn: {
    flex: 1,
    minWidth: 142,
    maxWidth: Platform.OS === 'web' ? 220 : 200,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginHorizontal: SPACING.container.horizontal,
    marginVertical: SPACING.lg,
  },
  section: {
    paddingHorizontal: SPACING.container.horizontal,
  },
  sectionLast: {
    marginBottom: SPACING.lg,
  },
  ctaSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  bodyText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bodyMutedText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multimarcaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
  },
  multimarcaBadgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  multimarcaBadgeText: {
    flex: 1,
    minWidth: 0,
  },
  multimarcaBadgeTitle: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.primary[700],
  },
  multimarcaBadgeSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary[600],
    marginTop: 2,
  },
  tagBadgeSpecialista: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[100],
  },
  tagTextEspecialista: {
    color: COLORS.primary[700],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  tagText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  ctaCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  ctaText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  fallbackPrimaryButton: {
    marginTop: SPACING.lg,
    width: '85%',
    maxWidth: 320,
  },
  fallbackLinkButton: {
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  bodyTextCenter: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default PublicProviderDetailScreen;
