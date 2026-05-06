import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ChevronRight, Cloud, AlertTriangle, Calendar, Gauge } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken } from '../../utils/healthFormat';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

// ─── Icono por slug ───────────────────────────────────────────────────────────
const ICON_MAP = {
  'aceite-motor':        { lib: 'MaterialCommunityIcons', name: 'oil' },
  'filtro-aceite':       { lib: 'MaterialCommunityIcons', name: 'filter' },
  'filtro-aire':         { lib: 'MaterialCommunityIcons', name: 'air-filter' },
  'filtro-cabina':       { lib: 'MaterialCommunityIcons', name: 'air-conditioner' },
  'refrigerante':        { lib: 'MaterialCommunityIcons', name: 'car-coolant-level' },
  'adblue':              { lib: 'MaterialCommunityIcons', name: 'water-plus' },
  'pastillas-freno':     { lib: 'MaterialCommunityIcons', name: 'car-brake-pad' },
  'discos-freno':        { lib: 'MaterialCommunityIcons', name: 'disc' },
  'liquido-frenos':      { lib: 'MaterialCommunityIcons', name: 'car-brake-fluid-level' },
  'neumaticos':          { lib: 'MaterialCommunityIcons', name: 'car-tire-alert' },
  'bujias':              { lib: 'MaterialCommunityIcons', name: 'spark-plug' },
  'bateria':             { lib: 'MaterialCommunityIcons', name: 'car-battery' },
  'correa-distribucion': { lib: 'MaterialCommunityIcons', name: 'link-variant' },
  'amortiguadores':      { lib: 'MaterialCommunityIcons', name: 'car-shocks' },
  'dpf':                 { lib: 'MaterialCommunityIcons', name: 'exhaust' },
  'default':             { lib: 'Ionicons',               name: 'construct-outline' },
};

function ComponentIcon({ slug, size = 22, color }) {
  const cfg = ICON_MAP[slug] || ICON_MAP['default'];
  if (cfg.lib === 'MaterialCommunityIcons')
    return <MaterialCommunityIcons name={cfg.name} size={size} color={color} />;
  if (cfg.lib === 'FontAwesome5')
    return <FontAwesome5 name={cfg.name} size={size} color={color} />;
  return <Ionicons name={cfg.name} size={size} color={color} />;
}

// ─── Helpers de formato ───────────────────────────────────────────────────────
function fmtKm(km) {
  if (km == null) return null;
  return `${Math.round(km).toLocaleString('es-CL')} km`;
}

function fmtDays(days) {
  if (days == null) return null;
  if (days <= 0) return 'Inmediato';
  if (days < 30) return `${days} días`;
  if (days < 365) return `${Math.round(days / 30)} mes${Math.round(days / 30) !== 1 ? 'es' : ''}`;
  return `${(days / 365).toFixed(1)} años`;
}

// ─── Badge de nivel ────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  CRITICO:  { label: 'Crítico',  bg: COLORS.error[50],   text: COLORS.error[600] },
  URGENTE:  { label: 'Urgente',  bg: COLORS.error[50],   text: COLORS.error[500] },
  ATENCION: { label: 'Atención', bg: COLORS.warning[50], text: COLORS.warning[700] },
  OPTIMO:   { label: 'Óptimo',   bg: COLORS.success[50], text: COLORS.success[600] },
  NORMAL:   { label: 'Normal',   bg: COLORS.neutral.gray[100], text: COLORS.text.tertiary },
};

