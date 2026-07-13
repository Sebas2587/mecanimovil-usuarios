import React, { useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Wrench,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ClipboardEdit,
} from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import {
  getHealthColorToken,
  getHealthLabel,
  normalizePct,
  formatHealthActionWindow,
} from '../../utils/healthFormat';
import { buildShortDiagnosticSummary } from '../../utils/componentDiagnosticCopy';
import ComponentDiagnosticInsights from './ComponentDiagnosticInsights';
import Button from '../base/Button/Button';

/**
 * Sheet a pantalla completa (patrón Airbnb / pageSheet) con el detalle
 * de un componente de salud: estado, timing, riesgo, confianza y servicios.
 */
export default function ComponentHealthDetailSheet({
  visible,
  metric,
  servicios = [],
  onClose,
  onSelectService,
  onAgendarGeneric,
  onDeclare,
}) {
  const insets = useSafeAreaInsets();

  const name =
    metric?.name ||
    metric?.nombre ||
    (typeof metric?.componente === 'string' ? metric.componente : null) ||
    'Componente';

  const pct = useMemo(() => {
    if (!metric) return null;
    const raw = metric.salud_porcentaje ?? metric.salud ?? metric.salud_actual;
    if (raw == null) return null;
    return Math.round(normalizePct(raw));
  }, [metric]);

  const healthColor = pct != null ? getHealthColorToken(COLORS, pct) : COLORS.text.tertiary;
  const healthLabel = pct != null ? getHealthLabel(pct) : null;

  const handlePrimaryAgendar = useCallback(() => {
    if (!metric) return;
    if (servicios.length > 0) {
      onSelectService?.(servicios[0], metric);
      return;
    }
    onAgendarGeneric?.(metric);
  }, [metric, servicios, onSelectService, onAgendarGeneric]);

  if (!metric) return null;

  const pred = metric._prediction;
  const km = pred?.km_hasta_servicio ?? null;
  const dias = pred?.dias_hasta_atencion ?? null;
  const immediate = (km != null && km <= 0) || (dias != null && dias <= 0);
  const clima = pred?.factor_clima ?? 1.0;
  const actionWindow = formatHealthActionWindow({ km, days: dias });
  const fallback = metric.vida_util;
  const showAction = !!(actionWindow || fallback || immediate);

  const risk = pred?.probabilidad_falla_30;
  const showRisk = risk != null && risk >= 25;
  const riskSevere = Math.round(risk || 0) >= 50;

  const confianza =
    metric.confianza_historial ||
    (metric.historial_fuente === 'CHECKLIST' || metric.historial_fuente === 'REGISTRO_INICIAL'
      ? 'alta'
      : metric.historial_fuente === 'USUARIO_DECLARADO'
        ? 'media'
        : metric.historial_conocido === false
          ? 'baja'
          : 'alta');
  const showDeclareBtn = confianza === 'baja' || confianza === 'media';
  const badgeColor =
    confianza === 'alta'
      ? COLORS.success.main
      : confianza === 'media'
        ? COLORS.warning.main
        : COLORS.text.secondary;
  const badgeBg =
    confianza === 'alta'
      ? COLORS.success[50]
      : confianza === 'media'
        ? COLORS.warning[50]
        : COLORS.neutral.gray[100];
  const badgeLabel =
    confianza === 'alta'
      ? 'Verificado por taller'
      : confianza === 'media'
        ? metric.historial_fuente_display || 'Declarado por ti'
        : 'Estimado (sin historial)';

  const nivel = metric.nivel_alerta_display || metric.nivel_alerta || healthLabel || '';

  const fechaSrv = metric.fecha_ultimo_servicio ? new Date(metric.fecha_ultimo_servicio) : null;
  const fechaTxt =
    fechaSrv && !Number.isNaN(fechaSrv.getTime())
      ? fechaSrv.toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.handleWrap, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 8 }]}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <Text style={styles.title} numberOfLines={2}>
              {name}
            </Text>
            {pct != null ? (
              <View style={styles.headerMeta}>
                <View style={[styles.statusPill, { backgroundColor: withOpacity(healthColor, 0.12) }]}>
                  <View style={[styles.statusDot, { backgroundColor: healthColor }]} />
                  <Text style={[styles.statusPillText, { color: healthColor }]}>
                    {healthLabel} · {pct}%
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <X size={22} color={COLORS.text.primary} strokeWidth={2} fill="none" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {pct != null ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Estado actual</Text>
              <View style={styles.healthRow}>
                {metric.historial_conocido === false ? (
                  <Text style={styles.estimadoInline}>Estimado</Text>
                ) : (
                  <Text style={styles.healthCaption}>{nivel}</Text>
                )}
                <Text style={[styles.healthPct, { color: healthColor }]}>{pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${pct}%`, backgroundColor: healthColor }]}
                />
              </View>
            </View>
          ) : null}

          {showAction ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cuándo actuar</Text>
              {immediate ? (
                <Text style={[styles.sectionValue, { color: COLORS.error.main }]}>
                  Atención inmediata requerida
                </Text>
              ) : (
                <Text style={styles.sectionValue}>{actionWindow || fallback}</Text>
              )}
              {clima > 1.08 ? (
                <Text style={styles.climaNote}>
                  El clima en tu zona acelera el desgaste un {Math.round((clima - 1) * 100)}%;
                  considera adelantar la revisión.
                </Text>
              ) : null}
            </View>
          ) : null}

          {showRisk ? (
            <View
              style={[
                styles.riskBanner,
                {
                  backgroundColor: riskSevere ? COLORS.error[50] : COLORS.warning[50],
                },
              ]}
            >
              <AlertTriangle
                size={16}
                color={riskSevere ? COLORS.error.main : COLORS.warning.main}
                strokeWidth={2}
                fill="none"
              />
              <Text
                style={[
                  styles.riskText,
                  { color: riskSevere ? COLORS.error.main : COLORS.warning.main },
                ]}
              >
                {riskSevere
                  ? `Alta probabilidad de falla en los próximos 30 días (${Math.round(risk)}%)`
                  : `Probabilidad de falla en 30 días: ${Math.round(risk)}%`}
              </Text>
            </View>
          ) : null}

          <View style={[styles.confianzaRow, { backgroundColor: badgeBg }]}>
            {confianza === 'alta' ? (
              <ShieldCheck size={14} color={badgeColor} strokeWidth={2} fill="none" />
            ) : (
              <ShieldAlert size={14} color={badgeColor} strokeWidth={2} fill="none" />
            )}
            <Text style={[styles.confianzaText, { color: badgeColor }]}>{badgeLabel}</Text>
            {showDeclareBtn ? (
              <TouchableOpacity
                style={styles.declararBtn}
                onPress={() => onDeclare?.(metric)}
                accessibilityRole="button"
              >
                <ClipboardEdit size={13} color={COLORS.primary[500]} strokeWidth={2} fill="none" />
                <Text style={styles.declararBtnText}>
                  {confianza === 'baja' ? 'Declarar km' : 'Actualizar km'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {metric.historial_fuente === 'CHECKLIST' && metric.salud_anclada_pct != null ? (
            <View style={styles.inspeccionBlock}>
              <ClipboardEdit size={14} color={COLORS.success.main} strokeWidth={2} fill="none" />
              <Text style={styles.inspeccionText}>
                {fechaTxt
                  ? `Inspeccionado el ${fechaTxt} — declarado en ${Math.round(Number(metric.salud_anclada_pct))}%`
                  : `Declarado por taller en ${Math.round(Number(metric.salud_anclada_pct))}%`}
              </Text>
            </View>
          ) : null}

          <ComponentDiagnosticInsights component={metric} prediction={pred} />

          {servicios.length > 0 ? (
            <View style={styles.servicesBlock}>
              <Text style={styles.sectionLabel}>Servicios sugeridos</Text>
              <Text style={styles.sectionHint}>
                Elige uno para agendar sin volver a seleccionar el tipo de servicio.
              </Text>
              {servicios.map((srv) => (
                <TouchableOpacity
                  key={srv.id}
                  style={styles.serviceCard}
                  activeOpacity={0.85}
                  onPress={() => onSelectService?.(srv, metric)}
                >
                  <View style={styles.serviceIcon}>
                    <Wrench size={20} color={COLORS.primary[500]} strokeWidth={2} fill="none" />
                  </View>
                  <View style={styles.serviceBody}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>
                      {srv.nombre}
                    </Text>
                    {srv.descripcion ? (
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {srv.descripcion}
                      </Text>
                    ) : null}
                    {srv.precio_referencia != null ? (
                      <Text style={styles.serviceMeta}>
                        Desde ${Number(srv.precio_referencia).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} fill="none" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            title={servicios.length > 0 ? 'Agendar servicio' : 'Cotizar / Nueva solicitud'}
            onPress={handlePrimaryAgendar}
            accessibilityLabel="Agendar servicio para este componente"
          />
          {servicios.length > 0 ? (
            <TouchableOpacity
              style={styles.footerSecondary}
              onPress={() => onAgendarGeneric?.(metric)}
            >
              <Text style={styles.footerSecondaryText}>Otra solicitud sin preselección</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Helper reutilizado por la screen al armar la descripción de solicitud. */
export function buildMetricServiceNavPayload(metric, srv) {
  const name =
    metric?.name ||
    metric?.nombre ||
    (typeof metric?.componente === 'string' ? metric.componente : null) ||
    'Componente';
  const descripcion = buildShortDiagnosticSummary(metric, metric?._prediction);
  const payload = {
    descripcionPrellenada: descripcion
      ? `[${name}] ${descripcion}`
      : `[${name}] Mantenimiento sugerido`,
  };
  if (srv?.id != null) {
    payload.servicioPreseleccionado = {
      id: Number(srv.id) || srv.id,
      nombre: srv.nombre || 'Servicio',
      descripcion: srv.descripcion || '',
      precio_referencia:
        srv.precio_referencia != null ? Number(srv.precio_referencia) : undefined,
    };
  }
  return payload;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
    gap: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },
  headerMeta: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    ...TYPOGRAPHY.styles.captionBold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray[100],
  },
  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  section: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  sectionValue: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  sectionHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  healthCaption: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  healthPct: {
    ...TYPOGRAPHY.styles.h4,
  },
  estimadoInline: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neutral.gray[100],
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  climaNote: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.warning.main,
    marginTop: 6,
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
  },
  riskText: {
    ...TYPOGRAPHY.styles.captionBold,
    flex: 1,
  },
  confianzaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.sm,
    flexWrap: 'wrap',
  },
  confianzaText: {
    ...TYPOGRAPHY.styles.captionBold,
    flex: 1,
  },
  declararBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  declararBtnText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  inspeccionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.sm,
    backgroundColor: COLORS.success[50],
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  inspeccionText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.success.main,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  servicesBlock: {
    marginTop: SPACING.xs,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.neutral.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  serviceBody: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
  },
  serviceDesc: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.secondary,
  },
  serviceMeta: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
    marginTop: SPACING.xxs,
  },
  footer: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  footerSecondary: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerSecondaryText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
