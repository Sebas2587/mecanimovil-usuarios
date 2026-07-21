import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldAlert, KeyRound } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import TransferenciaService from '../../services/transferenciaService';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, PENDING_TRANSFER_CLAIM_KEY } from '../../utils/constants';
import { extractTransferToken } from '../../utils/shareTransferCode';
import { getTransferClaimTokenFromWebPath } from '../../utils/publicListingRoute';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

/**
 * Reclamo de traspaso vía link (WhatsApp) o deep link.
 * Misma seguridad que el QR: token de un uso, ~15 min, requiere sesión.
 */
const TransferenciaClaimScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => {
    const fromParams = extractTransferToken(route.params?.token);
    if (fromParams) return fromParams;
    if (Platform.OS === 'web') {
      return getTransferClaimTokenFromWebPath();
    }
    return null;
  }, [route.params?.token]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(ROUTES.GUEST_LANDING || 'GuestLanding');
  }, [navigation]);

  const persistAndGoAuth = useCallback(
    async (target) => {
      if (token) {
        try {
          await AsyncStorage.setItem(PENDING_TRANSFER_CLAIM_KEY, token);
        } catch {
          /* ignore */
        }
      }
      navigation.navigate(target);
    },
    [navigation, token],
  );

  const handleClaim = useCallback(async () => {
    if (!token) {
      Alert.alert('Código inválido', 'Este enlace de traspaso no es válido.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await TransferenciaService.completeTransfer(token);
      try {
        await AsyncStorage.removeItem(PENDING_TRANSFER_CLAIM_KEY);
      } catch {
        /* ignore */
      }
      const vName = result.vehicle_name || 'Vehículo';
      const vYear = result.vehicle_year || '';
      navigation.replace(ROUTES.TRANSFERENCIA_EXITO, {
        vehicleId: result.vehicle_id,
        vehicleName: vYear ? `${vName} ${vYear}` : vName,
        newOwner: result.new_owner_name || result.new_owner || 'Tú',
      });
    } catch (error) {
      Alert.alert(
        'No se pudo completar',
        error?.message || 'Código inválido, expirado o ya usado.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [navigation, token]);

  if (!token) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <AppHeader title="Traspaso" onBack={handleBack} />
        <View style={styles.center}>
          <Text style={[TYPOGRAPHY.styles.body, styles.muted]}>
            Este enlace de traspaso no es válido o ya expiró.
          </Text>
          <Button title="Volver" onPress={handleBack} style={{ marginTop: SPACING.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader title="Recibir vehículo" onBack={handleBack} />
      <View style={styles.body}>
        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.iconWrap}>
            <KeyRound size={28} color={COLORS.primary[500]} strokeWidth={2} />
          </View>
          <Text style={[TYPOGRAPHY.styles.h3, styles.title]}>Código de traspaso</Text>
          <Text style={[TYPOGRAPHY.styles.body, styles.subtitle]}>
            Al confirmar, el historial y la salud del vehículo pasan a tu cuenta MecaniMovil.
            El código expira en 15 minutos.
          </Text>
          <View style={styles.warnRow}>
            <ShieldAlert size={18} color={COLORS.warning?.main || COLORS.primary[500]} strokeWidth={2} />
            <Text style={[TYPOGRAPHY.styles.caption, styles.warnText]}>
              Solo acepta este enlace si compraste el auto y el vendedor te lo envió a ti.
            </Text>
          </View>
        </View>

        {isAuthenticated ? (
          <Button
            title={submitting ? 'Transfiriendo…' : 'Confirmar recepción'}
            onPress={handleClaim}
            disabled={submitting}
            fullWidth
            style={styles.primaryBtn}
          />
        ) : (
          <>
            <Text style={[TYPOGRAPHY.styles.body, styles.loginHint]}>
              Inicia sesión o regístrate para recibir el vehículo.
            </Text>
            <Button
              title="Iniciar sesión"
              onPress={() => persistAndGoAuth(ROUTES.LOGIN)}
              fullWidth
              style={styles.primaryBtn}
            />
            <Button
              title="Crear cuenta"
              variant="ghost"
              onPress={() => persistAndGoAuth(ROUTES.REGISTER)}
              fullWidth
            />
          </>
        )}

        {submitting ? (
          <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.primary[500]} />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  warnText: {
    flex: 1,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  loginHint: {
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  primaryBtn: {
    marginBottom: SPACING.sm,
  },
  muted: {
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default TransferenciaClaimScreen;
