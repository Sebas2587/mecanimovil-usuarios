import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';

/** Colapsa espacios y separa frases pegadas (p. ej. "DomicilioTenemos"). */
export function normalizeProviderDescription(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/([.!?;:])([^\s\n])/g, '$1 $2')
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isMostlyTitleCase(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  const titled = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).length;
  return titled / words.length >= 0.55;
}

/** Texto legible: oraciones en minúsculas si el proveedor escribió todo en Title Case. */
export function formatProviderDescriptionForDisplay(raw) {
  const normalized = normalizeProviderDescription(raw);
  if (!normalized) return [];

  const applySentenceCase = (block) => {
    if (!isMostlyTitleCase(block)) return block;
    const lower = block.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const blocks = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const source = blocks.length > 0 ? blocks : [normalized];
  return source.map(applySentenceCase);
}

/**
 * Descripción del proveedor — bloque editorial Airbnb (título h5 + cuerpo caption aireado).
 */
const ProviderAboutSection = ({ description, providerType = 'taller' }) => {
  const paragraphs = useMemo(
    () => formatProviderDescriptionForDisplay(description),
    [description],
  );

  if (!paragraphs.length) return null;

  const title =
    providerType === 'taller' ? 'Acerca del taller' : 'Acerca del mecánico';

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.bodyCol}>
        {paragraphs.map((paragraph, index) => (
          <Text key={`about-p-${index}`} style={styles.body}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  bodyCol: {
    gap: SPACING.sm,
  },
  body: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
});

export default ProviderAboutSection;
