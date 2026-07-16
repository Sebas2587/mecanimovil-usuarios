import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Building2, Tag, FileText, Calendar, CheckCircle2 } from 'lucide-react-native';
import Card from '../base/Card/Card';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

const TIPO_PAGO_LABELS = {
  servicio_completo: 'Servicio completo',
  servicio_parcial: 'Pago parcial',
  servicio_secundario: 'Servicio adicional',
};

/** Tipos de pago → COLORS.payment.* (tipología). Estado “Aprobado” → COLORS.payment.aprobado. */
const TIPO_PAGO_TOKENS = {
  servicio_completo: COLORS.payment.completo,
  servicio_parcial: COLORS.payment.parcial,
  servicio_secundario: COLORS.payment.adicional,
  default: {
    background: COLORS.badge.meta.background,
    border: COLORS.badge.meta.border,
    text: COLORS.badge.meta.text,
    icon: COLORS.badge.meta.icon,
  },
};

/** Separa `[Componente]` del cuerpo de la solicitud para jerarquía Airbnb. */
export function parseSolicitudDescripcion(desc) {
  if (!desc?.trim()) {
    return { component: null, summary: 'Solicitud de servicio' };
  }
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)/s);
  if (!match) {
    return { component: null, summary: desc.trim() };
  }
  const component = match[1].trim();
  let summary = match[2].trim() || 'Mantenimiento sugerido';
  if (summary.length > 140) {
    const cut = summary.indexOf('. ');
    summary =
      cut > 24 && cut < 140 ? summary.slice(0, cut + 1) : `${summary.slice(0, 137).trim()}…`;
  }
  return { component, summary };
}

function StatusPill({ label, tokens, icon: Icon }) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: tokens.background,
          borderColor: tokens.border,
        },
      ]}
    >
      {Icon ? <Icon size={12} color={tokens.icon || tokens.text} strokeWidth={2} /> : null}
      <Text style={[styles.pillText, { color: tokens.text }]}>{label}</Text>
    </View>
  );
}

function DetailRow({ icon: Icon, label, value, subValue }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      {Icon ? (
        <View style={styles.detailIcon}>
          <Icon size={16} color={COLORS.icon.default} strokeWidth={1.75} />
        </View>
      ) : null}
      <View style={styles.detailCol}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
        {subValue ? <Text style={styles.detailSub}>{subValue}</Text> : null}
      </View>
    </View>
  );
}

const PaymentHistoryCard = memo(({ item, formatAmount, formatDate }) => {
  const tipoPago = item.tipo_pago || 'servicio_completo';
  const tipoTokens = TIPO_PAGO_TOKENS[tipoPago] || TIPO_PAGO_TOKENS.default;
  const solicitud = parseSolicitudDescripcion(item.solicitud_info?.descripcion);

  const proveedorLine = item.proveedor_info
    ? [
        item.proveedor_info.nombre,
        item.proveedor_info.tipo
          ? item.proveedor_info.tipo === 'taller'
            ? 'Taller'
            : 'Mecánico a domicilio'
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Card variant="elevated" elevation="sm" padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        <StatusPill
          label={TIPO_PAGO_LABELS[tipoPago] || 'Pago'}
          tokens={tipoTokens}
        />
        <Text style={styles.amount}>{formatAmount(item.transaction_amount)}</Text>
      </View>

      <View style={styles.details}>
        <DetailRow icon={Building2} label="Proveedor" value={proveedorLine} />
        {item.oferta_info ? (
          <DetailRow
            icon={Tag}
            label="Oferta"
            value={formatAmount(item.oferta_info.precio_total)}
          />
        ) : null}
        {(solicitud.component || solicitud.summary) && (
          <DetailRow
            icon={FileText}
            label="Solicitud"
            value={solicitud.component || solicitud.summary}
            subValue={solicitud.component ? solicitud.summary : null}
          />
        )}
        <DetailRow
          icon={Calendar}
          label="Fecha"
          value={formatDate(item.date_approved_mp || item.fecha_creacion)}
        />
      </View>

      <View style={styles.footer}>
        <StatusPill
          label="Aprobado"
          tokens={COLORS.payment.aprobado}
          icon={CheckCircle2}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  amount: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDERS.radius.badge.md,
    borderWidth: BORDERS.width.thin,
    flexShrink: 1,
  },
  pillText: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  details: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailIcon: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  detailValue: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  detailSub: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  footer: {
    marginTop: SPACING.md,
  },
});

export default PaymentHistoryCard;
