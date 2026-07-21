import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { FileText, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { COLORS, BORDERS, SPACING, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

const LEGAL_ICONS = {
  'document-text-outline': FileText,
  'shield-checkmark-outline': ShieldCheck,
};

function LegalDocumentBody({ meta, sections, footer }) {
  const IntroIcon = LEGAL_ICONS[meta.icon] || FileText;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <ScrollView
        style={[styles.scrollContainer, Platform.OS === 'web' && styles.scrollWeb]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.introCard}>
          <IntroIcon size={48} color={COLORS.primary[500]} />
          <Text style={styles.introTitle}>{meta.title}</Text>
          {meta.subtitle ? <Text style={styles.introSubtitle}>{meta.subtitle}</Text> : null}
          <Text style={styles.introText}>Última actualización: {meta.lastUpdated}</Text>
        </View>

        <View style={styles.documentCard}>
          {sections.map((section, index) => (
            <View
              key={section.title}
              style={[
                styles.sectionContainer,
                index === sections.length - 1 && !footer && styles.sectionContainerLast,
              ]}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          {footer ? (
            <View style={styles.footerBox}>
              <Text style={styles.footerTitle}>{footer.title}</Text>
              <Text style={styles.footerContent}>{footer.content}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function LegalDocumentViewStack({ meta, sections, footer }) {
  const { height: windowHeight } = useWindowDimensions();
  const navHeaderHeight = useHeaderHeight();

  const webRootStyle =
    Platform.OS === 'web'
      ? {
          minHeight: 0,
          height: Math.max(windowHeight - navHeaderHeight, 0),
          maxHeight: Math.max(windowHeight - navHeaderHeight, 0),
          overflow: 'hidden',
        }
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {Platform.OS === 'web' ? (
        <View style={[styles.container, webRootStyle]}>
          <LegalDocumentBody meta={meta} sections={sections} footer={footer} />
        </View>
      ) : (
        <LegalDocumentBody meta={meta} sections={sections} footer={footer} />
      )}
    </SafeAreaView>
  );
}

/**
 * Vista reutilizable para documentos legales (Términos, Privacidad).
 * @param {boolean} [embedded] — overlay/modal con header propio (sin useHeaderHeight).
 */
const LegalDocumentView = ({ meta, sections, footer, embedded = false }) => {
  if (embedded) {
    return (
      <View style={[styles.container, styles.embedded]}>
        <LegalDocumentBody meta={meta} sections={sections} footer={footer} />
      </View>
    );
  }

  return <LegalDocumentViewStack meta={meta} sections={sections} footer={footer} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  embedded: {
    minHeight: 0,
  },
  scrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: 0 } : {}),
  },
  scrollWeb: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }
      : {}),
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
    flexGrow: 1,
  },
  introCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  introTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
    marginBottom: 4,
    textAlign: 'center',
  },
  introSubtitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  introText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  sectionContainer: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  sectionContainerLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  sectionContent: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  footerBox: {
    backgroundColor: COLORS.primary[50],
    borderRadius: BORDERS.radius.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[200],
  },
  footerTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.primary[700],
    marginBottom: SPACING.xs,
  },
  footerContent: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
});

export default LegalDocumentView;
