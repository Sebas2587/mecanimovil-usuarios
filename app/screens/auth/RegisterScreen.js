import React, { useState } from 'react';
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
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import { TOKENS } from '../../design-system/tokens';
import { COLORS } from '../../design-system/tokens/colors';

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

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register, error: authError } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Design tokens
  const colors = SAFE_COLORS;
  const typography = SAFE_TYPOGRAPHY;
  const spacing = SAFE_SPACING;
  const borders = SAFE_BORDERS;

  // Colores del sistema de diseño
  const primaryColor = colors.primary?.[500] || '#003459';
  const secondaryColor = colors.secondary?.[500] || '#007EA7';
  const accentColor = colors.accent?.[500] || '#00A8E8';

  const validate = () => {
    let valid = true;
    let newErrors = {};

    // Validar nombre
    if (!firstName || firstName.trim().length === 0) {
      newErrors.firstName = 'El nombre es requerido';
      valid = false;
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'El nombre debe tener al menos 2 caracteres';
      valid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(firstName.trim())) {
      newErrors.firstName = 'El nombre solo puede contener letras y espacios';
      valid = false;
    }

    // Validar apellido
    if (!lastName || lastName.trim().length === 0) {
      newErrors.lastName = 'El apellido es requerido';
      valid = false;
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'El apellido debe tener al menos 2 caracteres';
      valid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(lastName.trim())) {
      newErrors.lastName = 'El apellido solo puede contener letras y espacios';
      valid = false;
    }

    // Validar email con reglas estrictas
    if (!email || email.trim().length === 0) {
      newErrors.email = 'El correo electrónico es requerido';
      valid = false;
    } else {
      const emailTrimmed = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z][a-zA-Z0-9._-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      // Validar que no empiece con número o carácter especial antes del @
      const localPart = emailTrimmed.split('@')[0];
      if (!localPart || localPart.length === 0) {
        newErrors.email = 'El correo electrónico debe tener una parte local antes del @';
        valid = false;
      } else if (/^[0-9]/.test(localPart)) {
        newErrors.email = 'El correo electrónico no puede comenzar con un número antes del @';
        valid = false;
      } else if (!/^[a-zA-Z]/.test(localPart)) {
        newErrors.email = 'El correo electrónico debe comenzar con una letra antes del @';
        valid = false;
      } else if (!emailRegex.test(emailTrimmed)) {
        newErrors.email = 'El formato del correo electrónico no es válido';
        valid = false;
      } else if (emailTrimmed.length > 254) {
        newErrors.email = 'El correo electrónico es demasiado largo';
        valid = false;
      }
    }

    // Validar contraseña
    if (!password || password.length === 0) {
      newErrors.password = 'La contraseña es requerida';
      valid = false;
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      valid = false;
    } else if (password.length > 128) {
      newErrors.password = 'La contraseña no puede tener más de 128 caracteres';
      valid = false;
    }

    // Validar confirmación de contraseña
    if (!confirmPassword || confirmPassword.length === 0) {
      newErrors.confirmPassword = 'Debes confirmar tu contraseña';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
      valid = false;
    }

    // Validar términos y condiciones
    if (!acceptTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    // Limpiar errores previos
    setErrors({});

    if (!validate()) {
      // La validación ya estableció los errores
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Formatear datos según lo que espera el servicio auth.js
      // El servicio espera firstName y lastName (camelCase), no first_name y last_name
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        username: email.trim().toLowerCase(), // Usamos email como username
      };

      console.log('Intentando registrar usuario con datos:', {
        ...userData,
        password: '***'
      });

      const result = await register(userData);

      if (result && result.success === true) {
        // Limpiar el formulario
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setAcceptTerms(false);
        setErrors({});

        Alert.alert(
          'Registro Exitoso',
          'Tu cuenta ha sido creada correctamente. Por favor inicia sesión.',
          [{
            text: 'OK',
            onPress: () => {
              navigation.navigate(ROUTES.LOGIN);
            }
          }]
        );
      } else {
        // Manejar errores con detalles específicos
        const errorMessage = result?.error || authError || 'Error al registrar usuario';
        const errorDetails = result?.errorDetails || {};
        const statusCode = result?.statusCode || 500;

        // Construir objeto de errores para mostrar en los campos
        const newErrors = { ...errorDetails };

        // Si hay errores específicos por campo, usarlos
        if (errorDetails.email) {
          newErrors.email = errorDetails.email;
        }
        if (errorDetails.username && errorDetails.username.includes('ya existe')) {
          newErrors.email = errorDetails.email || 'Este correo electrónico ya está registrado';
        }
        if (errorDetails.password) {
          newErrors.password = errorDetails.password;
        }
        if (errorDetails.firstName) {
          newErrors.firstName = errorDetails.firstName;
        }
        if (errorDetails.lastName) {
          newErrors.lastName = errorDetails.lastName;
        }

        // Si hay errores de campo, mostrarlos en el formulario
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);

          // Mostrar alerta solo si no hay errores específicos por campo o si es un error crítico
          if (statusCode === 500 || statusCode === 503 || statusCode === 0) {
            Alert.alert(
              'Error en el Registro',
              errorMessage,
              [{ text: 'Entendido' }]
            );
          } else if (statusCode === 409) {
            // Usuario ya existe - mostrar alerta específica
            Alert.alert(
              'Usuario Ya Registrado',
              'Este correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.',
              [{ text: 'Entendido' }]
            );
          }
        } else {
          // Si no hay errores específicos por campo, mostrar alerta general
          Alert.alert(
            'Error en el Registro',
            errorMessage,
            [{ text: 'Entendido' }]
          );
        }
      }
    } catch (error) {
      console.error('Error inesperado en registro:', error);

      // Manejar diferentes tipos de errores inesperados
      let errorMessage = 'Ocurrió un error inesperado al registrar. Por favor, intenta nuevamente.';
      let errorTitle = 'Error en el Registro';

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        errorTitle = 'Sin Conexión';
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.';
      } else if (error.response?.status === 500) {
        errorTitle = 'Error del Servidor';
        errorMessage = 'El servidor está experimentando problemas. Por favor, intenta nuevamente más tarde.';
      }

      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'Entendido' }]
      );

      // También intentar establecer errores en campos si es posible
      if (error.response?.data) {
        const apiError = error.response.data;
        const newErrors = {};

        if (apiError.email) {
          newErrors.email = Array.isArray(apiError.email) ? apiError.email[0] : apiError.email;
        }
        if (apiError.password) {
          newErrors.password = Array.isArray(apiError.password) ? apiError.password[0] : apiError.password;
        }
        if (apiError.first_name) {
          newErrors.firstName = Array.isArray(apiError.first_name) ? apiError.first_name[0] : apiError.first_name;
        }
        if (apiError.last_name) {
          newErrors.lastName = Array.isArray(apiError.last_name) ? apiError.last_name[0] : apiError.last_name;
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        }
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.safeArea}>
      {/* Gradiente superior - siempre visible en fondo */}
      <LinearGradient
        colors={[`${accentColor}15`, 'transparent']}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Gradiente inferior - siempre visible en fondo */}
      <LinearGradient
        colors={['transparent', `${accentColor}10`]}
        style={styles.bottomGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeAreaView} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          bounces={false}
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="never"
        >
          {/* Header con Logo */}
          <View style={styles.headerContainer}>
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text?.primary || '#00171F' }]}>
              Crear Cuenta
            </Text>
            <Text style={[styles.subtitle, { color: colors.text?.secondary || '#5D6F75' }]}>
              Únete a MecaniMóvil hoy
            </Text>
          </View>

          {/* Tabs Login/Register */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
            >
              <Text style={[styles.tabText, { color: colors.text?.secondary || '#9BAFB9' }]}>
                Iniciar Sesión
              </Text>
              <View style={styles.tabIndicatorInactive} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab}>
              <Text style={[styles.tabText, { color: secondaryColor }]}>Registrarse</Text>
              <View style={[styles.tabIndicator, { backgroundColor: secondaryColor }]} />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            {/* Nombre y Apellido en fila */}
            <View style={styles.nameRow}>
              <View style={[styles.nameInput, { marginRight: 12 }]}>
                <Input
                  label="Nombre"
                  placeholder="Juan"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) {
                      setErrors(prev => ({ ...prev, firstName: undefined }));
                    }
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  error={errors.firstName}
                  leftIcon="person-outline"
                />
              </View>
              <View style={[styles.nameInput, { marginRight: 0 }]}>
                <Input
                  label="Apellido"
                  placeholder="Pérez"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (errors.lastName) {
                      setErrors(prev => ({ ...prev, lastName: undefined }));
                    }
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  error={errors.lastName}
                  leftIcon="person-outline"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Input
                label="Correo Electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
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
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }
                  // Limpiar error de confirmación si las contraseñas coinciden ahora
                  if (text === confirmPassword && errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                secureTextEntry
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                error={errors.password}
                leftIcon="lock-closed-outline"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Input
                label="Confirmar Contraseña"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                secureTextEntry
                autoCorrect={false}
                returnKeyType="done"
                error={errors.confirmPassword}
                leftIcon="lock-closed-outline"
              />
            </View>

            {/* Términos y condiciones */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: secondaryColor },
                acceptTerms && { backgroundColor: secondaryColor }
              ]}>
                {acceptTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={[styles.termsText, { color: colors.text?.secondary || '#5D6F75' }]}>
                Acepto los{' '}
                <Text style={{ color: secondaryColor, fontWeight: '500' }}>
                  términos y condiciones
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.terms && (
              <Text style={styles.errorText}>{errors.terms}</Text>
            )}

            {/* Botón de Registro con gradiente */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.registerButtonWrapper}
            >
              <LinearGradient
                colors={[secondaryColor, accentColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButton}
              >
                {loading ? (
                  <Text style={styles.registerButtonText}>Creando cuenta...</Text>
                ) : (
                  <Text style={styles.registerButtonText}>Crear Cuenta</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeAreaView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
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
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
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
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 8,
  },
  registerButtonWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#007EA7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RegisterScreen;
