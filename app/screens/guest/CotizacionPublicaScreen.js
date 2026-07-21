import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, Wrench } from 'lucide-react-native';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import { showAlert } from '../../utils/platformAlert';
import {
  aceptarCotizacionPublica,
  obtenerCotizacionPublica,
  rechazarCotizacionPublica,
} from '../../services/cotizacionPublicaService';
import { getCotizacionTokenFromWebPath } from '../../utils/publicListingRoute';

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

const CotizacionPublicaScreen = () => {
  const route = useRoute();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - SPACING.lg * 2, 720);

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
      setError(e?.message || 'No se pudo cargar la cotización.');
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

  const estadoLabel = useMemo(() => {
    if (!data?.estado) return '';
    if (data.estado === 'aceptada') return 'Aceptada';
    if (data.estado === 'rechazada') return 'Rechazada';
    if (data.estado === 'enviada') return 'Pendiente de respuesta';
    return data.estado;
  }, [data?.estado]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.brand.magenta} />
        <Text style={styles.loadingText}>Cargando cotización…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Cotización no disponible</Text>
        <Text style={styles.errorBody}>{error || 'No encontramos esta cotización.'}</Text>
      </View>
    );
  }

  const repuestos = data.repuestos || [];
  const puedeResponder = Boolean(data.puede_responder);

  return (
    <LinearGradient colors={[COLORS.base.soft, COLORS.background.default]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Cotización de taller</Text>
            <Text style={styles.heroTitle}>{data.taller?.nombre || 'Taller Mecanimovil'}</Text>
            <Text style={styles.heroMeta}>{vehicleHeadline(data)}</Text>
            {estadoLabel ? (
              <View style={styles.estadoPill}>
                <Text style={styles.estadoPillText}>{estadoLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Wrench size={18} color={COLORS.brand.orange} />
              <Text style={styles.cardTitle}>{data.servicio_nombre || 'Servicio'}</Text>
            </View>
            {data.descripcion_problema ? (
              <Text style={styles.bodyText}>{data.descripcion_problema}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Modalidad</Text>
              <Text style={styles.metaValue}>
                {data.modalidad === 'domicilio' ? 'A domicilio' : 'En taller'}
              </Text>
            </View>
            {data.duracion_minutos_estimada ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Duración estimada</Text>
                <Text style={styles.metaValue}>{data.duracion_minutos_estimada} min</Text>
              </View>
            ) : null}
          </View>

          {repuestos.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionEyebrow}>Repuestos estimados</Text>
              {repuestos.map((rep, idx) => (
                <View key={`${rep.nombre}-${idx}`} style={styles.amenityRow}>
                  <Text style={styles.amenityLabel} numberOfLines={2}>
                    {rep.nombre} ×{rep.cantidad || 1}
                  </Text>
                  <Text style={styles.amenityValue}>
                    {formatCLP((rep.precio_unitario_clp || 0) * (rep.cantidad || 1))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.amenityRow}>
              <Text style={styles.amenityLabel}>Mano de obra</Text>
              <Text style={styles.amenityValue}>{formatCLP(data.mano_obra_clp)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.amenityRow}>
              <Text style={styles.totalLabel}>Total estimado</Text>
              <Text style={styles.totalValue}>{formatCLP(data.total_clp)}</Text>
            </View>
          </View>

          {(data.advertencias || []).length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionEyebrow}>Condiciones</Text>
              {data.advertencias.map((adv, i) => (
                <Text key={`adv-${i}`} style={styles.bodyText}>
                  • {adv}
                </Text>
              ))}
            </View>
          ) : null}

          {data.taller?.telefono || data.taller?.direccion ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Car size={18} color={COLORS.brand.magenta} />
                <Text style={styles.cardTitle}>Taller</Text>
              </View>
              {data.taller?.direccion ? (
                <Text style={styles.bodyText}>{data.taller.direccion}</Text>
              ) : null}
              {data.taller?.telefono ? (
                <Text style={styles.bodyText}>Tel: {data.taller.telefono}</Text>
              ) : null}
            </View>
          ) : null}

          {data.estado === 'aceptada' && data.horario_por_confirmar ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>¡Listo!</Text>
              <Text style={styles.successBody}>
                El taller coordinará el horario contigo. Revisa tu teléfono por si te contactan.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {puedeResponder ? (
          <View style={[styles.footer, { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }]}>
            <GuestGradientButton
              title="Aceptar cotización"
              onPress={() => void handleAceptar()}
              loading={submitting}
              disabled={submitting}
            />
            <Button
              title="Rechazar"
              variant="outline"
              onPress={() => void handleRechazar()}
              disabled={submitting}
              style={styles.rejectBtn}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background.default,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.text.secondary,
  },
  errorTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  errorBody: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  hero: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.brand.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.fontSize.xxl,
    color: COLORS.text.primary,
  },
  heroMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
  estadoPill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.selection,
  },
  estadoPillText: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.brand.magenta,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
    flex: 1,
  },
  sectionEyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  metaValue: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  amenityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  amenityLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  amenityValue: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.xs,
  },
  totalLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  totalValue: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.brand.magenta,
  },
  successBox: {
    backgroundColor: COLORS.selection,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  successTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.brand.magenta,
  },
  successBody: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  rejectBtn: {
    marginTop: 0,
  },
});

export default CotizacionPublicaScreen;
