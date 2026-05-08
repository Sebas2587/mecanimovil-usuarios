import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { useGoogleSignInFlow } from '../../hooks/useGoogleSignInFlow';
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

const GlassCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const LoginScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle } = useAuth();
  const queryClient = useQueryClient();
  const { handleGoogleSignIn, googleLoading, googleButtonDisabled, isWebOAuthReady, renderNativeGoogleButton } = useGoogleSignInFlow(loginWithGoogle, {
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

  const googleNativeBtnRef = React.useRef(null);

  // Render Google's native sign-in button when GIS SDK is ready (web only).
  // renderButton() has no One Tap cooldown and shows "Use another account" option.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isWebOAuthReady) return;
    if (!renderNativeGoogleButton) return;
    if (!googleNativeBtnRef.current) return;
    renderNativeGoogleButton(googleNativeBtnRef.current);
  }, [isWebOAuthReady, renderNativeGoogleButton]);

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

  useEffect(() => {
    const loadRememberedCredentials = async () => {
      try {
        const remembered = await AsyncStorage.getItem('rememberMe');
        if (remembered === 'true') {
          const savedEmail = await AsyncStorage.getItem('savedEmail');
          const savedPassword = await AsyncStorage.getItem('savedPassword');
          if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
          }
        }
      } catch (error) {
        logger.error('Error cargando credenciales recordadas:', error);
      }
    };
    loadRememberedCredentials();
  }, []);

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordErrors({ email: 'El correo electrónico es requerido' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setForgotPasswordErrors({ email: 'El correo electrónico no es válido' });
      return;
    }
    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      setForgotPasswordStep(2);
      Alert.alert('Solicitud enviada', 'Se ha enviado un token de recuperación a tu correo electrónico.', [{ text: 'OK' }]);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Ocurrió un error al solicitar la recuperación.';
      const statusCode = error.response?.status || error.status;
      if (statusCode === 404) {
        setForgotPasswordErrors({ email: errorMessage });
        Alert.alert('Correo no registrado', errorMessage);
      } else {
        setForgotPasswordErrors({ email: errorMessage });
        Alert.alert('Error', errorMessage);
      }
      setForgotPasswordStep(1);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken) { setForgotPasswordErrors({ token: 'El token es requerido' }); return; }
    if (!newPassword) { setForgotPasswordErrors({ newPassword: 'La nueva contraseña es requerida' }); return; }
    if (newPassword.length < 8) { setForgotPasswordErrors({ newPassword: 'La contraseña debe tener al menos 8 caracteres' }); return; }
    if (newPassword !== confirmNewPassword) { setForgotPasswordErrors({ confirmNewPassword: 'Las contraseñas no coinciden' }); return; }

    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});
    try {
      await authService.resetPassword(resetToken, newPassword);
      Alert.alert('Contraseña restablecida', 'Tu contraseña ha sido restablecida exitosamente.', [{
        text: 'OK', onPress: () => {
          setShowForgotPasswordModal(false);
          setForgotPasswordStep(1);
          setForgotPasswordEmail('');
          setResetToken('');
          setNewPassword('');
          setConfirmNewPassword('');
        }
      }]);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Ocurrió un error al restablecer la contraseña.';
      setForgotPasswordErrors({ token: errorMessage });
      Alert.alert('Error', errorMessage);
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
    let valid = true;
    let newErrors = {};
    if (!email) { newErrors.email = 'El correo electrónico es requerido'; valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { newErrors.email = 'El correo electrónico no es válido'; valid = false; }
    if (!password) { newErrors.password = 'La contraseña es requerida'; valid = false; }
    setErrors(newErrors);
    return valid;
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
          queryClient.prefetchQuery({ queryKey: ['userProfile', userId], queryFn: () => userService.getUserProfile(userId), staleTime: 1000 * 60 * 5 });
          queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: categoryService.getAllCategories, staleTime: 1000 * 60 * 60 * 24 });
          queryClient.prefetchQuery({ queryKey: ['chats', 'list'], queryFn: () => ofertasService.obtenerListaChats(), staleTime: 1000 * 60 * 5 });
          queryClient.prefetchQuery({ queryKey: ['vehicles'], queryFn: () => vehiculoService.getUserVehicles(), staleTime: 1000 * 60 * 5 });
        }
        if (rememberMe) {
          await AsyncStorage.setItem('rememberMe', 'true');
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('savedPassword', password);
        } else {
          await AsyncStorage.multiRemove(['rememberMe', 'savedEmail', 'savedPassword']);
        }
      } else if (result.code === 'PROVIDER_ACCOUNT') {
        Alert.alert(
          'Cuenta de Proveedor',
          'Esta cuenta está registrada como mecánico o taller.\n\nPara acceder, descarga y usa la aplicación MecaniMóvil Proveedores.',
          [{ text: 'Entendido' }],
        );
      } else {
        const errorMessage = result.error || 'Correo electrónico o contraseña incorrectos.';
        Alert.alert('Error al iniciar sesión', errorMessage, [{ text: 'OK' }]);
      }
    } catch (error) {
      logger.error('Error inesperado en handleLogin:', error);
      Alert.alert('Error al iniciar sesión', 'Ocurrió un problema. Verifica tu conexión e intenta nuevamente.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Logo + Title */}
        <View style={styles.headerSection}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>Conecta tu auto con especialistas automotrices</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabTextActive}>Iniciar Sesión</Text>
            <View style={styles.tabIndicatorActive} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate(ROUTES.REGISTER)}>
            <Text style={styles.tabTextInactive}>Registrarse</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <GlassCard style={styles.formCard}>
          <View style={styles.inputWrapper}>
            <Input
              label="Correo Electrónico"
              placeholder="ejemplo@correo.com"
              value={email}
              onChangeText={(text) => { setEmail(text); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }}
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
          <View style={styles.inputWrapper}>
            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => { setPassword(text); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
              secureTextEntry
              autoCorrect={false}
              returnKeyType="done"
              error={errors.password}
              leftIcon="lock-closed-outline"
              appearance="light"
            />
          </View>

          {/* Remember + Forgot */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.text.inverse} />}
              </View>
              <Text style={styles.rememberText}>Recordarme</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotPasswordModal(true)}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
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

          <View style={styles.oauthDivider}>
            <View style={styles.oauthDividerLine} />
            <Text style={styles.oauthDividerText}>o</Text>
            <View style={styles.oauthDividerLine} />
          </View>

          {Platform.OS === 'web' ? (
            // Web: botón nativo de Google (sin cooldown, soporta "Usar otra cuenta").
            // renderNativeGoogleButton() inyecta el iframe de GIS aquí.
            <View style={styles.googleNativeContainer}>
              <View ref={googleNativeBtnRef} style={styles.googleNativeBtnWrap} />
              {!isWebOAuthReady && (
                <ActivityIndicator size="small" color={COLORS.primary[500]} style={{ marginTop: 8 }} />
              )}
            </View>
          ) : (
            <GoogleSignInButton
              onPress={handleGoogleSignIn}
              isLoading={googleLoading}
              disabled={googleButtonDisabled}
            />
          )}
        </GlassCard>
      </ScrollView>

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
                  <View style={styles.inputWrapper}>
                    <Input label="Correo Electrónico" placeholder="ejemplo@correo.com" value={forgotPasswordEmail}
                      onChangeText={(t) => { setForgotPasswordEmail(t); if (forgotPasswordErrors.email) setForgotPasswordErrors(p => ({ ...p, email: undefined })); }}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.email} leftIcon="mail-outline" appearance="darkGlass" />
                  </View>
                  <Button
                    title="Enviar Solicitud"
                    onPress={handleForgotPassword}
                    isLoading={forgotPasswordLoading}
                    type="primary"
                    variant="solid"
                    useGradient
                    size="md"
                    fullWidth
                  />
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalDesc}>Ingresa el token recibido y tu nueva contraseña.</Text>
                  <View style={styles.inputWrapper}>
                    <Input label="Token" placeholder="Ingresa el token" value={resetToken}
                      onChangeText={(t) => { setResetToken(t); if (forgotPasswordErrors.token) setForgotPasswordErrors(p => ({ ...p, token: undefined })); }}
                      autoCapitalize="none" autoCorrect={false} error={forgotPasswordErrors.token} leftIcon="key-outline" appearance="darkGlass" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Input label="Nueva Contraseña" placeholder="Mínimo 8 caracteres" value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); if (forgotPasswordErrors.newPassword) setForgotPasswordErrors(p => ({ ...p, newPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.newPassword} leftIcon="lock-closed-outline" appearance="darkGlass" />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Input label="Confirmar Contraseña" placeholder="Confirma tu contraseña" value={confirmNewPassword}
                      onChangeText={(t) => { setConfirmNewPassword(t); if (forgotPasswordErrors.confirmNewPassword) setForgotPasswordErrors(p => ({ ...p, confirmNewPassword: undefined })); }}
                      secureTextEntry autoCorrect={false} error={forgotPasswordErrors.confirmNewPassword} leftIcon="lock-closed-outline" appearance="darkGlass" />
                  </View>
                  <Button
                    title="Restablecer Contraseña"
                    onPress={handleResetPassword}
                    isLoading={forgotPasswordLoading}
                    type="primary"
                    variant="solid"
                    useGradient
                    size="md"
                    fullWidth
                  />
                  <TouchableOpacity onPress={() => setForgotPasswordStep(1)} style={styles.backLink}>
                    <Ionicons name="arrow-back" size={16} color="#67E8F9" style={{ marginRight: 6 }} />
                    <Text style={styles.backLinkText}>Volver a ingresar email</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.default },

  scroll: { paddingHorizontal: SPACING.container.horizontal },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 180, height: 60, marginBottom: 16 },
  subtitle: {
    fontSize: TYPOGRAPHY.styles.body.fontSize,
    fontWeight: TYPOGRAPHY.styles.body.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.body.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.body.fontSize * TYPOGRAPHY.styles.body.lineHeight),
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  tabRow: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabTextActive: {
    fontSize: TYPOGRAPHY.styles.label.fontSize,
    fontWeight: TYPOGRAPHY.styles.label.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.label.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.label.fontSize * TYPOGRAPHY.styles.label.lineHeight),
    color: COLORS.text.primary,
  },
  tabTextInactive: {
    fontSize: TYPOGRAPHY.styles.label.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: TYPOGRAPHY.styles.label.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.label.fontSize * TYPOGRAPHY.styles.label.lineHeight),
    color: COLORS.text.tertiary,
  },
  tabIndicatorActive: { position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 3, borderRadius: 2, backgroundColor: COLORS.primary[500] },

  card: {
    borderRadius: BORDERS.radius.card?.lg ?? BORDERS.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    padding: 20,
  },

  formCard: { marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  googleNativeContainer: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  googleNativeBtnWrap: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  oauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  oauthDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border.light },
  oauthDividerText: {
    marginHorizontal: 14,
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.tertiary,
  },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 24 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border.dark, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary[500], borderColor: COLORS.primary[500] },
  rememberText: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.styles.caption.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.caption.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.caption.fontSize * TYPOGRAPHY.styles.caption.lineHeight),
    color: COLORS.text.secondary,
  },
  forgotText: {
    fontSize: TYPOGRAPHY.styles.captionBold.fontSize,
    fontWeight: TYPOGRAPHY.styles.captionBold.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.captionBold.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.captionBold.fontSize * TYPOGRAPHY.styles.captionBold.lineHeight),
    color: COLORS.primary[500],
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '85%', borderRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,126,167,0.20)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: {
    fontSize: TYPOGRAPHY.styles.h3.fontSize,
    fontWeight: TYPOGRAPHY.styles.h3.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.h3.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.h3.fontSize * TYPOGRAPHY.styles.h3.lineHeight),
    color: '#F9FAFB',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontWeight: TYPOGRAPHY.styles.caption.fontWeight,
    letterSpacing: TYPOGRAPHY.styles.caption.letterSpacing,
    lineHeight: Math.round(TYPOGRAPHY.styles.caption.fontSize * TYPOGRAPHY.styles.caption.lineHeight),
    color: withOpacity(COLORS.base.white, 0.55),
    marginBottom: 20,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 8 },
  backLinkText: { fontSize: 14, fontWeight: '600', color: '#67E8F9' },
});

export default LoginScreen;
