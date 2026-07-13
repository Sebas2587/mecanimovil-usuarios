import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
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
 
import {
  Check,
  Info,
  X,
  Search,
  CircleCheck,
  Car,
  ChevronUp,
  ChevronDown,
  Camera,
  Pencil,
  CircleAlert,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../../components/navigation/BackButton';

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
import { showAlert, showConfirm } from '../../utils/platformAlert';
import { formatApiErrorMessage } from '../../utils/formatApiError';
import {
    necesitaValorMercadoManual,
    tieneValorMercadoDesdeApi,
} from '../../utils/vehicleValuation';
import {
    getMileageSii,
    getVehicleYear,
    kmValidacionToHint,
    mensajeSinMileageSii,
    tieneMileageSii,
    validarKilometrajeContraSii,
} from '../../utils/vehicleMileage';

// Utility
const formatPatente = (text) => {
    // Only alphanumeric, max 6, uppercase
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
};

const ENGINE_OPTIONS = ['GASOLINA', 'DIESEL', 'HIBRIDO', 'ELECTRICO'];

const PaperCard = ({ children, style }) => (
    <View style={[styles.paperCard, style]}>{children}</View>
);

const MAINTENANCE_WIDE_BREAKPOINT = 600;

const MaintenanceChecklistItem = memo(function MaintenanceChecklistItem({
    item,
    isChecked,
    kmVal,
    isWideLayout,
    onToggle,
    onKmChange,
}) {
    const kmField = isChecked ? (
        <View
            style={[
                styles.maintenanceKmBlock,
                isWideLayout && styles.maintenanceKmBlockWide,
            ]}
        >
            {!isWideLayout && (
                <Text style={styles.maintenanceKmLabel}>Km del odómetro al cambiar</Text>
            )}
            <View
                style={[
                    styles.maintenanceKmInputWrapper,
                    isWideLayout && styles.maintenanceKmInputWrapperWide,
                ]}
            >
                <TextInput
                    style={styles.maintenanceKmInput}
                    value={kmVal === '' ? '' : String(kmVal)}
                    onChangeText={onKmChange}
                    placeholder="Ej: 125000"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text.tertiary}
                />
                <Text style={styles.maintenanceKmSuffix}>km</Text>
            </View>
        </View>
    ) : null;

    if (isWideLayout) {
        return (
            <View style={styles.maintenanceItem}>
                <View style={styles.maintenanceItemRowWide}>
                    <TouchableOpacity
                        style={styles.maintenanceItemHeaderWide}
                        onPress={onToggle}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked }}
                    >
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                            {isChecked && (
                                <Check size={16} color={COLORS.text.inverse} strokeWidth={2.5} />
                            )}
                        </View>
                        <Text style={styles.maintenanceLabel}>{item.nombre}</Text>
                    </TouchableOpacity>
                    {kmField}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.maintenanceItem}>
            <TouchableOpacity
                style={styles.maintenanceItemHeader}
                onPress={onToggle}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
            >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && (
                        <Check size={16} color={COLORS.text.inverse} strokeWidth={2.5} />
                    )}
                </View>
                <Text style={styles.maintenanceLabel}>{item.nombre}</Text>
            </TouchableOpacity>
            {kmField}
        </View>
    );
});

const VehicleRegistrationScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const isWideLayout = windowWidth >= MAINTENANCE_WIDE_BREAKPOINT;

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
    const [kmValidationHint, setKmValidationHint] = useState(null);
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

                if (!tieneMileageSii(data)) {
                    setKmValidationHint({ tipo: 'aviso', mensaje: mensajeSinMileageSii() });
                } else {
                    setKmValidationHint(null);
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

    const handleSave = async (kilometrajeConfirmado = false) => {
        if (!vehicleData) return;

        console.log("🔍 [DEBUG] handleSave - vehicleData:", JSON.stringify(vehicleData, null, 2));

        if (!kilometraje) {
            showAlert('Falta información', 'Por favor ingresa el kilometraje actual.');
            return;
        }

        const validacionKm = validarKilometrajeContraSii(kilometraje, vehicleData);
        if (!validacionKm.valid) {
            showAlert('Kilometraje inconsistente', validacionKm.mensaje);
            return;
        }

        if (validacionKm.requiere_confirmacion && !kilometrajeConfirmado) {
            const titulo =
                validacionKm.code === 'km_posible_typo'
                    ? 'Revisar kilometraje'
                    : 'Confirmar kilometraje';
            showConfirm(titulo, validacionKm.mensaje, {
                confirmText: 'Sí, es correcto',
                onConfirm: () => handleSave(true),
            });
            return;
        }

        try {
            const validacionServidor = await vehicleService.validarKilometraje(kilometraje, {
                mileage_sii: getMileageSii(vehicleData),
                tiene_mileage_sii: tieneMileageSii(vehicleData),
                year: getVehicleYear(vehicleData),
            });
            if (validacionServidor && validacionServidor.valid === false) {
                showAlert(
                    'Kilometraje inconsistente',
                    validacionServidor.mensaje || validacionKm.mensaje,
                );
                return;
            }
            if (
                validacionServidor?.requiere_confirmacion &&
                !kilometrajeConfirmado
            ) {
                showConfirm(
                    validacionServidor.code === 'km_posible_typo'
                        ? 'Revisar kilometraje'
                        : 'Confirmar kilometraje',
                    validacionServidor.mensaje || validacionKm.mensaje,
                    {
                        confirmText: 'Sí, es correcto',
                        onConfirm: () => handleSave(true),
                    },
                );
                return;
            }
        } catch (e) {
            console.warn('Validación servidor kilometraje:', e);
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

            // Marca/modelo: nombres para resolución canónica; IDs solo si son numéricos
            const marcaNombreRaw = vehicleData.marca_nombre
                || (typeof vehicleData.marca === 'string' ? vehicleData.marca : null);
            if (marcaNombreRaw) formData.append('marca_nombre', marcaNombreRaw);

            const modeloNombreRaw = vehicleData.modelo_nombre
                || (typeof vehicleData.modelo === 'string' ? vehicleData.modelo : null);
            if (modeloNombreRaw) formData.append('modelo_nombre', modeloNombreRaw);

            const marcaId = vehicleData.marca_id ?? (
                typeof vehicleData.marca === 'number' || /^\d+$/.test(String(vehicleData.marca ?? ''))
                    ? vehicleData.marca
                    : null
            );
            if (marcaId != null && String(marcaId).match(/^\d+$/)) {
                formData.append('marca', String(marcaId));
            }

            const modeloId = vehicleData.modelo_id ?? (
                typeof vehicleData.modelo === 'number' || /^\d+$/.test(String(vehicleData.modelo ?? ''))
                    ? vehicleData.modelo
                    : null
            );
            if (modeloId != null && String(modeloId).match(/^\d+$/)) {
                formData.append('modelo', String(modeloId));
            }

            formData.append('year', String(parseInt(vehicleData.year || vehicleData.anio)));
            formData.append('kilometraje', String(parseInt(kilometraje)));

            const apiMileage = getMileageSii(vehicleData);
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
                const detalle = formatApiErrorMessage(
                    error,
                    'No se pudo guardar el vehículo. Revisa los datos e inténtalo de nuevo.',
                );
                showAlert('Error al guardar', detalle);
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
        setKmValidationHint(null);
        setImage(null);
        setMaintenanceSelections({});
    };

    const mileageSiiRegistro = vehicleData ? getMileageSii(vehicleData) : null;
    const hayMileageSii = vehicleData ? tieneMileageSii(vehicleData) : false;

    const handleKilometrajeChange = useCallback(
        (text) => {
            const cleaned = text.replace(/[^0-9]/g, '');
            setKilometraje(cleaned);
            if (!vehicleData || !cleaned) {
                setKmValidationHint(
                    !tieneMileageSii(vehicleData) && vehicleData
                        ? { tipo: 'aviso', mensaje: mensajeSinMileageSii() }
                        : null,
                );
                return;
            }
            const v = validarKilometrajeContraSii(cleaned, vehicleData);
            setKmValidationHint(kmValidacionToHint(v));
        },
        [vehicleData],
    );

    const aplicarKmSugerido = useCallback(() => {
        if (kmValidationHint?.km_sugerido) {
            const sugerido = String(kmValidationHint.km_sugerido);
            setKilometraje(sugerido);
            const v = validarKilometrajeContraSii(sugerido, vehicleData);
            setKmValidationHint(kmValidacionToHint(v));
        }
    }, [kmValidationHint, vehicleData]);

    const requiereValorMercadoManual =
        step === 'success' && vehicleData && necesitaValorMercadoManual(vehicleData);

    const maintenanceItemHandlers = useMemo(() => {
        const map = new Map();
        for (const item of checklistItems) {
            map.set(item.id, {
                onToggle: () => toggleMaintenanceCheck(item.id),
                onKmChange: (t) => setMaintenanceKm(item.id, t),
            });
        }
        return map;
    }, [checklistItems, toggleMaintenanceCheck, setMaintenanceKm]);

    const valorMercadoBlock = requiereValorMercadoManual ? (
        <>
            {showValorMercadoAlert && (
                <View style={[styles.warningCard, styles.warningCardRow]}>
                    <Info
                        size={22}
                        color={COLORS.warning[600]}
                        strokeWidth={1.75}
                        style={styles.warningIcon}
                    />
                    <View style={styles.warningCardBody}>
                        <Text style={styles.warningText}>
                            <Text style={styles.warningTextStrong}>Aviso:</Text> No hay valor de mercado
                            registrado para este vehículo. Ingresa un valor referencial aproximado.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowValorMercadoAlert(false)}
                        style={styles.warningDismiss}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <X size={20} color={COLORS.warning[600]} strokeWidth={1.75} />
                    </TouchableOpacity>
                </View>
            )}
            <PaperCard style={styles.formSectionCard}>
                <Text style={styles.sectionLabel}>Valor de Mercado Referencial</Text>
                <View style={styles.kmInputWrapper}>
                    <Text style={[styles.kmSuffix, styles.currencyPrefix]}>$</Text>
                    <TextInput
                        style={styles.kmInput}
                        value={valorMercado}
                        onChangeText={(text) => setValorMercado(text.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.text.tertiary}
                    />
                </View>
            </PaperCard>
        </>
    ) : null;

    const valorMercadoApiBlock =
        vehicleData && tieneValorMercadoDesdeApi(vehicleData) ? (
            <PaperCard style={styles.formSectionCard}>
                <Text style={styles.sectionLabel}>Valor de mercado (registro)</Text>
                <Text style={styles.valorMercadoRegistrado}>
                    ${Number(vehicleData.precio_mercado_promedio || 0).toLocaleString('es-CL')}
                </Text>
            </PaperCard>
        ) : null;

    return (
        <View style={[styles.container, webRootFrame]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background.default} />

            {/* Header */}
            <View style={[styles.headerSafeArea, { paddingTop: insets.top + SPACING.xs }]}>
                <View style={styles.header}>
                    <BackButton onPress={handleBackPress} />
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
                                            <Search size={24} color={COLORS.text.inverse} strokeWidth={1.75} />
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
                                                <Search size={24} color={COLORS.text.inverse} strokeWidth={1.75} />
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
                                    <CircleCheck size={16} color={COLORS.success[600]} strokeWidth={1.75} />
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
                                        <Car size={48} color={COLORS.primary[500]} strokeWidth={1.5} />
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
                                    {hayMileageSii && mileageSiiRegistro != null && (
                                        <View style={[styles.gridItem, styles.gridItemFull]}>
                                            <Text style={styles.gridLabel}>Kilometraje según registro (SII)</Text>
                                            <Text style={styles.gridValueSii}>
                                                {mileageSiiRegistro.toLocaleString('es-CL')} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </PaperCard>

                            {valorMercadoBlock}
                            {valorMercadoApiBlock}

                            {/* Kilometraje Input */}
                            <PaperCard style={styles.formSectionCard}>
                                <Text style={styles.sectionLabel}>Kilometraje Actual</Text>
                                {hayMileageSii && mileageSiiRegistro != null ? (
                                    <Text style={styles.kmReferenciaSii}>
                                        Referencia SII: {mileageSiiRegistro.toLocaleString('es-CL')} km. El odómetro no puede ser menor a este valor.
                                    </Text>
                                ) : (
                                    <Text style={styles.kmReferenciaSiiMuted}>
                                        No hay kilometraje de referencia del SII para este vehículo. Ingresa el valor actual del odómetro.
                                    </Text>
                                )}
                                <View style={styles.kmInputWrapper}>
                                    <TextInput
                                        style={[
                                            styles.kmInput,
                                            kmValidationHint?.tipo === 'error' && styles.kmInputError,
                                        ]}
                                        value={kilometraje}
                                        onChangeText={handleKilometrajeChange}
                                        placeholder={
                                            hayMileageSii && mileageSiiRegistro
                                                ? String(mileageSiiRegistro)
                                                : '0'
                                        }
                                        keyboardType="numeric"
                                        placeholderTextColor={COLORS.text.tertiary}
                                    />
                                    <Text style={styles.kmSuffix}>km</Text>
                                </View>
                                {kmValidationHint?.mensaje ? (
                                    <View style={styles.kmHintBlock}>
                                        <Text
                                            style={
                                                kmValidationHint.tipo === 'error'
                                                    ? styles.kmHintError
                                                    : styles.kmHintAviso
                                            }
                                        >
                                            {kmValidationHint.mensaje}
                                        </Text>
                                        {kmValidationHint.km_sugerido ? (
                                            <TouchableOpacity
                                                onPress={aplicarKmSugerido}
                                                style={styles.kmSugeridoButton}
                                            >
                                                <Text style={styles.kmSugeridoButtonText}>
                                                    Usar {kmValidationHint.km_sugerido.toLocaleString('es-CL')} km
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                ) : null}
                            </PaperCard>

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
                                    {maintenanceExpanded ? (
                                        <ChevronUp size={24} color={COLORS.text.tertiary} strokeWidth={1.75} />
                                    ) : (
                                        <ChevronDown size={24} color={COLORS.text.tertiary} strokeWidth={1.75} />
                                    )}
                                </TouchableOpacity>
                                {maintenanceExpanded && checklistItems.length > 0 && (
                                    <View style={styles.maintenanceList}>
                                        <Text style={styles.maintenanceQuestion}>
                                            ¿Has cambiado o mantenido alguno de estos componentes?
                                        </Text>
                                        <Text style={styles.maintenanceHint}>
                                            Ingresa los km del odómetro al momento del cambio (ej: si hoy tienes
                                            145.000 km y lo cambiaste a los 125.000, escribe 125000).
                                        </Text>
                                        <View style={styles.maintenanceItems}>
                                            {checklistItems.map((item) => {
                                                const handlers = maintenanceItemHandlers.get(item.id);
                                                return (
                                                    <MaintenanceChecklistItem
                                                        key={item.id}
                                                        item={item}
                                                        isChecked={maintenanceSelections[item.id] !== undefined}
                                                        kmVal={maintenanceSelections[item.id]}
                                                        isWideLayout={isWideLayout}
                                                        onToggle={handlers?.onToggle}
                                                        onKmChange={handlers?.onKmChange}
                                                    />
                                                );
                                            })}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setMaintenanceSelections({})}
                                            style={styles.skipLink}
                                        >
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
                                            <Camera size={32} color={COLORS.primary[500]} strokeWidth={1.75} />
                                            <Text style={styles.photoText}>Subir una foto</Text>
                                        </View>
                                    )}
                                    {image && (
                                        <View style={styles.editPhotoBadge}>
                                            <Pencil size={16} color={COLORS.text.inverse} strokeWidth={1.75} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </PaperCard>

                            {/* Warning Message */}
                            <View style={styles.warningCard}>
                                <CircleAlert size={22} color={COLORS.warning[600]} strokeWidth={1.75} style={{ marginRight: SPACING.xs }} />
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
    headerSpacer: {
        width: 40,
        height: 40,
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
        backgroundColor: COLORS.warning.main,
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
        paddingBottom: SPACING['2xl'],
        ...(Platform.OS === 'web'
            ? {
                  maxWidth: 640,
                  alignSelf: 'center',
                  width: '100%',
              }
            : {}),
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
    gridItemFull: {
        width: '100%',
    },
    gridValueSii: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.primary[700],
    },
    kmReferenciaSii: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        lineHeight: 20,
    },
    kmReferenciaSiiMuted: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.sm,
        lineHeight: 20,
    },
    kmInputError: {
        color: COLORS.error[600],
    },
    kmHintError: {
        marginTop: SPACING.sm,
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.error[600],
        lineHeight: 18,
    },
    kmHintAviso: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.warning[700],
        lineHeight: 18,
    },
    kmHintBlock: {
        marginTop: SPACING.sm,
        gap: SPACING.xs,
    },
    kmSugeridoButton: {
        alignSelf: 'flex-start',
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.primary[50],
    },
    kmSugeridoButtonText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.primary[700],
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
    formSectionCard: {
        marginBottom: SPACING.lg,
    },
    currencyPrefix: {
        marginRight: SPACING.xs,
        marginLeft: 0,
    },
    warningIcon: {
        marginRight: SPACING.xs,
        marginTop: 2,
    },
    warningCardBody: {
        flex: 1,
    },
    warningDismiss: {
        padding: SPACING.xxs,
    },
    maintenanceSection: {
        marginBottom: SPACING.lg,
    },
    maintenanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    maintenanceSubtitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        marginTop: SPACING.xxs,
        lineHeight: 20,
        maxWidth: 520,
    },
    maintenanceList: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    maintenanceQuestion: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    maintenanceHint: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    maintenanceItems: {
        gap: 0,
    },
    maintenanceItem: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
    },
    maintenanceItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    maintenanceItemRowWide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        minHeight: 44,
    },
    maintenanceItemHeaderWide: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: BORDERS.radius.xs,
        borderWidth: BORDERS.width.medium,
        borderColor: COLORS.border.light,
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    maintenanceLabel: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.primary,
        lineHeight: 22,
    },
    maintenanceKmBlock: {
        marginTop: SPACING.sm,
        marginLeft: 30,
        gap: SPACING.xxs,
    },
    maintenanceKmBlockWide: {
        marginTop: 0,
        marginLeft: 0,
        flexShrink: 0,
    },
    maintenanceKmLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xxs,
    },
    maintenanceKmInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.input?.md ?? BORDERS.radius.md,
        paddingHorizontal: SPACING.sm,
        minHeight: 48,
    },
    maintenanceKmInputWrapperWide: {
        width: 200,
        maxWidth: '100%',
    },
    maintenanceKmInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.primary,
        paddingVertical: Platform.OS === 'web' ? SPACING.xs : SPACING.sm,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    maintenanceKmSuffix: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
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
