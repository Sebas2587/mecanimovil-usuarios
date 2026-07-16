import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

const formatJobDate = (fecha) => {
  if (!fecha) return null;
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

const getServiceName = (job) => {
  const lineas = job.lineas_detail || job.lineas || [];
  const first = lineas[0];
  if (first) {
    return first.servicio_nombre || first.nombre || 'Servicio general';
  }
  return 'Servicio general';
};

const getVehicleLabel = (job) => {
  const v = job.vehiculo_detail || job.vehiculo_info || job.vehiculo;
  if (!v) return null;
  const marca = v.marca_nombre || v.marca?.nombre || v.marca || '';
  const modelo = v.modelo_nombre || v.modelo?.nombre || v.modelo || '';
  const parts = [marca, modelo].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : v.full_name || null;
};

const CompletedJobCard = ({ job }) => {
  const serviceName = getServiceName(job);
  const vehicleLabel = getVehicleLabel(job);
  const dateStr = formatJobDate(job.fecha_servicio || job.fecha_hora_solicitud);

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Icon
          name="construct-outline"
          size={18}
          color={COLORS.success.main}
          style={styles.rowIcon}
        />
        <Text style={styles.serviceText} numberOfLines={2}>
          {serviceName}
        </Text>
      </View>
      {vehicleLabel && (
        <View style={styles.cardRow}>
          <Icon
            name="car-outline"
            size={18}
            color={COLORS.text.tertiary}
            style={styles.rowIcon}
          />
          <Text style={styles.vehicleText} numberOfLines={1}>
            {vehicleLabel}
          </Text>
        </View>
      )}
      {dateStr && <Text style={styles.dateText}>{dateStr}</Text>}
    </View>
  );
};

const ProviderCompletedJobsSection = ({ jobs = [] }) => {
  if (!jobs || jobs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon
            name="checkmark-done-circle-outline"
            size={18}
            color={COLORS.icon.active}
          />
        </View>
        <Text style={styles.title}>Trabajos Realizados</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {jobs.map((job) => (
          <View key={job.id} style={styles.cardWrapper}>
            <CompletedJobCard job={job} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const CARD_RADIUS = BORDERS.radius.card?.lg ?? BORDERS.radius.lg;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.background.paper,
    borderRadius: CARD_RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: {
    marginRight: 8,
  },
  serviceText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  vehicleText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    marginTop: 4,
    marginLeft: 26,
  },
});

export default ProviderCompletedJobsSection;
