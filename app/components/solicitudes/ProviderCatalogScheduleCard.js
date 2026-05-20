import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Wrench, Package } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import {
  calcularDesgloseIvaOferta,
  resolverDesgloseIvaMostrado,
} from '../../utils/ofertaPrecioDesglose';
import {
  catalogoIncluyeRepuestos,
  resolvePrecioTotalCatalogo,
} from '../home/shared/providerCatalogSchedule';
import { buildProviderAvatarUri, getProviderRating } from '../../utils/providerUtils';

function formatCLP(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('es-CL')}`;
}

function CostRow({ label, value, highlight }) {
  if (!value || Number(value) <= 0) return null;
  return (
    <View style={styles.costRow}>
      <Text style={[styles.costLabel, highlight && styles.costLabelHighlight]}>{label}</Text>
      <Text style={[styles.costValue, highlight && styles.costValueHighlight]}>{formatCLP(value)}</Text>
    </View>
  );
}

/**
 * Card unificada: proveedor + servicio de catálogo + desglose de precios (paso 1 nueva solicitud).
 */
export default function ProviderCatalogScheduleCard({ proveedor, servicio, tipoProveedor }) {
  const conRepuestos = catalogoIncluyeRepuestos(servicio);
  const aDomicilio = tipoProveedor === 'mecanico';

  const desglose = useMemo(() => {
    const mo = servicio?.costo_mano_de_obra_sin_iva ?? 0;
    const rep = conRepuestos ? (servicio?.costo_repuestos_sin_iva ?? 0) : 0;
    const gest = 0;
    const total = resolvePrecioTotalCatalogo(servicio, { conRepuestos });
    const calc = calcularDesgloseIvaOferta({
      costoManoObra: mo,
      costoRepuestos: rep,
      costoGestionCompra: gest,
      precioTotalOfrecido: total,
    });
    const api = servicio?.desglose_precios;
    const apiMapped =
      api && typeof api === 'object'
        ? {
            subtotal_sin_iva: api.costo_total_sin_iva,
            iva: api.iva_19_porciento,
            total: api.precio_final_cliente,
          }
        : null;
    return { merged: resolverDesgloseIvaMostrado(apiMapped, calc), calc, mo, rep, gest, total };
  }, [servicio, conRepuestos]);

  if (!proveedor || !servicio) return null;

  const nombreProveedor = proveedor.nombre || proveedor.nombre_comercial || 'Proveedor';
  const avatarUri = buildProviderAvatarUri(proveedor);
  const ratingRaw = getProviderRating(proveedor);
  const ratingNum =
    ratingRaw != null && ratingRaw !== ''
      ? parseFloat(String(ratingRaw).replace(',', '.'))
      : NaN;
  const ratingLabel =
    Number.isFinite(ratingNum) && ratingNum > 0 ? ` · ${ratingNum.toFixed(1)} ★` : '';
  const { merged, mo, rep } = desglose;
  const mostrarLineas = mo > 0 || rep > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Wrench size={22} color={COLORS.primary[500]} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.proveedorNombre} numberOfLines={2}>
            {nombreProveedor}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={14} color={COLORS.text?.secondary} />
            <Text style={styles.meta}>
              {aDomicilio ? 'Mecánico a domicilio' : 'Taller'}
              {ratingLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.servicioBlock}>
        <View style={styles.servicioTitleRow}>
          <Text style={styles.servicioNombre} numberOfLines={2}>
            {servicio.nombre || 'Servicio'}
          </Text>
          <View
            style={[
              styles.badge,
              conRepuestos ? styles.badgeConRepuestos : styles.badgeSinRepuestos,
            ]}
          >
            <Package size={12} color={conRepuestos ? COLORS.primary[700] : COLORS.neutral?.gray?.[700]} />
            <Text
              style={[
                styles.badgeText,
                conRepuestos ? styles.badgeTextCon : styles.badgeTextSin,
              ]}
            >
              {conRepuestos ? 'Con repuestos' : 'Sin repuestos'}
            </Text>
          </View>
        </View>
        {servicio.descripcion ? (
          <Text style={styles.descripcion} numberOfLines={3}>
            {servicio.descripcion}
          </Text>
        ) : null}
        {servicio.duracion_estimada ? (
          <Text style={styles.duracion}>Duración estimada: {servicio.duracion_estimada}</Text>
        ) : null}
      </View>

      <View style={styles.costContainer}>
        {mostrarLineas ? (
          <>
            <CostRow label="Mano de obra (sin IVA)" value={mo} />
            {conRepuestos && rep > 0 ? (
              <CostRow label="Repuestos incluidos (sin IVA)" value={rep} highlight />
            ) : null}
            {aDomicilio ? (
              <Text style={styles.notaDomicilio}>
                Incluye desplazamiento del mecánico según su tarifa de catálogo.
              </Text>
            ) : null}
            <View style={styles.divider} />
          </>
        ) : null}
        <CostRow label="Subtotal (sin IVA)" value={merged.subSinIva} />
        <CostRow label="IVA (19%)" value={merged.iva} />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{formatCLP(merged.total)}</Text>
        </View>
        {desglose.calc.mostrarNotaReconciliacion ? (
          <Text style={styles.notaReconciliacion}>
            El total coincide con el precio publicado en catálogo.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background?.paper || '#FFFFFF',
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: 1,
    borderColor: COLORS.border?.light || '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary?.[50] || '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  proveedorNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  meta: {
    fontSize: 13,
    color: COLORS.text?.secondary || '#6B7280',
    flex: 1,
  },
  servicioBlock: {
    marginBottom: 12,
  },
  servicioTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  servicioNombre: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text?.primary || '#111827',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeConRepuestos: {
    backgroundColor: COLORS.primary?.[50] || '#EFF6FF',
  },
  badgeSinRepuestos: {
    backgroundColor: COLORS.neutral?.gray?.[100] || '#F3F4F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextCon: {
    color: COLORS.primary?.[800] || '#1E40AF',
  },
  badgeTextSin: {
    color: COLORS.neutral?.gray?.[700] || '#374151',
  },
  descripcion: {
    fontSize: 13,
    color: COLORS.text?.secondary || '#6B7280',
    marginTop: 6,
  },
  duracion: {
    fontSize: 12,
    color: COLORS.text?.disabled || '#9CA3AF',
    marginTop: 4,
  },
  costContainer: {
    backgroundColor: COLORS.neutral?.gray?.[50] || '#F9FAFB',
    borderRadius: BORDERS.radius?.md ?? 10,
    padding: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  costLabel: {
    fontSize: 13,
    color: COLORS.text?.secondary || '#6B7280',
    flex: 1,
    paddingRight: 8,
  },
  costLabelHighlight: {
    color: COLORS.text?.primary || '#111827',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text?.primary || '#111827',
  },
  costValueHighlight: {
    color: COLORS.primary?.[700] || '#1D4ED8',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border?.light || '#E5E7EB',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text?.primary || '#111827',
  },
  notaDomicilio: {
    fontSize: 11,
    color: COLORS.text?.disabled || '#9CA3AF',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  notaReconciliacion: {
    fontSize: 11,
    color: COLORS.text?.disabled || '#9CA3AF',
    marginTop: 8,
  },
});
