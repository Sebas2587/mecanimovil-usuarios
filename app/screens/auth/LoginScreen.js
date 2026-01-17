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
  SafeAreaView,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import { TOKENS } from '../../design-system/tokens';
import { COLORS } from '../../design-system/tokens/colors';
import logger from '../../utils/logger';
import * as authService from '../../services/auth';

const { width } = Dimensions.get('window');

// Logo de MecaniMóvil
const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

// Fallback values
const SAFE_COLORS = TOKENS?.colors || COLORS || {
  background: { default: '#F5F7F8', paper: '#FFFFFF' },
  text: { primary: '#00171F', secondary: '#5D6F75' },
  primary: { 500: '#003459' },
  secondary: { 500: '#007EA7' },
  accent: { 500: '#00A8E8' },
  neutral: { gray: { 200: '#E5E7EB', 300: '#D1D5DB' } }
};

const SAFE_TYPOGRAPHY = TOKENS?.typography || {
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' }
};

const SAFE_SPACING = TOKENS?.spacing || {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48
};

const SAFE_BORDERS = TOKENS?.borders || {
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  width: { thin: 1 }
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  
  // Estados para modal de recuperación de contraseña
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: email, 2: token y nueva contraseña
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState({});

  // Design tokens
  const colors = SAFE_COLORS;
  const typography = SAFE_TYPOGRAPHY;
  const spacing = SAFE_SPACING;
  const borders = SAFE_BORDERS;

  // Colores del sistema de diseño
  const primaryColor = colors.primary?.[500] || '#003459';
  const secondaryColor = colors.secondary?.[500] || '#007EA7';
  const accentColor = colors.accent?.[500] || '#00A8E8';

  // Cargar credenciales guardadas al montar el componente
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
            logger.debug('Credenciales recordadas cargadas');
          }
        }
      } catch (error) {
        logger.error('Error cargando credenciales recordadas:', error);
      }
    };

    loadRememberedCredentials();
  }, []);

  // Funciones para recuperación de contraseña
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
      const response = await authService.forgotPassword(forgotPasswordEmail);
      
      // Si la solicitud fue exitosa, pasar al siguiente paso para ingresar el token
      setForgotPasswordStep(2);
      
      Alert.alert(
        'Solicitud enviada',
        'Se ha enviado un token de recuperación a tu correo electrónico. Revisa tu bandeja de entrada y entra el token recibido.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Manejar errores específicos
      const errorMessage = error.response?.data?.error || error.message || 'Ocurrió un error al solicitar la recuperación. Intenta nuevamente.';
      const statusCode = error.response?.status || error.status;
      
      // Si el email no existe (404), mostrar error y quedarse en el paso 1
      if (statusCode === 404) {
        setForgotPasswordErrors({ email: errorMessage });
        Alert.alert('Correo no registrado', errorMessage);
      } else {
        // Otros errores
        setForgotPasswordErrors({ email: errorMessage });
        Alert.alert('Error', errorMessage);
      }
      
      // No avanzar al siguiente paso si hay error
      setForgotPasswordStep(1);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Validaciones
    if (!resetToken) {
      setForgotPasswordErrors({ token: 'El token es requerido' });
      return;
    }

    if (!newPassword) {
      setForgotPasswordErrors({ newPassword: 'La nueva contraseña es requerida' });
      return;
    }

    if (newPassword.length < 8) {
      setForgotPasswordErrors({ newPassword: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotPasswordErrors({ confirmNewPassword: 'Las contraseñas no coinciden' });
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordErrors({});

    try {
      await authService.resetPassword(resetToken, newPassword);
      
      Alert.alert(
        'Contraseña restablecida',
        'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
        [{ text: 'OK', onPress: () => {
          setShowForgotPasswordModal(false);
          setForgotPasswordStep(1);
          setForgotPasswordEmail('');
          setResetToken('');
          setNewPassword('');
          setConfirmNewPassword('');
        }}]
      );
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Ocurrió un error al restablecer la contraseña. Verifica el token e intenta nuevamente.';
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

    if (!email) {
      newErrors.email = 'El correo electrónico es requerido';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'El correo electrónico no es válido';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({}); // Limpiar errores anteriores
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Guardar credenciales si "Recordarme" está activado
        if (rememberMe) {
          try {
            await AsyncStorage.setItem('rememberMe', 'true');
            await AsyncStorage.setItem('savedEmail', email);
            await AsyncStorage.setItem('savedPassword', password);
            logger.debug('Credenciales guardadas para recordar');
          } catch (storageError) {
            logger.error('Error guardando credenciales:', storageError);
            // No mostrar error al usuario, es una funcionalidad opcional
          }
        } else {
          // Si no está marcado, limpiar credenciales guardadas
          try {
            await AsyncStorage.removeItem('rememberMe');
            await AsyncStorage.removeItem('savedEmail');
            await AsyncStorage.removeItem('savedPassword');
            logger.debug('Credenciales recordadas eliminadas');
          } catch (storageError) {
            logger.error('Error eliminando credenciales:', storageError);
          }
        }

        // Login exitoso - la navegación se maneja automáticamente por AuthNavigator
        // No mostrar ningún mensaje aquí para mejor UX
      } else {
        // Mostrar mensaje de error amigable al usuario
        // El mensaje ya viene amigable desde AuthContext, solo mostrarlo
        const errorMessage = result.error || 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.';
        
        Alert.alert(
          'Error al iniciar sesión',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      // Este catch nunca debería ejecutarse si el código está bien,
      // pero por seguridad, manejar cualquier error inesperado
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      logger.error('Error inesperado en handleLogin (solo visible en desarrollo):', error);
      
      // NUNCA mostrar el error técnico al usuario
      // Siempre mostrar un mensaje amigable
      Alert.alert(
        'Error al iniciar sesión',
        'Ocurrió un problema al intentar iniciar sesión. Por favor, verifica tu conexión a internet e intenta nuevamente.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Gradiente superior */}
        <LinearGradient
          colors={[`${accentColor}15`, 'transparent']}
          style={styles.topGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Gradiente inferior */}
        <LinearGradient
          colors={['transparent', `${accentColor}10`]}
          style={styles.bottomGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
        >
          {/* Header con Logo */}
          <View style={styles.headerContainer}>
            <Image 
              source={LOGO} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: colors.text?.secondary || '#5D6F75' }]}>
              Conecta tu auto con especialistas automotrices en donde lo necesites
            </Text>
            <Text style={[styles.title, { color: colors.text?.primary || '#00171F' }]}>
              Iniciar Sesión
            </Text>
          </View>

          {/* Tabs Login/Register */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={styles.tab}>
              <Text style={[styles.tabText, { color: secondaryColor }]}>Iniciar Sesión</Text>
              <View style={[styles.tabIndicator, { backgroundColor: secondaryColor }]} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
            >
              <Text style={[styles.tabText, { color: colors.text?.secondary || '#9BAFB9' }]}>
                Registrarse
              </Text>
              <View style={styles.tabIndicatorInactive} />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Input
                label="Correo Electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  // Limpiar error cuando el usuario empiece a escribir
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                error={errors.email}
                leftIcon="mail-outline"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Input
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  // Limpiar error cuando el usuario empiece a escribir
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                secureTextEntry
                autoCorrect={false}
                returnKeyType="done"
                error={errors.password}
                leftIcon="lock-closed-outline"
              />
            </View>

            {/* Remember me y Forgot password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: secondaryColor },
                  rememberMe && { backgroundColor: secondaryColor }
                ]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.rememberText, { color: colors.text?.secondary || '#5D6F75' }]}>
                  Recordarme
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowForgotPasswordModal(true)}
              >
                <Text style={[styles.forgotText, { color: secondaryColor }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botón de Login con gradiente */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={styles.loginButtonWrapper}
            >
              <LinearGradient
                colors={[secondaryColor, accentColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                {loading ? (
                  <Text style={styles.loginButtonText}>Cargando...</Text>
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal de Recuperación de Contraseña */}
        <Modal
          visible={showForgotPasswordModal}
          animationType="fade"
          transparent={true}
          onRequestClose={closeForgotPasswordModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header con icono y título */}
              <View style={styles.modalHeaderContainer}>
                <View style={styles.modalIconContainer}>
                  <LinearGradient
                    colors={[`${accentColor}20`, `${secondaryColor}20`]}
                    style={styles.modalIconGradient}
                  >
                    <Ionicons 
                      name={forgotPasswordStep === 1 ? "mail-outline" : "key-outline"} 
                      size={32} 
                      color={secondaryColor} 
                    />
                  </LinearGradient>
                </View>
                <TouchableOpacity 
                  onPress={closeForgotPasswordModal} 
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={28} color={colors.text?.secondary || '#9BAFB9'} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalTitle, { color: colors.text?.primary || '#00171F' }]}>
                {forgotPasswordStep === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
              </Text>

              {forgotPasswordStep === 1 ? (
                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[styles.modalDescription, { color: colors.text?.secondary || '#5D6F75' }]}>
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </Text>
                  
                  <View style={styles.modalInputWrapper}>
                    <Input
                      label="Correo Electrónico"
                      placeholder="ejemplo@correo.com"
                      value={forgotPasswordEmail}
                      onChangeText={(text) => {
                        setForgotPasswordEmail(text);
                        if (forgotPasswordErrors.email) {
                          setForgotPasswordErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={forgotPasswordErrors.email}
                      leftIcon="mail-outline"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    style={[styles.modalButton, forgotPasswordLoading && styles.modalButtonDisabled]}
                  >
                    <LinearGradient
                      colors={[secondaryColor, accentColor]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalButtonGradient}
                    >
                      {forgotPasswordLoading ? (
                        <Text style={styles.modalButtonText}>Enviando...</Text>
                      ) : (
                        <>
                          <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.modalButtonText}>Enviar Solicitud</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[styles.modalDescription, { color: colors.text?.secondary || '#5D6F75' }]}>
                    Revisa tu correo electrónico. Si el email existe, recibirás un token de recuperación. Ingresa el token recibido y tu nueva contraseña.
                  </Text>
                  
                  <View style={styles.modalInputWrapper}>
                    <Input
                      label="Token de Recuperación"
                      placeholder="Ingresa el token recibido"
                      value={resetToken}
                      onChangeText={(text) => {
                        setResetToken(text);
                        if (forgotPasswordErrors.token) {
                          setForgotPasswordErrors(prev => ({ ...prev, token: undefined }));
                        }
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={forgotPasswordErrors.token}
                      leftIcon="key-outline"
                    />
                  </View>

                  <View style={styles.modalInputWrapper}>
                    <Input
                      label="Nueva Contraseña"
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (forgotPasswordErrors.newPassword) {
                          setForgotPasswordErrors(prev => ({ ...prev, newPassword: undefined }));
                        }
                      }}
                      secureTextEntry
                      autoCorrect={false}
                      error={forgotPasswordErrors.newPassword}
                      leftIcon="lock-closed-outline"
                    />
                  </View>

                  <View style={styles.modalInputWrapper}>
                    <Input
                      label="Confirmar Nueva Contraseña"
                      placeholder="Confirma tu contraseña"
                      value={confirmNewPassword}
                      onChangeText={(text) => {
                        setConfirmNewPassword(text);
                        if (forgotPasswordErrors.confirmNewPassword) {
                          setForgotPasswordErrors(prev => ({ ...prev, confirmNewPassword: undefined }));
                        }
                      }}
                      secureTextEntry
                      autoCorrect={false}
                      error={forgotPasswordErrors.confirmNewPassword}
                      leftIcon="lock-closed-outline"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={forgotPasswordLoading}
                    style={[styles.modalButton, forgotPasswordLoading && styles.modalButtonDisabled]}
                  >
                    <LinearGradient
                      colors={[secondaryColor, accentColor]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalButtonGradient}
                    >
                      {forgotPasswordLoading ? (
                        <Text style={styles.modalButtonText}>Restableciendo...</Text>
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.modalButtonText}>Restablecer Contraseña</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setForgotPasswordStep(1)}
                    style={styles.backToEmailButton}
                  >
                    <Ionicons name="arrow-back" size={16} color={secondaryColor} style={{ marginRight: 6 }} />
                    <Text style={[styles.backToEmailText, { color: secondaryColor }]}>
                      Volver a ingresar email
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
    zIndex: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 30,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  tabIndicatorInactive: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  formContainer: {
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButtonWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#007EA7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 23, 31, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 24,
    color: '#00171F',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'left',
    color: '#5D6F75',
  },
  modalInputWrapper: {
    marginBottom: 16,
  },
  modalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#007EA7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    flexDirection: 'row',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  backToEmailButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  backToEmailText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
