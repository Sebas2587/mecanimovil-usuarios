import { StyleSheet } from 'react-native';
import { COLORS } from '../../design-system/tokens';

/**
 * Tipografía de secciones del comparador catálogo (alineada con FormularioSolicitud gs.sectionTitle).
 */
export const comparadorCatalogoStyles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: COLORS.text.primary,
  },
  sectionTitleSpaced: {
    marginBottom: 14,
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text.secondary,
    marginTop: 6,
    marginBottom: 16,
  },
  subgroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.15,
    color: COLORS.text.primary,
    marginTop: 4,
    marginBottom: 14,
  },
  subgroupSub: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text.secondary,
    marginTop: -8,
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: COLORS.text.primary,
    marginTop: 6,
    marginBottom: 14,
  },
});
