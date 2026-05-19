import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../../../design-system/tokens';
import { HomePanelCard } from '../shared/HomePanelCard';
import HomeSectionHeader from '../shared/HomeSectionHeader';

/**
 * Sección «Qué piden otros con tu mismo auto» (demanda agregada por servicio).
 */
const HomeMarketActivitySection = ({ selectedVehicle, activity, loading }) => {
  if (!selectedVehicle) return null;

  const items = activity?.items ?? [];
  const marcaLabel = selectedVehicle.marca_nombre || '—';
  const modeloLabel = selectedVehicle.modelo_nombre || '';

  return (
    <View style={styles.section}>
      <HomeSectionHeader
        icon={<Users size={16} color={COLORS.primary[500]} />}
        title="Qué piden otros con tu mismo auto"
        hint={`Misma marca y modelo (${marcaLabel} ${modeloLabel}).`.trim()}
      />

      {loading ? (
        <HomePanelCard style={styles.loadingCard}>
          <ActivityIndicator color={COLORS.primary[500]} />
        </HomePanelCard>
      ) : items.length === 0 ? (
        <HomePanelCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Aún no hay datos para esta marca y modelo. Cuando otros usuarios soliciten servicios con
            un auto como el tuyo, aparecerán aquí.
          </Text>
        </HomePanelCard>
      ) : (
        <HomePanelCard innerStyle={styles.listInner}>
          {items.map((row, idx) => (
            <View
              key={`svc-${row.servicio_id ?? idx}`}
              style={[styles.row, idx < items.length - 1 && styles.rowBorder]}
            >
              <Text style={styles.serviceName} numberOfLines={2}>
                {row.servicio_nombre || 'Servicio'}
              </Text>
              <View style={styles.personasCol}>
                <Text style={styles.personasNum}>{Number(row.personas ?? 0)}</Text>
                <Text style={styles.personasLbl}>personas</Text>
              </View>
            </View>
          ))}
        </HomePanelCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  loadingCard: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCard: {
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  listInner: {
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  serviceName: {
    flex: 1,
    marginRight: 12,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  personasCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 56,
  },
  personasNum: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[500],
  },
  personasLbl: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default React.memo(HomeMarketActivitySection);
