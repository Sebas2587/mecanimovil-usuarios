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
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Download } from 'lucide-react-native';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import { buildProviderAvatarUri, resolveToAbsoluteMediaUrl } from '../../utils/providerUtils';
import {
  aceptarCotizacionPublica,
  descargarPdfCotizacionPublica,
  obtenerCotizacionPublica,
  rechazarCotizacionPublica,
} from '../../services/cotizacionPublicaService';
import { getCotizacionTokenFromWebPath } from '../../utils/publicListingRoute';
import DocumentoHeader from './cotizacion/DocumentoHeader';
import LineasCotizacion from './cotizacion/LineasCotizacion';
import {
  buildLineas,
  desgloseIvaDesdeTotal,
  duracionLabel,
  formatCLP,
  formatFechaCorta,
  formatFechaHoraPropuesta,
  hintFooterAceptacion,
  mensajeAceptacionAdicional,
  resolveCliente,
  vehicleHeadline,
} from './cotizacion/cotizacionPublicaFormat';

const BREAKPOINT = 768;
const DOC_MAX = 896;

const CotizacionPublicaScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINT;

  const token = useMemo(() => {
    const fromRoute = route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getCotizacionTokenFromWebPath();
    return null;
  }, [route.params?.token]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
      const payload = e?.response?.data || e?.data;
      if (status === 410 && payload?.cotizacion) {
        setData(payload.cotizacion);
        setError(null);
      } else if (status === 410) {
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !data) return;
    const folio = data.numero_publico ? `#${data.numero_publico}` : 'Cotización';
    const servicio = data.servicio_nombre || 'servicio';
    const taller = data.taller?.nombre || 'Mecanimovil';
    document.title = `${folio} · ${servicio} · ${taller}`;
  }, [data]);

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

  const handleDescargar = useCallback(async () => {
    if (!token) return;
    setDownloading(true);
    try {
      await descargarPdfCotizacionPublica(token, data?.numero_publico);
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  }, [token, data?.numero_publico]);

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

  const puedeResponder = Boolean(data.puede_responder);
  const contentWidthStyle = { maxWidth: DOC_MAX, width: '100%', alignSelf: 'center' };
  const tallerFoto = buildProviderAvatarUri(data.taller)
    || resolveToAbsoluteMediaUrl(data.taller?.foto_perfil || data.taller?.foto_perfil_url);
  const footerPad = puedeResponder
    ? 132 + Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 0)
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
  const cliente = resolveCliente(data);
  const lineas = buildLineas(data);
  const iva = desgloseIvaDesdeTotal(data.total_clp);
  const notas = (data.notas_cotizacion || '').trim();
  const vehiculo = vehicleHeadline(data);
  const duracion = duracionLabel(data.duracion_minutos_estimada);
  const desc = (data.descripcion_problema || '').trim();
  const mostrarDesc = desc && (!notas || !notas.includes(desc));

  const downloadBtn = (
    <Button
      title={downloading ? 'Descargando…' : 'Descargar PDF'}
      type="secondary"
      variant="outline"
      onPress={() => void handleDescargar()}
      disabled={downloading || submitting}
      fullWidth
      iconNode={<Download size={18} color={COLORS.buttonSecondary.outlineText} strokeWidth={2} />}
    />
  );

  const body = (
    <>
      <DocumentoHeader
        taller={data.taller}
        fotoUri={tallerFoto}
        imgError={tallerImgError}
        onImgError={() => setTallerImgError(true)}
        numeroPublico={data.numero_publico}
        estado={data.estado}
        enviadaEn={data.enviada_en}
        fechaExpiracion={data.fecha_expiracion_publica}
        actualizadaPorTaller={actualizadaPorTaller}
        wide={wide}
      />

      <View style={[styles.facts, wide && styles.factsWide]}>
        {cliente?.nombre ? (
          <View style={[styles.factCol, wide && styles.factColHalf]}>
            <Text style={styles.paperEyebrow}>Cliente</Text>
            <Text style={styles.paperTitle}>{cliente.nombre}</Text>
            {cliente.telefono ? <Text style={styles.bodyText}>{cliente.telefono}</Text> : null}
            {cliente.direccion ? <Text style={styles.bodyMuted}>{cliente.direccion}</Text> : null}
          </View>
        ) : null}
        <View style={[styles.factCol, wide && styles.factColHalf]}>
          <Text style={styles.paperEyebrow}>Vehículo</Text>
          <Text style={styles.paperTitle}>{vehiculo || 'Tu vehículo'}</Text>
          <Text style={styles.bodyMuted}>
            {[
              data.modalidad === 'domicilio' ? 'A domicilio' : 'En taller',
              duracion,
              data.tipo_motor_label,
              data.vehiculo_cilindraje,
            ].filter(Boolean).join(' · ')}
          </Text>
          {data.modalidad === 'domicilio' && data.direccion_servicio ? (
            <Text style={styles.bodyMuted}>{data.direccion_servicio}</Text>
          ) : null}
        </View>
      </View>

      {esAdicional ? (
        <View style={styles.paper}>
          <View style={styles.serviceTag}>
            <Text style={styles.serviceTagText}>Trabajo adicional</Text>
          </View>
          <Text style={styles.paperEyebrow}>Durante tu servicio</Text>
          <Text style={styles.paperTitle}>{nombrePrincipal || 'Servicio en curso'}</Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>
            Este trabajo se propone durante tu servicio en curso
            {nombrePrincipal ? `: ${nombrePrincipal}` : ''}.
          </Text>
          {motivoAdicional ? (
            <Text style={[styles.bodyText, { marginTop: 8 }]}>{motivoAdicional}</Text>
          ) : null}
          {esNuevaFecha ? (
            <>
              <View style={styles.paperRule} />
              <Text style={styles.bodyText}>
                {slotPropuesto
                  ? `Fecha propuesta: ${slotPropuesto} (acordada con el taller).`
                  : 'Fecha a confirmar con el taller.'}
              </Text>
            </>
          ) : null}
        </View>
      ) : data.servicio_nombre ? (
        <View style={styles.hero}>
          <View style={styles.serviceTag}>
            <Text style={styles.serviceTagText}>Servicio</Text>
          </View>
          <Text style={styles.heroTitle}>{data.servicio_nombre}</Text>
        </View>
      ) : null}

      {mostrarDesc ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Detalle</Text>
          <Text style={styles.paperTitle}>Sobre el servicio</Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>{desc}</Text>
        </View>
      ) : null}

      <LineasCotizacion lineas={lineas} wide={wide} />

      {notas ? (
        <View style={styles.paper}>
          <Text style={styles.paperEyebrow}>Notas de cotización</Text>
          <View style={styles.paperRule} />
          <Text style={styles.bodyText}>{notas}</Text>
        </View>
      ) : null}

      <View style={[styles.bottomRow, wide && styles.bottomRowWide]}>
        {data.fecha_expiracion_publica ? (
          <View style={[styles.noteAmber, wide && styles.noteAmberWide]}>
            <Text style={styles.paperEyebrow}>Validez</Text>
            <Text style={styles.bodyText}>
              Esta cotización es válida hasta el {formatFechaCorta(data.fecha_expiracion_publica)}.
              Los precios de repuestos pueden variar si cambia disponibilidad o marca.
            </Text>
          </View>
        ) : null}

        <View style={[styles.paper, styles.totalPaper, wide && styles.totalWide]}>
          {Number(data.costo_repuestos_clp) > 0 ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabelMuted}>Repuestos</Text>
              <Text style={styles.lineValueMuted}>{formatCLP(data.costo_repuestos_clp)}</Text>
            </View>
          ) : null}
          <View style={styles.lineRow}>
            <Text style={styles.lineLabelMuted}>Mano de obra</Text>
            <Text style={styles.lineValueMuted}>{formatCLP(data.mano_obra_clp)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabelMuted}>Neto</Text>
            <Text style={styles.lineValueMuted}>{formatCLP(iva.neto)}</Text>
          </View>
          <View style={styles.lineRow}>
            <Text style={styles.lineLabelMuted}>IVA 19%</Text>
            <Text style={styles.lineValueMuted}>{formatCLP(iva.iva)}</Text>
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
      </View>

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

      <View style={styles.downloadWrap}>{downloadBtn}</View>

      <Text style={styles.issued}>Emitida en Mecanimovil</Text>
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
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {data.numero_publico ? `#${data.numero_publico}` : 'Cotización'}
        </Text>
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

      {puedeResponder ? (
        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 12) },
          ]}
        >
          <View style={[styles.stickyInner, contentWidthStyle]}>
            <View style={styles.actionCopy}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle} numberOfLines={1}>
                  ¿Aceptas {formatCLP(data.total_clp)}?
                </Text>
                {wide && data.fecha_expiracion_publica ? (
                  <Text style={styles.actionExpiry} numberOfLines={1}>
                    Hasta {formatFechaCorta(data.fecha_expiracion_publica)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.actionHint} numberOfLines={wide ? 1 : 2}>
                {hintFooterAceptacion(data)}
                {!wide && data.fecha_expiracion_publica
                  ? ` · Hasta ${formatFechaCorta(data.fecha_expiracion_publica)}`
                  : ''}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Button
                title="Rechazar"
                type="secondary"
                variant="outline"
                size="lg"
                onPress={() => void handleRechazar()}
                disabled={submitting}
                style={styles.rejectBtn}
              />
              <View style={styles.acceptWrap}>
                <GuestGradientButton
                  title={submitting ? 'Enviando…' : 'Aceptar'}
                  accessibilityLabel="Aceptar cotización"
                  onPress={() => void handleAceptar()}
                  loading={submitting}
                  disabled={submitting}
                  fullWidth
                />
              </View>
            </View>
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
      ? { height: '100%', maxHeight: '100vh', overflow: 'hidden' }
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
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  topBarSpacer: { width: 40 },
  scrollView: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? { WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }
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
  facts: {
    backgroundColor: COLORS.badge.meta.background,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  factsWide: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  factCol: { flex: 1, gap: 4, minWidth: 0 },
  factColHalf: { flex: 1 },
  hero: { gap: SPACING.xs },
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
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.xl,
    lineHeight: 28,
    color: COLORS.text.primary,
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
  totalPaper: { gap: SPACING.sm },
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
  bodyMuted: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },
  hint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  bottomRow: { gap: SPACING.md },
  bottomRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteAmber: {
    backgroundColor: COLORS.warning.light,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  noteAmberWide: { flex: 1 },
  totalWide: { width: 320, flexShrink: 0 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
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
    color: COLORS.brand.magenta,
  },
  signedBanner: {
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
  downloadWrap: { marginTop: SPACING.xs },
  issued: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingBottom: SPACING.md,
  },
  stickyFooter: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    ...SHADOWS.md,
    zIndex: 10,
  },
  stickyInner: { gap: SPACING.sm },
  actionCopy: { gap: 2 },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  actionTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  actionExpiry: {
    flexShrink: 0,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  actionHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  rejectBtn: {
    flex: 1,
  },
  acceptWrap: {
    flex: 1.55,
  },
});

export default CotizacionPublicaScreen;
