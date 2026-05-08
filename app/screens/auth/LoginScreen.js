import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
  Animated,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

/** ─────────────────────────────────────────────────────────────────────────── */
const LoginScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();
  const queryClient = useQueryClient();

  // Google sign-in hook
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

  // Connected Google accounts (Canva-style list)
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  useEffect(() => {
    let alive = true;
    getConnectedGoogleAccountsAsync().then((list) => {
      if (alive) setConnectedAccounts(list);
    });
    return () => { alive = false; };
  }, [googleLoading]);

  const handleClearGoogleAccounts = async () => {
    await clearConnectedGoogleAccountsAsync();
    setConnectedAccounts([]);
  };

  const handleAccountTap = (email) => {
    if (googleLoading) return;
    signInWithAccountChooser({ loginHint: email });
  };

  const handleUseAnotherAccount = () => {
    if (googleLoading) return;
    signInWithAccountChooser();
  };

  // Email/password form (hidden by default — only shown if user taps "Usar correo")
  const [emailMode, setEmailMode] = useState(false);
  const emailModeAnim = useRef(new Animated.Value(0)).current;

  const toggleEmailMode = () => {
    const next = !emailMode;
    setEmailMode(next);
    Animated.spring(emailModeAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState({});

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
          setEmailMode(true);
          emailModeAnim.setValue(1);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) { setForgotPasswordErrors({ email: 'El correo electrónico es requerido' }); return; }
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) { setForgotPasswordErrors({ email: 'El correo electrónico no es válido' }); return; }
    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      setForgotPasswordStep(2);
      Alert.alert('Solicitud enviada', 'Se ha enviado un token de recuperación a tu correo electrónico.');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Ocurrió un error.';
      setForgotPasswordErrors({ email: msg });
      Alert.alert(error.response?.status === 404 ? 'Correo no registrado' : 'Error', msg);
      setForgotPasswordStep(1);
    } finally {
      setForgotPasswordLoading(false);
    }
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
      Alert.alert('Contraseña restablecida', 'Tu contraseña fue restablecida exitosamente.', [{
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
      Alert.alert('Error', msg);
    } finally {
      setForgotPasswordLoading(false);
    }
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
        Alert.alert('Cuenta de Proveedor', 'Esta cuenta está registrada como mecánico o taller.\n\nUsa la aplicación MecaniMóvil Proveedores.', [{ text: 'Entendido' }]);
      } else {
        Alert.alert('Error al iniciar sesión', result.error || 'Correo o contraseña incorrectos.', [{ text: 'OK' }]);
      }
    } catch (error) {
      logger.error('Error inesperado en handleLogin:', error);
      Alert.alert('Error al iniciar sesión', 'Ocurrió un problema. Verifica tu conexión.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 48 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Logo ───────────────────────────────────────────────────── */}
          <View style={styles.logoWrap}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>

          {/* ── Heading ───────────────────────────────────────────────── */}
          <Text style={styles.heading}>
            {emailMode ? 'Inicia sesión con tu correo' : 'Inicia sesión o regístrate'}
          </Text>
          <Text style={styles.subheading}>
            {emailMode
              ? 'Ingresa tus datos para continuar'
              : 'Para acceder a MecaniMóvil, usa tu cuenta de Google o correo electrónico.'}
          </Text>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          {!emailMode && (
            <View style={styles.tabRow}>
              <TouchableOpacity style={styles.tab}>
                <Text style={styles.tabActive}>Iniciar Sesión</Text>
                <View style={styles.tabIndicator} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate(ROUTES.REGISTER)}>
                <Text style={styles.tabInactive}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Card ──────────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* === Auth options (shown when NOT in email mode) === */}
            {!emailMode && (
              <>
                {/* --- Google accounts list (Canva style) --- */}
                {connectedAccounts.length > 0 ? (
                  <View>
                    <Text style={styles.cardLabel}>¿Con qué cuenta continuarás hoy?</Text>

                    {connectedAccounts.map((acc) => {
                      const initials = (acc.name || acc.email || '?')
                        .split(/\s+/)
                        .map((s) => s[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
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
                            {acc.name ? (
                              <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                            ) : null}
                            <Text style={styles.accountEmail} numberOfLines={1}>{acc.email}</Text>
                          </View>
                          {googleLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary[500]} />
                          ) : (
                            <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>O bien</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  </View>
                ) : null}

                {/* --- Google primary button --- */}
                <TouchableOpacity
                  onPress={handleUseAnotherAccount}
                  disabled={googleLoading}
                  style={[styles.authBtn, styles.authBtnGoogle, googleLoading && styles.disabled]}
                  activeOpacity={0.75}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="#1F1F1F" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.authBtnIcon} />
                      <Text style={styles.authBtnText}>
                        {connectedAccounts.length > 0 ? 'Usar otra cuenta de Google' : 'Continuar con Google'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* --- Email secondary button --- */}
                <TouchableOpacity
                  onPress={toggleEmailMode}
                  style={[styles.authBtn, styles.authBtnEmail]}
                  activeOpacity={0.75}
                >
                  <Ionicons name="mail-outline" size={20} color={COLORS.text.primary} style={styles.authBtnIcon} />
                  <Text style={styles.authBtnText}>Continuar con correo electrónico</Text>
                </TouchableOpacity>

                {/* --- Clear accounts link --- */}
                {connectedAccounts.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearGoogleAccounts}
                    disabled={googleLoading}
                    style={styles.clearBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-remove-outline" size={13} color={COLORS.text.tertiary} style={{ marginRight: 5 }} />
                    <Text style={styles.clearBtnText}>Quitar las cuentas</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* === Email/password form (shown when emailMode = true) === */}
            {emailMode && (
              <>
                <TouchableOpacity
                  onPress={toggleEmailMode}
                  style={styles.backRow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.primary[500]} />
                  <Text style={styles.backText}>Volver a opciones</Text>
                </TouchableOpacity>

                <View style={styles.tabs2}>
                  <TouchableOpacity style={styles.tab}>
                    <Text style={styles.tabActive}>Iniciar Sesión</Text>
                    <View style={styles.tabIndicator} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate(ROUTES.REGISTER)}>
                    <Text style={styles.tabInactive}>Registrarse</Text>
                  </TouchableOpacity>
                </View>

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

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={handleUseAnotherAccount}
                  disabled={googleLoading}
                  style={[styles.authBtn, styles.authBtnGoogle, googleLoading && styles.disabled]}
                  activeOpacity={0.75}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="#1F1F1F" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.authBtnIcon} />
                      <Text style={styles.authBtnText}>
                        {connectedAccounts.length > 0 ? 'Usar otra cuenta de Google' : 'Continuar con Google'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <Text style={styles.footer}>
            Al continuar, aceptas los{' '}
            <Text style={styles.footerLink}>Términos de uso</Text> de MecaniMóvil.
            Consulta nuestra{' '}
            <Text style={styles.footerLink}>Política de privacidad</Text>.
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* ── Forgot Password Modal ──────────────────────────────────────── */}
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
  },

  /* Logo */
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 180, height: 52 },

  /* Heading */
  heading: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  tabs2: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', position: 'relative' },
  tabActive: {
    fontSize: TYPOGRAPHY.styles.label.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  tabInactive: {
    fontSize: TYPOGRAPHY.styles.label.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '15%',
    right: '15%',
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary[500],
  },

  /* Card */
  card: {
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    padding: 20,
    marginBottom: 20,
  },

  /* Account list */
  cardLabel: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    marginBottom: 8,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.gray[100],
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary[500],
  },
  accountInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  accountName: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  accountEmail: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },

  /* Auth buttons */
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  authBtnGoogle: {
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  authBtnEmail: {
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  authBtnIcon: { marginRight: 10 },
  authBtnText: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border.light },
  dividerText: {
    marginHorizontal: 14,
    fontSize: TYPOGRAPHY.styles.small.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },

  /* Clear accounts */
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  clearBtnText: {
    fontSize: TYPOGRAPHY.styles.small.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },

  /* Back / email mode */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 16,
  },
  backText: {
    marginLeft: 6,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary[500],
  },

  /* Form fields */
  fieldWrap: { marginBottom: 14 },

  /* Options row */
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border.dark,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* Disabled state */
  disabled: { opacity: 0.55 },

  /* Footer */
  footer: {
    fontSize: TYPOGRAPHY.styles.small.fontSize,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
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
