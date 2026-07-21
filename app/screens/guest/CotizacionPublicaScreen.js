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
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import {
  aceptarCotizacionPublica,
  obtenerCotizacionPublica,
  rechazarCotizacionPublica,
} from '../../services/cotizacionPublicaService';
import { getCotizacionTokenFromWebPath } from '../../utils/publicListingRoute';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

function formatCLP(value) {
  const n = Number(value || 0);
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function vehicleHeadline(data) {
  if (!data) return 'Tu vehículo';
  const parts = [data.vehiculo_marca, data.vehiculo_modelo, data.vehiculo_anio].filter(Boolean);
  const base = parts.join(' ');
  if (data.vehiculo_patente) {
    return base ? `${base} · ${data.vehiculo_patente}` : data.vehiculo_patente;
  }
  return base || 'Tu vehículo';
}

function estadoMeta(estado) {
  if (estado === 'aceptada') {
    return { label: 'Aceptada', tone: 'ok' };
  }
  if (estado === 'rechazada') {
    return { label: 'Rechazada', tone: 'muted' };
  }
  if (estado === 'enviada') {
    return { label: 'Pendiente de respuesta', tone: 'muted' };
  }
  return estado ? { label: String(estado), tone: 'muted' } : null;
}

const CotizacionPublicaScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const token = useMemo(() => {
    const fromRoute = route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getCotizacionTokenFromWebPath();
    return null;
  }, [route.params?.token]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!token) {
      setError('Enlace de cotización inválido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await obtenerCotizacionPublica(token);
      setData(res);
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status === 410) {
        setError('Este enlace de cotización expiró. Solicita una nueva al taller.');
      } else {
        setError(e?.message || 'No se pudo cargar la cotización.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleAceptar = useCallback(async () => {
    if (!token || !data?.puede_responder) return;
    setSubmitting(true);
    try {
      const res = await aceptarCotizacionPublica(token);
      setData(res);
      showAlert(
        'Cotización aceptada',
        'El taller coordinará el horario contigo. Te contactará pronto.',
      );
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo aceptar la cotización.');
    } finally {
      setSubmitting(false);
    }
  }, [token, data?.puede_responder]);

  const handleRechazar = useCallback(async () => {
    if (!token || !data?.puede_responder) return;
    setSubmitting(true);
    try {
      const res = await rechazarCotizacionPublica(token);
      setData(res);
      showAlert('Cotización rechazada', 'Gracias por tu respuesta.');
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo rechazar la cotización.');
    } finally {
      setSubmitting(false);
    }
  }, [token, data?.puede_responder]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.GUEST_LANDING);
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brand.magenta} />
          <Text style={styles.loadingText}>Cargando cotización…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={goBack} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Cotización no disponible</Text>
          <Text style={styles.errorBody}>{error || 'No encontramos esta cotización.'}</Text>
          <GuestGradientButton title="Reintentar" onPress={() => void cargar()} />
        </View>
      </SafeAreaView>
    );
  }

  const repuestos = data.repuestos || [];
  const advertencias = data.advertencias || [];
  const puedeResponder = Boolean(data.puede_responder);
  const estado = estadoMeta(data.estado);
  const contentWidthStyle = { maxWidth: 752, width: '100%', alignSelf: 'center' };

  const body = (
    <>
      {/* Hero: marca (taller) + título + soporte — una composición */}
      <View style={styles.hero}>
        <Text style={styles.brandKicker}>
          {data.taller?.nombre || 'Cotización de taller'}
        </Text>
        <Text style={styles.heroTitle}>
          {data.servicio_nombre || 'Cotización de servicio'}
        </Text>
        <Text style={styles.heroSupport}>{vehicleHeadline(data)}</Text>
        <View style={styles.metaRow}>
          {estado ? (
            <View style={[styles.metaPill, estado.tone === 'ok' && styles.metaPillOk]}>
              <Text style={[styles.metaPillText, estado.tone === 'ok' && styles.metaPillOkText]}>
                {estado.label}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {data.modalidad === 'domicilio' ? 'A domicilio' : 'En taller'}
            </Text>
          </View>
          {data.duracion_minutos_estimada ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                {data.duracion_minutos_estimada} min est.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Sobre el servicio */}
      {data.descripcion_problema ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Sobre el servicio</Text>
          <Text style={styles.sectionTitle}>Qué incluye</Text>
          <View style={styles.sectionRule} />
          <Text style={styles.resumenLead}>{data.descripcion_problema}</Text>
        </View>
      ) : null}

      {/* Repuestos — amenities */}
      {repuestos.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Materiales</Text>
          <Text style={styles.sectionTitle}>Repuestos estimados</Text>
          <View style={styles.sectionRule} />
          <View style={styles.amenityList}>
            {repuestos.map((rep, idx) => (
              <View key={`${rep.nombre}-${idx}`} style={styles.amenityRow}>
                <Text style={styles.amenityLabel} numberOfLines={3}>
                  {rep.nombre}
                  {rep.cantidad && Number(rep.cantidad) !== 1
                    ? ` · ×${rep.cantidad}`
                    : ''}
                </Text>
                <Text style={styles.amenityValue}>
                  {formatCLP((rep.precio_unitario_clp || 0) * (rep.cantidad || 1))}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Totales */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Precio</Text>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.sectionRule} />
        <View style={styles.amenityList}>
          <View style={styles.amenityRow}>
            <Text style={styles.amenityLabel}>Mano de obra</Text>
            <Text style={styles.amenityValue}>{formatCLP(data.mano_obra_clp)}</Text>
          </View>
          {Number(data.costo_repuestos_clp) > 0 ? (
            <View style={styles.amenityRow}>
              <Text style={styles.amenityLabel}>Repuestos</Text>
              <Text style={styles.amenityValue}>{formatCLP(data.costo_repuestos_clp)}</Text>
            </View>
          ) : null}
          <View style={[styles.amenityRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total estimado</Text>
            <Text style={styles.totalValue}>{formatCLP(data.total_clp)}</Text>
          </View>
        </View>
      </View>

      {/* Condiciones */}
      {advertencias.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Condiciones</Text>
          <Text style={styles.sectionTitle}>Ten en cuenta</Text>
          <View style={styles.sectionRule} />
          <View style={styles.condicionesBlock}>
            {advertencias.map((adv, i) => (
              <Text key={`adv-${i}`} style={styles.resumenParagraph}>
                {adv}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {/* Taller */}
      {data.taller?.telefono || data.taller?.direccion ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Proveedor</Text>
          <Text style={styles.sectionTitle}>
            {data.taller?.nombre || 'Taller'}
          </Text>
          <View style={styles.sectionRule} />
          {data.taller?.direccion ? (
            <Text style={styles.resumenParagraph}>{data.taller.direccion}</Text>
          ) : null}
          {data.taller?.telefono ? (
            <Text style={styles.resumenParagraph}>Tel. {data.taller.telefono}</Text>
          ) : null}
        </View>
      ) : null}

      {data.estado === 'aceptada' && data.horario_por_confirmar ? (
        <View style={styles.signedBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.signedTitle}>Cotización aceptada</Text>
            <Text style={styles.signedMeta}>
              El taller coordinará el horario contigo. Revisa tu teléfono por si te contactan.
            </Text>
          </View>
        </View>
      ) : null}

      {/* CTA — único card interactivo */}
      {puedeResponder ? (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>¿Aceptas esta cotización?</Text>
          <Text style={styles.actionHint}>
            Al aceptar, el taller te contactará para confirmar el horario. No necesitas crear una cuenta.
          </Text>
          <GuestGradientButton
            title={submitting ? 'Enviando…' : 'Aceptar cotización'}
            onPress={() => void handleAceptar()}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
          <Button
            title="Rechazar"
            type="secondary"
            variant="outline"
            onPress={() => void handleRechazar()}
            disabled={submitting}
            fullWidth
            style={styles.rejectBtn}
          />
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.root, Platform.OS === 'web' && styles.rootWebFlow]}
      edges={['top', 'bottom']}
    >
      <LinearGradient
        colors={[COLORS.base.soft, COLORS.background.default, COLORS.background.default]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <BackButton onPress={goBack} />
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Mecanimovil"
        />
        <View style={styles.topBarSpacer} />
      </View>

      {/*
        Web: sin ScrollView interno — el stack card hace overflowY:auto
        (igual que InformeServicioScreen).
        Native: ScrollView normal.
      */}
      {Platform.OS === 'web' ? (
        <View style={[styles.scrollContent, contentWidthStyle]}>{body}</View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  rootWebFlow: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    minHeight: '100%',
    alignSelf: 'stretch',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    zIndex: 2,
  },
  logo: {
    flex: 1,
    height: 28,
    maxWidth: 160,
    alignSelf: 'center',
  },
  topBarSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['2xl'],
    gap: SPACING.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
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
  },
  hero: {
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  brandKicker: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.brand.orange,
  },
  heroTitle: {
    ...TYPOGRAPHY.styles.h1,
    color: COLORS.text.primary,
  },
  heroSupport: {
    ...TYPOGRAPHY.styles.body,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.badge.meta.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.sm,
  },
  metaPillOk: {
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.08),
  },
  metaPillText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.badge.meta.text,
  },
  metaPillOkText: {
    color: COLORS.brand.magenta,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionEyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.section,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  resumenLead: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 28,
    color: COLORS.text.primary,
    paddingTop: SPACING.xs,
  },
  resumenParagraph: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 24,
    color: COLORS.text.secondary,
  },
  condicionesBlock: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  amenityList: {
    gap: 0,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  amenityLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  amenityValue: {
    flexShrink: 0,
    maxWidth: '42%',
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.secondary,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: SPACING.md,
  },
  totalLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 24,
    color: COLORS.text.primary,
  },
  totalValue: {
    flexShrink: 0,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  signedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  signedTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  signedMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
  actionCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  actionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  actionHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  rejectBtn: {
    marginTop: SPACING.xs,
  },
});

export default CotizacionPublicaScreen;
