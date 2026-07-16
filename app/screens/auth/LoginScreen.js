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
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  UserMinus,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import {
  useGoogleSignInFlow,
  getConnectedGoogleAccountsAsync,
  clearConnectedGoogleAccountsAsync,
} from '../../hooks/useGoogleSignInFlow';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import logger from '../../utils/logger';
import * as authService from '../../services/auth';
import { useQueryClient } from '@tanstack/react-query';
import * as categoryService from '../../services/categories';
import * as userService from '../../services/user';
import ofertasService from '../../services/ofertasService';
import vehiculoService from '../../services/vehicle';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';
import LegalFooterLinks from '../../components/support/LegalFooterLinks';

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
const ICON_STROKE = 1.75;

const GoogleMark = ({ size = 20 }) => (
  <Text
    style={{
      width: size,
      fontSize: Math.round(size * 0.85),
      fontFamily: TYPOGRAPHY.styles.button.fontFamily,
      fontWeight: TYPOGRAPHY.styles.button.fontWeight,
      color: COLORS.primary[500],
      textAlign: 'center',
    }}
  >
    G
  </Text>
);

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

  const navigateBackToGuest = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.GUEST_LANDING);
  };

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
  const [formError, setFormError] = useState('');
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
    if (!validate()) {
      showAlert('Revisa el formulario', 'Completa los campos requeridos para continuar.');
      return;
    }
    setLoading(true);
    setErrors({});
    setFormError('');
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
        const msg = 'Esta cuenta está registrada como mecánico o taller.\n\nUsa la app MecaniMóvil Proveedores.';
        setFormError(msg);
        showAlert('Cuenta de proveedor', msg);
      } else if (result.code === 'USER_NOT_FOUND' || /no.*registrad|no.*encontrad|usuario.*no.*existe/i.test(result.error || '')) {
        const msg = 'No encontramos una cuenta con ese correo.';
        setErrors({ email: msg });
        setFormError(msg);
        showAlertButtons(
          'Cuenta no encontrada',
          'No encontramos una cuenta con ese correo. ¿Quieres registrarte?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Registrarme', onPress: () => navigation.navigate(ROUTES.REGISTER, { prefill: { email } }) },
          ],
        );
      } else {
        const msg = result.error || 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
        setErrors({ password: 'Contraseña incorrecta' });
        setFormError(msg);
        showAlert('No pudimos iniciar sesión', msg);
      }
    } catch (error) {
      logger.error('Error inesperado en handleLogin:', error);
      const msg = 'Ocurrió un problema. Verifica tu conexión e intenta de nuevo.';
      setFormError(msg);
      showAlert('Error al iniciar sesión', msg);
    } finally { setLoading(false); }
  };

  /* ─── render helpers ─────────────────────────────────────────────── */

  const renderAccountsView = () => (
    <>
      <TouchableOpacity onPress={navigateBackToGuest} style={styles.backRow} activeOpacity={0.7}>
        <ChevronLeft size={20} color={COLORS.text.primary} strokeWidth={ICON_STROKE} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

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
                : <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={ICON_STROKE} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>O BIEN</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Usar otra cuenta"
          onPress={goMethods}
          disabled={googleLoading}
          type="secondary"
          variant="outline"
          size="md"
          fullWidth
        />
      </View>

      <LegalFooterLinks textStyle={styles.footer} linkStyle={styles.footerLink} />

      <TouchableOpacity
        onPress={handleClearGoogleAccounts}
        disabled={googleLoading}
        style={styles.clearBtn}
        activeOpacity={0.7}
      >
        <UserMinus size={14} color={COLORS.text.secondary} strokeWidth={ICON_STROKE} style={{ marginRight: 6 }} />
        <Text style={styles.clearBtnText}>Quitar las cuentas</Text>
      </TouchableOpacity>
    </>
  );

  const renderMethodsView = () => (
    <>
      <TouchableOpacity
        onPress={connectedAccounts.length > 0 ? goAccounts : navigateBackToGuest}
        style={styles.backRow}
        activeOpacity={0.7}
      >
        <ChevronLeft size={20} color={COLORS.text.primary} strokeWidth={ICON_STROKE} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

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
            <View style={styles.optionIcon}>
              <GoogleMark size={20} />
            </View>
          )}
          <Text style={styles.optionText}>Usar Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goEmail}
          style={styles.optionBtn}
          activeOpacity={0.75}
        >
          <Mail size={20} color={COLORS.text.primary} strokeWidth={ICON_STROKE} style={styles.optionIcon} />
          <Text style={styles.optionText}>Usar mi correo</Text>
        </TouchableOpacity>
      </View>

      <LegalFooterLinks textStyle={styles.footer} linkStyle={styles.footerLink} />
    </>
  );

  const renderEmailView = () => (
    <>
      <TouchableOpacity onPress={goMethods} style={styles.backRow} activeOpacity={0.7}>
        <ChevronLeft size={20} color={COLORS.text.primary} strokeWidth={ICON_STROKE} />
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
        {formError ? (
          <View style={styles.formErrorBanner}>
            <AlertCircle size={18} color={COLORS.error.main} strokeWidth={ICON_STROKE} />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

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
            <View style={[styles.checkbox, rememberMe && styles.checkboxCheckedWrap]}>
              {rememberMe ? (
                <PrimaryGradientFill style={styles.checkboxFill}>
                  <Check size={13} color={COLORS.text.inverse} strokeWidth={2.5} />
                </PrimaryGradientFill>
              ) : null}
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
          size="md"
          fullWidth
        />
      </View>

      <LegalFooterLinks textStyle={styles.footer} linkStyle={styles.footerLink} />
    </>
  );

  /* ─── render ─────────────────────────────────────────────────────── */
  const scrollContent = (
    <ScrollView
      style={Platform.OS === 'web' ? styles.webScroll : undefined}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrap}>
                  {forgotPasswordStep === 1 ? (
                    <Mail size={26} color={COLORS.primary[500]} strokeWidth={ICON_STROKE} />
                  ) : (
                    <KeyRound size={26} color={COLORS.primary[500]} strokeWidth={ICON_STROKE} />
                  )}
                </View>
                <TouchableOpacity onPress={closeForgotPasswordModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color={COLORS.text.tertiary} strokeWidth={ICON_STROKE} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTitle}>{forgotPasswordStep === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}</Text>
              {forgotPasswordStep === 1 ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalDesc}>Ingresa tu correo y te enviaremos un token para restablecer tu contraseña.</Text>
                  <View style={styles.fieldWrap}>
                    <Input label="Correo Electrónico" placeholder="ejemplo@correo.com" value={forgotPasswordEmail}
                      onChangeText={(t) => { setForgotPasswordEmail(t); if (forgotPasswordErrors.email) setForgotPasswordErrors((p) => ({ ...p, email: undefined })); }}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.email} leftIcon="mail-outline" appearance="light" />
                  </View>
                  <Button title="Enviar Solicitud" onPress={handleForgotPassword} isLoading={forgotPasswordLoading} type="primary" variant="solid" size="md" fullWidth />
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalDesc}>Ingresa el token recibido y tu nueva contraseña.</Text>
                  <View style={styles.fieldWrap}>
                    <Input label="Token" placeholder="Ingresa el token" value={resetToken}
                      onChangeText={(t) => { setResetToken(t); if (forgotPasswordErrors.token) setForgotPasswordErrors((p) => ({ ...p, token: undefined })); }}
                      autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.token} leftIcon="key-outline" appearance="light" />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Input label="Nueva Contraseña" placeholder="Mínimo 8 caracteres" value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); if (forgotPasswordErrors.newPassword) setForgotPasswordErrors((p) => ({ ...p, newPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.newPassword} leftIcon="lock-closed-outline" appearance="light" />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Input label="Confirmar Contraseña" placeholder="Confirma tu contraseña" value={confirmNewPassword}
                      onChangeText={(t) => { setConfirmNewPassword(t); if (forgotPasswordErrors.confirmNewPassword) setForgotPasswordErrors((p) => ({ ...p, confirmNewPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.confirmNewPassword} leftIcon="lock-closed-outline" appearance="light" />
                  </View>
                  <Button title="Restablecer Contraseña" onPress={handleResetPassword} isLoading={forgotPasswordLoading} type="primary" variant="solid" size="md" fullWidth />
                  <TouchableOpacity onPress={() => setForgotPasswordStep(1)} style={styles.backRow}>
                    <ArrowLeft size={16} color={COLORS.primary[500]} strokeWidth={ICON_STROKE} style={{ marginRight: 6 }} />
                    <Text style={styles.modalBackLink}>Volver a ingresar email</Text>
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
    ...(Platform.OS === 'web'
      ? { height: '100vh', maxHeight: '100vh', overflow: 'hidden' }
      : null),
  },
  webScroll: { flex: 1 },
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
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  h2: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  headingLink: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.primary[500],
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
    ...TYPOGRAPHY.styles.captionBold,
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
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
  },
  accountInfo: { flex: 1, marginLeft: 14, minWidth: 0 },
  accountName: {
    ...TYPOGRAPHY.styles.bodyBold,
    color: COLORS.text.primary,
  },
  accountEmail: {
    ...TYPOGRAPHY.styles.caption,
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
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.styles.captionBold.fontFamily,
    fontWeight: TYPOGRAPHY.styles.captionBold.fontWeight,
    color: COLORS.text.tertiary,
    letterSpacing: 0.5,
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
    ...TYPOGRAPHY.styles.button,
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
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },

  /* Form fields */
  fieldWrap: { marginBottom: 14 },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
    padding: 12,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.error[200],
    backgroundColor: COLORS.error[50],
  },
  formErrorText: {
    flex: 1,
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.error.main,
  },
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
  checkboxCheckedWrap: {
    borderColor: COLORS.primary[500],
    overflow: 'hidden',
    padding: 0,
  },
  checkboxFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
  forgotText: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
  },

  /* Disabled */
  disabled: { opacity: 0.55 },

  /* Footer */
  footer: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.text.tertiary,
    marginBottom: 10,
  },
  footerLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
    textDecorationLine: 'underline',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  modalContent: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  modalDesc: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  modalBackLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
  },
});

export default LoginScreen;
