import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
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

/**
 * Verificaciones del proveedor — summary chips Airbnb + iconos Lucide brand.
 */
const TrustSection = ({ documents }) => {
  if (!documents || documents.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificaciones</Text>

      <View style={styles.badgesGrid}>
        {documents.map((doc, index) => (
          <View key={doc.id || index} style={styles.badgeCard}>
            <CircleCheck
              size={20}
              color={COLORS.success.main}
              strokeWidth={1.75}
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.container.horizontal,
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  checkIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  badgeLabel: {
    flex: 1,
    ...TYPOGRAPHY.styles.caption,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    lineHeight: 16,
  },
});

export default TrustSection;
