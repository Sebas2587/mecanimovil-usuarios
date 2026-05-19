import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';

export default function ServiciosSugeridosList({
  servicios = [],
  seleccionados = [],
  onToggle,
}) {
  if (!Array.isArray(servicios) || servicios.length === 0) {
    return (
      <Text style={styles.empty}>
        Escribe o dicta tu necesidad para ver servicios sugeridos.
      </Text>
    );
  }

  const selectedIds = new Set(
    (seleccionados || []).map((s) => (typeof s === 'object' ? s.id : s))
  );

  return (
    <View style={styles.list}>
      {servicios.map((item) => {
        const id = item.servicio_id ?? item.id;
        const selected = selectedIds.has(id);
        return (
          <TouchableOpacity
            key={String(id)}
            style={[styles.card, selected && styles.cardSelected]}
            onPress={() => onToggle?.(item)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.nombre || 'Servicio'}</Text>
              {selected ? (
                <Check size={18} color={COLORS.primary?.main || COLORS.primary} />
              ) : null}
            </View>
            {item.razon ? (
              <Text style={styles.razon}>{item.razon}</Text>
            ) : null}
            {item.score != null ? (
              <Text style={styles.meta}>
                Relevancia {Math.round(Number(item.score) * 100)}%
                {item.fuente ? ` · ${item.fuente}` : ''}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  empty: {
    fontSize: 14,
    color: COLORS.text?.secondary || '#6B7280',
    paddingVertical: 8,
  },
  card: {
    padding: 14,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: 1,
    borderColor: COLORS.border?.light || '#E5E7EB',
    backgroundColor: COLORS.background?.paper || '#FFFFFF',
  },
  cardSelected: {
    borderColor: COLORS.primary?.main || COLORS.primary,
    backgroundColor: COLORS.primary?.light || '#EFF6FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text?.primary || '#111827',
    flex: 1,
  },
  razon: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.text?.secondary || '#6B7280',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.text?.disabled || '#9CA3AF',
  },
});
