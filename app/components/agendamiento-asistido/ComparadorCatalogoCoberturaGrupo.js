import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../design-system/tokens';

/**
 * Subsección dentro de «Coincidencia exacta» / «Fuera de tu zona» (especialistas vs multimarca).
 */
export default function ComparadorCatalogoCoberturaGrupo({
  title,
  subtitle,
  accent = 'especialista',
  children,
}) {
  if (!children) return null;

  const headerAccent =
    accent === 'multimarca' ? styles.headerMultimarca : styles.headerEspecialista;

  return (
    <View style={styles.grupo}>
      <View style={[styles.header, headerAccent]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.cardList}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    marginBottom: 20,
  },
  header: {
    paddingLeft: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  headerEspecialista: {
    borderLeftColor: COLORS.success[500],
  },
  headerMultimarca: {
    borderLeftColor: COLORS.primary[500],
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: 17,
  },
  cardList: {
    gap: 14,
  },
});
