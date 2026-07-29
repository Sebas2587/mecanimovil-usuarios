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
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  QrCode,
  ShieldAlert,
  Wrench,
} from 'lucide-react-native';
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

function sanitizeName(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.startsWith('data:') || s.startsWith('iVBORw') || s.length > 45 || /^[A-Za-z0-9+/=]{30,}$/.test(s)) {
    return '';
  }
  return s;
}

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

function splitResumenParagraphs(text, { stripHallazgosBlock = false } = {}) {
  if (!text) return [];
  let raw = String(text).trim();
  if (stripHallazgosBlock) {
    raw = raw
      .replace(/\n*Hallazgos que conviene tener presente:[\s\S]*?(?=\n\n[A-ZÁÉÍÓÚ¡]|El resto|\n*$)/i, '')
      .replace(/\n*El resto de la inspección[^\n.]+\.?/gi, '')
      .replace(/\n*La inspección no presentó observaciones críticas[^\n.]+\.?/gi, '')
      .trim();
  }
  return raw
    .split(/\n{2,}/)
    .map((p) => p
      .replace(/\s+\n/g, '\n')
      .replace(/\.\s*con\s+/gi, '. Con ')
      .replace(/^[•\-*]\s+/gm, '')
      .trim())
    .filter((p) => p && !/^•/.test(p) && !p.includes('Hallazgos que conviene'));
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
      {fotos.map((foto, index) => {
        const caption = String(foto.descripcion || '').trim() || `Foto ${index + 1}`;
        return (
          <View key={foto.id} style={[styles.photoCard, { width: tile }]}>
            <Image
              source={{ uri: foto.imagen_url }}
              style={[styles.photoTile, { width: tile, height }]}
              resizeMode="cover"
              accessibilityLabel={caption}
            />
            <Text style={styles.photoCaption} numberOfLines={3}>
              {caption}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const SEVERIDAD_COLORS = {
  ok: COLORS.success.main,
  atencion: COLORS.warning.main,
  alerta: COLORS.brand.orange,
  critico: COLORS.error.main,
};

function severityColor(severidad) {
  return SEVERIDAD_COLORS[severidad] || COLORS.text.secondary;
}

/** Valor de amenity: % con barra por gravedad, o texto. */
function AmenityValue({ item, attentionStyle }) {
  const formato = item?.formato;
  const pct = Number(item?.porcentaje);
  if (formato === 'porcentaje' && Number.isFinite(pct)) {
    const color = severityColor(item.severidad);
    const widthPct = Math.max(0, Math.min(100, pct));
    return (
      <View style={styles.pctValueWrap}>
        <View style={styles.pctBarTrack}>
          <View style={[styles.pctBarFill, { width: `${widthPct}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.pctValueText, { color }]}>
          {item.valor || `${Math.round(widthPct)}%`}
        </Text>
      </View>
    );
  }
  return (
    <Text style={[styles.amenityValue, attentionStyle && styles.amenityValueAttention]}>
      {item?.valor || '—'}
    </Text>
  );
}

const KEYWORD_HIGHLIGHT_REGEX = /(crítico|critico|urgente|atención|atencion|reemplazo|reemplazar|desgaste|bajo|fuga|desalineado|daño|dañada|dañado|observación|observacion|inspección|inspeccion|revisar)/i;

/** Resalta el nombre del taller y palabras clave de atención dentro del resumen. */
function HighlightedResumenText({ text, tallerNombre, style }) {
  const taller = String(tallerNombre || '').trim();
  const body = String(text || '');
  if (!body) return null;

  const termPattern = taller
    ? `${taller.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|crítico|critico|urgente|atención|atencion|reemplazo|reemplazar|desgaste|bajo|fuga|desalineado|daño|dañada|dañado|observación|observacion|inspección|inspeccion|revisar`
    : 'crítico|critico|urgente|atención|atencion|reemplazo|reemplazar|desgaste|bajo|fuga|desalineado|daño|dañada|dañado|observación|observacion|inspección|inspeccion|revisar';

  const regex = new RegExp(`(${termPattern})`, 'gi');
  const parts = body.split(regex);

  if (parts.length <= 1) {
    return <Text style={style}>{body}</Text>;
  }

  return (
    <Text style={style}>
      {parts.map((part, idx) => {
        if (!part) return null;
        const isTaller = taller && part.toLowerCase() === taller.toLowerCase();
        const isAttention = !isTaller && KEYWORD_HIGHLIGHT_REGEX.test(part);

        if (isTaller) {
          return (
            <Text key={`p-${idx}`} style={styles.tallerHighlight}>
              {part}
            </Text>
          );
        }
        if (isAttention) {
          return (
            <Text key={`p-${idx}`} style={styles.attentionHighlight}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
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
  // Airbnb: listados largos parten cerrados; el cliente abre si quiere el detalle.
  const [showDetalleChecklist, setShowDetalleChecklist] = useState(false);
  const [itemFilter, setItemFilter] = useState('all'); // 'all' | 'attention' | 'photos'

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
      const cleanName = sanitizeName(data?.cliente_nombre || data?.firmado_por_nombre);
      if (cleanName && !nombreCliente) {
        setNombreCliente(cleanName);
      }
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status === 410) {
        setError('Este enlace de informe expiró. Solicita uno nuevo al taller.');
      } else {
        setError(e?.response?.data?.error || e?.message || 'No se pudo cargar el informe');
      }
    } finally {
      setLoading(false);
    }
  }, [token, nombreCliente]);

  useEffect(() => {
    void cargarInforme();
  }, [cargarInforme]);

  const yaFirmado = informe?.estado === 'FIRMADO' || informe?.estado === 'VEHICULO_RECLAMADO';
  const puedeFirmar = informe?.estado === 'PENDIENTE_FIRMA_CLIENTE' && !yaFirmado;

  const hallazgos = informe?.hallazgos || [];
  const resumenParrafos = useMemo(
    () => splitResumenParagraphs(informe?.resumen_ia, {
      stripHallazgosBlock: hallazgos.length > 0,
    }),
    [informe?.resumen_ia, hallazgos.length],
  );
  const checklistItems = informe?.checklist?.items || [];
  const itemsConValor = useMemo(
    () => checklistItems.filter((it) => it.completado),
    [checklistItems],
  );
  const itemsConFotos = useMemo(
    () => itemsConValor.filter((it) => (it.fotos || []).length > 0).length,
    [itemsConValor],
  );
  const itemsConHallazgoCount = useMemo(
    () => itemsConValor.filter((it) => it.es_hallazgo).length,
    [itemsConValor],
  );
  const filteredItems = useMemo(() => {
    if (itemFilter === 'attention') {
      return itemsConValor.filter((it) => it.es_hallazgo);
    }
    if (itemFilter === 'photos') {
      return itemsConValor.filter((it) => (it.fotos || []).length > 0);
    }
    return itemsConValor;
  }, [itemsConValor, itemFilter]);
  const kmLabel = formatKm(informe?.vehiculo?.kilometraje_servicio);
  const qrPayload = informe?.qr_payload || informe?.url_publica;

  const claimVehicleData = useMemo(() => {
    const v = informe?.vehiculo || {};
    const plate = v.patente ? String(v.patente).toUpperCase().trim() : null;
    return {
      patente: plate,
      marca: v.marca || null,
      marca_nombre: v.marca || null,
      modelo: v.modelo || null,
      modelo_nombre: v.modelo || null,
      year: v.anio || null,
      anio: v.anio || null,
      vin: v.vin || null,
      kilometraje_servicio: v.kilometraje_servicio ?? null,
      kilometraje_api: v.kilometraje_api ?? null,
      mileage_sii: v.kilometraje_api ?? null,
    };
  }, [informe]);

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

  const contentWidthStyle = { maxWidth: 752, width: '100%', alignSelf: 'center' };

  const informeBody = (
    <>
        {/* Hero: marca, vehículo, meta e info de taller sin card envolvente */}
        <View style={styles.hero}>
          <View style={styles.tallerHeaderRow}>
            {informe.taller_foto_url ? (
              <Image
                source={{ uri: informe.taller_foto_url }}
                style={styles.tallerAvatar}
                resizeMode="cover"
                accessibilityLabel={informe.taller_nombre || 'Taller'}
              />
            ) : (
              <View style={styles.tallerAvatarPlaceholder}>
                <Wrench size={18} color={COLORS.brand.orange} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.brandKicker} numberOfLines={1}>
                {informe.taller_nombre || 'Informe de servicio'}
              </Text>
              <View style={styles.tallerBadgeRow}>
                <CheckCircle2 size={13} color={COLORS.success.main} />
                <Text style={styles.tallerBadgeText}>Taller verificado Mecanimovil</Text>
              </View>
            </View>
          </View>

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

        {/* Sobre el servicio — prosa Airbnb */}
        {resumenParrafos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>Sobre el servicio</Text>
            <Text style={styles.sectionTitle}>Qué se hizo</Text>
            <View style={styles.sectionRule} />
            <View style={styles.resumenBlock}>
              {resumenParrafos.map((p, idx) => (
                <HighlightedResumenText
                  key={`p-${idx}`}
                  text={p}
                  tallerNombre={informe.taller_nombre}
                  style={idx === 0 ? styles.resumenLead : styles.resumenParagraph}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Hallazgos — tarjetas estructuradas con justificación y atención limpia */}
        {hallazgos.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.disclosureHeader}
              onPress={() => setShowHallazgos((v) => !v)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ expanded: showHallazgos }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sectionEyebrow}>Revisión preventiva</Text>
                <Text style={styles.sectionTitle}>Qué conviene revisar</Text>
                <Text style={styles.sectionMeta}>
                  {hallazgos.length} {hallazgos.length === 1 ? 'observación recomendada' : 'observaciones recomendadas'} por el taller
                </Text>
              </View>
              {showHallazgos
                ? <ChevronUp size={22} color={COLORS.icon.default} strokeWidth={2} />
                : <ChevronDown size={22} color={COLORS.icon.default} strokeWidth={2} />}
            </TouchableOpacity>
            <View style={styles.sectionRule} />
            {showHallazgos ? (
              <View style={styles.hallazgosContainer}>
                {hallazgos.map((h, idx) => (
                  <View key={String(h.id || idx)} style={styles.hallazgoCard}>
                    <View style={styles.hallazgoCardHeader}>
                      <View style={styles.hallazgoIconWrap}>
                        <AlertTriangle size={18} color={COLORS.brand.orange} />
                      </View>
                      <Text style={styles.hallazgoTitle}>{h.pregunta}</Text>
                      <View style={styles.attentionChip}>
                        <Text style={styles.attentionChipText}>Atención</Text>
                      </View>
                    </View>
                    <View style={styles.hallazgoCardBody}>
                      <AmenityValue item={h} attentionStyle />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Detalle checklist — Respuestas estructuradas del técnico */}
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
                <Text style={styles.sectionEyebrow}>Inspección detallada</Text>
                <Text style={styles.sectionTitle}>Respuestas del técnico</Text>
                <Text style={styles.sectionMeta}>
                  {informe.checklist?.items_completados ?? itemsConValor.length}
                  {informe.checklist?.items_total
                    ? ` de ${informe.checklist.items_total}`
                    : ''}{' '}
                  puntos revisados
                  {itemsConFotos > 0 ? ` · ${itemsConFotos} con fotos` : ''}
                </Text>
              </View>
              {showDetalleChecklist
                ? <ChevronUp size={22} color={COLORS.icon.default} strokeWidth={2} />
                : <ChevronDown size={22} color={COLORS.icon.default} strokeWidth={2} />}
            </TouchableOpacity>
            <View style={styles.sectionRule} />

            {!showDetalleChecklist ? (
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => setShowDetalleChecklist(true)}
                activeOpacity={0.88}
              >
                <Text style={styles.showAllBtnText}>
                  Ver las {itemsConValor.length} respuestas del técnico
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.checklistDetailContainer}>
                {/* Filtros rápidos por estado */}
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, itemFilter === 'all' && styles.filterPillActive]}
                    onPress={() => setItemFilter('all')}
                  >
                    <Text style={[styles.filterPillText, itemFilter === 'all' && styles.filterPillTextActive]}>
                      Todos ({itemsConValor.length})
                    </Text>
                  </TouchableOpacity>
                  {itemsConHallazgoCount > 0 ? (
                    <TouchableOpacity
                      style={[styles.filterPill, itemFilter === 'attention' && styles.filterPillActive]}
                      onPress={() => setItemFilter('attention')}
                    >
                      <Text style={[styles.filterPillText, itemFilter === 'attention' && styles.filterPillTextActive]}>
                        Atención ({itemsConHallazgoCount})
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {itemsConFotos > 0 ? (
                    <TouchableOpacity
                      style={[styles.filterPill, itemFilter === 'photos' && styles.filterPillActive]}
                      onPress={() => setItemFilter('photos')}
                    >
                      <Text style={[styles.filterPillText, itemFilter === 'photos' && styles.filterPillTextActive]}>
                        Con fotos ({itemsConFotos})
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.checklistGrid}>
                  {filteredItems.map((item) => (
                    <View key={item.id} style={styles.checklistItemCard}>
                      <View style={styles.checklistItemHeader}>
                        <View style={styles.checklistItemTitleCol}>
                          <Text style={styles.checklistItemTitle}>{item.pregunta_texto}</Text>
                          {item.es_hallazgo ? (
                            <View style={styles.attentionChip}>
                              <Text style={styles.attentionChipText}>Atención</Text>
                            </View>
                          ) : null}
                        </View>
                        <AmenityValue
                          item={item}
                          attentionStyle={item.es_hallazgo && item.formato !== 'porcentaje'}
                        />
                      </View>
                      {item.fotos?.length ? (
                        <View style={styles.checklistPhotosWrap}>
                          <PhotoGrid
                            fotos={item.fotos}
                            contentWidth={Math.max(contentWidth - 24, 280)}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.showAllBtn}
                  onPress={() => setShowDetalleChecklist(false)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.showAllBtnText}>Ocultar respuestas</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* Sección ÚNICA de Certificación y Firma (1 sola card) */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Respaldo del servicio</Text>
          <Text style={styles.sectionTitle}>Certificación y Firma</Text>
          <View style={styles.sectionRule} />

          <View style={styles.singleSignatureCard}>
            {/* Certificación del Taller */}
            <View style={styles.firmaTecnicoRow}>
              <View style={styles.firmaBadgeIcon}>
                <CheckCircle2 size={18} color={COLORS.success.main} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.firmaRoleTitle}>Inspeccionado y Certificado por Taller</Text>
                <Text style={styles.firmaRoleSub}>{informe.taller_nombre || 'Taller verificado Mecanimovil'}</Text>
              </View>
              {informe.firmas?.tecnico || informe.firmas?.supervisor ? (
                <View style={styles.firmaMiniBadge}>
                  <Text style={styles.firmaMiniBadgeText}>Firma técnico ✓</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.signatureCardDivider} />

            {/* Bloque ÚNICO de Firma del Cliente (FIRMADO o PENDIENTE) */}
            {yaFirmado ? (
              <View style={styles.signedCompletedBlock}>
                <View style={styles.signedCompletedHeader}>
                  <CheckCircle2 size={20} color={COLORS.brand.magenta} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signedTitle}>Conformidad del Cliente</Text>
                    {informe.firmado_por_nombre ? (
                      <Text style={styles.signedMeta}>Firmado por {informe.firmado_por_nombre}</Text>
                    ) : null}
                  </View>
                </View>

                {informe.firmas?.cliente ? (
                  <View style={styles.firmaImageWrap}>
                    <Image
                      source={{ uri: informe.firmas.cliente }}
                      style={styles.firmaImg}
                      resizeMode="contain"
                      accessibilityLabel="Firma del cliente"
                    />
                    <Text style={styles.firmaVerifiedLabel}>Firma digital registrada</Text>
                  </View>
                ) : (
                  <View style={styles.firmaBadgeWrap}>
                    <Text style={styles.firmaVerifiedText}>✓ Servicio certificado por el cliente</Text>
                  </View>
                )}
              </View>
            ) : puedeFirmar ? (
              <View style={styles.interactiveSignatureBlock}>
                <Text style={styles.actionTitle}>Firma de conformidad del cliente</Text>
                <Text style={styles.actionHint}>
                  Confirma que recibiste el servicio realizado por el taller. No necesitas crear cuenta.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tu nombre completo</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Ej. Juan Pérez"
                    placeholderTextColor={COLORS.text.hint}
                    value={nombreCliente}
                    onChangeText={setNombreCliente}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.signaturePadHeader}>
                    <Text style={styles.inputLabel}>Tu firma digital</Text>
                    {hasDrawn ? (
                      <TouchableOpacity onPress={() => signatureRef.current?.clearSignature()}>
                        <Text style={styles.clearSignatureText}>Limpiar firma</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
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
                </View>

                <GuestGradientButton
                  title={submitting ? 'Guardando firma…' : 'Firmar y certificar servicio'}
                  onPress={handleLeerFirma}
                  loading={submitting}
                  disabled={submitting || !hasDrawn}
                  fullWidth
                />
              </View>
            ) : null}
          </View>
        </View>

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
    </>
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

      {/*
        ScrollView en todas las plataformas. En web el stack card usa overflow:hidden
        + altura acotada; el scroll lo maneja este ScrollView.
        Antes se delegaba overflowY:auto al card (sin ScrollView) y en iOS Safari el
        hijo flex:1 no expandía el scrollHeight → touch scroll bloqueado.
      */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {informeBody}
      </ScrollView>
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
          maxHeight: '100%',
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
    ...(Platform.OS === 'web'
      ? {
          height: '100%',
          maxHeight: '100%',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }
      : null),
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
  sectionMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  resumenBlock: {
    gap: SPACING.md,
    paddingTop: SPACING.xs,
  },
  resumenLead: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 28,
    color: COLORS.text.primary,
  },
  resumenParagraph: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 24,
    color: COLORS.text.secondary,
  },
  disclosureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
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
  amenityLabelCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
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
  amenityValueAttention: {
    color: COLORS.brand.orange,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
  },
  pctValueWrap: {
    flexShrink: 0,
    width: 112,
    alignItems: 'flex-end',
    gap: 6,
  },
  pctBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.badge.meta.background,
    overflow: 'hidden',
  },
  pctBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctValueText: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
  },
  tallerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  tallerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.buttonSecondary.background,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  tallerAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: withOpacity(COLORS.brand.orange, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallerVerifiedSub: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success.main,
    marginTop: 2,
  },
  tallerHighlight: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    color: COLORS.brand.orange,
  },
  attentionHighlight: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    color: COLORS.brand.orange,
    backgroundColor: withOpacity(COLORS.brand.orange, 0.08),
  },
  hallazgosContainer: {
    gap: SPACING.md,
    paddingTop: SPACING.xs,
  },
  hallazgoCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  hallazgoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hallazgoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: withOpacity(COLORS.brand.orange, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  hallazgoTitle: {
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  hallazgoCardBody: {
    marginTop: 2,
  },
  attentionChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.badge.especialista.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.badge.especialista.border,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
  },
  attentionChipText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.badge.especialista.text,
    letterSpacing: 0.2,
  },
  checklistDetailContainer: {
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.badge.meta.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
  },
  filterPillActive: {
    backgroundColor: COLORS.brand.magenta,
    borderColor: COLORS.brand.magenta,
  },
  filterPillText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  filterPillTextActive: {
    color: COLORS.base.white,
  },
  checklistGrid: {
    gap: SPACING.sm,
  },
  checklistItemCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    gap: SPACING.xs,
  },
  checklistItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  checklistItemTitleCol: {
    flex: 1,
    gap: 4,
  },
  checklistItemTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    color: COLORS.text.primary,
  },
  checklistPhotosWrap: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  showAllBtn: {
    marginTop: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1.5,
    borderColor: COLORS.brand.magenta,
    backgroundColor: withOpacity(COLORS.brand.magenta, 0.04),
    paddingHorizontal: SPACING.lg,
  },
  showAllBtnText: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.brand.magenta,
  },
  singleSignatureCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    gap: SPACING.md,
  },
  firmaTecnicoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  firmaBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.badge.meta.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firmaRoleTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.semibold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  firmaRoleSub: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  firmaMiniBadge: {
    backgroundColor: withOpacity(COLORS.success.main, 0.1),
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  firmaMiniBadgeText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success.main,
  },
  signatureCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
  },
  signedCompletedBlock: {
    gap: SPACING.md,
  },
  signedCompletedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
  interactiveSignatureBlock: {
    gap: SPACING.md,
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
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
  },
  signaturePadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearSignatureText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.brand.orange,
  },
  firmaImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.base.white,
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
    gap: 4,
  },
  firmaImg: {
    width: '100%',
    height: 80,
  },
  firmaVerifiedLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success.main,
  },
  firmaBadgeWrap: {
    backgroundColor: withOpacity(COLORS.success.main, 0.08),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
  },
  firmaVerifiedText: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.success.main,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoCard: {
    gap: 6,
  },
  photoTile: {
    borderRadius: BORDERS.radius.md,
    backgroundColor: COLORS.buttonSecondary.background,
  },
  photoCaption: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: COLORS.text.primary,
  },
  actionCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.light,
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
