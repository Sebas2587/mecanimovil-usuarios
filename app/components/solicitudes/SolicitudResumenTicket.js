import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Car, Wrench, User, CalendarDays, Clock, MapPin, Info } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

function formatFecha(fecha) {
  if (!fecha) return '—';
  const m = String(fecha).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return fecha;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(m[3], 10)} ${meses[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function formatHora(hora) {
  if (!hora) return null;
  const h = String(hora).slice(0, 5);
  return h.length >= 5 ? h : hora;
}

function Row({ icon: Icon, label, value, accent }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Icon size={18} color={accent || COLORS.primary[500]} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

/**
 * Resumen tipo “ticket” antes de enviar la solicitud (baja fricción, menos errores).
 */
export default function SolicitudResumenTicket({
  vehiculo,
  servicios = [],
  proveedor,
  fechaPreferida,
  horaPreferida,
  direccion,
  horarioEsPreferido = true,
}) {
  const nombreVehiculo = vehiculo
    ? `${vehiculo.marca_nombre || ''} ${vehiculo.modelo_nombre || ''}`.trim() || 'Tu vehículo'
    : null;
  const servicioNombre = servicios[0]?.nombre || (servicios.length > 1 ? `${servicios.length} servicios` : null);
  const proveedorNombre =
    proveedor?.nombre || proveedor?.nombre_comercial || null;
  const direccionTexto =
    typeof direccion === 'string'
      ? direccion
      : direccion?.direccion || null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Revisa tu pedido</Text>
      <Text style={styles.subtitle}>
        Confirma que todo esté correcto antes de enviar.
      </Text>

      <View style={styles.card}>
        <Row icon={Car} label="Vehículo" value={nombreVehiculo} accent={COLORS.primary[500]} />
        <Row icon={Wrench} label="Servicio" value={servicioNombre} accent={COLORS.primary[500]} />
        {proveedorNombre ? (
          <Row icon={User} label="Proveedor" value={proveedorNombre} accent={COLORS.success[600]} />
        ) : null}
        <Row
          icon={CalendarDays}
          label="Fecha"
          value={formatFecha(fechaPreferida)}
          accent={COLORS.success[600]}
        />
        {horaPreferida ? (
          <Row
            icon={Clock}
            label="Hora preferida"
            value={formatHora(horaPreferida)}
            accent={COLORS.success[600]}
          />
        ) : null}
        <Row icon={MapPin} label="Ubicación" value={direccionTexto} accent={COLORS.neutral.gray[600]} />
      </View>

      {horarioEsPreferido && fechaPreferida ? (
        <View style={styles.hint}>
          <Info size={16} color={COLORS.primary[600]} />
          <Text style={styles.hintText}>
            El horario es tu preferencia; el proveedor lo confirma al responder.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  card: {
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary[800],
    lineHeight: 18,
  },
});
