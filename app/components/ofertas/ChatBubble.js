import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, BORDERS } from '../../utils/constants';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';

/**
 * Componente para mostrar un mensaje de chat en formato bubble
 */
const ChatBubble = ({ mensaje, esPropio }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <View style={[
      styles.container,
      esPropio ? styles.containerPropio : styles.containerOtro
    ]}>
      <View style={[
        styles.bubble,
        esPropio ? styles.bubblePropio : styles.bubbleOtro
      ]}>
        {!esPropio && (
          <Text style={styles.nombreRemitente}>
            {mensaje.enviado_por_nombre || 'Usuario'}
          </Text>
        )}
        
        <Text style={[
          styles.mensajeTexto,
          esPropio ? styles.mensajeTextoPropio : styles.mensajeTextoOtro
        ]}>
          {mensaje.mensaje}
        </Text>
        
        <View style={styles.footer}>
          <Text style={[
            styles.timestamp,
            esPropio ? styles.timestampPropio : styles.timestampOtro
          ]}>
            {formatTime(mensaje.fecha_envio)}
          </Text>
          {esPropio && mensaje.leido && (
            <Text style={styles.checkmarks}>✓✓</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    maxWidth: '85%'
  },
  containerPropio: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end'
  },
  containerOtro: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start'
  },
  bubble: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.md,
    maxWidth: '100%'
  },
  bubblePropio: {
    backgroundColor: COLORS.primary[500],
    borderBottomRightRadius: 4
  },
  bubbleOtro: {
    backgroundColor: COLORS.neutral.gray[100],
    borderBottomLeftRadius: 4
  },
  nombreRemitente: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[500],
    marginBottom: SPACING.xs
  },
  mensajeTexto: {
    fontSize: 15,
    lineHeight: 20
  },
  mensajeTextoPropio: {
    color: COLORS.text.onPrimary
  },
  mensajeTextoOtro: {
    color: COLORS.text.primary
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs
  },
  timestamp: {
    fontSize: 11
  },
  timestampPropio: {
    color: withOpacity(COLORS.base.white, 0.7)
  },
  timestampOtro: {
    color: COLORS.text.secondary
  },
  checkmarks: {
    fontSize: 11,
    color: withOpacity(COLORS.base.white, 0.7)
  }
});

export default ChatBubble;

