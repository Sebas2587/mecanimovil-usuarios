import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import {
  useGoogleSignInFlow,
  getConnectedGoogleAccountsAsync,
  clearConnectedGoogleAccountsAsync,
} from '../../hooks/useGoogleSignInFlow';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, withOpacity } from '../../design-system/tokens';
import logger from '../../utils/logger';
import * as authService from '../../services/auth';
import { useQueryClient } from '@tanstack/react-query';
import * as categoryService from '../../services/categories';
import * as userService from '../../services/user';
import ofertasService from '../../services/ofertasService';
import vehiculoService from '../../services/vehicle';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';

/**
 * 3 estados de UI tipo onboarding (Canva-like):
 *   - "accounts": lista de cuentas Google previas conectadas (login rápido)
 *   - "methods":  pantalla con "Usar Google" y "Usar correo electrónico"
 *   - "email":    formulario tradicional usuario/contraseña
 *
 * Reglas:
 *   - Sin cuentas previas → arranca en "methods".
 *   - Con cuentas previas → arranca en "accounts".
 *   - "Usar otra cuenta" / "Usar otro método" → "methods".
 *   - "Usar correo" en "methods" → "email".
 *   - "← Volver" siempre regresa al estado anterior lógico.
 */

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const LoginScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();
  const queryClient = useQueryClient();

  /* ── Google sign-in hook ─────────────────────────────────────────── */
  const { googleLoading, signInWithAccountChooser } = useGoogleSignInFlow(loginWithGoogle, {
    flow: 'login',
    onUserNotFound: (profile) => {
      navigation.navigate(ROUTES.REGISTER, {
        prefill: {
          email: profile?.email || '',
          firstName: profile?.given_name || '',
          lastName: profile?.family_name || '',
        },
      });
    },
  });

  /* ── Cuentas Google conectadas ────────────────────────────────────── */
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  const reloadAccounts = async () => {
    const list = await getConnectedGoogleAccountsAsync();
    setConnectedAccounts(list);
    setAccountsLoaded(true);
    return list;
  };

  useEffect(() => {
    reloadAccounts();
  }, []);

  // Refresca lista cuando termina un loading de Google (post-login agrega cuenta).
  useEffect(() => {
    if (!googleLoading && accountsLoaded) reloadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoading]);

  /* ── Estado de UI: accounts | methods | email ─────────────────────── */
  // Decisión inicial diferida hasta cargar cuentas para evitar flicker.
  const [step, setStep] = useState(null);
  useEffect(() => {
    if (!accountsLoaded) return;
    if (step !== null) return;
    setStep(connectedAccounts.length > 0 ? 'accounts' : 'methods');
  }, [accountsLoaded, connectedAccounts.length, step]);

  const goAccounts = () => setStep('accounts');
  const goMethods = () => setStep('methods');
  const goEmail = () => setStep('email');

  /* ── Acciones Google ──────────────────────────────────────────────── */
  const handleAccountTap = (email) => {
    if (googleLoading) return;
    signInWithAccountChooser({ loginHint: email });
  };

  const handleUseAnotherGoogle = () => {
    if (googleLoading) return;
    signInWithAccountChooser();
  };

  const handleClearGoogleAccounts = async () => {
    await clearConnectedGoogleAccountsAsync();
    const fresh = await reloadAccounts();
    if (fresh.length === 0) goMethods();
  };

  /* ── Email/password ───────────────────────────────────────────────── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState({});

  // Cargar credenciales recordadas y, si existen, abrir email mode.
  useEffect(() => {
    AsyncStorage.getItem('rememberMe').then((val) => {
      if (val !== 'true') return;
      Promise.all([
        AsyncStorage.getItem('savedEmail'),
        AsyncStorage.getItem('savedPassword'),
      ]).then(([savedEmail, savedPassword]) => {
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
          // Si hay cuentas Google previas, NO autoabrir email — se pierde el flow Canva.
          // Solo usar prefill cuando el user navega manualmente a 'email'.
        }
      });
    });
  }, []);

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) { setForgotPasswordErrors({ email: 'El correo electrónico es requerido' }); return; }
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) { setForgotPasswordErrors({ email: 'El correo electrónico no es válido' }); return; }
    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      setForgotPasswordStep(2);
      showAlert('Solicitud enviada', 'Se ha enviado un token de recuperación a tu correo electrónico.');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Ocurrió un error.';
      setForgotPasswordErrors({ email: msg });
      showAlert(error.response?.status === 404 ? 'Correo no registrado' : 'Error', msg);
      setForgotPasswordStep(1);
    } finally { setForgotPasswordLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!resetToken) { setForgotPasswordErrors({ token: 'El token es requerido' }); return; }
    if (!newPassword) { setForgotPasswordErrors({ newPassword: 'La nueva contraseña es requerida' }); return; }
    if (newPassword.length < 8) { setForgotPasswordErrors({ newPassword: 'Mínimo 8 caracteres' }); return; }
    if (newPassword !== confirmNewPassword) { setForgotPasswordErrors({ confirmNewPassword: 'Las contraseñas no coinciden' }); return; }
    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});
    try {
      await authService.resetPassword(resetToken, newPassword);
      showAlertButtons('Contraseña restablecida', 'Tu contraseña fue restablecida exitosamente.', [{
        text: 'OK', onPress: () => {
          setShowForgotPasswordModal(false);
          setForgotPasswordStep(1);
          setForgotPasswordEmail('');
          setResetToken('');
          setNewPassword('');
          setConfirmNewPassword('');
        },
      }]);
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Ocurrió un error.';
      setForgotPasswordErrors({ token: msg });
      showAlert('Error', msg);
    } finally { setForgotPasswordLoading(false); }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordStep(1);
    setForgotPasswordEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotPasswordErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'El correo electrónico es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'El correo electrónico no es válido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.user?.id) {
          const userId = result.user.id;
          queryClient.prefetchQuery({ queryKey: ['userProfile', userId], queryFn: () => userService.getUserProfile(userId), staleTime: 300_000 });
          queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: categoryService.getAllCategories, staleTime: 86_400_000 });
          queryClient.prefetchQuery({ queryKey: ['chats', 'list'], queryFn: () => ofertasService.obtenerListaChats(), staleTime: 300_000 });
          queryClient.prefetchQuery({ queryKey: ['vehicles'], queryFn: () => vehiculoService.getUserVehicles(), staleTime: 300_000 });
        }
        if (rememberMe) {
          await AsyncStorage.setItem('rememberMe', 'true');
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('savedPassword', password);
        } else {
          await AsyncStorage.multiRemove(['rememberMe', 'savedEmail', 'savedPassword']);
        }
      } else if (result.code === 'PROVIDER_ACCOUNT') {
        showAlert(
          'Cuenta de Proveedor',
          'Esta cuenta está registrada como mecánico o taller.\n\nUsa la app MecaniMóvil Proveedores.',
        );
      } else if (result.code === 'USER_NOT_FOUND' || /no.*registrad|no.*encontrad|usuario.*no.*existe/i.test(result.error || '')) {
        showAlertButtons(
          'Cuenta no encontrada',
          'No encontramos una cuenta con ese correo. ¿Quieres registrarte?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Registrarme', onPress: () => navigation.navigate(ROUTES.REGISTER, { prefill: { email } }) },
          ],
        );
      } else {
        showAlert(
          'Error al iniciar sesión',
          result.error || 'Correo o contraseña incorrectos.',
        );
      }
    } catch (error) {
      logger.error('Error inesperado en handleLogin:', error);
      showAlert('Error al iniciar sesión', 'Ocurrió un problema. Verifica tu conexión.');
    } finally { setLoading(false); }
  };

  /* ─── render helpers ─────────────────────────────────────────────── */

  const renderAccountsView = () => (
    <>
      <View style={styles.heading}>
        <Text style={styles.h1}>¿Con qué cuenta continuarás hoy?</Text>
        <Text style={styles.h2}>
          Selecciona una cuenta para iniciar sesión rápido o usa otra.
        </Text>
      </View>

      <View style={styles.card}>
        {connectedAccounts.map((acc) => {
          const initials = (acc.name || acc.email || '?')
            .split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
          return (
            <TouchableOpacity
              key={acc.email}
              onPress={() => handleAccountTap(acc.email)}
              disabled={googleLoading}
              style={[styles.accountRow, googleLoading && styles.disabled]}
              activeOpacity={0.7}
            >
              {acc.picture ? (
                <Image source={{ uri: acc.picture }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.accountInfo}>
                {acc.name ? <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text> : null}
                <Text style={styles.accountEmail} numberOfLines={1}>{acc.email}</Text>
              </View>
              {googleLoading
                ? <ActivityIndicator size="small" color={COLORS.primary[500]} />
                : <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>O BIEN</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          onPress={goMethods}
          disabled={googleLoading}
          style={[styles.btnPrimary, googleLoading && styles.disabled]}
          activeOpacity={0.75}
        >
          <Text style={styles.btnPrimaryText}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Al continuar, aceptas los <Text style={styles.footerLink}>Términos de uso</Text> de
        MecaniMóvil. Consulta nuestra <Text style={styles.footerLink}>Política de privacidad</Text>.
      </Text>

      <TouchableOpacity
        onPress={handleClearGoogleAccounts}
        disabled={googleLoading}
        style={styles.clearBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="person-remove-outline" size={14} color={COLORS.text.secondary} style={{ marginRight: 6 }} />
        <Text style={styles.clearBtnText}>Quitar las cuentas</Text>
      </TouchableOpacity>
    </>
  );

  const renderMethodsView = () => (
    <>
      {connectedAccounts.length > 0 && (
        <TouchableOpacity onPress={goAccounts} style={styles.backRow} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      )}

      <View style={styles.heading}>
        <Text style={styles.h1}>Inicia sesión o regístrate</Text>
        <Text style={styles.h2}>
          Para acceder a MecaniMóvil, usa tu cuenta de Google o tu correo electrónico.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          onPress={handleUseAnotherGoogle}
          disabled={googleLoading}
          style={[styles.optionBtn, googleLoading && styles.disabled]}
          activeOpacity={0.75}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={COLORS.text.primary} />
          ) : (
            <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.optionIcon} />
          )}
          <Text style={styles.optionText}>Usar Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goEmail}
          style={styles.optionBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="mail-outline" size={20} color={COLORS.text.primary} style={styles.optionIcon} />
          <Text style={styles.optionText}>Usar mi correo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Al continuar, aceptas los <Text style={styles.footerLink}>Términos de uso</Text> de
        MecaniMóvil. Consulta nuestra <Text style={styles.footerLink}>Política de privacidad</Text>.
      </Text>
    </>
  );

  const renderEmailView = () => (
    <>
      <TouchableOpacity onPress={goMethods} style={styles.backRow} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.heading}>
        <Text style={styles.h1}>Inicia sesión con tu correo</Text>
        <Text style={styles.h2}>
          ¿No tienes cuenta?{' '}
          <Text
            style={styles.headingLink}
            onPress={() => navigation.navigate(ROUTES.REGISTER, { prefill: { email } })}
          >
            Regístrate aquí
          </Text>
          .
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.fieldWrap}>
          <Input
            label="Correo Electrónico"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            error={errors.email}
            leftIcon="mail-outline"
            appearance="light"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Input
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
            secureTextEntry
            autoCorrect={false}
            returnKeyType="done"
            error={errors.password}
            leftIcon="lock-closed-outline"
            appearance="light"
          />
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
              {rememberMe && <Ionicons name="checkmark" size={13} color={COLORS.text.inverse} />}
            </View>
            <Text style={styles.rememberText}>Recordarme</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForgotPasswordModal(true)}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Iniciar Sesión"
          onPress={handleLogin}
          isLoading={loading}
          type="primary"
          variant="solid"
          useGradient
          size="md"
          fullWidth
        />
      </View>

      <Text style={styles.footer}>
        Al continuar, aceptas los <Text style={styles.footerLink}>Términos de uso</Text> de
        MecaniMóvil. Consulta nuestra <Text style={styles.footerLink}>Política de privacidad</Text>.
      </Text>
    </>
  );

  /* ─── render ─────────────────────────────────────────────────────── */
  const scrollContent = (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'web' ? undefined : 'on-drag'}
    >
      <View style={styles.logoWrap}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      {step === null ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : step === 'accounts' ? renderAccountsView()
        : step === 'methods'  ? renderMethodsView()
        : renderEmailView()}
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {Platform.OS === 'web' ? (
        scrollContent
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {scrollContent}
        </TouchableWithoutFeedback>
      )}

      {/* Forgot Password Modal */}
      <Modal visible={showForgotPasswordModal} animationType="fade" transparent onRequestClose={closeForgotPasswordModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeForgotPasswordModal} />
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.88)' }]} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name={forgotPasswordStep === 1 ? 'mail-outline' : 'key-outline'} size={28} color="#67E8F9" />
                </View>
                <TouchableOpacity onPress={closeForgotPasswordModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTitle}>{forgotPasswordStep === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}</Text>
              {forgotPasswordStep === 1 ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalDesc}>Ingresa tu correo y te enviaremos un token para restablecer tu contraseña.</Text>
                  <View style={styles.fieldWrap}>
                    <Input label="Correo Electrónico" placeholder="ejemplo@correo.com" value={forgotPasswordEmail}
                      onChangeText={(t) => { setForgotPasswordEmail(t); if (forgotPasswordErrors.email) setForgotPasswordErrors((p) => ({ ...p, email: undefined })); }}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.email} leftIcon="mail-outline" appearance="darkGlass" />
                  </View>
                  <Button title="Enviar Solicitud" onPress={handleForgotPassword} isLoading={forgotPasswordLoading} type="primary" variant="solid" useGradient size="md" fullWidth />
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalDesc}>Ingresa el token recibido y tu nueva contraseña.</Text>
                  <View style={styles.fieldWrap}>
                    <Input label="Token" placeholder="Ingresa el token" value={resetToken}
                      onChangeText={(t) => { setResetToken(t); if (forgotPasswordErrors.token) setForgotPasswordErrors((p) => ({ ...p, token: undefined })); }}
                      autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.token} leftIcon="key-outline" appearance="darkGlass" />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Input label="Nueva Contraseña" placeholder="Mínimo 8 caracteres" value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); if (forgotPasswordErrors.newPassword) setForgotPasswordErrors((p) => ({ ...p, newPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.newPassword} leftIcon="lock-closed-outline" appearance="darkGlass" />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Input label="Confirmar Contraseña" placeholder="Confirma tu contraseña" value={confirmNewPassword}
                      onChangeText={(t) => { setConfirmNewPassword(t); if (forgotPasswordErrors.confirmNewPassword) setForgotPasswordErrors((p) => ({ ...p, confirmNewPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.confirmNewPassword} leftIcon="lock-closed-outline" appearance="darkGlass" />
                  </View>
                  <Button title="Restablecer Contraseña" onPress={handleResetPassword} isLoading={forgotPasswordLoading} type="primary" variant="solid" useGradient size="md" fullWidth />
                  <TouchableOpacity onPress={() => setForgotPasswordStep(1)} style={styles.backRow}>
                    <Ionicons name="arrow-back" size={16} color="#67E8F9" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#67E8F9' }}>Volver a ingresar email</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web' ? { height: '100%' } : null),
  },
  scroll: {
    paddingHorizontal: SPACING.container.horizontal,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  /* Logo */
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 170, height: 50 },

  /* Heading */
  heading: { marginBottom: 22 },
  h1: {
    fontSize: TYPOGRAPHY.styles.h2.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 32,
  },
  h2: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  headingLink: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textDecorationLine: 'underline',
  },

  /* Back button */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginLeft: 2,
  },

  /* Card */
  card: {
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    padding: 18,
    marginBottom: 18,
  },

  /* Account row */
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[500],
  },
  accountInfo: { flex: 1, marginLeft: 14, minWidth: 0 },
  accountName: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  accountEmail: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border.light },
  dividerText: {
    marginHorizontal: 14,
    fontSize: TYPOGRAPHY.styles.small.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.5,
  },

  /* Primary button (text-only style for "Usar otra cuenta") */
  btnPrimary: {
    minHeight: 50,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border.dark,
    backgroundColor: COLORS.background.paper,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  /* Method options (Usar Google / Usar correo) */
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border.dark,
    backgroundColor: COLORS.background.paper,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionIcon: { marginRight: 12 },
  optionText: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  /* Clear accounts link */
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  clearBtnText: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },

  /* Form fields */
  fieldWrap: { marginBottom: 14 },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: COLORS.border.dark, marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.primary[500], borderColor: COLORS.primary[500] },
  rememberText: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.text.secondary,
  },
  forgotText: {
    fontSize: TYPOGRAPHY.styles.captionBold.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[500],
  },

  /* Disabled */
  disabled: { opacity: 0.55 },

  /* Footer */
  footer: {
    fontSize: TYPOGRAPHY.styles.small.fontSize,
    color: COLORS.text.tertiary,
    lineHeight: 18,
    marginBottom: 10,
  },
  footerLink: {
    color: COLORS.primary[500],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textDecorationLine: 'underline',
  },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '85%', borderRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,126,167,0.20)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    color: '#F9FAFB',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: withOpacity(COLORS.base.white, 0.55),
    marginBottom: 20,
    lineHeight: 20,
  },
});

export default LoginScreen;
