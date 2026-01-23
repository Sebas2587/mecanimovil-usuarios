import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { debounce } from 'lodash';

// Servicios
import * as locationService from '../../services/location';

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const onAddressAddedCallback = route.params?.onAddressAdded;
  const onGoBackCallback = route.params?.onGoBack;

  // Estados para los campos del formulario
  const [direccion, setDireccion] = useState('');
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [detalles, setDetalles] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState(null);
  const [isPreciseLocation, setIsPreciseLocation] = useState(true);

  // Estados para el autocompletado de direcciones
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados para el modal de refinamiento
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLatitude, setTempLatitude] = useState('');
  const [tempLongitude, setTempLongitude] = useState('');

  // Opciones para etiquetas de dirección
  const etiquetaOptions = ['Casa', 'Trabajo', 'Otro'];

  // Flag para evitar múltiples navegaciones (usando useRef para no causar re-renders)
  const isNavigatingRef = useRef(false);

  // Función centralizada para manejar el retroceso
  const handleGoBack = useCallback(() => {
    // Evitar múltiples navegaciones simultáneas
    if (isNavigatingRef.current) {
      console.log('⚠️ Navegación ya en curso, ignorando...');
      return;
    }

    isNavigatingRef.current = true;

    try {
      if (onGoBackCallback) {
        // Si hay callback personalizado, usarlo
        onGoBackCallback();
      } else {
        // Si no hay callback, usar navegación normal
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('❌ Error al navegar hacia atrás:', error);
      // Fallback: intentar navegar normalmente
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } finally {
      // Resetear el flag después de un delay para permitir que la navegación se complete
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }
  }, [navigation, onGoBackCallback]);

  // Configurar el botón de retroceso del header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleGoBack]);

  // Función debounce para evitar demasiadas llamadas a la API
  const fetchSuggestions = useCallback(
    debounce(async (text) => {
      if (text.length < 3) {
        setSuggestions([]);
        setLoadingSuggestions(false);
        return;
      }

      try {
        setLoadingSuggestions(true);
        const results = await locationService.getAddressSuggestions(text);
        setSuggestions(results || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error al obtener sugerencias:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500),
    []
  );

  // Manejar cambios en el campo de dirección
  const handleAddressChange = (text) => {
    setDireccion(text);
    setError(null);

    if (text.length >= 3) {
      setLoadingSuggestions(true);
      fetchSuggestions(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Manejar selección de una sugerencia
  const handleSelectSuggestion = (suggestion) => {
    const { mainText, details } = suggestion;
    const { street, streetNumber } = details || {};

    let direccionMostrada = mainText;

    if (street && streetNumber && !mainText.includes(streetNumber)) {
      const partes = [];
      partes.push(`${street} ${streetNumber}`);

      if (details.district) partes.push(details.district);
      if (details.city && details.city !== details.district) partes.push(details.city);

      direccionMostrada = partes.join(', ');
    }

    if (direccionMostrada.endsWith(', Chile')) {
      direccionMostrada = direccionMostrada.replace(', Chile', '');
    }

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

  // Guardar la dirección
  const handleSaveAddress = async () => {
    if (!direccion.trim()) {
      setError('La dirección es obligatoria');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let direccionCompleta = direccion;
      if (!direccionCompleta.toLowerCase().includes('chile')) {
        direccionCompleta = `${direccion}, Chile`;
      }

      let latitude, longitude;

      if (coords && isPreciseLocation) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      } else {
        try {
          const geocoded = await locationService.geocodeAddress(direccionCompleta);
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        } catch (geocodeError) {
          console.error('Error al geocodificar:', geocodeError);
          setError('No se pudo geocodificar la dirección. Verifica que sea una dirección válida en Chile.');
          setLoading(false);
          return;
        }
      }

      const addressData = {
        direccion: direccionCompleta,
        etiqueta,
        detalles,
        es_principal: esPrincipal,
        latitude,
        longitude
      };

      const savedAddress = await locationService.saveAddress(addressData);

      if (onAddressAddedCallback) {
        onAddressAddedCallback(savedAddress);
      }

      if (Platform.OS === 'web') {
        alert('Tu dirección ha sido guardada correctamente');
        setTimeout(() => {
          handleGoBack();
        }, 100);
      } else {
        Alert.alert(
          'Dirección guardada',
          'Tu dirección ha sido guardada correctamente',
          [{
            text: 'OK',
            onPress: () => {
              // Pequeño delay para asegurar que la dirección se guardó
              setTimeout(() => {
                handleGoBack();
              }, 100);
            }
          }]
        );
      }
    } catch (error) {
      console.error('Error al guardar dirección:', error);
      setError('No se pudo guardar la dirección. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Obtener ubicación actual
  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsPreciseLocation(true);

      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        setError('Se requieren permisos de ubicación para usar esta función');
        setLoading(false);
        return;
      }

      const location = await locationService.getCurrentLocation(true);
      const { latitude, longitude, accuracy } = location.coords;

      setCoords({ latitude, longitude, accuracy });

      if (accuracy > 200) {
        setIsPreciseLocation(false);
        Alert.alert(
          'Ubicación imprecisa',
          'No se pudo obtener tu ubicación con precisión. Puedes usarla de todos modos o introducir la dirección manualmente.',
          [
            { text: 'Usar de todos modos', onPress: () => obtenerDireccionDesdeCoords(latitude, longitude) },
            { text: 'Refinar manualmente', onPress: () => openLocationModal(latitude, longitude) },
            { text: 'Cancelar' }
          ]
        );
      } else {
        obtenerDireccionDesdeCoords(latitude, longitude);
      }
    } catch (error) {
      console.error('Error al obtener ubicación actual:', error);
      setError('No se pudo obtener tu ubicación. Introduce la dirección manualmente.');
      setLoading(false);
    }
  };

  const obtenerDireccionDesdeCoords = async (latitude, longitude) => {
    try {
      const addressInfo = await locationService.reverseGeocode(latitude, longitude);

      if (addressInfo.country !== 'Chile' && addressInfo.isoCountryCode !== 'CL') {
        setDireccion('Av. Libertador Bernardo O\'Higgins 1100, Santiago');
      } else {
        const parts = [];

        // PRIORIDAD: Construir la dirección con número si está disponible
        // Formato: "Calle Número" o al menos "Calle"
        let streetPart = '';

        if (addressInfo.street) {
          // Si tenemos nombre de calle, agregarlo
          streetPart = addressInfo.street;

          // Intentar obtener el número de diferentes campos
          const streetNumber = addressInfo.streetNumber ||
            addressInfo.number ||
            addressInfo.houseNumber ||
            null;

          // Si tenemos número, agregarlo
          if (streetNumber) {
            streetPart = `${streetPart} ${streetNumber}`;
          } else {
            // Si no hay número específico, intentar extraerlo del campo 'name' o agregar un placeholder
            // Algunos servicios de geocodificación incluyen el número en 'name'
            if (addressInfo.name && addressInfo.name !== addressInfo.street) {
              // Intentar extraer número del name si incluye información adicional
              const nameMatch = addressInfo.name.match(/\d+/);
              if (nameMatch && !streetPart.includes(nameMatch[0])) {
                streetPart = `${streetPart} ${nameMatch[0]}`;
              }
            }

            // Si aún no hay número y tenemos coordenadas precisas, mostrar un placeholder
            // pero mejor intentar obtenerlo de Nominatim como fallback
            console.log('⚠️ No se detectó número de dirección en reverseGeocode, intentando fallback...');
          }
        } else if (addressInfo.name) {
          // Si no hay street pero sí name, usar name (puede incluir número)
          streetPart = addressInfo.name;
        }

        // Agregar la parte de la calle al array de partes
        if (streetPart) {
          parts.push(streetPart);
        } else if (addressInfo.name && !parts.includes(addressInfo.name)) {
          // Si no hay streetPart pero sí name (puede ser un POI), usarlo
          // Pero intentar extraer calle y número del name si es posible
          const nameParts = addressInfo.name.split(',').map(p => p.trim());
          if (nameParts.length > 0) {
            const firstPart = nameParts[0];
            // Si el primer parte incluye un número, asumir que es "Calle Número"
            if (/\d+/.test(firstPart)) {
              parts.push(firstPart);
            } else {
              // Si es un POI sin número, incluirlo de todas formas pero con advertencia
              parts.push(firstPart);
              console.log('⚠️ Dirección sin número detectada (posible POI):', firstPart);
            }
          }
        }

        // Agregar comuna/distrito
        if (addressInfo.district) {
          parts.push(addressInfo.district);
        } else if (addressInfo.subregion) {
          parts.push(addressInfo.subregion);
        } else if (addressInfo.city) {
          // Si no hay district/subregion, usar city como comuna
          parts.push(addressInfo.city);
        }

        // Agregar región si está disponible y no está ya incluida
        if (addressInfo.region && !parts.some(part => part.toLowerCase().includes(addressInfo.region.toLowerCase()))) {
          parts.push(addressInfo.region);
        }

        // Agregar "Chile" al final si no está presente
        const formattedAddress = parts.filter(Boolean).join(', ');
        const finalAddress = formattedAddress.toLowerCase().includes('chile')
          ? formattedAddress
          : `${formattedAddress}, Chile`;

        // Verificar si la dirección final tiene número
        const hasNumberInFinalAddress = /\b\d+\b/.test(finalAddress.split(',')[0]);
        if (!hasNumberInFinalAddress) {
          console.warn('⚠️ La dirección final no contiene número de calle. Esto puede afectar la detección de proveedores.');
          console.warn('   Dirección generada:', finalAddress);
          console.warn('   Se recomienda editar manualmente la dirección para agregar el número si es posible.');
        }

        console.log('📍 Dirección formateada desde coordenadas:', finalAddress);
        console.log('   Detalles de addressInfo:', {
          street: addressInfo.street,
          streetNumber: addressInfo.streetNumber,
          number: addressInfo.number,
          name: addressInfo.name,
          district: addressInfo.district,
          subregion: addressInfo.subregion,
          city: addressInfo.city,
          hasNumber: hasNumberInFinalAddress
        });

        setDireccion(finalAddress);
      }
    } catch (geocodeError) {
      console.warn('Error de geocodificación:', geocodeError);
      // Dirección por defecto con número
      setDireccion('Av. Libertador Bernardo O\'Higgins 1100, Santiago, Chile');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de refinamiento de ubicación
  const openLocationModal = (latitude, longitude) => {
    setTempLatitude(latitude.toString());
    setTempLongitude(longitude.toString());
    setShowLocationModal(true);
  };

  // Manejar el refinamiento manual de ubicación
  const handleRefinedLocation = () => {
    const lat = parseFloat(tempLatitude);
    const lng = parseFloat(tempLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Por favor introduce coordenadas válidas');
      return;
    }

    const newCoords = {
      latitude: lat,
      longitude: lng,
      accuracy: 10
    };

    setCoords(newCoords);
    setIsPreciseLocation(true);
    setShowLocationModal(false);
    obtenerDireccionDesdeCoords(lat, lng);
  };

  // Renderizar sugerencia
  const renderSuggestion = (suggestion, index) => (
    <TouchableOpacity
      key={index}
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(suggestion)}
    >
      <Ionicons name="location-outline" size={16} color="#666666" />
      <Text style={styles.suggestionText}>{suggestion.mainText}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar dirección</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mensaje de error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Advertencia de ubicación imprecisa */}
        {!isPreciseLocation && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color="#FF9500" />
            <View style={styles.warningContent}>
              <Text style={styles.warningText}>
                La ubicación obtenida podría ser imprecisa. Para mayor exactitud, ajusta las coordenadas manualmente.
              </Text>
              <TouchableOpacity
                style={styles.refineButton}
                onPress={() => openLocationModal(coords?.latitude || -33.46779, coords?.longitude || -70.67367)}
              >
                <Text style={styles.refineButtonText}>Refinar ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sección de ubicación actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <TouchableOpacity
            style={[styles.locationButton, loading && styles.locationButtonDisabled]}
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            <View style={styles.locationButtonContent}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.locationButtonText}>Usar mi ubicación actual</Text>
            </View>
            {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        {/* Campo de dirección */}
        <View style={styles.section}>
          <Text style={styles.label}>Dirección *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu dirección completa"
              placeholderTextColor="#999999"
              value={direccion}
              onChangeText={handleAddressChange}
              multiline={true}
              numberOfLines={2}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {loadingSuggestions && (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.inputLoader} />
            )}
          </View>

          {/* Sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.slice(0, 5).map(renderSuggestion)}
            </View>
          )}
        </View>

        {/* Selector de etiqueta */}
        <View style={styles.section}>
          <Text style={styles.label}>Etiqueta</Text>
          <View style={styles.tagContainer}>
            {etiquetaOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.tagButton,
                  etiqueta === option && styles.tagButtonActive
                ]}
                onPress={() => setEtiqueta(option)}
              >
                <Ionicons
                  name={
                    option === 'Casa' ? 'home' :
                      option === 'Trabajo' ? 'briefcase' :
                        'location'
                  }
                  size={16}
                  color={etiqueta === option ? '#FFFFFF' : COLORS.primary}
                />
                <Text style={[
                  styles.tagButtonText,
                  etiqueta === option && styles.tagButtonTextActive
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Campo de detalles */}
        <View style={styles.section}>
          <Text style={styles.label}>Detalles adicionales</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ej: Depto 4B, portón azul, casa esquina..."
              placeholderTextColor="#999999"
              value={detalles}
              onChangeText={setDetalles}
              multiline={true}
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Dirección principal */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setEsPrincipal(!esPrincipal)}
          >
            <Ionicons
              name={esPrincipal ? "checkbox" : "checkbox-outline"}
              size={24}
              color={COLORS.primary}
            />
            <View style={styles.checkboxContent}>
              <Text style={styles.checkboxLabel}>Establecer como dirección principal</Text>
              <Text style={styles.checkboxDescription}>
                Esta será tu dirección predeterminada para los servicios
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Botón guardar */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, (loading || !direccion.trim()) && styles.saveButtonDisabled]}
            onPress={handleSaveAddress}
            disabled={loading || !direccion.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Guardar dirección</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para refinar ubicación */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refinar ubicación</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLocationModal(false)}
              >
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Ajusta manualmente las coordenadas de tu ubicación:
              </Text>

              <View style={styles.coordInputContainer}>
                <Text style={styles.coordLabel}>Latitud:</Text>
                <TextInput
                  style={styles.coordInput}
                  placeholder="-33.46779"
                  value={tempLatitude}
                  onChangeText={setTempLatitude}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.coordInputContainer}>
                <Text style={styles.coordLabel}>Longitud:</Text>
                <TextInput
                  style={styles.coordInput}
                  placeholder="-70.67367"
                  value={tempLongitude}
                  onChangeText={setTempLongitude}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.coordHelpText}>
                Puedes obtener coordenadas exactas desde Google Maps haciendo clic derecho en el mapa y seleccionando "¿Qué hay aquí?"
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowLocationModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleRefinedLocation}
                >
                  <Text style={styles.confirmButtonText}>Usar ubicación</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  errorCard: {
    backgroundColor: '#FFE4E1',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  warningCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningText: {
    color: '#333333',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  refineButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  refineButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  locationButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 12,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  input: {
    fontSize: 16,
    color: '#333333',
    padding: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  inputLoader: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
    justifyContent: 'center',
  },
  tagButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 6,
  },
  tagButtonTextActive: {
    color: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxContent: {
    marginLeft: 12,
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: '#333333',
  },
  coordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coordLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  coordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: 'white',
  },
  coordHelpText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AddAddressScreen; 