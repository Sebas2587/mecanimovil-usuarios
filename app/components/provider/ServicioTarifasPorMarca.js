import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/** Indica si conviene mostrar el desglose (evita montar el componente cuando renderizaría null). */
export function tarifasMuestranDesglose(tarifas, { soloSiVarias = true } = {}) {
  const list = Array.isArray(tarifas) ? tarifas : [];
  if (list.length === 0) return false;

  const preciosUnicos = new Set(
    list.map((t) => (t.precioPublico != null ? Math.round(t.precioPublico) : -1)),
  );
  if (soloSiVarias && preciosUnicos.size <= 1) {
    return false;
  }

  return true;
}

/**
 * Desglose compacto vehículo → precio (solo cuando hay variación entre marcas).
 */
export default function ServicioTarifasPorMarca({
  tarifas,
  maxFilas = 3,
  soloSiVarias = true,
}) {
  const list = Array.isArray(tarifas) ? tarifas : [];
  if (!tarifasMuestranDesglose(list, { soloSiVarias })) {
    return null;
  }

  const visibles = list.slice(0, maxFilas);
  const restantes = list.length - visibles.length;

  return (
    <View style={styles.wrap}>
      {visibles.map((t) => (
        <View key={`${t.vehicleId ?? t.ofertaId}-${t.marcaId}`} style={styles.row}>
          <Text style={styles.marca} numberOfLines={1}>
            {t.marcaLabel}
          </Text>
          <Text style={styles.precio} numberOfLines={1}>
            {formatCLP(t.precioPublico)}
          </Text>
        </View>
      ))}
      {restantes > 0 ? (
        <Text style={styles.mas}>+{restantes} vehículo{restantes !== 1 ? 's' : ''}</Text>
      ) : null}
    </View>
  );
}

function formatCLP(valor) {
  if (valor == null || !Number.isFinite(valor)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.xxs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  marca: {
    flex: 1,
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
  },
  precio: {
    ...TYPOGRAPHY.styles.small,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  mas: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
  },
});
