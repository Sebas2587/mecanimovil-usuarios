import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount, getDeleteAccountStatus } from '../../services/privacyService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '../../design-system/tokens';
import Button from '../../components/base/Button/Button';
import { confirmDestructive, showAlert } from '../../utils/platformAlert';

const DeleteAccountScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [blockMessage, setBlockMessage] = useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getDeleteAccountStatus();
        if (mounted && !status?.puede_eliminar) {
          setBlockMessage(status?.mensaje || 'No puedes eliminar tu cuenta en este momento.');
        }
      } catch {
        if (mounted) setBlockMessage('No se pudo verificar el estado de tu cuenta.');
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = useCallback(() => {
    if (blockMessage) return;
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      showAlert('Confirmación requerida', 'Escribe ELIMINAR para confirmar.');
      return;
    }
    if (!password.trim()) {
      showAlert('Contraseña requerida', 'Ingresa tu contraseña actual.');
      return;
    }

    confirmDestructive(
      'Esta acción es permanente. Se anonimizarán tus datos personales y cerrarás sesión.',
      async () => {
        setLoading(true);
        try {
          await deleteAccount({ password: password.trim() });
          await logout();
          showAlert(
            'Cuenta eliminada',
            'Tus datos personales fueron anonimizados. Gracias por haber usado MecaniMóvil.',
          );
          navigation.popToTop();
        } catch (e) {
          showAlert(
            'No se pudo eliminar',
            e?.response?.data?.error || e?.message || 'Intenta más tarde.',
          );
        } finally {
          setLoading(false);
        }
      },
      { title: 'Eliminar cuenta', confirmText: 'Eliminar definitivamente' },
    );
  }, [blockMessage, confirmText, password, logout, navigation]);

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.warningBox}>
        <AlertTriangle size={22} color={COLORS.error[700]} />
        <Text style={styles.warningTitle}>Eliminar cuenta</Text>
        <Text style={styles.warningBody}>
          Conservaremos historial de órdenes y pagos anonimizado por obligaciones legales y fiscales.
          No podrás recuperar tu cuenta después.
        </Text>
      </View>

      {blockMessage ? (
        <Text style={styles.blockText}>{blockMessage}</Text>
      ) : (
        <>
          <Text style={styles.label}>Contraseña actual</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Escribe ELIMINAR para confirmar</Text>
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="ELIMINAR"
            autoCapitalize="characters"
          />
          <Button
            title={loading ? 'Eliminando…' : 'Eliminar mi cuenta'}
            onPress={handleDelete}
            type="danger"
            fullWidth
            disabled={loading}
            style={styles.deleteBtn}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.container.horizontal,
    paddingBottom: SPACING.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    backgroundColor: COLORS.error[50] || '#FEF2F2',
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  warningTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.error[800] || COLORS.error[700],
  },
  warningBody: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  blockText: {
    color: COLORS.warning?.main || COLORS.brand.orange,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
  },
  label: {
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.xs,
    color: COLORS.text.primary,
  },
  input: {
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border?.default || '#E5E7EB',
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  deleteBtn: {
    marginTop: SPACING.sm,
  },
});

export default DeleteAccountScreen;
