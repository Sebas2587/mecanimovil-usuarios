import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Car,
  Gauge,
  HeartPulse,
  ShieldCheck,
  Wrench,
} from 'lucide-react-native';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import StoreDownloadBadges from '../../components/guest/StoreDownloadBadges';
import BrandIconWell from '../../components/base/BrandIconWell/BrandIconWell';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { getMarketplaceVehicleIdFromWebPath, getMarketplaceFichaTokenFromWebPath } from '../../utils/publicListingRoute';
import { getHealthLabel } from '../../utils/healthFormat';
import { getPublicVehicleFicha, getPublicVehicleFichaByToken } from '../../services/vehicle';
import { useAuth } from '../../context/AuthContext';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

function statusColor(status) {
  if (status === 'critical') return COLORS.error.main;
  if (status === 'warning') return COLORS.warning?.main || COLORS.brand.orange;
  return COLORS.success?.main || COLORS.brand.orange;
}

const PublicVehicleFichaScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuth();

  const fichaToken = useMemo(() => {
    const fromRoute = route.params?.fichaToken ?? route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getMarketplaceFichaTokenFromWebPath();
    return null;
  }, [route.params?.fichaToken, route.params?.token]);

  const vehicleId = useMemo(() => {
    const fromRoute = route.params?.vehicleId ?? route.params?.id;
    if (fromRoute != null && fromRoute !== '') {
      const n = Number(fromRoute);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (Platform.OS === 'web') return getMarketplaceVehicleIdFromWebPath();
    return null;
  }, [route.params?.vehicleId, route.params?.id]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!fichaToken && !vehicleId) {
      setError('Enlace de ficha inválido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = fichaToken
        ? await getPublicVehicleFichaByToken(fichaToken)
        : await getPublicVehicleFicha(vehicleId);
      setData(res);
    } catch (e) {
      setError(e?.message || 'No se pudo cargar la ficha.');
    } finally {
      setLoading(false);
    }
  }, [fichaToken, vehicleId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const headline = useMemo(() => {
    if (!data) return 'Vehículo';
    return [data.marca, data.modelo].filter(Boolean).join(' ') || 'Vehículo';
  }, [data]);

  const metaLine = useMemo(() => {
    if (!data) return '';
    return [data.anio, data.cilindraje].filter(Boolean).join(' · ');
  }, [data]);

  const score = Math.round(Number(data?.health_score) || 0);
  const healthLabel = getHealthLabel(score);
  const healthDetails = Array.isArray(data?.health_details) ? data.health_details : [];
  const servicios = Array.isArray(data?.servicios) ? data.servicios : [];

  const goRegister = useCallback(() => {
    navigation.navigate(ROUTES.REGISTER);
  }, [navigation]);

  const goLogin = useCallback(() => {
    navigation.navigate(ROUTES.LOGIN);
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brand.magenta} />
          <Text style={styles.loadingText}>Cargando ficha…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Ficha no disponible</Text>
          <Text style={styles.errorBody}>{error || 'Intenta más tarde.'}</Text>
          <GuestGradientButton title="Ir al inicio" onPress={() => navigation.navigate(ROUTES.GUEST_LANDING)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="MecaniMovil" />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.eyebrow}>Ficha de salud</Text>
        <Text style={styles.title}>{headline}</Text>
        {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}

        <View style={styles.scoreRow}>
          <BrandIconWell size={44}>
            <Gauge size={20} color={COLORS.brand.orange} strokeWidth={2} />
          </BrandIconWell>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>Salud general · {healthLabel}</Text>
          </View>
        </View>

        {healthDetails.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Métricas de salud</Text>
            <Text style={styles.sectionHint}>Componentes monitoreados en MecaniMovil</Text>
            <View style={styles.healthList}>
              {healthDetails.map((item) => {
                const pct = Math.round(Number(item.salud_porcentaje) || 0);
                return (
                  <View key={String(item.id)} style={styles.healthRow}>
                    <Text style={styles.healthName} numberOfLines={1}>{item.nombre}</Text>
                    <View style={styles.healthBarTrack}>
                      <View
                        style={[
                          styles.healthBarFill,
                          {
                            width: `${Math.max(4, Math.min(100, pct))}%`,
                            backgroundColor: statusColor(item.status),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.healthPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Métricas de salud</Text>
            <Text style={styles.emptyHint}>
              Aún no hay componentes registrados. En MecaniMovil puedes llevar el control completo.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios realizados</Text>
          <Text style={styles.sectionHint}>
            {servicios.length === 1
              ? '1 servicio con taller verificado'
              : `${servicios.length} servicios con talleres verificados`}
          </Text>
          {servicios.length === 0 ? (
            <Text style={styles.emptyHint}>Todavía no hay servicios asociados a esta ficha.</Text>
          ) : (
            servicios.map((s) => (
              <View key={String(s.id)} style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  {s.proveedor_avatar ? (
                    <Image source={{ uri: s.proveedor_avatar }} style={styles.avatar} />
                  ) : (
                    <Wrench size={16} color={COLORS.icon.active} strokeWidth={2} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.serviceName} numberOfLines={2}>{s.servicio_nombre}</Text>
                  <Text style={styles.serviceMeta} numberOfLines={1}>
                    {[s.proveedor_nombre, s.fecha].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.ctaBlock}>
          <View style={styles.ctaIconRow}>
            <HeartPulse size={18} color={COLORS.brand.magenta} strokeWidth={2} />
            <ShieldCheck size={18} color={COLORS.brand.orange} strokeWidth={2} />
            <Car size={18} color={COLORS.icon.default} strokeWidth={2} />
          </View>
          {isAuthenticated ? (
            <>
              <Text style={styles.ctaTitle}>Controla tu auto en MecaniMovil</Text>
              <Text style={styles.ctaBody}>
                Esta es la ficha pública. En tu cuenta puedes ver patente, historial completo y agendar servicios.
              </Text>
              <GuestGradientButton
                title="Ir a mis vehículos"
                onPress={() => navigation.navigate(ROUTES.MIS_VEHICULOS)}
              />
            </>
          ) : (
            <>
              <Text style={styles.ctaTitle}>
                {data.cta?.titulo || 'Lleva este control en MecaniMovil'}
              </Text>
              <Text style={styles.ctaBody}>
                {data.cta?.descripcion
                  || 'Regístrate gratis para guardar la salud de tu auto, agendar talleres y no perder el historial.'}
              </Text>
              <GuestGradientButton title="Crear cuenta gratis" onPress={goRegister} />
              <Text style={styles.loginHint} onPress={goLogin}>
                ¿Ya tienes cuenta? Inicia sesión
              </Text>
              <StoreDownloadBadges style={{ marginTop: SPACING.md }} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.fixed.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    minHeight: 44,
  },
  logo: { width: 120, height: 28 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.container.horizontal,
    gap: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  errorTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  errorBody: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  eyebrow: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.brand.magenta,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.styles.h1,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  meta: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.base.white,
    borderRadius: BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light || withOpacity(COLORS.text.primary, 0.08),
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scoreValue: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 28,
    color: COLORS.text.primary,
  },
  scoreLabel: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  emptyHint: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  healthList: { gap: SPACING.sm },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  healthName: {
    width: 110,
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.primary,
  },
  healthBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.badge.meta || '#F3F3F3',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  healthPct: {
    width: 40,
    textAlign: 'right',
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(COLORS.text.primary, 0.1),
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.badge.meta || '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 36, height: 36 },
  serviceName: {
    ...TYPOGRAPHY.styles.body,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.text.primary,
  },
  serviceMeta: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  ctaBlock: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.base.soft || '#FFF0F5',
    gap: SPACING.sm,
  },
  ctaIconRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  ctaTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
  },
  ctaBody: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  loginHint: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.buttonSecondary.outlineText || COLORS.brand.orange,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
  },
});

export default PublicVehicleFichaScreen;