function LevelBadge({ nivel }) {
  const key = (nivel || '').toUpperCase().replace(/\s+/g, '_');
  const cfg = LEVEL_CONFIG[key] || LEVEL_CONFIG['NORMAL'];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Chip pequeño ─────────────────────────────────────────────────────────────
function Chip({ label, color, bgColor, icon }) {
  return (
    <View style={[s.chip, { backgroundColor: bgColor }]}>
      {icon}
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Tarjeta unificada ────────────────────────────────────────────────────────
/**
 * Props:
 *  item  — componente de salud (healthData.componentes[*]) ya con prediction fusionada
 *  onPress — callback para abrir modal de detalle
 */
const UnifiedComponentCard = memo(({ item, onPress }) => {
  const name       = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
  const percentage = item.salud_porcentaje ?? item.salud ?? item.percentage ?? 0;
  const slug       = item.slug || item.componente_detail?.slug || item.icon_slug || '';
  const nivel      = item.nivel_alerta_display || item.nivel_alerta || 'NORMAL';
  const esEstimado = item.historial_conocido === false;

  // Predicción fusionada (puede ser null si aún no cargó)
  const pred = item._prediction ?? null;

  const healthColor = getHealthColorToken(COLORS, percentage);
  const iconColor   = esEstimado ? COLORS.neutral.gray[400] : healthColor;

  const needsAttention = percentage < 70;

  // Datos predictivos para mostrar
  const kmHasta     = pred?.km_hasta_servicio ?? item.km_estimados_restantes ?? item.vida_util_restante_km;
  const diasHasta   = pred?.dias_hasta_atencion;
  const riesgo30    = pred?.probabilidad_falla_30;
  const factorClima = pred?.factor_clima ?? 1.0;

  const kmLabel   = fmtKm(kmHasta);
  const diasLabel = fmtDays(diasHasta);
  const showRisk  = riesgo30 != null && riesgo30 >= 25;
  const showClima = factorClima > 1.08;

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      {/* Icono */}
      <View style={[s.iconWrap, { backgroundColor: withOpacity(iconColor, 0.12) }]}>
        <ComponentIcon slug={slug} size={22} color={iconColor} />
      </View>

      {/* Contenido */}
      <View style={s.content}>
        {/* Fila: nombre + badge + porcentaje */}
        <View style={s.row}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <LevelBadge nivel={nivel} />
          <Text style={[s.pct, { color: iconColor }]}>{Math.round(percentage)}%</Text>
        </View>

        {/* Barra de progreso */}
        <View style={s.barTrack}>
          <View style={[
            s.barFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: healthColor, opacity: esEstimado ? 0.5 : 1 },
          ]} />
        </View>

        {/* Línea de predicción (próximo servicio) */}
        {(kmLabel || diasLabel) && (
          <View style={s.predRow}>
            <Gauge size={11} color={COLORS.text.tertiary} />
            <Text style={s.predText}>
              Próx. servicio
              {kmLabel ? ` en ${esEstimado ? '~' : ''}${kmLabel}` : ''}
              {diasLabel ? ` · ${esEstimado ? '~' : ''}${diasLabel}` : ''}
            </Text>
          </View>
        )}

        {/* Chips: riesgo / clima / estimado */}
        {(showRisk || showClima || esEstimado) && (
          <View style={s.chips}>
            {showRisk && (
              <Chip
                label={`Riesgo ${Math.round(riesgo30)}%`}
                color={riesgo30 >= 50 ? COLORS.error[600] : COLORS.warning[700]}
                bgColor={riesgo30 >= 50 ? COLORS.error[50] : COLORS.warning[50]}
                icon={<AlertTriangle size={10} color={riesgo30 >= 50 ? COLORS.error[600] : COLORS.warning[700]} />}
              />
            )}
            {showClima && (
              <Chip
                label={`Clima +${Math.round((factorClima - 1) * 100)}%`}
                color={COLORS.warning[700]}
                bgColor={COLORS.warning[50]}
                icon={<Cloud size={10} color={COLORS.warning[700]} />}
              />
            )}
            {esEstimado && (
              <Chip
                label="Estimado"
                color={COLORS.neutral.gray[500]}
                bgColor={COLORS.neutral.gray[100]}
              />
            )}
          </View>
        )}
      </View>

      <ChevronRight size={16} color={COLORS.text.tertiary} style={{ marginLeft: SPACING.xs }} />
    </TouchableOpacity>
  );
});

// ─── Separador de sección ─────────────────────────────────────────────────────
export const SectionHeader = memo(({ title, count }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
    {count != null && (
      <View style={s.sectionCount}>
        <Text style={s.sectionCountText}>{count}</Text>
      </View>
    )}
  </View>
));

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.card.lg,
    marginBottom: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
    flexShrink: 1,
  },
  pct: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    flexShrink: 0,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  barTrack: {
    height: 5,
    backgroundColor: COLORS.neutral.gray[200],
    borderRadius: 3,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  predText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  chipText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  sectionCount: {
    backgroundColor: COLORS.neutral.gray[200],
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.tertiary,
  },
});

export default UnifiedComponentCard;
