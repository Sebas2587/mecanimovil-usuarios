import React, { useCallback, useState } from 'react';
import { Modal as RNModal, StyleSheet, Text, View } from 'react-native';
import Modal from '../feedback/Modal/Modal';
import Button from '../base/Button/Button';
import AppHeader from '../navigation/AppHeader';
import LegalDocumentView from '../support/LegalDocumentView';
import { registerLegalConsent } from '../../services/privacyService';
import { COLORS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import {
  TERMS_META,
  TERMS_SECTIONS,
  TERMS_FOOTER,
} from '../../content/legal/termsOfUseContent';
import {
  PRIVACY_META,
  PRIVACY_SECTIONS,
  PRIVACY_FOOTER,
} from '../../content/legal/privacyPolicyContent';

const LEGAL_DOCS = {
  terms: {
    title: 'Términos y condiciones',
    meta: TERMS_META,
    sections: TERMS_SECTIONS,
    footer: TERMS_FOOTER,
  },
  privacy: {
    title: 'Política de privacidad',
    meta: PRIVACY_META,
    sections: PRIVACY_SECTIONS,
    footer: PRIVACY_FOOTER,
  },
};

export default function LegalConsentModal({ visible, onAccepted }) {
  const [loading, setLoading] = useState(false);
  const [legalPreview, setLegalPreview] = useState(null);

  const handleAccept = useCallback(async () => {
    setLoading(true);
    try {
      await registerLegalConsent();
      onAccepted?.();
    } catch {
      /* keep modal open */
    } finally {
      setLoading(false);
    }
  }, [onAccepted]);

  const previewDoc = legalPreview ? LEGAL_DOCS[legalPreview] : null;

  if (!visible && !legalPreview) {
    return null;
  }

  return (
    <>
      {visible && !legalPreview ? (
        <Modal visible onClose={() => {}} dismissible={false} showCloseButton={false}>
          <View style={styles.container}>
            <Text style={styles.title}>Actualización legal</Text>
            <Text style={styles.body}>
              Para seguir usando MecaniMóvil necesitas aceptar los Términos y la Política de Privacidad
              vigentes (Ley 21.719).
            </Text>
            <Button
              title="Ver términos"
              type="secondary"
              variant="outline"
              onPress={() => setLegalPreview('terms')}
              fullWidth
              style={styles.linkBtn}
            />
            <Button
              title="Ver política de privacidad"
              type="secondary"
              variant="outline"
              onPress={() => setLegalPreview('privacy')}
              fullWidth
              style={styles.linkBtn}
            />
            <Button
              title={loading ? 'Guardando…' : 'Acepto términos y privacidad'}
              onPress={handleAccept}
              fullWidth
              disabled={loading}
            />
          </View>
        </Modal>
      ) : null}

      <RNModal
        visible={!!legalPreview}
        animationType="slide"
        onRequestClose={() => setLegalPreview(null)}
      >
        <View style={styles.previewRoot}>
          <AppHeader
            title={previewDoc?.title}
            onBack={() => setLegalPreview(null)}
          />
          {previewDoc ? (
            <View style={styles.previewBody}>
              <LegalDocumentView
                meta={previewDoc.meta}
                sections={previewDoc.sections}
                footer={previewDoc.footer}
                embedded
              />
            </View>
          ) : null}
        </View>
      </RNModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.md, gap: SPACING.sm },
  title: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text.primary,
  },
  body: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  linkBtn: { marginBottom: SPACING.xs },
  previewRoot: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  previewBody: {
    flex: 1,
    minHeight: 0,
  },
});
