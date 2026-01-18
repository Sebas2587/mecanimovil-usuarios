import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS } from '../../utils/constants';

/**
 * Badge para mostrar el estado de una solicitud con colores apropiados
 */
const EstadoSolicitudBadge = ({ estado }) => {
  const getEstadoConfig = () => {
    const configs = {
      creada: {
        color: COLORS.textLight,
        backgroundColor: '#E5E5E5',
        texto: 'Creada'
      },
      seleccionando_servicios: {
        color: COLORS.info,
        backgroundColor: '#E3F2FD',
        texto: 'Seleccionando Servicios'
      },
      publicada: {
        color: COLORS.primary,
        backgroundColor: '#E3F2FD',
        texto: 'Publicada'
      },
      con_ofertas: {
        color: COLORS.warning,
        backgroundColor: '#FFF3E0',
        texto: 'Con Ofertas'
      },
      adjudicada: {
        color: COLORS.success,
        backgroundColor: '#E8F5E9',
        texto: 'Adjudicada'
      },
      pendiente_pago: {
        color: COLORS.warning,
        backgroundColor: '#FFF3E0',
        texto: 'Pendiente Pago'
      },
      pagada: {
        color: COLORS.success,
        backgroundColor: '#E8F5E9',
        texto: 'Pagada'
      },
      pagada_parcialmente: {
        color: COLORS.warning,
        backgroundColor: '#FFF3E0',
        texto: 'Pagada Parcialmente'
      },
      en_ejecucion: {
        color: COLORS.primary,
        backgroundColor: '#E3F2FD',
        texto: 'En Progreso'
      },
      completada: {
        color: COLORS.success,
        backgroundColor: '#E8F5E9',
        texto: 'Completada'
      },
      expirada: {
        color: COLORS.danger,
        backgroundColor: '#FFEBEE',
        texto: 'Expirada'
      },
      cancelada: {
        color: COLORS.danger,
        backgroundColor: '#FFEBEE',
        texto: 'Cancelada'
      }
    };

    return configs[estado] || {
      color: COLORS.text,
      backgroundColor: COLORS.lightGray,
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

