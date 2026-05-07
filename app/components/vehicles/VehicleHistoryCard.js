import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CheckCircle2, Gauge, ClipboardList } from 'lucide-react-native';
import { COLORS } from '../../utils/constants';
import { COLORS as DS_COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Card from '../base/Card/Card';
import Avatar from '../base/Avatar/Avatar';


const VehicleHistoryCard = ({ vehiculo, solicitudes, onPress }) => {
  const completados = solicitudes.filter(s => s.estado === 'completado').length;
  const cancelados = solicitudes.filter(s => ['cancelado', 'devolucion_procesada'].includes(s.estado)).length;
  const totalGastado = solicitudes
    .filter(s => s.estado === 'completado')
    .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

  const ultimoServicio = solicitudes
    .filter(s => s.estado === 'completado')
    .sort((a, b) => new Date(b.fecha_servicio) - new Date(a.fecha_servicio))[0];

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card style={styles.container}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {/* Header del vehículo */}
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car" size={24} color={COLORS.primary} />
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>
                {vehiculo.marca_nombre} {vehiculo.modelo_nombre}
              </Text>
              <Text style={styles.vehicleSubtitle}>
                {vehiculo.year} • {vehiculo.patente}
              </Text>
            </View>
          </View>
          <View style={styles.totalServicesContainer}>
            <Text style={styles.totalServicesNumber}>{solicitudes.length}</Text>
            <Text style={styles.totalServicesLabel}>servicios</Text>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#28A745' }]}>{completados}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#DC3545' }]}>{cancelados}</Text>
            <Text style={styles.statLabel}>Cancelados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              ${totalGastado.toLocaleString('es-CL')}
            </Text>
            <Text style={styles.statLabel}>Total Gastado</Text>
          </View>
        </View>

        {/* Último servicio */}
        {ultimoServicio && (
          <View style={styles.lastServiceContainer}>
            <View style={styles.lastServiceHeader}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.lastServiceTitle}>Último servicio:</Text>
            </View>
            <Text style={styles.lastServiceDate}>
              {formatearFecha(ultimoServicio.fecha_servicio)}
            </Text>
            {ultimoServicio.lineas && ultimoServicio.lineas.length > 0 && (
              <Text style={styles.lastServiceName}>
                {ultimoServicio.lineas[0].servicio_nombre || ultimoServicio.lineas[0].nombre}
              </Text>
            )}
          </View>
        )}

        {/* Indicador de ver más */}
        <View style={styles.viewMoreContainer}>
          <Text style={styles.viewMoreText}>Ver historial completo</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  totalServicesContainer: {
    alignItems: 'center',
  },
  totalServicesNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  totalServicesLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  lastServiceContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  lastServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastServiceTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  lastServiceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  lastServiceName: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  viewMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
});

// ... (imports remain the same)

export default VehicleHistoryCard;

/**
 * Normaliza montos desde API (número, string con puntos de miles, $, comas decimales).
 * Evita NaN en iOS/Android cuando el backend envía strings formateados.
 */
function parseMoneyValue(raw) {
  if (raw == null || raw === '') return NaN;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  const str = String(raw).trim();
  if (!str) return NaN;
  let cleaned = str.replace(/[$\s\u00A0]/g, '');
  const hasCommaDecimal = /,\d{1,2}$/.test(cleaned);
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/\./g, '');
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function sumDetalleServicios(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) return NaN;
  let sum = 0;
  for (const d of detalles) {
    const p = parseMoneyValue(d?.precio_servicio ?? d?.precio ?? d?.subtotal ?? d?.total);
    if (Number.isFinite(p)) sum += p;
  }
  return sum > 0 ? sum : NaN;
}

function sumLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) return NaN;
  let sum = 0;
  for (const line of lineas) {
    const p = parseMoneyValue(line?.precio ?? line?.subtotal ?? line?.total ?? line?.precio_servicio);
    if (Number.isFinite(p)) sum += p;
  }
  return sum > 0 ? sum : NaN;
}

