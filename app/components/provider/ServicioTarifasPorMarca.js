import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Lista compacta vehículo/marca del usuario → precio (solo varios autos con precios distintos).
 */
export default function ServicioTarifasPorMarca({
  tarifas,
  maxFilas = 4,
  soloSiVarias = true,
}) {
  const list = Array.isArray(tarifas) ? tarifas : [];
  if (list.length === 0) return null;

  const preciosUnicos = new Set(
    list.map((t) => (t.precioPublico != null ? Math.round(t.precioPublico) : -1)),
  );
  if (soloSiVarias && preciosUnicos.size <= 1 && list.length <= 1) {
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
        <Text style={styles.mas}>+{restantes} marca{restantes !== 1 ? 's' : ''}</Text>
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
    marginTop: SPACING.xs,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  marca: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  mas: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
});
