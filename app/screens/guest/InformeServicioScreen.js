import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Check, ChevronDown, ChevronUp, QrCode } from 'lucide-react-native';
import BackButton from '../../components/navigation/BackButton';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import Button from '../../components/base/Button/Button';
import SignaturePad from '../../components/signature/SignaturePad';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import {
  firmarInformeCliente,
  obtenerInformePublico,
  reclamarInformeServicio,
} from '../../services/informeServicioService';
import { savePendingInformeClaimIntent } from '../../utils/guestIntent';
import { useAuth } from '../../context/AuthContext';
import { getInformeTokenFromWebPath } from '../../utils/publicListingRoute';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const SIGNATURE_WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px dashed #B8B8B8; border-radius: 12px; }
  .m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad--footer button { display: none !important; }
`;

function formatKm(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${Math.round(n).toLocaleString('es-CL')} km`;
}

function vehicleHeadline(vehiculo) {
  if (!vehiculo) return 'Tu vehículo';
  const parts = [vehiculo.marca, vehiculo.modelo, vehiculo.anio].filter(Boolean);
  return parts.join(' ') || vehiculo.patente || 'Tu vehículo';
}

function splitResumenParagraphs(text) {
  if (!text) return [];
  return String(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function photoGridMetrics(contentWidth) {
  const gap = SPACING.xs;
  const cols = contentWidth >= 720 ? 3 : contentWidth >= 420 ? 2 : 1;
  const tile = Math.max(
    120,
    Math.floor((contentWidth - gap * (cols - 1)) / cols),
  );
  return { cols, gap, tile, height: Math.round(tile * 0.72) };
}

function PhotoGrid({ fotos, contentWidth }) {
  const { gap, tile, height } = photoGridMetrics(contentWidth);
  if (!fotos?.length) return null;
  return (
    <View style={[styles.photoGrid, { gap }]}>
      {fotos.map((foto) => (
        <Image
          key={foto.id}
          source={{ uri: foto.imagen_url }}
          style={[styles.photoTile, { width: tile, height }]}
          resizeMode="cover"
          accessibilityLabel={foto.descripcion || 'Foto del servicio'}
        />
      ))}
    </View>
  );
}

const InformeServicioScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const signatureRef = useRef(null);
  const contentWidth = Math.min(width - SPACING.lg * 2, 720);

  const token = useMemo(() => {
    const fromRoute = route.params?.token;
    if (fromRoute) return String(fromRoute).trim();
    if (Platform.OS === 'web') return getInformeTokenFromWebPath();
    return null;
  }, [route.params?.token]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [informe, setInforme] = useState(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showHallazgos, setShowHallazgos] = useState(true);
  const [showDetalleChecklist, setShowDetalleChecklist] = useState(true);

  const cargarInforme = useCallback(async () => {
    if (!token) {
      setError('Enlace de informe inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerInformePublico(token);
      setInforme(data);
      if (data?.cliente_nombre && !nombreCliente) {
        setNombreCliente(String(data.cliente_nombre).trim());
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'No se pudo cargar el informe');
    } finally {
      setLoading(false);
    }
  }, [token, nombreCliente]);

  useEffect(() => {
    void cargarInforme();
  }, [cargarInforme]);

  const yaFirmado = informe?.estado === 'FIRMADO' || informe?.estado === 'VEHICULO_RECLAMADO';
  const puedeFirmar = informe?.estado === 'PENDIENTE_FIRMA_CLIENTE' && !yaFirmado;

  const resumenParrafos = useMemo(
    () => splitResumenParagraphs(informe?.resumen_ia),
    [informe?.resumen_ia],
  );
  const hallazgos = informe?.hallazgos || [];
  const checklistItems = informe?.checklist?.items || [];
  const itemsConValor = useMemo(
    () => checklistItems.filter((it) => it.completado),
    [checklistItems],
  );
  const kmLabel = formatKm(informe?.vehiculo?.kilometraje_servicio);
  const qrPayload = informe?.qr_payload || informe?.url_publica;

  const claimVehicleData = useMemo(() => ({
    patente: informe?.vehiculo?.patente,
    marca_nombre: informe?.vehiculo?.marca,
    modelo_nombre: informe?.vehiculo?.modelo,
    year: informe?.vehiculo?.anio,
    anio: informe?.vehiculo?.anio,
    vin: informe?.vehiculo?.vin,
    kilometraje_api: informe?.vehiculo?.kilometraje_api,
    mileage_sii: informe?.vehiculo?.kilometraje_api,
  }), [informe]);

  const handleFirmar = useCallback(async (firmaBase64) => {
    if (!token || !firmaBase64) return;
    const nombre = nombreCliente.trim();
    if (!nombre) {
      showAlert('Nombre requerido', 'Indica tu nombre para certificar el servicio.');
      return;
    }
    setSubmitting(true);
    try {
      await firmarInformeCliente(token, {
        firma_cliente: firmaBase64,
        firmado_por_nombre: nombre,
      });
      showAlert('¡Gracias!', 'Servicio certificado correctamente.');
      await cargarInforme();
    } catch (e) {
      showAlert(
        'No se pudo firmar',
        e?.response?.data?.error || e?.message || 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [token, nombreCliente, cargarInforme]);

  const handleLeerFirma = () => {
    signatureRef.current?.readSignature();
  };

  const handleCrearCuenta = async () => {
    if (!informe) return;
    await savePendingInformeClaimIntent({ token, vehicleData: claimVehicleData });
    navigation.navigate(ROUTES.REGISTER);
  };

  const handleReclamar = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const result = await reclamarInformeServicio(token);
      showAlert('Servicio vinculado', result?.message || 'El servicio quedó en tu vehículo.');
      await cargarInforme();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'No se pudo vincular el servicio';
      if (msg.toLowerCase().includes('registra tu vehículo') || msg.toLowerCase().includes('registrar')) {
        await savePendingInformeClaimIntent({ token, vehicleData: claimVehicleData });
        navigation.navigate(ROUTES.CREAR_VEHICULO, {
          prefillPatente: informe?.vehiculo?.patente,
          prefillVehicleData: claimVehicleData,
          pendingInformeClaimToken: token,
        });
        return;
      }
      showAlert('No se pudo vincular', msg);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.brand.magenta} />
          <Text style={styles.loadingText}>Cargando informe…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !informe) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Informe no encontrado'}</Text>
          <GuestGradientButton title="Reintentar" onPress={() => void cargarInforme()} />
        </View>
      </SafeAreaView>
    );
  }

  const goBack = () => (
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate(ROUTES.GUEST_LANDING)
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[COLORS.base.soft, COLORS.background.default, COLORS.background.default]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <BackButton onPress={goBack} />
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Mecanimovil" />
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { maxWidth: 752, width: '100%', alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: una composición — marca, vehículo, meta */}
        <View style={styles.hero}>
          <Text style={styles.brandKicker}>
            {informe.taller_nombre || 'Informe de servicio'}
          </Text>
          <Text style={styles.heroTitle}>{vehicleHeadline(informe.vehiculo)}</Text>
          <Text style={styles.heroSupport}>
            {informe.checklist?.template_nombre
              || 'Resumen del trabajo realizado en taller'}
          </Text>
          <View style={styles.metaRow}>
            {informe.vehiculo?.patente ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{informe.vehiculo.patente}</Text>
              </View>
            ) : null}
            {kmLabel ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{kmLabel}</Text>
              </View>
            ) : null}
            {yaFirmado ? (
              <View style={[styles.metaPill, styles.metaPillOk]}>
                <Check size={12} color={COLORS.brand.magenta} strokeWidth={2.5} />
                <Text style={[styles.metaPillText, styles.metaPillOkText]}>Certificado</Text>
              </View>
            ) : (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>Pendiente de firma</Text>
              </View>
            )}
          </View>
        </View>

        {/* Resumen narrativo — sin card pesada */}
        {resumenParrafos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Qué se hizo</Text>
            {resumenParrafos.map((p, idx) => (
              <Text key={`p-${idx}`} style={styles.resumenParagraph}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Hallazgos relevantes (plegable) */}
        {hallazgos.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.disclosureHeader}
              onPress={() => setShowHallazgos((v) => !v)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ expanded: showHallazgos }}
            >
              <Text style={styles.sectionLabel}>Hallazgos a tener presente</Text>
              {showHallazgos
                ? <ChevronUp size={20} color={COLORS.icon.default} strokeWidth={2} />
                : <ChevronDown size={20} color={COLORS.icon.default} strokeWidth={2} />}
            </TouchableOpacity>
            {showHallazgos ? (
              <View style={styles.hallazgosList}>
                {hallazgos.map((h) => (
                  <View key={String(h.id)} style={styles.hallazgoRow}>
                    <View style={styles.hallazgoDot} />
                    <View style={styles.hallazgoBody}>
                      <Text style={styles.hallazgoTitle}>{h.pregunta}</Text>
                      <Text style={styles.hallazgoValue}>{h.valor}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Detalle del checklist: pregunta + valor del técnico + fotos */}
        {itemsConValor.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.disclosureHeader}
              onPress={() => setShowDetalleChecklist((v) => !v)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ expanded: showDetalleChecklist }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sectionLabel}>Detalle del checklist</Text>
                <Text style={styles.sectionMeta}>
                  {informe.checklist?.items_completados ?? itemsConValor.length}
                  {informe.checklist?.items_total
                    ? ` de ${informe.checklist.items_total}`
                    : ''}{' '}
                  ítems con respuesta del técnico
                </Text>
              </View>
              {showDetalleChecklist
                ? <ChevronUp size={20} color={COLORS.icon.default} strokeWidth={2} />
                : <ChevronDown size={20} color={COLORS.icon.default} strokeWidth={2} />}
            </TouchableOpacity>

            {showDetalleChecklist ? (
              <View style={styles.checklistList}>
                {itemsConValor.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.checklistItem,
                      item.es_hallazgo && styles.checklistItemHallazgo,
                    ]}
                  >
                    <View style={styles.checklistItemHeader}>
                      <Text style={styles.checklistQuestion}>{item.pregunta_texto}</Text>
                      <Text
                        style={[
                          styles.checklistValue,
                          item.es_hallazgo && styles.checklistValueHallazgo,
                        ]}
                      >
                        {item.valor || '—'}
                      </Text>
                    </View>
                    {item.fotos?.length ? (
                      <View style={styles.checklistPhotosWrap}>
                        <Text style={styles.photoCountLabel}>
                          {item.fotos.length} foto{item.fotos.length === 1 ? '' : 's'} de evidencia
                        </Text>
                        <PhotoGrid fotos={item.fotos} contentWidth={contentWidth} />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {yaFirmado ? (
          <View style={styles.signedBanner}>
            <Check size={22} color={COLORS.brand.magenta} strokeWidth={2.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.signedTitle}>Servicio certificado</Text>
              {informe.firmado_por_nombre ? (
                <Text style={styles.signedMeta}>Firmado por {informe.firmado_por_nombre}</Text>
              ) : null}
              {informe.reclamado ? (
                <Text style={styles.signedMeta}>Ya vinculado a tu vehículo en Mecanimovil</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Firma — único contenedor de interacción */}
        {puedeFirmar ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Certifica el servicio</Text>
            <Text style={styles.actionHint}>
              Confirma que recibiste el trabajo descrito. No necesitas crear una cuenta.
            </Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Tu nombre completo"
              placeholderTextColor={COLORS.text.hint}
              value={nombreCliente}
              onChangeText={setNombreCliente}
            />
            <View style={styles.signatureBox}>
              <SignaturePad
                ref={signatureRef}
                onOK={handleFirmar}
                onEmpty={() => showAlert('Firma requerida', 'Dibuja tu firma antes de continuar.')}
                onBegin={() => setHasDrawn(true)}
                webStyle={SIGNATURE_WEB_STYLE}
                style={styles.signaturePad}
              />
            </View>
            <GuestGradientButton
              title={submitting ? 'Enviando…' : 'Certificar servicio'}
              onPress={handleLeerFirma}
              loading={submitting}
              disabled={submitting || !hasDrawn}
              fullWidth
            />
          </View>
        ) : null}

        {yaFirmado && !informe.reclamado ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Lleva el control de tu auto</Text>
            <Text style={styles.actionHint}>
              Vincula este servicio a tu vehículo para ver la salud oficial y el historial en Mecanimovil.
            </Text>
            {isAuthenticated ? (
              <>
                <GuestGradientButton
                  title={claiming ? 'Vinculando…' : 'Vincular a mi vehículo'}
                  onPress={() => void handleReclamar()}
                  loading={claiming}
                  fullWidth
                />
                <Button
                  title="Escanear código QR"
                  variant="secondary"
                  onPress={() => navigation.navigate(ROUTES.ESCANEAR_INFORME_SERVICIO)}
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            ) : (
              <>
                <GuestGradientButton
                  title="Crear cuenta gratis"
                  onPress={() => void handleCrearCuenta()}
                  fullWidth
                />
                <Button
                  title="Ya tengo cuenta — iniciar sesión"
                  variant="secondary"
                  onPress={async () => {
                    await savePendingInformeClaimIntent({
                      token,
                      vehicleData: claimVehicleData,
                    });
                    navigation.navigate(ROUTES.LOGIN);
                  }}
                  fullWidth
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            )}
          </View>
        ) : null}

        {/* QR discreto / plegable */}
        {qrPayload ? (
          <View style={styles.qrSection}>
            <TouchableOpacity
              style={styles.disclosureHeader}
              onPress={() => setShowQr((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.qrHeaderLeft}>
                <QrCode size={18} color={COLORS.icon.default} strokeWidth={2} />
                <Text style={styles.qrHeaderText}>Código del informe</Text>
              </View>
              {showQr
                ? <ChevronUp size={20} color={COLORS.icon.default} strokeWidth={2} />
                : <ChevronDown size={20} color={COLORS.icon.default} strokeWidth={2} />}
            </TouchableOpacity>
            {showQr ? (
              <>
                <Text style={styles.qrHint}>
                  Ábrelo en otro dispositivo o úsalo al registrar tu auto.
                </Text>
                <View style={styles.qrWrap}>
                  <QRCode value={String(qrPayload)} size={Math.min(width - 140, 180)} />
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
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
  errorText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.error.main,
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
  sectionLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  sectionMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  resumenParagraph: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 24,
    color: COLORS.text.primary,
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  hallazgosList: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  hallazgoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  hallazgoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand.orange,
    marginTop: 7,
  },
  hallazgoBody: {
    flex: 1,
    gap: 2,
  },
  hallazgoTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  },
  hallazgoValue: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },
  checklistList: {
    marginTop: SPACING.sm,
    gap: 0,
  },
  checklistItem: {
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  checklistItemHallazgo: {
    backgroundColor: withOpacity(COLORS.brand.orange, 0.04),
    marginHorizontal: -SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
  },
  checklistItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  checklistQuestion: {
    flex: 1,
    minWidth: 0,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  checklistValue: {
    flexShrink: 0,
    maxWidth: '46%',
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  checklistValueHallazgo: {
    color: COLORS.brand.orange,
  },
  checklistPhotosWrap: {
    gap: SPACING.xs,
  },
  photoCountLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoTile: {
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.buttonSecondary.background,
  },
  signedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.border.main,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default,
  },
  signatureBox: {
    height: 180,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.base.white,
  },
  signaturePad: {
    flex: 1,
  },
  qrSection: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  qrHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  qrHeaderText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },
  qrHint: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  qrWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
});

export default InformeServicioScreen;
