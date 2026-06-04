import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Car,
  Wrench,
  Package,
  MapPin,
  Clock,
  Zap,
  FileText,
  Camera,
} from 'lucide-react-native';
import { COLORS, BORDERS, TYPOGRAPHY, SPACING, SHADOWS } from '../../design-system/tokens';
import { catalogoIncluyeRepuestos } from '../home/shared/providerCatalogSchedule';

function ResumenRow({ icon: Icon, label, value, iconColor = COLORS.primary[500], isLast = false }) {
  if (!value) return null;

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.rowIconWrap, { backgroundColor: `${iconColor}14` }]}>
          <Icon size={16} color={iconColor} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue} numberOfLines={4}>
            {value}
          </Text>
        </View>
      </View>
      {!isLast ? <View style={styles.divider} /> : null}
    </>
  );
}

/** Paso 3 del wizard comparador: revisión antes de llamar al ML. */
export default function SolicitudWizardResumenComparador({ formData, flujoCatalogoProveedor = false }) {
  const servicio = formData.servicios_seleccionados?.[0];
  const vehiculo = formData.vehiculo;
  const conRepuestos = formData.requiere_repuestos !== false;
  const esUrgente = formData.urgencia === 'urgente';
  const direccion =
    formData.direccion_usuario?.direccion
    || formData.direccion_servicio_texto
    || 'Sin dirección';

  const repuestosLabel = (() => {
    if (flujoCatalogoProveedor && servicio?.tipo_servicio) {
      return catalogoIncluyeRepuestos(servicio) ? 'Con repuestos (oferta)' : 'Solo mano de obra (oferta)';
    }
    return conRepuestos ? 'Con repuestos' : 'Solo mano de obra';
  })();

  const fotosCount = Array.isArray(formData.fotos_necesidad) ? formData.fotos_necesidad.length : 0;
  const detalles = formData.descripcion_problema?.trim() || null;

  const rows = [
    vehiculo
      ? {
          icon: Car,
          label: 'Vehículo',
          value: `${vehiculo.marca_nombre || ''} ${vehiculo.modelo_nombre || ''}`.trim(),
          iconColor: COLORS.primary[500],
        }
      : null,
    servicio
      ? {
          icon: Wrench,
          label: 'Servicio',
          value: servicio.nombre || 'Servicio',
          iconColor: COLORS.primary[500],
        }
      : null,
    {
      icon: Package,
      label: 'Repuestos',
      value: repuestosLabel,
      iconColor: conRepuestos ? COLORS.primary[500] : COLORS.neutral.gray[600],
    },
    {
      icon: esUrgente ? Zap : Clock,
      label: 'Urgencia',
      value: esUrgente ? 'Urgente' : 'Normal',
      iconColor: esUrgente ? COLORS.warning[600] : COLORS.success[600],
    },
    {
      icon: MapPin,
      label: 'Ubicación',
      value: direccion,
      iconColor: COLORS.success[600],
    },
    detalles
      ? {
          icon: FileText,
          label: 'Detalles',
          value: detalles,
          iconColor: COLORS.neutral.gray[600],
        }
      : null,
    fotosCount > 0
      ? {
          icon: Camera,
          label: 'Fotos',
          value: `${fotosCount} adjunta${fotosCount !== 1 ? 's' : ''}`,
          iconColor: COLORS.neutral.gray[600],
        }
      : null,
  ].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <ResumenRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            iconColor={row.iconColor}
            isLast={index === rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BORDERS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  rowValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border.light,
    marginLeft: 34 + SPACING.sm,
  },
});