function resolveHistoryItemCost(item, oferta) {
  const candidates = [
    item.cost,
    item.total,
    item.price,
    item.monto,
    item.valor,
    item.total_pagado,
    item.monto_total,
    item.precio_total,
    item.precio_final,
    oferta.monto,
    oferta.precio_total,
    oferta.precio_total_ofrecido,
    oferta.total,
    sumDetalleServicios(oferta.detalles_servicios),
    sumLineas(item.lineas),
    sumLineas(item.line_items),
  ];
  for (const c of candidates) {
    const n = typeof c === 'number' && Number.isFinite(c) ? c : parseMoneyValue(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

/**
 * VehicleServiceHistoryRow
 * 
 * Enhanced visual representation of a service history item for the Marketplace.
 * Used in MarketplaceVehicleDetailScreen.
 * 
 * @param {Object} item - Service history item
 * @param {Function} [onViewChecklist] - Si no se pasa, no se muestra el botón de checklist (p. ej. ficha pública).
 */
function createHistoryRowStyles(isDark) {
  const cardBg = isDark
    ? withOpacity(DS_COLORS.base.white, 0.06)
    : DS_COLORS.background.paper;
  const border = isDark
    ? withOpacity(DS_COLORS.base.white, 0.12)
    : DS_COLORS.border.light;
  const textPrimary = isDark ? DS_COLORS.neutral.gray[50] : DS_COLORS.text.primary;
  const textSecondary = isDark
    ? withOpacity(DS_COLORS.base.white, 0.55)
    : DS_COLORS.text.secondary;
  const textMuted = isDark
    ? withOpacity(DS_COLORS.base.white, 0.45)
    : DS_COLORS.text.tertiary;
  const sectionBg = isDark
    ? withOpacity(DS_COLORS.base.white, 0.04)
    : DS_COLORS.neutral.gray[100];
  const primaryBtn = isDark ? DS_COLORS.primary[200] : DS_COLORS.primary[700];
  const primaryBorder = isDark
    ? withOpacity(DS_COLORS.primary[300], 0.45)
    : DS_COLORS.primary[200];
  const primaryBg = isDark
    ? withOpacity(DS_COLORS.primary[500], 0.12)
    : DS_COLORS.primary[50];

  return StyleSheet.create({
    rowContainer: {
      backgroundColor: cardBg,
      borderRadius: BORDERS.radius.lg,
      padding: 20,
      marginBottom: 20,
      borderWidth: BORDERS.width.thin,
      borderColor: border,
      overflow: 'hidden',
      ...SHADOWS.sm,
    },
    groupLabel: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    providerTextCol: {
      flex: 1,
      minWidth: 0,
    },
    providerName: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: SPACING.xs,
      marginTop: 4,
    },
    dateText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: textSecondary,
    },
    pillTipo: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: BORDERS.radius.full,
      backgroundColor: isDark
        ? withOpacity(DS_COLORS.base.white, 0.1)
        : DS_COLORS.primary[50],
      borderWidth: BORDERS.width.thin,
      borderColor: isDark
        ? withOpacity(DS_COLORS.base.white, 0.15)
        : DS_COLORS.primary[100],
    },
    pillTipoText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: isDark ? DS_COLORS.primary[200] : DS_COLORS.primary[700],
    },
    pillKm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.md,
      backgroundColor: isDark
        ? withOpacity(DS_COLORS.base.white, 0.08)
        : DS_COLORS.neutral.gray[200],
    },
    pillKmText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
      color: textSecondary,
    },
    pillVerified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: BORDERS.radius.md,
      backgroundColor: isDark
        ? withOpacity(DS_COLORS.success[500], 0.15)
        : DS_COLORS.success[50],
      borderWidth: BORDERS.width.thin,
      borderColor: isDark
        ? withOpacity(DS_COLORS.success[400], 0.4)
        : DS_COLORS.success[200],
    },
    pillVerifiedText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: isDark ? DS_COLORS.success[200] : DS_COLORS.success[700],
    },
    divider: {
      height: 1,
      backgroundColor: isDark
        ? withOpacity(DS_COLORS.base.white, 0.08)
        : DS_COLORS.border.light,
      marginVertical: SPACING.md,
    },
    serviceBlock: {
      backgroundColor: sectionBg,
      borderRadius: BORDERS.radius.md,
      padding: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    serviceTitle: {
      fontSize: TYPOGRAPHY.fontSize.base,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: textPrimary,
      marginBottom: SPACING.sm,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.xs,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    priceRowLabel: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      color: textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 0,
      flexShrink: 0,
    },
    costBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      justifyContent: 'flex-end',
      backgroundColor: isDark
        ? withOpacity(DS_COLORS.success[500], 0.15)
        : DS_COLORS.success[50],
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: BORDERS.radius.md,
      borderWidth: BORDERS.width.thin,
      borderColor: isDark
        ? withOpacity(DS_COLORS.success[400], 0.4)
        : DS_COLORS.success[200],
      gap: SPACING.sm,
    },
    costLabel: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      color: isDark ? DS_COLORS.success[300] : DS_COLORS.success[700],
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    },
    costValue: {
      fontSize: TYPOGRAPHY.fontSize.md,
      color: isDark ? DS_COLORS.success[200] : DS_COLORS.success[600],
      fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    checklistButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: SPACING.md,
      borderWidth: BORDERS.width.thin,
      borderColor: primaryBorder,
      borderRadius: BORDERS.radius.md,
      backgroundColor: primaryBg,
      gap: SPACING.xs,
    },
    checklistButtonText: {
      color: primaryBtn,
      fontWeight: TYPOGRAPHY.fontWeight.semibold,
      fontSize: TYPOGRAPHY.fontSize.sm,
    },
  });
}

