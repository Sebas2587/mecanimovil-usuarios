import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Car, Sparkles } from 'lucide-react-native';
import { COLORS, BORDERS, SPACING, TYPOGRAPHY, SHADOWS } from '../../design-system/tokens';
import { ROUTES } from '../../utils/constants';
import GuestGradientButton from '../../components/guest/GuestGradientButton';
import { consultarPatentePublica } from '../../services/vehicle';
import { showAlert } from '../../utils/platformAlert';

const LOGO = require('../../../assets/images/Group 27logo_negro_mecanimovil.png');

const GuestLandingScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [patente, setPatente] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedPatente = patente.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const handlePatenteChange = useCallback((text) => {
    setPatente(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }, []);

  const handleSearch = useCallback(async () => {
    if (normalizedPatente.length < 6) {
      showAlert('Patente inválida', 'Ingresa una patente válida de 6 caracteres.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      const data = await consultarPatentePublica(normalizedPatente);
      navigation.navigate(ROUTES.GUEST_VEHICLE_RESULTS, {
        patente: normalizedPatente,
        vehicleData: data,
      });
    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'No pudimos consultar la patente. Intenta nuevamente.';
      showAlert('Sin resultados', msg);
    } finally {
      setLoading(false);
    }
  }, [navigation, normalizedPatente]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + SPACING.sm }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
        >
          <Text style={styles.loginLink}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACING.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Sparkles size={22} color={COLORS.primary[500]} />
          </View>
          <Text style={styles.heroTitle}>Descubre servicios para tu auto</Text>
          <Text style={styles.heroSubtitle}>
            Consulta gratis con tu patente. Sin registro, sin compromiso.
          </Text>

          <View style={styles.inputWrap}>
            <Car size={18} color={COLORS.text.tertiary} />
            <TextInput
              style={styles.input}
              placeholder="Ej: ABCD12"
              placeholderTextColor={COLORS.text.tertiary}
              value={patente}
              onChangeText={handlePatenteChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>

          <GuestGradientButton
            title="Buscar mi vehículo"
            onPress={handleSearch}
            loading={loading}
            disabled={normalizedPatente.length < 6}
          />

          <Text style={styles.disclaimer}>
            Al continuar verás talleres y servicios disponibles. Para agendar o llevar el control de
            tu auto necesitarás crear una cuenta gratis.
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureRow title="Consulta por patente" body="Identificamos marca, modelo y servicios compatibles." />
          <FeatureRow title="Talleres cerca de ti" body="Agrega tu dirección para ver opciones locales." />
          <FeatureRow title="Control completo" body="Regístrate para agendar, salud del vehículo y más." />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function FeatureRow({ title, body }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  logo: {
    width: 140,
    height: 36,
  },
  loginLink: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.primary[600],
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    padding: SPACING.lg,
    ...SHADOWS.cardElevated,
    marginBottom: SPACING.lg,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    borderRadius: BORDERS.radius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'web' ? SPACING.sm : SPACING.xs,
    backgroundColor: COLORS.neutral.gray[50],
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    letterSpacing: 2,
    paddingVertical: SPACING.sm,
  },
  disclaimer: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  features: {
    gap: SPACING.md,
  },
  featureRow: {
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.paper,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  featureTitle: {
    ...TYPOGRAPHY.styles.captionBold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  featureBody: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },
});

export default GuestLandingScreen;
