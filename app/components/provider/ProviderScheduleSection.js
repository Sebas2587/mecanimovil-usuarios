import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Clock } from 'lucide-react-native';

const glassBase = {
  backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
  padding: 16,
};

const GlassCard = ({ children, style }) => (
  <View style={[glassBase, style]}>
    {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
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
        <Clock size={18} color="#93C5FD" />
        <Text style={styles.sectionTitle}>Horarios disponibles</Text>
      </View>

      <GlassCard>
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
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
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
    fontWeight: '700',
    color: '#FFF',
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  hours: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: '600',
  },
  closed: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
  },
});

