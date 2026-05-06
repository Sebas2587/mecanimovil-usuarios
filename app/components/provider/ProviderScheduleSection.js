import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Clock } from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const Card = ({ children, style }) => (
  <View
    style={[
      styles.card,
      style,
    ]}
  >
    {children}
  </View>
);

const DIA_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function formatHour(h) {
  if (!h) return '';
  // backend suele devolver "HH:MM:SS" o "HH:MM"
  return String(h).slice(0, 5);
}

export default function ProviderScheduleSection({ horarios }) {
  const items = useMemo(() => (Array.isArray(horarios) ? horarios : []), [horarios]);

  // Normalizar a 7 días (si viene parcial)
  const byDay = useMemo(() => {
    const m = new Map();
    items.forEach((it) => {
      const d = Number(it?.dia_semana);
      if (Number.isFinite(d)) m.set(d, it);
    });
    return DIA_LABELS.map((label, d) => {
      const it = m.get(d) || null;
      return {
        dia: d,
        label,
        activo: it ? !!it.activo : false,
        hora_inicio: it?.hora_inicio ?? null,
        hora_fin: it?.hora_fin ?? null,
      };
    });
  }, [items]);

  const hasAny = byDay.some((d) => d.activo && d.hora_inicio && d.hora_fin);

  const grouped = useMemo(() => {
    if (byDay.length === 0) return [];
    const norm = (d) => ({
      activo: !!d.activo,
      hora_inicio: d.hora_inicio ? formatHour(d.hora_inicio) : null,
      hora_fin: d.hora_fin ? formatHour(d.hora_fin) : null,
    });

    const groups = [];
    let cur = null;
    byDay.forEach((d) => {
      const v = norm(d);
      const sameAsCur =
        cur &&
        cur.activo === v.activo &&
        cur.hora_inicio === v.hora_inicio &&
        cur.hora_fin === v.hora_fin;

      if (!cur || !sameAsCur) {
        if (cur) groups.push(cur);
        cur = { ...v, startDia: d.dia, endDia: d.dia };
      } else {
        cur.endDia = d.dia;
      }
    });
    if (cur) groups.push(cur);
    return groups.map((g) => {
      const startLabel = DIA_LABELS[g.startDia] || '';
      const endLabel = DIA_LABELS[g.endDia] || '';
      const dayLabel = g.startDia === g.endDia ? startLabel : `${startLabel}–${endLabel}`;
      const hoursLabel =
        g.activo && g.hora_inicio && g.hora_fin ? `${g.hora_inicio} - ${g.hora_fin}` : 'No disponible';
      return { ...g, dayLabel, hoursLabel };
    });
  }, [byDay]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Clock size={18} color={COLORS.primary[500]} />
        <Text style={styles.sectionTitle}>Horarios disponibles</Text>
      </View>

      <Card>
        {hasAny ? (
          <View style={styles.list}>
            {grouped.map((g, idx) => (
              <View key={`${g.startDia}-${g.endDia}-${idx}`} style={styles.row}>
                <Text style={styles.day}>{g.dayLabel}</Text>
                {g.activo && g.hora_inicio && g.hora_fin ? (
                  <Text style={styles.hours}>{g.hoursLabel}</Text>
                ) : (
                  <Text style={styles.closed}>{g.hoursLabel}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Horarios no disponibles.</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    padding: 16,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  day: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  hours: {
    color: COLORS.text.primary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  closed: {
    color: COLORS.text.tertiary,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
});

