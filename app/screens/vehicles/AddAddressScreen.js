import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  MapPin,
  AlertTriangle,
  Home,
  Briefcase,
  Bookmark,
  SquareCheck,
  Square,
} from 'lucide-react-native';
import { debounce } from 'lodash';

import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import BackButton from '../../components/navigation/BackButton';
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import * as locationService from '../../services/location';

import Input from '../../components/base/Input/Input';
import Button from '../../components/base/Button/Button';
import Card from '../../components/base/Card/Card';

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const onAddressAddedCallback = route.params?.onAddressAdded;
  const onGoBackCallback = route.params?.onGoBack;

  const [direccion, setDireccion] = useState('');
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [detalles, setDetalles] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [isPreciseLocation, setIsPreciseLocation] = useState(true);

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const etiquetaOptions = ['Casa', 'Trabajo', 'Otro'];
  const isNavigatingRef = useRef(false);

  const handleGoBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    try {
      if (onGoBackCallback) onGoBackCallback();
      else if (navigation.canGoBack()) navigation.goBack();
    } finally {
      setTimeout(() => { isNavigatingRef.current = false; }, 500);
    }
  }, [navigation, onGoBackCallback]);

  const fetchSuggestions = useCallback(
    debounce(async (text) => {
      if (text.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        setLoadingSuggestions(true);
        const results = await locationService.getAddressSuggestions(text);
        setSuggestions(results || []);
        setShowSuggestions(true);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500),
    []
  );

  const handleAddressChange = (text) => {
    setDireccion(text);
    if (text.length >= 3) {
      setLoadingSuggestions(true);
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    const { mainText } = suggestion;
    let direccionMostrada = mainText;
    if (direccionMostrada.endsWith(', Chile')) direccionMostrada = direccionMostrada.replace(', Chile', '');

    setDireccion(direccionMostrada);
    setSuggestions([]);
    setShowSuggestions(false);

    if (suggestion.coordinates) {
      setCoords({
        latitude: suggestion.coordinates.latitude,
        longitude: suggestion.coordinates.longitude,
        accuracy: 10
      });
      setIsPreciseLocation(true);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Error', 'Se requieren permisos de ubicación.');
        return;
      }
      const location = await locationService.getCurrentLocation(true);
      const { latitude, longitude, accuracy } = location.coords;
      setCoords({ latitude, longitude, accuracy });

      if (accuracy > 200) {
        setIsPreciseLocation(false);
      }
      const addressInfo = await locationService.reverseGeocode(latitude, longitude);
      if (addressInfo.street) setDireccion(`${addressInfo.street} ${addressInfo.streetNumber || ''}, ${addressInfo.district || ''}`);
      else setDireccion(`${latitude}, ${longitude}`);

    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!direccion.trim()) return Alert.alert('Error', 'La dirección es obligatoria');
    setLoading(true);
    try {
      Alert.alert('Éxito', 'Dirección guardada.');
      setTimeout(handleGoBack, 100);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <BackButton onPress={handleGoBack} />
        <Text style={styles.headerTitle}>Nueva Dirección</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.primary[500]} /> : (
              <>
                <MapPin size={20} color={COLORS.primary[500]} strokeWidth={1.75} />
                <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
              </>
            )}
          </TouchableOpacity>

          {!isPreciseLocation && (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color={COLORS.warning[600]} strokeWidth={1.75} />
              <Text style={styles.warningText}>Ubicación imprecisa. Revisa las coordenadas.</Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles</Text>

          <View style={styles.inputWrapper}>
            <Input
              label="Dirección *"
              value={direccion}
              onChangeText={handleAddressChange}
              placeholder="Calle, número, comuna..."
              leftIcon="map-outline"
              multiline
            />
            {showSuggestions && (
              <View style={styles.suggestionsList}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectSuggestion(s)} style={styles.suggestionItem}>
                    <MapPin size={14} color={COLORS.text.secondary} strokeWidth={1.75} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{s.mainText}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.label}>Etiqueta</Text>
          <View style={styles.tagsRow}>
            {etiquetaOptions.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.tag, etiqueta === opt && styles.tagActiveWrap]}
                onPress={() => setEtiqueta(opt)}
                activeOpacity={0.85}
              >
                {etiqueta === opt ? (
                  <PrimaryGradientFill style={StyleSheet.absoluteFillObject} />
                ) : null}
                {opt === 'Casa' ? (
                  <Home size={14} color={etiqueta === opt ? COLORS.text.inverse : COLORS.text.secondary} strokeWidth={1.75} />
                ) : opt === 'Trabajo' ? (
                  <Briefcase size={14} color={etiqueta === opt ? COLORS.text.inverse : COLORS.text.secondary} strokeWidth={1.75} />
                ) : (
                  <Bookmark size={14} color={etiqueta === opt ? COLORS.text.inverse : COLORS.text.secondary} strokeWidth={1.75} />
                )}
                <Text style={[styles.tagText, etiqueta === opt && styles.tagTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Referencia / Detalles"
            value={detalles}
            onChangeText={setDetalles}
            placeholder="Ej: Portón verde, esquina..."
            leftIcon="information-circle-outline"
            multiline
          />

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setEsPrincipal(!esPrincipal)}>
            {esPrincipal ? (
              <SquareCheck size={24} color={COLORS.primary[500]} strokeWidth={1.75} />
            ) : (
              <Square size={24} color={COLORS.primary[500]} strokeWidth={1.75} />
            )}
            <Text style={styles.checkboxText}>Marcar como dirección principal</Text>
          </TouchableOpacity>

          <Button
            title="Guardar Dirección"
            onPress={handleSaveAddress}
            isLoading={loading}
            style={{ marginTop: SPACING.md }}
          />
        </Card>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.default,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.md,
    paddingBottom: SPACING['2xl'],
  },
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.card.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.input.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.primary[100],
    backgroundColor: COLORS.primary[50],
    gap: SPACING.xs,
  },
  locationButtonText: {
    color: COLORS.primary[600],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning[50],
    padding: SPACING.sm,
    borderRadius: BORDERS.radius.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  warningText: {
    color: COLORS.warning[800],
    fontSize: TYPOGRAPHY.fontSize.sm,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: SPACING.md,
    position: 'relative',
    zIndex: 10,
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.input.md,
    ...SHADOWS.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    marginTop: SPACING.xxs,
    paddingVertical: SPACING.xxs,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.neutral.gray[200],
    gap: 10,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xxs,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius.badge.md,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.neutral.gray[200],
    backgroundColor: COLORS.background.paper,
    gap: 6,
  },
  tagActiveWrap: {
    borderColor: COLORS.primary[500],
    overflow: 'hidden',
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  tagTextActive: {
    color: COLORS.text.inverse,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
    gap: 10,
  },
  checkboxText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
  },
});

export default AddAddressScreen;
