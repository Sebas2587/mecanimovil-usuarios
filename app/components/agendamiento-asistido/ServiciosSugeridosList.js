import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { BORDERS } from '../../design-system/tokens/borders';
import { AGENDAMIENTO_THEME as T } from './theme';

export default function ServiciosSugeridosList({
  servicios = [],
  seleccionados = [],
  onToggle,
  loading = false,
  hint,
}) {
  if (loading) {
    return (
      <Text style={styles.empty}>Analizando tu descripción…</Text>
    );
  }

  if (!Array.isArray(servicios) || servicios.length === 0) {
    return (
      <Text style={styles.empty}>
        {hint || 'Escribe al menos 4 caracteres para ver servicios sugeridos.'}
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
                <Check size={18} color={T.primary} />
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
    color: T.textSecondary,
    paddingVertical: 8,
  },
  card: {
    padding: 14,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: 1,
    borderColor: T.borderLight,
    backgroundColor: T.backgroundPaper,
  },
  cardSelected: {
    borderColor: T.primary,
    backgroundColor: T.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textPrimary,
    flex: 1,
  },
  razon: {
    marginTop: 6,
    fontSize: 13,
    color: T.textSecondary,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: T.textDisabled,
  },
});
