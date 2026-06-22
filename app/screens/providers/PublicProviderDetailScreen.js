import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MapPin } from 'lucide-react-native';

import { ROUTES } from '../../utils/constants';
import { buildPublicProviderUrl, buildDeepLinkProviderUrl } from '../../config/publicListing';

import ProviderHeader from '../../components/provider/ProviderHeader';
import TrustSection from '../../components/provider/TrustSection';
import ProviderCompletedJobsSection from '../../components/provider/ProviderCompletedJobsSection';
import PortfolioCarousel from '../../components/provider/PortfolioCarousel';
import ProviderCatalogServiceCard from '../../components/provider/ProviderCatalogServiceCard';
import ProviderScheduleSection from '../../components/provider/ProviderScheduleSection';
import ProviderTeamSection from '../../components/provider/ProviderTeamSection';
import MarketplaceDownloadBanner from '../../components/marketplace/MarketplaceDownloadBanner';

import { fetchPublicProviderFicha, getProviderReviews } from '../../services/providers';
import {
  getPublicProviderFromWebPath,
  normalizeProviderRouteParams,
  parsePublicProviderFromUrl,
} from '../../utils/publicListingRoute';

import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
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

const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

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
    try {
      const webUrl = buildPublicProviderUrl(providerType, providerId);
      const deepUrl = buildDeepLinkProviderUrl(providerType, providerId);
      const isTaller = providerType === 'taller';
      const titleSpec = isTaller ? 'Taller especializado' : 'Mecánico a domicilio';
      const zonasComunas = details?.zonas_servicio
        ? details.zonas_servicio.flatMap((z) => z.comunas || [])
        : [];
      const comunasRaw =
        zonasComunas.length > 0
          ? zonasComunas
          : details.comunas_cobertura_nombres ||
            details.comunas_cobertura?.map((c) => c?.nombre || c) ||
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
          ? details.comuna
            ? `Atiende en ${details.comuna}.`
            : ''
          : 'Atiende a domicilio.';
      }
      const marcasArr = details.marcas_atendidas_nombres || ['Multimarca'];
      const marcasText =
        marcasArr.length > 6 ? `${marcasArr.slice(0, 6).join(', ')}...` : marcasArr.join(', ');
      const name = details.nombre || 'Especialista';
      const messageTexto = `Conoce a ${name}, ${titleSpec}.\n${comunasText}\nEspecialista en: ${marcasText}\n\nVer en la web:\n${webUrl}\n\nAbrir en la app:\n${deepUrl}`;
      if (Platform.OS === 'web') {
        await Share.share({ message: messageTexto, title: 'MecaniMóvil', url: webUrl });
      } else {
        await Share.share({ message: messageTexto, url: webUrl });
      }
    } catch (e) {
      console.error(e);
    }
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
        <TouchableOpacity
          style={styles.fallbackPrimaryButton}
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
        >
          <Text style={styles.fallbackPrimaryText}>Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.bodyText}>Cargando información del especialista...</Text>
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
        <TouchableOpacity style={styles.fallbackPrimaryButton} onPress={() => reload()}>
          <Text style={styles.fallbackPrimaryText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
          <Text style={styles.linkText}>Iniciar sesión</Text>
        </TouchableOpacity>
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
        <MarketplaceDownloadBanner forPublicProfile />
      </View>

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
              <Text style={styles.sectionTitle}>Comunas de Cobertura</Text>
              {comunas.length > 0 ? (
                <View style={styles.tagsRow}>
                  {comunas.map((c, i) => (
                    <View key={`${c}-${i}`} style={styles.tagBadge}>
                      <MapPin size={12} color={COLORS.text.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>{String(c)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Card style={{ marginTop: 10 }}>
                  <Text style={styles.bodyMutedText}>Cobertura no disponible.</Text>
                </Card>
              )}
            </View>
          );
        }

        const addr =
          provider.direccion_fisica?.direccion_completa ||
          provider.direccion_taller ||
          null;
        const comuna = provider.direccion_fisica?.comuna || provider.comuna || '';
        const display = [addr, comuna].filter(Boolean).join(', ') || 'Dirección no disponible.';

        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dirección del Taller</Text>
            <Card style={{ marginTop: 10 }}>
              <View style={styles.iconRow}>
                <MapPin size={18} color={COLORS.primary[500]} />
                <Text style={styles.bodyText}>{display}</Text>
              </View>
            </Card>
          </View>
        );
      })()}

      {/* Cobertura de marcas */}
      {(() => {
        const tipoCobertura = provider?.tipo_cobertura_marca;
        const esMultimarca = tipoCobertura === 'multimarca'
          || (!tipoCobertura && !(provider.marcas_atendidas_nombres?.length > 0));

        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {esMultimarca ? 'Cobertura de Marcas' : 'Especialidad en Marcas'}
            </Text>

            {esMultimarca ? (
              <View style={styles.multimarcaBadge}>
                <Text style={styles.multimarcaBadgeIcon}>🌐</Text>
                <View>
                  <Text style={styles.multimarcaBadgeTitle}>Proveedor Multimarca</Text>
                  <Text style={styles.multimarcaBadgeSub}>Atiende vehículos de cualquier marca</Text>
                </View>
              </View>
            ) : (
              <View style={styles.tagsRow}>
                {(provider.marcas_atendidas_nombres || []).map((brand, i) => (
                  <View key={i} style={[styles.tagBadge, styles.tagBadgeSpecialista]}>
                    <Text style={styles.tagText}>⭐ {brand}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })()}

      {tieneEquipoPublico ? (
        <ProviderTeamSection miembros={equipoPublico} />
      ) : (
        <ProviderScheduleSection horarios={details?.horarios_semanales || []} />
      )}

      <TrustSection documents={documents || []} />

      {/* SECCIÓN DE SERVICIOS PÚBLICA */}
      {serviciosVisibles.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios Profesionales</Text>
          {esMultimarcaProveedor ? (
            <Text style={styles.sectionHint}>
              Precios orientativos; al agendar verás el valor según la marca de tu vehículo. Inicia sesión para solicitar.
            </Text>
          ) : (
            <Text style={styles.sectionHint}>
              Servicios activos de este especialista. Inicia sesión para solicitar presupuesto.
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

      {/* CTA Login */}
      <View style={[styles.section, { marginTop: 20, marginBottom: 40 }]}>
        <Card style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>¿Necesitas un servicio?</Text>
          <Text style={styles.ctaText}>
            Inicia sesión para solicitar presupuestos, chatear con este especialista y agendar tu
            atención.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
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
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerWrap: {
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: -36,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 20,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
    marginBottom: 0,
  },
  sectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 12,
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
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    flex: 1,
    lineHeight: 22,
    marginLeft: 10,
  },
  bodyMutedText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 12,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.lg,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary[100],
  },
  multimarcaBadgeIcon: {
    fontSize: 28,
  },
  multimarcaBadgeTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[600],
    marginBottom: 2,
  },
  multimarcaBadgeSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary[500],
  },
  tagBadgeSpecialista: {
    backgroundColor: COLORS.success?.light || '#EAF9EF',
    borderColor: COLORS.success?.main || '#05b169',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray[100],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  tagText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  // CTA Styles
  ctaCard: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  fallbackPrimaryButton: {
    marginTop: 20,
    width: '85%',
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: BORDERS.radius.button?.md ?? BORDERS.radius.full,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackPrimaryText: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  errorText: {
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 22,
  },
  linkText: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
});

export default PublicProviderDetailScreen;
