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
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../utils/constants';
import Input from '../../components/base/Input/Input';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const GLASS_BG = Platform.select({
  ios: 'rgba(255,255,255,0.06)',
  android: 'rgba(255,255,255,0.10)',
  default: 'rgba(255,255,255,0.08)',
});
const BLUR_INTENSITY = Platform.OS === 'ios' ? 30 : 0;

const GlassCard = ({ children, style }) => (
  <View style={[styles.glassOuter, style]}>
    <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
    <View style={[styles.glassInner, { backgroundColor: GLASS_BG }]}>{children}</View>
  </View>
);

const RegisterScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { register, error: authError } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
    if (!validate()) return;

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
        Alert.alert('Registro Exitoso', 'Tu cuenta ha sido creada correctamente. Por favor inicia sesión.', [{
          text: 'OK', onPress: () => navigation.navigate(ROUTES.LOGIN)
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
          if (statusCode === 500 || statusCode === 503 || statusCode === 0) {
            Alert.alert('Error en el Registro', errorMessage, [{ text: 'Entendido' }]);
          } else if (statusCode === 409) {
            Alert.alert('Usuario Ya Registrado', 'Este correo ya está registrado. Inicia sesión o utiliza otro correo.', [{ text: 'Entendido' }]);
          }
        } else {
          Alert.alert('Error en el Registro', errorMessage, [{ text: 'Entendido' }]);
        }
      }
    } catch (error) {
      let errorMessage = 'Ocurrió un error inesperado. Intenta nuevamente.';
      let errorTitle = 'Error en el Registro';

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        errorTitle = 'Sin Conexión';
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      } else if (error.response?.status === 500) {
        errorTitle = 'Error del Servidor';
        errorMessage = 'El servidor está experimentando problemas. Intenta más tarde.';
      }

      Alert.alert(errorTitle, errorMessage, [{ text: 'Entendido' }]);

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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
        <View style={styles.blobEmerald} />
        <View style={styles.blobIndigo} />
        <View style={styles.blobCyan} />
      </View>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        <GlassCard style={styles.formCard}>
          <View style={styles.nameRow}>
            <View style={[styles.nameInput, { marginRight: 12 }]}>
              <Input label="Nombre" placeholder="Juan" value={firstName}
                onChangeText={(t) => { setFirstName(t); if (errors.firstName) setErrors(p => ({ ...p, firstName: undefined })); }}
                autoCapitalize="words" autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
                error={errors.firstName} leftIcon="person-outline" appearance="darkGlass" />
            </View>
            <View style={styles.nameInput}>
              <Input label="Apellido" placeholder="Pérez" value={lastName}
                onChangeText={(t) => { setLastName(t); if (errors.lastName) setErrors(p => ({ ...p, lastName: undefined })); }}
                autoCapitalize="words" autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
                error={errors.lastName} leftIcon="person-outline" appearance="darkGlass" />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Correo Electrónico" placeholder="ejemplo@correo.com" value={email}
              onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="next" blurOnSubmit={false} error={errors.email} leftIcon="mail-outline" appearance="darkGlass" />
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Contraseña" placeholder="••••••••" value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors(p => ({ ...p, password: undefined }));
                if (t === confirmPassword && errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined }));
              }}
              secureTextEntry autoCorrect={false} returnKeyType="next" blurOnSubmit={false}
              error={errors.password} leftIcon="lock-closed-outline" appearance="darkGlass" />
          </View>

          <View style={styles.inputWrapper}>
            <Input label="Confirmar Contraseña" placeholder="••••••••" value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined })); }}
              secureTextEntry autoCorrect={false} returnKeyType="done"
              error={errors.confirmPassword} leftIcon="lock-closed-outline" appearance="darkGlass" />
          </View>

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(!acceptTerms)}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              Acepto los <Text style={styles.termsLink}>términos y condiciones</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

          {/* Submit */}
          <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.submitBtn} activeOpacity={0.85}>
            <LinearGradient colors={['#007EA7', '#00A8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Crear Cuenta</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  blobEmerald: { position: 'absolute', top: -80, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(16,185,129,0.12)' },
  blobIndigo: { position: 'absolute', bottom: 100, right: -50, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(99,102,241,0.10)' },
  blobCyan: { position: 'absolute', top: 340, right: 30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(6,182,212,0.08)' },

  scroll: { paddingHorizontal: 20 },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 180, height: 60, marginBottom: 16, tintColor: '#F9FAFB' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#F9FAFB', marginBottom: 6 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  tabRow: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabTextActive: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  tabTextInactive: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.40)' },
  tabIndicatorActive: { position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 3, borderRadius: 2, backgroundColor: '#00A8E8' },

  glassOuter: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  glassInner: { padding: 20 },

  formCard: { marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  nameRow: { flexDirection: 'row', marginBottom: 16 },
  nameInput: { flex: 1 },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.30)', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#007EA7', borderColor: '#007EA7' },
  termsText: { fontSize: 14, color: 'rgba(255,255,255,0.55)', flex: 1 },
  termsLink: { color: '#67E8F9', fontWeight: '500' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 8 },

  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});

export default RegisterScreen;
