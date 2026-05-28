import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { comparadorCatalogoStyles as cs } from './comparadorCatalogoStyles';

/**
 * Bloque de candidatos por cobertura (especialista / multimarca), título alineado a sección padre.
 */
export default function ComparadorCatalogoCoberturaGrupo({ title, children }) {
  if (!children) return null;

  return (
    <View style={styles.grupo}>
      <Text style={cs.groupTitle}>{title}</Text>
      <View style={styles.cardList}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    marginBottom: 0,
  },
  cardList: {
    gap: 14,
    marginTop: 2,
  },
});