const HISTORY_STYLES_LIGHT = createHistoryRowStyles(false);
const HISTORY_STYLES_DARK = createHistoryRowStyles(true);

export const VehicleServiceHistoryRow = ({ item, onViewChecklist, variant = 'light' }) => {
  const isDark = variant === 'dark';
  const s = isDark ? HISTORY_STYLES_DARK : HISTORY_STYLES_LIGHT;
  const oferta = item.oferta_seleccionada_detail || item.oferta_seleccionada || {};

  const providerType = item.tipo_proveedor || item.provider_type || oferta.tipo_proveedor || (item.taller ? 'taller' : 'mecanico');

  let providerName = 'Proveedor';
  if (item.nombre_proveedor) providerName = item.nombre_proveedor;
  else if (oferta.nombre_proveedor) providerName = oferta.nombre_proveedor;
  else if (oferta.proveedor_nombre) providerName = oferta.proveedor_nombre;
  else if (item.provider_name) providerName = item.provider_name;
  else if (item.taller_nombre) providerName = item.taller_nombre;
  else if (item.mecanico_nombre) providerName = item.mecanico_nombre;
  else if (item.taller?.nombre) providerName = item.taller.nombre;
  else if (item.mecanico?.nombre) providerName = item.mecanico.nombre;
  else if (item.provider?.name) providerName = item.provider.name;

  let providerAvatar = null;
  if (item.proveedor_foto) providerAvatar = item.proveedor_foto;
  else if (oferta.proveedor_foto) providerAvatar = oferta.proveedor_foto;
  else if (oferta.foto_proveedor) providerAvatar = oferta.foto_proveedor;
  else if (item.provider_avatar) providerAvatar = item.provider_avatar;
  else if (item.taller_logo) providerAvatar = item.taller_logo;
  else if (item.mecanico_foto) providerAvatar = item.mecanico_foto;
  else if (providerType === 'taller') {
    providerAvatar = item.taller?.logo || item.logo || item.provider?.logo || oferta.taller?.logo;
  } else {
    providerAvatar =
      item.mecanico?.foto_perfil ||
      item.mecanico?.usuario?.foto_perfil ||
      item.foto_perfil ||
      item.provider?.avatar ||
      oferta.mecanico?.foto_perfil ||
      oferta.mecanico?.usuario?.foto_perfil;
  }

  const lineas = item.lineas || item.lineas_detail || [];
  const serviceName = item.servicio_nombre ||
    item.service_name ||
    item.nombre_servicio ||
    (oferta.detalles_servicios && oferta.detalles_servicios[0]?.servicio_nombre) ||
    (oferta.detalles_servicios && oferta.detalles_servicios[0]?.nombre) ||
    (lineas[0]?.servicio_nombre) ||
    (lineas[0]?.nombre) ||
    (item.line_items && item.line_items[0]?.service_name) ||
    item.service?.nombre ||
    'Servicio General';

  const kmNum = item.kilometraje != null && item.kilometraje !== '' ? Number(item.kilometraje) : NaN;
  const mileage = Number.isFinite(kmNum)
    ? `${kmNum.toLocaleString()} km`
    : (typeof item.mileage === 'string' && item.mileage.trim() ? item.mileage : '—');

  const dateObj = item.fecha_servicio ? new Date(item.fecha_servicio) : (item.date ? new Date(item.date) : new Date());
  const dateStr = dateObj.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const displayCostAmount = resolveHistoryItemCost(item, oferta);
  const kmIconColor = isDark
    ? withOpacity(DS_COLORS.base.white, 0.55)
    : DS_COLORS.text.tertiary;
  const checklistChevron = isDark ? DS_COLORS.primary[200] : DS_COLORS.primary[600];

  return (
    <View style={s.rowContainer}>
      <Text style={s.groupLabel}>Proveedor</Text>
      <View style={s.providerRow}>
        <Avatar
          source={providerAvatar}
          name={providerName}
          size="md"
          variant="circular"
        />
        <View style={s.providerTextCol}>
          <Text style={s.providerName} numberOfLines={2}>{providerName}</Text>
          <View style={s.metaRow}>
            <Text style={s.dateText}>{dateStr}</Text>
            <View style={s.pillTipo}>
              <Text style={s.pillTipoText}>
                {providerType === 'taller' ? 'Taller' : 'A domicilio'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <Text style={s.groupLabel}>Servicio</Text>
      <View style={s.serviceBlock}>
        <Text style={s.serviceTitle} numberOfLines={3}>{serviceName}</Text>
        <View style={s.chipsRow}>
          <View style={s.pillKm}>
            <Gauge size={12} color={kmIconColor} />
            <Text style={s.pillKmText}>{mileage}</Text>
          </View>
          {item.verified === true && (
            <View style={s.pillVerified}>
              <CheckCircle2
                size={12}
                color={isDark ? DS_COLORS.success[300] : DS_COLORS.success[600]}
              />
              <Text style={s.pillVerifiedText}>Registrado</Text>
            </View>
          )}
        </View>
      </View>

      {Number.isFinite(displayCostAmount) && displayCostAmount > 0 && (
        <View style={s.priceRow}>
          <Text style={s.priceRowLabel}>Monto</Text>
          <View style={s.costBadge}>
            <Text style={s.costLabel}>Total</Text>
            <Text style={s.costValue} numberOfLines={1}>
              ${Math.round(displayCostAmount).toLocaleString('es-CL')}
            </Text>
          </View>
        </View>
      )}

      {typeof onViewChecklist === 'function' ? (
        <TouchableOpacity
          style={s.checklistButton}
          onPress={() => onViewChecklist(item)}
          activeOpacity={0.75}
        >
          <ClipboardList size={16} color={checklistChevron} />
          <Text style={s.checklistButtonText}>Ver informe de servicio</Text>
          <Ionicons name="chevron-forward" size={16} color={checklistChevron} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};