import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    StatusBar,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
 
import { Ionicons } from '@expo/vector-icons'; // Lucide substitute
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import * as vehicleService from '../../services/vehicle';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/base/Button/Button';
import * as ImagePicker from 'expo-image-picker'; // New import
import { useQueryClient } from '@tanstack/react-query'; // For invalidation
import { ROUTES } from '../../utils/constants';
import { showAlert } from '../../utils/platformAlert';
import { formatApiErrorMessage } from '../../utils/formatApiError';
import {
    necesitaValorMercadoManual,
    tieneValorMercadoDesdeApi,
} from '../../utils/vehicleValuation';

// Utility
const formatPatente = (text) => {
    // Only alphanumeric, max 6, uppercase
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
};

const ENGINE_OPTIONS = ['GASOLINA', 'DIESEL', 'HIBRIDO', 'ELECTRICO'];

const PaperCard = ({ children, style }) => (
    <View style={[styles.paperCard, style]}>{children}</View>
);

const VehicleRegistrationScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const webRootFrame =
        Platform.OS === 'web'
            ? {
                  height: windowHeight,
                  maxHeight: windowHeight,
                  minHeight: 0,
                  flex: 1,
                  overflow: 'hidden',
              }
            : null;

    // States
    const [patente, setPatente] = useState('');
    const [step, setStep] = useState('search'); // 'search' | 'success' | 'manual'
    const [loading, setLoading] = useState(false);
    const [vehicleData, setVehicleData] = useState(null);
    const [kilometraje, setKilometraje] = useState('');
    const [image, setImage] = useState(null); // New state for image
    const [saving, setSaving] = useState(false);
    const [selectedEngineType, setSelectedEngineType] = useState(null);
    const [maintenanceSelections, setMaintenanceSelections] = useState({});
    const [maintenanceExpanded, setMaintenanceExpanded] = useState(true);
    const [valorMercado, setValorMercado] = useState('');
    const [showValorMercadoAlert, setShowValorMercadoAlert] = useState(false);
    const queryClient = useQueryClient();

    // Fetch checklist for maintenance section
    const engineForChecklist = selectedEngineType || 'GASOLINA';
    const { data: checklistItems = [] } = useQuery({
        queryKey: ['checklist-inicial', engineForChecklist],
        queryFn: () => vehicleService.getInitialChecklist(engineForChecklist),
        enabled: step === 'success' && !!selectedEngineType,
    });

    const setMaintenanceKm = useCallback((compId, kmStr) => {
        const parsed = kmStr.replace(/[^0-9]/g, '');
        const km = parsed === '' ? '' : parseInt(parsed, 10);
        setMaintenanceSelections(prev => ({ ...prev, [compId]: km }));
    }, []);

    const toggleMaintenanceCheck = useCallback((compId) => {
        const isChecked = maintenanceSelections[compId] !== undefined;
        if (isChecked) {
            setMaintenanceSelections(prev => {
                const next = { ...prev };
                delete next[compId];
                return next;
            });
        } else {
            setMaintenanceSelections(prev => ({ ...prev, [compId]: '' }));
        }
    }, [maintenanceSelections]);

    // Initial focus
    const patenteInputRef = useRef(null);

    const handleBackPress = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        // Fallback: volver al tab raíz del stack ("TabNavigator") en MisVehiculos
        navigation.navigate('TabNavigator', {
            screen: ROUTES.MIS_VEHICULOS,
        });
    }, [navigation]);

    const handleSearch = async () => {
        if (patente.length < 6) {
            showAlert('Patente inválida', 'La patente debe tener 6 caracteres.');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);
        try {
            // 1. Check if patente is already registered in the system
            const check = await vehicleService.verificarPatenteRegistrada(patente);
            if (check?.registered) {
                if (check.owner === 'self') {
                    showAlert(
                        'Patente ya registrada',
                        'Este vehículo ya se encuentra en tu garaje. Puedes verlo desde tu panel principal.',
                    );
                } else {
                    showAlert(
                        'Patente no disponible',
                        'Esta patente ya se encuentra registrada por otro usuario en el sistema. Si crees que esto es un error, contáctanos a soporte.',
                    );
                }
                setLoading(false);
                return;
            }

            // 2. Fetch vehicle info from external API
            const data = await vehicleService.getVehicleByPatente(patente);

            if (data && (data.marca || data.marca_nombre || data.modelo || data.year || data.vin || data.numero_motor)) {
                setVehicleData(data);

                // Initialize Engine Type
                if (data) {
                    let type = data.tipo_motor || 'GASOLINA';
                    const upper = type.toUpperCase();
                    if (upper.includes('BENCINA') || upper.includes('GASOLINA')) type = 'GASOLINA';
                    else if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) type = 'DIESEL';
                    else if (upper.includes('HIBRIDO') || upper.includes('HÍBRIDO')) type = 'HIBRIDO';
                    else if (upper.includes('ELECTRICO') || upper.includes('ELÉCTRICO')) type = 'ELECTRICO';
                    else type = null; // Force manual selection
                    setSelectedEngineType(type);
                }

                const requiereValorManual = necesitaValorMercadoManual(data);
                setShowValorMercadoAlert(requiereValorManual);
                if (!requiereValorManual && data.precio_mercado_promedio) {
                    setValorMercado(String(data.precio_mercado_promedio));
                } else {
                    setValorMercado('');
                }

                setStep('success');
            } else {
                showAlert(
                    'Patente no encontrada',
                    'No encontramos un vehículo asociado a esta patente en el registro nacional. Revisa que esté escrita correctamente (6 caracteres).',
                );
            }
        } catch (error) {
            console.error(error);
            if (error?.status === 404) {
                const detalle = formatApiErrorMessage(
                    error,
                    'La patente ingresada no existe en el registro nacional de vehículos.',
                );
                showAlert('Patente no encontrada', detalle);
                return;
            }
            showAlert(
                'Error',
                'Hubo un problema consultando la patente. Intenta nuevamente en unos momentos.',
            );
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        // Request permissions
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permiso Denegado", "Se requiere acceso a la galería para subir una foto.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5, // Compression to reduce upload size
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!vehicleData) return;

        console.log("🔍 [DEBUG] handleSave - vehicleData:", JSON.stringify(vehicleData, null, 2));

        if (!kilometraje) {
            showAlert('Falta información', 'Por favor ingresa el kilometraje actual.');
            return;
        }

        if (!selectedEngineType) {
            showAlert('Falta información', 'Por favor selecciona el tipo de combustible.');
            return;
        }

        if (necesitaValorMercadoManual(vehicleData)) {
            if (!valorMercado) {
                showAlert('Falta información', 'Por favor ingresa el valor de mercado referencial.');
                return;
            }
        }

        // Double-check patente availability before saving (race-condition guard)
        try {
            const recheck = await vehicleService.verificarPatenteRegistrada(patente);
            if (recheck?.registered && recheck.owner !== 'self') {
                if (Platform.OS === 'web') {
                    showAlert(
                        'Patente no disponible',
                        'Esta patente fue registrada por otro usuario mientras completabas el formulario. Intenta con otra patente.',
                    );
                    handleReset();
                } else {
                    Alert.alert(
                        'Patente no disponible',
                        'Esta patente fue registrada por otro usuario mientras completabas el formulario. Intenta con otra patente.',
                        [{ text: 'Entendido', onPress: handleReset }],
                    );
                }
                return;
            }
        } catch (e) {
            // If verification fails, let the backend reject on create
            console.warn('No se pudo re-verificar patente:', e);
        }

        const kmActual = parseInt(kilometraje, 10) || 0;
        for (const [compId, kmVal] of Object.entries(maintenanceSelections)) {
            if (kmVal === '' || kmVal === undefined) {
                const item = checklistItems.find(c => c.id === Number(compId));
                showAlert('Falta información', `Ingresa los km del odómetro cuando cambiaste "${item?.nombre || 'el componente'}".`);
                return;
            }
            const km = typeof kmVal === 'number' ? kmVal : parseInt(String(kmVal), 10);
            if (isNaN(km) || km < 0) {
                showAlert('Dato inválido', 'Los km deben ser un número mayor o igual a 0.');
                return;
            }
            if (km > kmActual) {
                showAlert('Dato inválido', `Los km del cambio no pueden ser mayores al kilometraje actual del auto (${kmActual.toLocaleString()} km).`);
                return;
            }
        }

        setSaving(true);
        try {
            // Prepare FormData for creation with image
            const formData = new FormData();

            // Append explicit fields
            formData.append('patente', patente);
            formData.append('tipo_motor', selectedEngineType);

            // Handle MARCA logic safely
            const marcaVal = vehicleData.marca_id || vehicleData.marca;
            if (marcaVal !== undefined && marcaVal !== null) {
                formData.append('marca', marcaVal);
            }

            // Handle MODELO logic safely
            const modeloVal = vehicleData.modelo_id || vehicleData.modelo;
            // Only append modelo if it is defined and looks like an ID, otherwise backend might fail if it tries to filter(id=string) without check
            // However, backend code (line 225) gets 'modelo' and likely tries to filter if present.
            // If it's a name, we should probably SKIP sending it as 'modelo' ID and rely on 'modelo_nombre'.
            // But if previously it worked, maybe 'modelo' key was ignored if not ID?
            // Safer: append if defined.
            if (modeloVal !== undefined && modeloVal !== null) {
                formData.append('modelo', modeloVal);
            }

            // Handle Names
            const marcaNombre = vehicleData.marca_nombre || vehicleData.marca;
            if (marcaNombre) formData.append('marca_nombre', marcaNombre);

            const modeloNombre = vehicleData.modelo_nombre || vehicleData.modelo;
            if (modeloNombre) formData.append('modelo_nombre', modeloNombre);

            formData.append('year', String(parseInt(vehicleData.year || vehicleData.anio)));
            formData.append('kilometraje', String(parseInt(kilometraje)));

            // Send API Mileage for comparison
            const apiMileage = vehicleData.raw_data?.mileage || vehicleData.mileage || vehicleData.kilometraje;
            if (apiMileage) {
                formData.append('kilometraje_api', String(apiMileage));
            }

            // Append market value manually if needed
            if (necesitaValorMercadoManual(vehicleData) && valorMercado) {
                formData.append('precio_mercado_promedio', valorMercado);
            }

            // Optional fields - Strict checks
            if (vehicleData.cilindraje) formData.append('cilindraje', vehicleData.cilindraje);
            if (vehicleData.color) formData.append('color', vehicleData.color);
            if (vehicleData.vin) formData.append('vin', vehicleData.vin);
            if (vehicleData.numero_motor) formData.append('numero_motor', vehicleData.numero_motor);
            if (vehicleData.transmision) formData.append('transmision', vehicleData.transmision);
            if (vehicleData.version) formData.append('version', vehicleData.version);
            if (vehicleData.puertas) formData.append('puertas', String(vehicleData.puertas));
            if (vehicleData.mes_revision_tecnica) formData.append('mes_revision_tecnica', vehicleData.mes_revision_tecnica);

            // Componentes historial (mantenimientos recientes)
            const historialEntries = Object.entries(maintenanceSelections)
                .filter(([, km]) => km !== '' && km !== undefined && !isNaN(Number(km)))
                .map(([componente_id, km]) => ({ componente_id: Number(componente_id), km_ultimo_cambio: Number(km) }));
            if (historialEntries.length > 0) {
                formData.append('componentes_historial', JSON.stringify(historialEntries));
                console.log('📤 [DEBUG] componentes_historial enviado:', historialEntries);
            }

            // Append Image if exists
            if (image) {
                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('foto', { uri: image, name: filename, type });
            }

            console.log("📤 [DEBUG] FormData contents:");
            // FormData inspection for debugging (not iterable in all RN versions but logging keys helps)
            // Note: In RN, we can't iterate formData easily, but we can verify our appends above.
            console.log("   - Vin:", vehicleData.vin);
            console.log("   - Motor (Serial):", vehicleData.numero_motor);
            console.log("   - Transmision:", vehicleData.transmision);
            console.log("   - Version:", vehicleData.version);

            await vehicleService.createVehicle(formData);

            // Invalidar listas (UserPanel / CrearSolicitud usan ['userVehicles']; hooks usan ['vehicles', userId])
            queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });

            if (Platform.OS === 'web') {
                showAlert('Éxito', 'Vehículo agregado a tu garaje.');
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Main', {
                        screen: 'MisVehiculos',
                        params: { refresh: true }
                    });
                }
            } else {
                Alert.alert('Éxito', 'Vehículo agregado a tu garaje.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Intentar navegar al stack principal o volver atrás
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                // Fallback para estructura de tabs
                                navigation.navigate('Main', {
                                    screen: 'MisVehiculos',
                                    params: { refresh: true }
                                });
                            }
                        }
                    }
                ]);
            }

        } catch (error) {
            console.error(error);
            const status = error?.response?.status;
            const detail = error?.response?.data?.patente?.[0];
            if (status === 409 || (detail && detail.toLowerCase().includes('registrada'))) {
                if (Platform.OS === 'web') {
                    showAlert(
                        'Patente no disponible',
                        detail || 'Esta patente ya se encuentra registrada por otro usuario.',
                    );
                    handleReset();
                } else {
                    Alert.alert(
                        'Patente no disponible',
                        detail || 'Esta patente ya se encuentra registrada por otro usuario.',
                        [{ text: 'Entendido', onPress: handleReset }],
                    );
                }
            } else {
                showAlert('Error', 'No se pudo guardar el vehículo. Inténtalo más tarde.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setStep('search');
        setVehicleData(null);
        setPatente('');
        setKilometraje('');
        setValorMercado('');
        setShowValorMercadoAlert(false);
        setImage(null);
        setMaintenanceSelections({});
    };

    const requiereValorMercadoManual =
        step === 'success' && vehicleData && necesitaValorMercadoManual(vehicleData);

    return (
        <View style={[styles.container, webRootFrame]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

            {/* Header */}
            <View style={[styles.headerSafeArea, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.closeButton}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nuevo Vehículo</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            {/* Main Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.keyboardContainer, Platform.OS === 'web' && styles.keyboardContainerWeb]}
            >
                <View
                    style={[
                        styles.contentContainer,
                        Platform.OS === 'web' && styles.contentContainerWeb,
                    ]}
                >

                    {/* SEARCH STATE */}
                    {step === 'search' && (
                        // NOTE: On web, TouchableWithoutFeedback can swallow click/focus events for TextInput.
                        // Keep dismiss-on-background-tap only on native.
                        (Platform.OS === 'web' ? (
                            <View style={styles.centerWrapper}>
                                <Text style={styles.instructionText}>Ingresa la patente de tu vehículo para buscar sus datos automáticamente.</Text>

                                <View style={styles.searchCardShell}>
                                    <View style={styles.patenteInputContainer}>
                                        <View style={styles.patenteDecorator}>
                                            <Text style={styles.patenteFlag}>🇨🇱</Text>
                                        </View>
                                        <TextInput
                                            ref={patenteInputRef}
                                            style={styles.patenteInput}
                                            placeholder="AB-CD-12"
                                            placeholderTextColor={COLORS.text.tertiary}
                                            value={patente}
                                            onChangeText={t => setPatente(formatPatente(t))}
                                            maxLength={6}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            returnKeyType="search"
                                            onSubmitEditing={handleSearch}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.searchButton, loading && styles.disabledButton]}
                                        onPress={handleSearch}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={COLORS.text.inverse} />
                                        ) : (
                                            <Ionicons name="search" size={24} color={COLORS.text.inverse} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                <View style={styles.centerWrapper}>
                                    <Text style={styles.instructionText}>Ingresa la patente de tu vehículo para buscar sus datos automáticamente.</Text>

                                    <View style={styles.searchCardShell}>
                                        <View style={styles.patenteInputContainer}>
                                            <View style={styles.patenteDecorator}>
                                                <Text style={styles.patenteFlag}>🇨🇱</Text>
                                            </View>
                                            <TextInput
                                                ref={patenteInputRef}
                                                style={styles.patenteInput}
                                                placeholder="AB-CD-12"
                                                placeholderTextColor={COLORS.text.tertiary}
                                                value={patente}
                                                onChangeText={t => setPatente(formatPatente(t))}
                                                maxLength={6}
                                                autoCapitalize="characters"
                                                autoCorrect={false}
                                                returnKeyType="search"
                                                onSubmitEditing={handleSearch}
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.searchButton, loading && styles.disabledButton]}
                                            onPress={handleSearch}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color={COLORS.text.inverse} />
                                            ) : (
                                                <Ionicons name="search" size={24} color={COLORS.text.inverse} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        ))
                    )}

                    {/* SUCCESS STATE */}
                    {step === 'success' && vehicleData && (
                        <ScrollView
                            style={Platform.OS === 'web' ? styles.successScrollViewWeb : undefined}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.successScroll}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            <View style={styles.successHeader}>
                                <View style={styles.successBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success[600]} />
                                    <Text style={styles.successBadgeText}>Vehículo Identificado</Text>
                                </View>
                            </View>

                            {/* Data Card */}
                            <PaperCard style={styles.vehicleCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.brandText}>{vehicleData.marca_nombre || 'Marca'}</Text>
                                        <Text style={styles.modelText}>{vehicleData.modelo_nombre || 'Modelo'}</Text>
                                        <Text style={styles.yearText}>{vehicleData.year || vehicleData.anio || '----'}</Text>
                                    </View>
                                    <View style={styles.carIconContainer}>
                                        <Ionicons name="car-sport" size={48} color={COLORS.primary[500]} />
                                    </View>
                                </View>

                                <View style={styles.grid}>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Motor</Text>
                                        <Text style={styles.gridValue}>{vehicleData.motor || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Combustible</Text>
                                        <View style={styles.fuelChips}>
                                            {ENGINE_OPTIONS.map((type) => (
                                                <TouchableOpacity
                                                    key={type}
                                                    onPress={() => setSelectedEngineType(type)}
                                                    style={[styles.fuelChip, selectedEngineType === type && styles.fuelChipActive]}
                                                >
                                                    <Text style={[styles.fuelChipText, selectedEngineType === type && styles.fuelChipTextActive]}>{type}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Color</Text>
                                        <Text style={styles.gridValue}>{vehicleData.color || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>VIN</Text>
                                        <Text style={[styles.gridValue, styles.monospace]}>{vehicleData.vin || 'N/A'}</Text>
                                    </View>
                                </View>
                            </PaperCard>

                            {/* Kilometraje Input */}
                            <PaperCard style={styles.kilometerSection}>
                                <Text style={styles.sectionLabel}>Kilometraje Actual</Text>
                                <View style={styles.kmInputWrapper}>
                                    <TextInput
                                        style={styles.kmInput}
                                        value={kilometraje}
                                        onChangeText={text => setKilometraje(text.replace(/[^0-9]/g, ''))}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                    <Text style={styles.kmSuffix}>km</Text>
                                </View>
                            </PaperCard>

                            {/* Valor mercado: solo si GetAPI no entregó tasación */}
                            {requiereValorMercadoManual && (
                                <>
                                    {showValorMercadoAlert && (
                                        <View style={[styles.warningCard, styles.warningCardRow]}>
                                            <Ionicons name="information-circle-outline" size={22} color={COLORS.warning[600]} style={{ marginRight: SPACING.xs, marginTop: 2 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.warningText}>
                                                    <Text style={styles.warningTextStrong}>Aviso:</Text> No hay valor de mercado registrado para este vehículo. Ingresa un valor referencial aproximado.
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setShowValorMercadoAlert(false)} style={{ padding: 4 }}>
                                                <Ionicons name="close" size={20} color={COLORS.warning[600]} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <PaperCard style={[styles.kilometerSection, { marginTop: SPACING.md }]}>
                                        <Text style={styles.sectionLabel}>Valor de Mercado Referencial</Text>
                                        <View style={styles.kmInputWrapper}>
                                            <Text style={[styles.kmSuffix, { marginRight: 8, marginLeft: 0 }]}>$</Text>
                                            <TextInput
                                                style={styles.kmInput}
                                                value={valorMercado}
                                                onChangeText={text => setValorMercado(text.replace(/[^0-9]/g, ''))}
                                                placeholder="0"
                                                keyboardType="numeric"
                                                placeholderTextColor={COLORS.text.tertiary}
                                            />
                                        </View>
                                    </PaperCard>
                                </>
                            )}

                            {tieneValorMercadoDesdeApi(vehicleData) && (
                                <PaperCard style={[styles.kilometerSection, { marginTop: SPACING.md }]}>
                                    <Text style={styles.sectionLabel}>Valor de mercado (registro)</Text>
                                    <Text style={styles.valorMercadoRegistrado}>
                                        $
                                        {Number(vehicleData.precio_mercado_promedio || 0).toLocaleString('es-CL')}
                                    </Text>
                                </PaperCard>
                            )}

                            {/* Mantenimientos Recientes (Opcional) */}
                            <PaperCard style={styles.maintenanceSection}>
                                <TouchableOpacity
                                    style={styles.maintenanceHeader}
                                    onPress={() => setMaintenanceExpanded(!maintenanceExpanded)}
                                    activeOpacity={0.7}
                                >
                                    <View>
                                        <Text style={styles.sectionLabel}>Mantenimientos Recientes (Opcional)</Text>
                                        <Text style={styles.maintenanceSubtitle}>Indica los km que tenía el auto cuando cambiaste cada pieza.</Text>
                                    </View>
                                    <Ionicons name={maintenanceExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={COLORS.text.tertiary} />
                                </TouchableOpacity>
                                {maintenanceExpanded && checklistItems.length > 0 && (
                                    <View style={styles.maintenanceList}>
                                        <Text style={styles.maintenanceQuestion}>¿Has cambiado o mantenido alguno de estos componentes?</Text>
                                        <Text style={styles.maintenanceHint}>Ingresa los km del odómetro que marcaba el auto cuando hiciste el cambio (ej: si tienes 145.000 km ahora y lo cambiaste a los 125.000, escribe 125000).</Text>
                                        {checklistItems.map((item) => {
                                            const isChecked = maintenanceSelections[item.id] !== undefined;
                                            const kmVal = maintenanceSelections[item.id];
                                            const kmNum = typeof kmVal === 'number' ? kmVal : (kmVal === '' ? '' : parseInt(String(kmVal), 10));
                                            return (
                                                <View key={item.id} style={styles.maintenanceRow}>
                                                    <TouchableOpacity
                                                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                                                        onPress={() => toggleMaintenanceCheck(item.id)}
                                                    >
                                                        {isChecked && <Ionicons name="checkmark" size={16} color={COLORS.text.inverse} />}
                                                    </TouchableOpacity>
                                                    <Text style={styles.maintenanceLabel}>{item.nombre}</Text>
                                                    {isChecked && (
                                                        <View style={styles.kmInputInline}>
                                                            <TextInput
                                                                style={styles.kmInputSmall}
                                                                value={kmVal === '' ? '' : String(kmVal)}
                                                                onChangeText={t => setMaintenanceKm(item.id, t)}
                                                                placeholder="Ej: 125000"
                                                                keyboardType="numeric"
                                                                placeholderTextColor={COLORS.text.tertiary}
                                                            />
                                                            <Text style={styles.kmSuffixSmall}>km</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                        <TouchableOpacity onPress={() => setMaintenanceSelections({})} style={styles.skipLink}>
                                            <Text style={styles.skipLinkText}>Continuar sin especificar</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </PaperCard>

                            {/* Photo Upload Section */}
                            <PaperCard style={styles.photoSection}>
                                <Text style={styles.sectionLabel}>Foto del Vehículo (Opcional)</Text>
                                <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.vehicleImage} />
                                    ) : (
                                        <View style={styles.photoPlaceholder}>
                                            <Ionicons name="camera" size={32} color={COLORS.primary[500]} />
                                            <Text style={styles.photoText}>Subir una foto</Text>
                                        </View>
                                    )}
                                    {image && (
                                        <View style={styles.editPhotoBadge}>
                                            <Ionicons name="pencil" size={16} color={COLORS.text.inverse} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </PaperCard>

                            {/* Warning Message */}
                            <View style={styles.warningCard}>
                                <Ionicons name="alert-circle-outline" size={22} color={COLORS.warning[600]} style={{ marginRight: SPACING.xs }} />
                                <Text style={styles.warningText}>
                                    <Text style={styles.warningTextStrong}>Importante:</Text> Para garantizar la veracidad de la información, los datos del vehículo no podrán ser editados después del registro.
                                </Text>
                            </View>

                            <Button
                                title="Guardar en mi Garaje"
                                icon="add"
                                onPress={handleSave}
                                isLoading={saving}
                                style={styles.saveButton}
                            />

                            <TouchableOpacity onPress={handleReset} style={styles.retryLink} disabled={saving}>
                                <Text style={styles.retryText}>Buscar otra patente</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    )}

                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    paperCard: {
        borderRadius: BORDERS.radius.card.lg,
        overflow: 'hidden',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        padding: SPACING.md,
        ...SHADOWS.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.container.horizontal,
        height: 56,
        zIndex: 2,
    },
    headerSafeArea: {
        backgroundColor: COLORS.background.default,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSpacer: {
        width: 36,
        height: 36,
    },
    keyboardContainer: {
        flex: 1,
    },
    keyboardContainerWeb: {
        minHeight: 0,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: SPACING.container.horizontal,
        paddingBottom: SPACING.xl,
    },
    contentContainerWeb: {
        minHeight: 0,
    },
    successScrollViewWeb: {
        flex: 1,
    },
    centerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -10,
    },
    instructionText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        maxWidth: '90%',
    },
    searchCardShell: {
        flexDirection: 'row',
        backgroundColor: COLORS.background.paper,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.md,
        width: '100%',
        alignItems: 'center',
        padding: SPACING.xs,
        borderRadius: BORDERS.radius.xl,
    },
    patenteInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: SPACING.sm,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.lg,
        height: 56,
    },
    patenteDecorator: {
        width: 24,
        height: 16,
        backgroundColor: '#FFDD00',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2,
    },
    patenteFlag: {
        fontSize: 10,
    },
    patenteInput: {
        fontSize: 22,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        letterSpacing: 3,
        flex: 1,
        textTransform: 'uppercase',
    },
    searchButton: {
        backgroundColor: COLORS.primary[500],
        width: 56,
        height: 56,
        borderRadius: BORDERS.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.xs,
    },
    disabledButton: {
        opacity: 0.7,
    },

    successScroll: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    valorMercadoRegistrado: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginTop: SPACING.xs,
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
        marginTop: SPACING.sm,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success[50],
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDERS.radius.badge.md,
        gap: SPACING.xs,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.success[200],
    },
    successBadgeText: {
        color: COLORS.success[700],
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.base,
    },
    vehicleCard: {
        marginBottom: SPACING.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.neutral.gray[200],
        paddingBottom: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    brandText: {
        fontSize: TYPOGRAPHY.fontSize.base,
        textTransform: 'uppercase',
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        letterSpacing: 1,
    },
    modelText: {
        fontSize: TYPOGRAPHY.fontSize['3xl'],
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginTop: SPACING.xxs,
    },
    yearText: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        color: COLORS.text.secondary,
        marginTop: SPACING.xxs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    carIconContainer: {
        width: 56,
        height: 56,
        borderRadius: BORDERS.radius.lg,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridItem: {
        width: '45%',
    },
    gridLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xxs,
    },
    gridValue: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    fuelChips: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: SPACING.xxs,
    },
    fuelChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BORDERS.radius.sm,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    fuelChipActive: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    fuelChipText: {
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: 10,
    },
    fuelChipTextActive: {
        color: COLORS.text.inverse,
    },
    monospace: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
    },
    kilometerSection: {
        marginBottom: SPACING.xl,
    },
    maintenanceSection: {
        marginBottom: SPACING.xl,
    },
    maintenanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    maintenanceSubtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginTop: SPACING.xxs,
    },
    maintenanceList: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.neutral.gray[200],
    },
    maintenanceQuestion: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    maintenanceHint: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        lineHeight: 18,
        marginBottom: SPACING.sm,
        fontStyle: 'italic',
    },
    maintenanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: BORDERS.width.medium,
        borderColor: COLORS.border.light,
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    maintenanceLabel: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text.primary,
    },
    kmInputInline: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.sm,
        paddingHorizontal: 10,
        width: 100,
    },
    kmInputSmall: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.primary,
        paddingVertical: 6,
    },
    kmSuffixSmall: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        marginLeft: SPACING.xxs,
    },
    skipLink: {
        marginTop: SPACING.xs,
        paddingVertical: SPACING.xs,
    },
    skipLinkText: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.primary[600],
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    sectionLabel: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    kmInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.lg,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xxs,
        height: 64,
    },
    kmInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize['2xl'],
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
    kmSuffix: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    saveButton: {
        marginBottom: SPACING.md,
    },
    retryLink: {
        alignItems: 'center',
        padding: SPACING.sm,
    },
    retryText: {
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    photoSection: {
        marginBottom: SPACING.xl,
    },
    photoUpload: {
        width: '100%',
        height: 200,
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.xl,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    vehicleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoPlaceholder: {
        alignItems: 'center',
        gap: 12,
    },
    photoText: {
        color: COLORS.primary[600],
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: SPACING.md,
        right: SPACING.md,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.65),
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    warningCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.warning[50],
        padding: SPACING.sm,
        borderRadius: BORDERS.radius.input.md,
        marginBottom: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning[500],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.warning[100],
    },
    warningCardRow: {
        alignItems: 'flex-start',
    },
    warningText: {
        flex: 1,
        color: COLORS.text.primary,
        fontSize: TYPOGRAPHY.fontSize.sm,
        lineHeight: 18,
    },
    warningTextStrong: {
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.warning[700],
    },
});

export default VehicleRegistrationScreen;
