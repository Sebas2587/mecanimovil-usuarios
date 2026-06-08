import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '../../design-system/tokens';

const DOCUMENT_LABELS = {
  curriculum: 'Curriculum Vitae',
  certificado_antecedentes: 'Antecedentes Penales',
  rut_fiscal: 'RUT del Negocio',
  licencia_conducir: 'Licencia de Conducir',
};

const getDocumentLabel = (doc) => {
  if (doc.tipo_documento_display) return doc.tipo_documento_display;
  const key = (doc.tipo_documento || '').toLowerCase();
  return DOCUMENT_LABELS[key] || doc.tipo_documento || 'Documento Verificado';
};

const TrustSection = ({ documents }) => {
  if (!documents || documents.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificaciones</Text>

      <View style={styles.badgesGrid}>
        {documents.map((doc, index) => (
          <View key={doc.id || index} style={styles.badgeCard}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={COLORS.success.main}
              style={styles.checkIcon}
            />
            <Text style={styles.badgeLabel} numberOfLines={2}>
              {getDocumentLabel(doc)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const CARD_RADIUS = BORDERS.radius.card?.md ?? BORDERS.radius.md;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: 24,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.25,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: CARD_RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  checkIcon: {
    marginRight: 8,
  },
  badgeLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 16,
  },
});

export default TrustSection;
