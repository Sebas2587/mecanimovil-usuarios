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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { MapPin, Phone, Wrench } from 'lucide-react-native';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import { resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';
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

/** Desglose informativo desde total con IVA 19% incluido. */
function desgloseIvaDesdeTotal(totalIvaIncl) {
  const total = Math.round(Number(totalIvaIncl) || 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  return { neto, iva, total };
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

function formatFechaHoraPropuesta(fecha, hora) {
  if (!fecha) return '';
  const iso = String(fecha).split('T')[0];
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return '';
  const parsed = new Date(y, m - 1, d);
  const fechaTxt = parsed.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const horaTxt = String(hora || '').substring(0, 5);
  return horaTxt ? `${fechaTxt} a las ${horaTxt}` : fechaTxt;
}

function mensajeAceptacionAdicional(data) {
  if (data?.ejecucion_adicional === 'nueva_fecha') {
    const slot = formatFechaHoraPropuesta(data.fecha_propuesta, data.hora_propuesta);
    if (slot) return `Quedó agendado para el ${slot}.`;
    return 'Quedó agendado en la fecha acordada con el taller.';
  }
  return 'El taller puede continuar este trabajo adicional en la misma visita.';
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
  if (estado === 'cancelada') {
    return { label: 'Cancelada', tone: 'muted' };
  }
  return estado ? { label: String(estado), tone: 'muted' } : null;
}

const CotizacionPublicaScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

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
  const [tallerImgError, setTallerImgError] = useState(false);

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
      setTallerImgError(false);
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
        res.es_trabajo_adicional
          ? mensajeAceptacionAdicional(res)
          : 'El taller coordinará el horario contigo. Te contactará pronto.',
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

  const repuestos = Array.isArray(data.repuestos) ? data.repuestos : [];
  const puedeResponder = Boolean(data.puede_responder);
  const estado = estadoMeta(data.estado);
  const contentWidthStyle = { maxWidth: 752, width: '100%', alignSelf: 'center' };
  const tallerFoto = resolveToAbsoluteMediaUrl(data.taller?.foto_perfil);
  const footerPad = puedeResponder
    ? 24 + 180 + Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 0)
    : SPACING['2xl'] + Math.max(insets.bottom, 16);

  const esAdicional = Boolean(data.es_trabajo_adicional);
  const nombrePrincipal = data.servicio_principal?.nombre;
  const motivoAdicional = (data.motivo_servicio_adicional || '').trim();
  const esNuevaFecha = data.ejecucion_adicional === 'nueva_fecha';
  const slotPropuesto = formatFechaHoraPropuesta(data.fecha_propuesta, data.hora_propuesta);
  const actualizadaPorTaller = Boolean(data.actualizada_por_taller)
    || (
      data.enviada_en
      && data.actualizado_en
      && new Date(data.actualizado_en).getTime() > new Date(data.enviada_en).getTime() + 2000
    );

  const body = (
    <>
      {/* Hero: etiqueta Servicio + título (no marca del taller) */}
      <View style={styles.hero}>
        <View style={styles.serviceTag}>
          <Text style={styles.serviceTagText}>
            {esAdicional ? 'Trabajo adicional' : 'Servicio'}
          </Text>
        </View>
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

      {actualizadaPorTaller ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Actualización</Text>
          <Text style={styles.paperTitle}>El taller actualizó esta cotización</Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>
            Revisá el desglose. Si el total cambió y aún puedes responder, aceptá o rechazá de nuevo.
          </Text>
        </View>
      ) : null}

      {esAdicional ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Durante tu servicio</Text>
          <Text style={styles.paperTitle}>
            {nombrePrincipal || 'Servicio en curso'}
          </Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>
            Este trabajo se propone durante el servicio que el taller ya está realizando
            {nombrePrincipal ? ` (${nombrePrincipal})` : ''}.
            {motivoAdicional ? ` ${motivoAdicional}` : ''}
          </Text>
          {esNuevaFecha && slotPropuesto ? (
            <>
              <View style={styles.paperRule} />
              <Text style={styles.bodyText}>
                Fecha propuesta: {slotPropuesto} (acordada con el taller).
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Detalle del trabajo (texto, sin montos) */}
      {data.descripcion_problema ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Detalle</Text>
          <Text style={styles.paperTitle}>Sobre el servicio</Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>{data.descripcion_problema}</Text>
        </View>
      ) : null}

      {/* Mano de obra — bloque propio */}
      <View style={styles.paper}>
        <Text style={styles.paperEyebrow}>Mano de obra</Text>
        <Text style={styles.paperTitle}>Trabajo del taller</Text>
        <View style={styles.paperRule} />
        <View style={styles.lineRow}>
          <Text style={styles.lineLabel}>Mano de obra</Text>
          <Text style={styles.lineValue}>{formatCLP(data.mano_obra_clp)}</Text>
        </View>
        <Text style={styles.hint}>
          Incluye el tiempo y la intervención del mecánico.
        </Text>
      </View>

      {/* Repuestos — ítems separados de la mano de obra */}
      {repuestos.length > 0 ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Repuestos</Text>
          <Text style={styles.paperTitle}>Materiales</Text>
          <View style={styles.paperRule} />
          <View style={styles.itemList}>
            {repuestos.map((rep, idx) => {
              const qty = Number(rep.cantidad) || 1;
              const unit = Number(rep.precio_unitario_clp) || 0;
              const marca = (rep.marca_repuesto || '').trim();
              return (
                <View key={`${rep.id || rep.nombre}-${idx}`} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName} numberOfLines={3}>
                      {rep.nombre || 'Repuesto'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {[
                        qty > 1 ? `${qty} × ${formatCLP(unit)}` : '1 unidad',
                        marca ? `Marca ${marca}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.itemAmount}>{formatCLP(unit * qty)}</Text>
                </View>
              );
            })}
          </View>
          {Number(data.costo_repuestos_clp) > 0 ? (
            <View style={[styles.lineRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Subtotal repuestos</Text>
              <Text style={styles.subtotalValue}>{formatCLP(data.costo_repuestos_clp)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Total con desglose IVA informativo */}
      <View style={[styles.paper, styles.totalPaper]}>
        <View style={styles.totalBreakdown}>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabelMuted}>Mano de obra</Text>
            <Text style={styles.lineValueMuted}>{formatCLP(data.mano_obra_clp)}</Text>
          </View>
          {Number(data.costo_repuestos_clp) > 0 ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabelMuted}>Repuestos</Text>
              <Text style={styles.lineValueMuted}>{formatCLP(data.costo_repuestos_clp)}</Text>
            </View>
          ) : null}
          {(() => {
            const d = desgloseIvaDesdeTotal(data.total_clp);
            return (
              <>
                <View style={styles.lineRow}>
                  <Text style={styles.lineLabelMuted}>Neto</Text>
                  <Text style={styles.lineValueMuted}>{formatCLP(d.neto)}</Text>
                </View>
                <View style={styles.lineRow}>
                  <Text style={styles.lineLabelMuted}>IVA 19%</Text>
                  <Text style={styles.lineValueMuted}>{formatCLP(d.iva)}</Text>
                </View>
              </>
            );
          })()}
        </View>
        <View style={styles.totalRule} />
        <View style={styles.lineRow}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{formatCLP(data.total_clp)}</Text>
        </View>
        <Text style={styles.hint}>
          Los precios de línea ya incluyen IVA. El desglose neto/IVA es informativo.
        </Text>
        {esAdicional || data.pago_directo_taller ? (
          <Text style={styles.hint}>
            El pago de mano de obra y repuestos se coordina directo con el taller.
            Mecanimovil no cobra este trabajo.
          </Text>
        ) : null}
      </View>

      {/* Proveedor: foto + nombre + contacto */}
      {data.taller?.nombre || data.taller?.telefono || data.taller?.direccion ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Proveedor</Text>
          <View style={styles.tallerRow}>
            {tallerFoto && !tallerImgError ? (
              <ExpoImage
                source={{ uri: tallerFoto }}
                style={styles.tallerAvatar}
                contentFit="cover"
                onError={() => setTallerImgError(true)}
                accessibilityLabel={data.taller?.nombre || 'Taller'}
              />
            ) : (
              <View style={styles.tallerAvatarPlaceholder}>
                <Wrench size={20} color={COLORS.brand.orange} strokeWidth={2} />
              </View>
            )}
            <View style={styles.tallerCopy}>
              <Text style={styles.tallerName} numberOfLines={2}>
                {data.taller?.nombre || 'Taller'}
              </Text>
              {data.taller?.direccion ? (
                <View style={styles.contactRow}>
                  <MapPin size={14} color={COLORS.icon.default} strokeWidth={2} />
                  <Text style={styles.contactText}>{data.taller.direccion}</Text>
                </View>
              ) : null}
              {data.taller?.telefono ? (
                <View style={styles.contactRow}>
                  <Phone size={14} color={COLORS.icon.default} strokeWidth={2} />
                  <Text style={styles.contactText}>{data.taller.telefono}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {data.estado === 'aceptada' && (esAdicional || data.horario_por_confirmar) ? (
        <View style={styles.signedBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.signedTitle}>Cotización aceptada</Text>
            <Text style={styles.signedMeta}>
              {esAdicional
                ? mensajeAceptacionAdicional(data)
                : 'El taller coordinará el horario contigo. Revisa tu teléfono por si te contactan.'}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          contentWidthStyle,
          { paddingBottom: footerPad },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {body}
      </ScrollView>

      {/* Footer sticky: siempre visible en web/móvil (resuelve scroll cortado) */}
      {puedeResponder ? (
        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 12) },
          ]}
        >
          <View style={[styles.stickyInner, contentWidthStyle]}>
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
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web'
      ? {
          height: '100%',
          maxHeight: '100vh',
          overflow: 'hidden',
        }
      : null),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    zIndex: 2,
    flexShrink: 0,
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
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? {
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }
      : null),
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
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
  serviceTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.selection.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.sm,
  },
  serviceTagText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.selection.text,
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
  paper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  totalPaper: {
    gap: SPACING.sm,
  },
  paperEyebrow: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
  },
  paperTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 26,
    color: COLORS.text.primary,
  },
  paperRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginVertical: SPACING.xs,
  },
  bodyText: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 24,
    color: COLORS.text.primary,
  },
  hint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  lineLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  lineValue: {
    flexShrink: 0,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  lineLabelMuted: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  lineValueMuted: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  itemList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  itemMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  itemAmount: {
    flexShrink: 0,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  subtotalRow: {
    paddingTop: SPACING.sm,
    borderTopWidth: 0,
  },
  subtotalLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  subtotalValue: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  totalBreakdown: {
    gap: 6,
  },
  totalRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
  },
  totalLabel: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  totalValue: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  tallerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  tallerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  tallerAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(COLORS.brand.orange, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  tallerName: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  contactText: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
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
  stickyFooter: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    ...SHADOWS.md,
    zIndex: 10,
  },
  stickyInner: {
    gap: SPACING.xs,
  },
  actionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  actionHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  rejectBtn: {
    marginTop: SPACING.xxs,
  },
});

export default CotizacionPublicaScreen;
