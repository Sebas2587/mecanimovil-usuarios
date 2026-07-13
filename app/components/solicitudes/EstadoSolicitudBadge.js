import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDERS } from '../../utils/constants';
import { COLORS } from '../../design-system/tokens/colors';

/**
 * Badge para mostrar el estado de una solicitud con colores apropiados
 */
const EstadoSolicitudBadge = ({ estado }) => {
  const getEstadoConfig = () => {
    const configs = {
      creada: {
        color: COLORS.text.secondary,
        backgroundColor: COLORS.neutral.gray[200],
        texto: 'Creada'
      },
      seleccionando_servicios: {
        color: COLORS.info.main,
        backgroundColor: COLORS.info.light,
        texto: 'Seleccionando Servicios'
      },
      publicada: {
        color: COLORS.primary[500],
        backgroundColor: COLORS.info.light,
        texto: 'Publicada'
      },
      con_ofertas: {
        color: COLORS.warning.main,
        backgroundColor: COLORS.warning.light,
        texto: 'Con Ofertas'
      },
      pendiente_confirmacion: {
        color: COLORS.primary[500],
        backgroundColor: COLORS.info.light,
        texto: 'Esperando confirmación proveedor'
      },
      esperando_creditos_proveedor: {
        color: COLORS.warning.main,
        backgroundColor: COLORS.warning[100],
        texto: 'Esperando confirmación proveedor'
      },
      adjudicada: {
        color: COLORS.success.main,
        backgroundColor: COLORS.success.light,
        texto: 'Adjudicada'
      },
      pendiente_pago: {
        color: COLORS.warning.main,
        backgroundColor: COLORS.warning.light,
        texto: 'Pendiente Pago'
      },
      pagada: {
        color: COLORS.success.main,
        backgroundColor: COLORS.success.light,
        texto: 'Pagada'
      },
      pagada_parcialmente: {
        color: COLORS.warning.main,
        backgroundColor: COLORS.warning.light,
        texto: 'Pagada Parcialmente'
      },
      en_ejecucion: {
        color: COLORS.primary[500],
        backgroundColor: COLORS.info.light,
        texto: 'En Progreso'
      },
      completada: {
        color: COLORS.success.main,
        backgroundColor: COLORS.success.light,
        texto: 'Completada'
      },
      expirada: {
        color: COLORS.error.main,
        backgroundColor: COLORS.error.light,
        texto: 'Expirada'
      },
      cancelada: {
        color: COLORS.error.main,
        backgroundColor: COLORS.error.light,
        texto: 'Cancelada'
      },
      ofertas_adicionales_pendientes: {
        color: COLORS.warning.dark,
        backgroundColor: COLORS.warning[100],
        texto: 'Ofertas adicionales por revisar'
      }
    };

    return configs[estado] || {
      color: COLORS.text.primary,
      backgroundColor: COLORS.neutral.gray[100],
      texto: estado
    };
  };

  const config = getEstadoConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.text, { color: config.color }]}>
        {config.texto}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.sm,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  }
});

export default EstadoSolicitudBadge;
