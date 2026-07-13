import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { AlertCircle, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY } from '../../design-system/tokens';
import { showAlert, showAlertButtons } from '../../utils/platformAlert';
import LegalFooterLinks from '../../components/support/LegalFooterLinks';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');
const ICON_STROKE = 1.75;

const FormCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const RegisterScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { register, error: authError } = useAuth();

  const prefill = route?.params?.prefill || {};
  const [firstName, setFirstName] = useState(prefill.firstName || '');
  const [lastName, setLastName] = useState(prefill.lastName || '');
  const [email, setEmail] = useState(prefill.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!firstName || firstName.trim().length === 0) {
      newErrors.firstName = 'El nombre es requerido'; valid = false;
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'El nombre debe tener al menos 2 caracteres'; valid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(firstName.trim())) {
      newErrors.firstName = 'El nombre solo puede contener letras y espacios'; valid = false;
    }

    if (!lastName || lastName.trim().length === 0) {
      newErrors.lastName = 'El apellido es requerido'; valid = false;
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'El apellido debe tener al menos 2 caracteres'; valid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(lastName.trim())) {
      newErrors.lastName = 'El apellido solo puede contener letras y espacios'; valid = false;
    }

    if (!email || email.trim().length === 0) {
      newErrors.email = 'El correo electrónico es requerido'; valid = false;
    } else {
      const emailTrimmed = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z][a-zA-Z0-9._-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const localPart = emailTrimmed.split('@')[0];
      if (!localPart || localPart.length === 0) {
        newErrors.email = 'El correo debe tener una parte local antes del @'; valid = false;
      } else if (/^[0-9]/.test(localPart)) {
        newErrors.email = 'El correo no puede comenzar con un número'; valid = false;
      } else if (!/^[a-zA-Z]/.test(localPart)) {
        newErrors.email = 'El correo debe comenzar con una letra'; valid = false;
      } else if (!emailRegex.test(emailTrimmed)) {
        newErrors.email = 'El formato del correo no es válido'; valid = false;
      } else if (emailTrimmed.length > 254) {
        newErrors.email = 'El correo es demasiado largo'; valid = false;
      }
    }

    if (!password || password.length === 0) {
      newErrors.password = 'La contraseña es requerida'; valid = false;
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres'; valid = false;
    } else if (password.length > 128) {
      newErrors.password = 'La contraseña no puede tener más de 128 caracteres'; valid = false;
    }

    if (!confirmPassword || confirmPassword.length === 0) {
      newErrors.confirmPassword = 'Debes confirmar tu contraseña'; valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'; valid = false;
    }

    if (!acceptTerms) {
      newErrors.terms = 'Debes aceptar los términos y condiciones'; valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    setErrors({});
    setFormError('');
    if (!validate()) {
      showAlert('Revisa el formulario', 'Corrige los campos marcados antes de continuar.');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        username: email.trim().toLowerCase(),
      };

      const result = await register(userData);

      if (result && result.success === true) {
        setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setConfirmPassword('');
        setAcceptTerms(false); setErrors({});
        setFormError('');
        showAlertButtons('Registro exitoso', 'Tu cuenta ha sido creada correctamente. Por favor inicia sesión.', [{
          text: 'Iniciar sesión', onPress: () => navigation.navigate(ROUTES.LOGIN)
        }]);
      } else {
        const errorMessage = result?.error || authError || 'Error al registrar usuario';
        const errorDetails = result?.errorDetails || {};
        const statusCode = result?.statusCode || 500;
        const newErrors = { ...errorDetails };

        if (errorDetails.email) newErrors.email = errorDetails.email;
        if (errorDetails.username?.includes('ya existe')) newErrors.email = errorDetails.email || 'Este correo ya está registrado';
        if (errorDetails.password) newErrors.password = errorDetails.password;
        if (errorDetails.firstName) newErrors.firstName = errorDetails.firstName;
        if (errorDetails.lastName) newErrors.lastName = errorDetails.lastName;

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setFormError(errorMessage);
          if (statusCode === 409) {
            showAlert('Usuario ya registrado', 'Este correo ya está registrado. Inicia sesión o utiliza otro correo.');
          } else if (statusCode === 500 || statusCode === 503 || statusCode === 0) {
            showAlert('Error en el registro', errorMessage);
          } else {
            showAlert('Revisa el formulario', errorMessage);
          }
        } else {
          setFormError(errorMessage);
          showAlert('Error en el registro', errorMessage);
        }
      }
    } catch (error) {
      let errorMessage = 'Ocurrió un error inesperado. Intenta nuevamente.';
      let errorTitle = 'Error en el registro';

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        errorTitle = 'Sin conexión';
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else if (error.response?.status === 500) {
        errorTitle = 'Error del servidor';
        errorMessage = 'El servidor está experimentando problemas. Intenta más tarde.';
      }

      setFormError(errorMessage);
      showAlert(errorTitle, errorMessage);

      if (error.response?.data) {
        const apiError = error.response.data;
        const newErrors = {};
        if (apiError.email) newErrors.email = Array.isArray(apiError.email) ? apiError.email[0] : apiError.email;
        if (apiError.password) newErrors.password = Array.isArray(apiError.password) ? apiError.password[0] : apiError.password;
        if (apiError.first_name) newErrors.firstName = Array.isArray(apiError.first_name) ? apiError.first_name[0] : apiError.first_name;
        if (apiError.last_name) newErrors.lastName = Array.isArray(apiError.last_name) ? apiError.last_name[0] : apiError.last_name;
        if (Object.keys(newErrors).length > 0) setErrors(newErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={Platform.OS === 'web' ? styles.webScroll : undefined}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'web' ? undefined : 'on-drag'}
      >
        {/* Logo + Title */}
        <View style={styles.headerSection}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Crear Cuenta</Text>
          <Text style={styles.headerSub}>Únete a MecaniMóvil hoy</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
            <Text style={styles.tabTextInactive}>Iniciar Sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabTextActive}>Registrarse</Text>
            <View style={styles.tabIndicatorActive} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        {formError ? (
          <View style={styles.formErrorBanner}>
            <AlertCircle size={18} color={COLORS.error.main} strokeWidth={ICON_STROKE} />
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <FormCard style={styles.formCard}>
          <View style={styles.nameRow}>
            <View style={[styles.nameInput, { marginRight: 12 }]}>
              <Input label="Nombre" placeholder="Juan" value={firstName}
                onChangeText={(t) => { setFirstName(t); if (errors.firstName) setErrors(p => ({ ...p, firstName: undefined })); }}
                autoCapitalize="words" autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
                error={errors.firstName} leftIcon="person-outline" appearance="light" />
            </View>
            <View style={styles.nameInput}>
              <Input label="Apellido" placeholder="Pérez" value={lastName}
                onChangeText={(t) => { setLastName(t); if (errors.lastName) setErrors(p => ({ ...p, lastName: undefined })); }}
                autoCapitalize="words" autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
                error={errors.lastName} leftIcon="person-outline" appearance="light" />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Correo Electrónico" placeholder="ejemplo@correo.com" value={email}
              onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="next" blurOnSubmit={false} error={errors.email} leftIcon="mail-outline" appearance="light" />
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Contraseña" placeholder="••••••••" value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors(p => ({ ...p, password: undefined }));
                if (t === confirmPassword && errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined }));
              }}
              secureTextEntry autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
              error={errors.password} leftIcon="lock-closed-outline" appearance="light" />
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Confirmar Contraseña" placeholder="••••••••" value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined })); }}
              secureTextEntry autoCorrect={false} returnKeyType="done"
              error={errors.confirmPassword} leftIcon="lock-closed-outline" appearance="light" />
          </View>

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(!acceptTerms)}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Check size={14} color={COLORS.text.inverse} strokeWidth={2.5} />}
            </View>
            <LegalFooterLinks
              variant="register"
              textStyle={styles.termsText}
              linkStyle={styles.termsLink}
            />
          </TouchableOpacity>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

          {/* Submit */}
          <Button
            title="Crear Cuenta"
            onPress={handleRegister}
            isLoading={loading}
            type="primary"
            variant="solid"
            size="md"
            fullWidth
          />
        </FormCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    ...(Platform.OS === 'web'
      ? { height: '100vh', maxHeight: '100vh', overflow: 'hidden' }
      : null),
  },
  webScroll: { flex: 1 },

  scroll: { paddingHorizontal: SPACING.container.horizontal, maxWidth: 480, width: '100%', alignSelf: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 180, height: 60, marginBottom: 16 },
  headerTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  headerSub: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  tabRow: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabTextActive: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
  },
  tabTextInactive: {
    ...TYPOGRAPHY.styles.label,
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
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
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
  inputWrapper: { marginBottom: 16 },
  nameRow: { flexDirection: 'row', marginBottom: 16 },
  nameInput: { flex: 1 },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border.dark, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary[500], borderColor: COLORS.primary[500] },
  termsText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
  termsLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[500],
  },
  errorText: {
    ...TYPOGRAPHY.styles.small,
    color: COLORS.error.main,
    marginBottom: 8,
  },
});

export default RegisterScreen;
