import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Modal from '../components/feedback/Modal/Modal';
import Button from '../components/base/Button/Button';
import { getConsentStatus, registerLegalConsent } from '../services/privacyService';
import { COLORS, SPACING, TYPOGRAPHY } from '../design-system/tokens';
import { ROUTES } from '../utils/constants';
import { useNavigation } from '@react-navigation/native';

export default function LegalConsentModal({ visible, onAccepted }) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal visible={visible} onClose={() => {}} dismissible={false}>
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
          onPress={() => navigation.navigate(ROUTES.TERMS)}
          fullWidth
          style={styles.linkBtn}
        />
        <Button
          title="Ver política de privacidad"
          type="secondary"
          variant="outline"
          onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
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
  );
}

export function useLegalConsentGate(isAuthenticated) {
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setNeedsConsent(false);
      return undefined;
    }
    (async () => {
      try {
        const status = await getConsentStatus();
        if (mounted) setNeedsConsent(!!status?.requiere_consentimiento);
      } catch {
        if (mounted) setNeedsConsent(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  return { needsConsent, clearNeedsConsent: () => setNeedsConsent(false) };
}

const styles = StyleSheet.create({
  container: { padding: SPACING.md, gap: SPACING.sm },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.primary,
  },
  body: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  linkBtn: { marginBottom: SPACING.xs },
});
