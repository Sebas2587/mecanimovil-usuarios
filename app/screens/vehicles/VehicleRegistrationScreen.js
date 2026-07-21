import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
 
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
  ClipboardList,
  QrCode,
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
import PrimaryGradientFill from '../../components/base/PrimaryGradientFill/PrimaryGradientFill';
import * as ImagePicker from 'expo-image-picker'; // New import
import { useQueryClient } from '@tanstack/react-query'; // For invalidation
import { ROUTES } from '../../utils/constants';
import { navigateCrearSolicitudConProveedorYServicio } from '../../components/home/shared/homeScheduleNavigation';
import { showAlert, showConfirm } from '../../utils/platformAlert';
import { formatApiErrorMessage } from '../../utils/formatApiError';
import { appendImageToFormData } from '../../utils/imagePickerWeb';
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
    compararKmConChecklist,
    mergeKmValidationHints,
} from '../../utils/vehicleMileage';
import {
    getInformesPendientesPorPatente,
    reclamarInformesServicio,
} from '../../services/informeServicioService';
import {
    clearPendingInformeClaimIntent,
    savePendingInformeClaimIntent,
} from '../../utils/guestIntent';

// Utility
const formatPatente = (text) => {
    // Only alphanumeric, max 6, uppercase
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
};

const ENGINE_OPTIONS = [
    { id: 'GASOLINA', label: 'Gasolina' },
    { id: 'DIESEL', label: 'Diésel' },
    { id: 'HIBRIDO', label: 'Híbrido' },
    { id: 'ELECTRICO', label: 'Eléctrico' },
];

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
    readOnly,
    readOnlyLabel,
}) {
    const kmField = isChecked && !readOnly ? (
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
                    placeholderTextColor={COLORS.text.hint}
                />
                <Text style={styles.maintenanceKmSuffix}>km</Text>
            </View>
        </View>
    ) : null;

    if (isWideLayout) {
        return (
            <View style={[styles.maintenanceItem, readOnly && styles.maintenanceItemReadOnly]}>
                <View style={styles.maintenanceItemRowWide}>
                    <TouchableOpacity
                        style={styles.maintenanceItemHeaderWide}
                        onPress={readOnly ? undefined : onToggle}
                        activeOpacity={readOnly ? 1 : 0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isChecked, disabled: !!readOnly }}
                        disabled={readOnly}
                    >
                        <View style={[styles.checkbox, isChecked && styles.checkboxCheckedWrap]}>
                            {isChecked ? (
                                <PrimaryGradientFill style={styles.checkboxFill}>
                                    <Check size={16} color={COLORS.text.inverse} strokeWidth={2.5} />
                                </PrimaryGradientFill>
                            ) : null}
                        </View>
                        <View style={styles.maintenanceLabelWrap}>
                            <Text style={styles.maintenanceLabel}>{item.nombre}</Text>
                            {readOnly && readOnlyLabel ? (
                                <Text style={styles.maintenanceOfficialBadge}>{readOnlyLabel}</Text>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                    {kmField}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.maintenanceItem, readOnly && styles.maintenanceItemReadOnly]}>
            <TouchableOpacity
                style={styles.maintenanceItemHeader}
                onPress={readOnly ? undefined : onToggle}
                activeOpacity={readOnly ? 1 : 0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked, disabled: !!readOnly }}
                disabled={readOnly}
            >
                <View style={[styles.checkbox, isChecked && styles.checkboxCheckedWrap]}>
                    {isChecked ? (
                        <PrimaryGradientFill style={styles.checkboxFill}>
                            <Check size={16} color={COLORS.text.inverse} strokeWidth={2.5} />
                        </PrimaryGradientFill>
                    ) : null}
                </View>
                <View style={styles.maintenanceLabelWrap}>
                    <Text style={styles.maintenanceLabel}>{item.nombre}</Text>
                    {readOnly && readOnlyLabel ? (
                        <Text style={styles.maintenanceOfficialBadge}>{readOnlyLabel}</Text>
                    ) : null}
                </View>
            </TouchableOpacity>
            {kmField}
        </View>
    );
});

const VehicleRegistrationScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
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
    const [patenteFocused, setPatenteFocused] = useState(false);
    const [kmFocused, setKmFocused] = useState(false);
    const [valorMercadoFocused, setValorMercadoFocused] = useState(false);
    const [step, setStep] = useState('search'); // 'search' | 'success' | 'manual'
    const [loading, setLoading] = useState(false);
    const [vehicleData, setVehicleData] = useState(null);
    const [kilometraje, setKilometraje] = useState('');
    const [image, setImage] = useState(null); // URI preview
    const [imageAsset, setImageAsset] = useState(null); // expo-image-picker asset (web File upload)
    const [saving, setSaving] = useState(false);
    const [selectedEngineType, setSelectedEngineType] = useState(null);
    const [maintenanceSelections, setMaintenanceSelections] = useState({});
    const [componentesOficialesIds, setComponentesOficialesIds] = useState(() => {
        const fromRoute = route.params?.componentesOficialesIds;
        return Array.isArray(fromRoute) ? fromRoute.map(Number).filter(Boolean) : [];
    });
    const pendingInformeClaimToken = route.params?.pendingInformeClaimToken || null;
    const pendingInformeClaimTokens = route.params?.pendingInformeClaimTokens || [];
    const claimPersistedRef = useRef(false);
    const [informesPendientes, setInformesPendientes] = useState([]);
    const [maintenanceExpanded, setMaintenanceExpanded] = useState(true);
    const [valorMercado, setValorMercado] = useState('');
    const [showValorMercadoAlert, setShowValorMercadoAlert] = useState(false);
    const [kmValidationHint, setKmValidationHint] = useState(null);
    const queryClient = useQueryClient();

    const loadInformesPendientes = useCallback(async (plate) => {
        const normalized = String(plate || '').toUpperCase().trim();
        if (normalized.length < 6) {
            setInformesPendientes([]);
            return;
        }
        try {
            const data = await getInformesPendientesPorPatente(normalized);
            setInformesPendientes(Array.isArray(data?.informes) ? data.informes : []);
        } catch (err) {
            console.warn('Informes pendientes por patente:', err);
            setInformesPendientes([]);
        }
    }, []);

    /**
     * Solo tokens obtenidos por QR/enlace del informe.
     * La patente sola no autoriza vincular historial (anti-apropiación).
     */
    const claimTokensFromProof = useMemo(
        () => [...new Set([
            pendingInformeClaimToken,
            ...(Array.isArray(pendingInformeClaimTokens) ? pendingInformeClaimTokens : []),
        ].filter(Boolean))],
        [pendingInformeClaimToken, pendingInformeClaimTokens],
    );

    /**
     * Si el usuario cancela el registro, el claim debe seguir disponible
     * en home / Mis vehículos (no solo en params de esta pantalla).
     */
    useEffect(() => {
        if (!claimTokensFromProof.length) return undefined;
        const persistClaim = () => {
            if (claimPersistedRef.current) return;
            const prefill = route.params?.prefillVehicleData || vehicleData || null;
            void savePendingInformeClaimIntent({
                tokens: claimTokensFromProof,
                vehicleData: prefill
                    ? { ...prefill, patente: prefill.patente || patente || route.params?.prefillPatente }
                    : { patente: patente || route.params?.prefillPatente },
            });
        };
        persistClaim();
        const unsub = navigation.addListener('beforeRemove', persistClaim);
        return unsub;
    }, [
        navigation,
        claimTokensFromProof,
        route.params?.prefillVehicleData,
        route.params?.prefillPatente,
        vehicleData,
        patente,
    ]);

    useEffect(() => {
        const prefillVehicleData = route.params?.prefillVehicleData;
        const prefillPatente = route.params?.prefillPatente
            || prefillVehicleData?.patente
            || null;
        const prefillKm = prefillVehicleData?.kilometraje_servicio
            ?? prefillVehicleData?.kilometraje_api
            ?? prefillVehicleData?.mileage_sii
            ?? prefillVehicleData?.mileage;
        if (!prefillPatente && !prefillVehicleData) return;

        let cancelled = false;

        const normalizeInformePrefill = (data) => {
            if (!data || typeof data !== 'object') return {};
            return {
                ...data,
                patente: data.patente || prefillPatente || undefined,
                marca_nombre: data.marca_nombre || data.marca || undefined,
                modelo_nombre: data.modelo_nombre || data.modelo || undefined,
                year: data.year || data.anio || undefined,
                anio: data.anio || data.year || undefined,
                vin: data.vin || undefined,
                kilometraje_api: data.kilometraje_api ?? data.mileage_sii ?? data.mileage ?? undefined,
                mileage_sii: data.mileage_sii ?? data.kilometraje_api ?? data.mileage ?? undefined,
                kilometraje_servicio: data.kilometraje_servicio ?? undefined,
            };
        };

        const applyPrefill = (data) => {
            setVehicleData(data);
            setStep('success');

            let type = data.tipo_motor || null;
            if (type) {
                const upper = String(type).toUpperCase();
                if (upper.includes('BENCINA') || upper.includes('GASOLINA')) type = 'GASOLINA';
                else if (upper.includes('DIESEL') || upper.includes('DIÉSEL')) type = 'DIESEL';
                else if (upper.includes('HIBRIDO') || upper.includes('HÍBRIDO')) type = 'HIBRIDO';
                else if (upper.includes('ELECTRICO') || upper.includes('ELÉCTRICO')) type = 'ELECTRICO';
                else type = null;
            }
            setSelectedEngineType(type);

            const requiereValorManual = necesitaValorMercadoManual(data);
            setShowValorMercadoAlert(requiereValorManual);
            if (tieneValorMercadoDesdeApi(data) && data.precio_mercado_promedio != null) {
                setValorMercado(String(data.precio_mercado_promedio));
            }
            if (!tieneMileageSii(data)) {
                setKmValidationHint({ tipo: 'aviso', mensaje: mensajeSinMileageSii() });
            } else {
                setKmValidationHint(null);
            }
        };

        (async () => {
            const plate = prefillPatente
                ? String(prefillPatente).toUpperCase().trim().slice(0, 6)
                : '';
            if (plate) setPatente(plate);

            if (plate) {
                try {
                    const check = await vehicleService.verificarPatenteRegistrada(plate);
                    if (cancelled) return;
                    if (check?.registered) {
                        if (check.owner === 'self') {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('TabNavigator', { screen: ROUTES.HOME });
                            }
                            return;
                        }
                        showAlert(
                            'Patente no disponible',
                            'Esta patente ya se encuentra registrada por otro usuario en el sistema. Si crees que esto es un error, contáctanos a soporte.',
                        );
                        setStep('search');
                        setVehicleData(null);
                        return;
                    }
                } catch (_e) {
                    // Continuar: handleSave re-verifica
                }
            }

            // Igual que el canal tradicional: enriquecer con GetAPI (motor, color, tipo, etc.).
            // El informe solo trae un subset; sin esta consulta la ficha queda en N/A.
            let merged = normalizeInformePrefill(prefillVehicleData);
            if (plate) {
                setLoading(true);
                try {
                    const apiData = await vehicleService.getVehicleByPatente(plate);
                    if (cancelled) return;
                    if (apiData) {
                        merged = {
                            ...apiData,
                            ...merged,
                            patente: plate,
                            marca_nombre: apiData.marca_nombre || merged.marca_nombre,
                            modelo_nombre: apiData.modelo_nombre || merged.modelo_nombre,
                            year: apiData.year || merged.year || merged.anio,
                            anio: apiData.year || merged.anio || merged.year,
                            vin: apiData.vin || merged.vin,
                            color: apiData.color || merged.color,
                            motor: apiData.motor || merged.motor || apiData.cilindraje,
                            tipo_motor: apiData.tipo_motor || merged.tipo_motor,
                            kilometraje_api:
                                merged.kilometraje_api
                                ?? apiData.kilometraje_api
                                ?? apiData.mileage
                                ?? null,
                            mileage_sii:
                                merged.mileage_sii
                                ?? apiData.kilometraje_api
                                ?? apiData.mileage
                                ?? null,
                        };
                    }
                } catch (_e) {
                    // Si GetAPI falla, usar lo que trajo el informe
                } finally {
                    if (!cancelled) setLoading(false);
                }
            }

            if (cancelled) return;

            const hasUsefulData = !!(
                merged.marca_nombre
                || merged.modelo_nombre
                || merged.vin
                || merged.year
                || merged.motor
            );

            if (hasUsefulData) {
                applyPrefill(merged);
                const kmSource = prefillKm
                    ?? merged.kilometraje_servicio
                    ?? merged.kilometraje_api
                    ?? merged.mileage_sii;
                if (kmSource != null && String(kmSource).trim() !== '') {
                    const kmInt = parseInt(String(kmSource).replace(/\D/g, ''), 10);
                    if (Number.isFinite(kmInt) && kmInt > 0) {
                        setKilometraje(String(kmInt));
                    }
                }
                if (plate) {
                    await loadInformesPendientes(plate);
                }
            } else if (plate) {
                // Patente lista; el usuario puede pulsar buscar (GetAPI falló).
                setStep('search');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [route.params?.prefillPatente, route.params?.prefillVehicleData, navigation, loadInformesPendientes]);

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
        if (componentesOficialesIds.includes(Number(compId))) return;
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
    }, [maintenanceSelections, componentesOficialesIds]);

    useEffect(() => {
        if (!checklistItems.length || !componentesOficialesIds.length) return;
        setMaintenanceSelections((prev) => {
            const next = { ...prev };
            checklistItems.forEach((item) => {
                if (componentesOficialesIds.includes(Number(item.id))) {
                    next[item.id] = next[item.id] ?? '';
                }
            });
            return next;
        });
    }, [checklistItems, componentesOficialesIds]);

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
                await loadInformesPendientes(patente);
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
            const asset = result.assets[0];
            setImage(asset.uri);
            setImageAsset(asset);
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
        const validacionChecklist = compararKmConChecklist(kilometraje, informesPendientes);
        if (!validacionKm.valid) {
            showAlert('Kilometraje inconsistente', validacionKm.mensaje);
            return;
        }

        const needKmConfirm =
            (validacionKm.requiere_confirmacion || validacionChecklist.requiere_confirmacion)
            && !kilometrajeConfirmado;
        if (needKmConfirm) {
            const mensajes = [validacionKm.mensaje, validacionChecklist.mensaje].filter(Boolean);
            const titulo =
                validacionKm.code === 'km_posible_typo'
                    ? 'Revisar kilometraje'
                    : 'Confirmar kilometraje';
            showConfirm(titulo, mensajes.join('\n\n'), {
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
                .filter(([componente_id, km]) => {
                    if (componentesOficialesIds.includes(Number(componente_id))) return false;
                    return km !== '' && km !== undefined && !isNaN(Number(km));
                })
                .map(([componente_id, km]) => ({ componente_id: Number(componente_id), km_ultimo_cambio: Number(km) }));
            if (historialEntries.length > 0) {
                formData.append('componentes_historial', JSON.stringify(historialEntries));
                console.log('📤 [DEBUG] componentes_historial enviado:', historialEntries);
            }

            // Append Image if exists (web necesita File/Blob, no { uri })
            if (image) {
                await appendImageToFormData(formData, 'foto', image, imageAsset);
            }

            console.log("📤 [DEBUG] FormData contents:");
            // FormData inspection for debugging (not iterable in all RN versions but logging keys helps)
            // Note: In RN, we can't iterate formData easily, but we can verify our appends above.
            console.log("   - Vin:", vehicleData.vin);
            console.log("   - Motor (Serial):", vehicleData.numero_motor);
            console.log("   - Transmision:", vehicleData.transmision);
            console.log("   - Version:", vehicleData.version);
            console.log("   - Foto:", image ? 'sí' : 'no');

            const created = await vehicleService.createVehicle(formData);

            let claimMessage = null;
            if (claimTokensFromProof.length > 0) {
                try {
                    const batch = await reclamarInformesServicio(claimTokensFromProof);
                    claimPersistedRef.current = true;
                    await clearPendingInformeClaimIntent();
                    const exitosos = batch?.exitosos ?? 0;
                    const total = batch?.total ?? claimTokensFromProof.length;
                    const restantes = Math.max(0, informesPendientes.length - exitosos);
                    if (exitosos > 0 && restantes > 0) {
                        claimMessage =
                            `Vehículo creado. Se vincularon ${exitosos} servicio(s). ` +
                            `Quedan ${restantes} por vincular: usa el QR o enlace del taller.`;
                    } else if (exitosos > 0) {
                        claimMessage =
                            total === 1
                                ? 'Vehículo creado. El servicio del taller quedó vinculado.'
                                : `Vehículo creado. Se vincularon ${exitosos} de ${total} servicio(s).`;
                    } else {
                        claimMessage =
                            'Vehículo creado. No se pudieron vincular los informes. Escanea el QR del taller.';
                    }
                    const failedTokens = (batch?.resultados || [])
                        .filter((item) => !item.success)
                        .map((item) => item.token)
                        .filter(Boolean);
                    if (failedTokens.length) {
                        await savePendingInformeClaimIntent({
                            tokens: failedTokens,
                            vehicleData: { ...vehicleData, patente },
                        });
                    }
                } catch (claimErr) {
                    console.warn('Reclamo batch de informes post-registro:', claimErr);
                    claimMessage = claimErr?.response?.data?.error
                        || 'Vehículo creado. Escanea el QR del informe para vincular el servicio.';
                    await savePendingInformeClaimIntent({
                        tokens: claimTokensFromProof,
                        vehicleData: { ...vehicleData, patente },
                    });
                }
            } else if (informesPendientes.length > 0) {
                claimMessage =
                    'Vehículo creado. Hay servicios de taller pendientes: ' +
                    'escanea el QR o abre el enlace del informe para vincularlos.';
            }

            // Invalidar listas (UserPanel / CrearSolicitud usan ['userVehicles']; hooks usan ['vehicles', userId])
            queryClient.invalidateQueries({ queryKey: ['userVehicles'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });

            const pendingScheduleIntent = route.params?.pendingScheduleIntent;
            if (pendingScheduleIntent?.provider && pendingScheduleIntent?.servicio && created?.id) {
              navigateCrearSolicitudConProveedorYServicio(navigation, {
                vehicle: created,
                provider: pendingScheduleIntent.provider,
                providerType: pendingScheduleIntent.providerType,
                servicio: pendingScheduleIntent.servicio,
              });
              return;
            }

            if (Platform.OS === 'web') {
                showAlert('Éxito', claimMessage || 'Vehículo agregado a tu garaje.');
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Main', {
                        screen: 'MisVehiculos',
                        params: { refresh: true }
                    });
                }
            } else {
                Alert.alert('Éxito', claimMessage || 'Vehículo agregado a tu garaje.', [
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
        setImageAsset(null);
        setMaintenanceSelections({});
        setInformesPendientes([]);
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
            const checklist = compararKmConChecklist(cleaned, informesPendientes);
            setKmValidationHint(mergeKmValidationHints(v, checklist));
        },
        [vehicleData, informesPendientes],
    );

    const aplicarKmSugerido = useCallback(() => {
        if (kmValidationHint?.km_sugerido) {
            const sugerido = String(kmValidationHint.km_sugerido);
            setKilometraje(sugerido);
            const v = validarKilometrajeContraSii(sugerido, vehicleData);
            const checklist = compararKmConChecklist(sugerido, informesPendientes);
            setKmValidationHint(mergeKmValidationHints(v, checklist));
        }
    }, [kmValidationHint, vehicleData, informesPendientes]);

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
                        size={20}
                        color={COLORS.text.secondary}
                        strokeWidth={1.75}
                        style={styles.warningIcon}
                    />
                    <View style={styles.warningCardBody}>
                        <Text style={styles.warningText}>
                            <Text style={styles.warningTextStrong}>Aviso: </Text>
                            No hay valor de mercado registrado para este vehículo. Ingresa un valor referencial aproximado.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowValorMercadoAlert(false)}
                        style={styles.warningDismiss}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <X size={18} color={COLORS.text.tertiary} strokeWidth={1.75} />
                    </TouchableOpacity>
                </View>
            )}
            <PaperCard style={styles.formSectionCard}>
                <Text style={styles.sectionLabel}>Valor de Mercado Referencial</Text>
                <View
                    style={[
                        styles.fieldInputWrapper,
                        valorMercadoFocused && styles.fieldInputWrapperFocused,
                    ]}
                >
                    <Text style={[styles.fieldSuffix, styles.currencyPrefix]}>$</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={valorMercado}
                        onChangeText={(text) => setValorMercado(text.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.text.hint}
                        onFocus={() => setValorMercadoFocused(true)}
                        onBlur={() => setValorMercadoFocused(false)}
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
                    {step === 'search' && (() => {
                        // NOTE: On web, TouchableWithoutFeedback can swallow click/focus for TextInput.
                        const searchField = (
                            <View style={styles.centerWrapper}>
                                <Text style={styles.instructionText}>
                                    Ingresa la patente de tu vehículo para buscar sus datos automáticamente.
                                </Text>

                                <View style={styles.searchCardShell}>
                                    <View
                                        style={[
                                            styles.patenteInputContainer,
                                            patenteFocused && styles.patenteInputContainerFocused,
                                        ]}
                                    >
                                        <View style={styles.patenteDecorator}>
                                            <Text style={styles.patenteFlag}>🇨🇱</Text>
                                        </View>
                                        <TextInput
                                            ref={patenteInputRef}
                                            style={styles.patenteInput}
                                            placeholder="AB-CD-12"
                                            placeholderTextColor={COLORS.text.hint}
                                            value={patente}
                                            onChangeText={(t) => setPatente(formatPatente(t))}
                                            maxLength={6}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            returnKeyType="search"
                                            onSubmitEditing={handleSearch}
                                            onFocus={() => setPatenteFocused(true)}
                                            onBlur={() => setPatenteFocused(false)}
                                            accessibilityLabel="Patente del vehículo"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.searchButtonWrap, loading && styles.disabledButton]}
                                        onPress={handleSearch}
                                        disabled={loading}
                                        accessibilityRole="button"
                                        accessibilityLabel="Buscar patente"
                                        activeOpacity={0.85}
                                    >
                                        <PrimaryGradientFill style={styles.searchButton}>
                                            {loading ? (
                                                <ActivityIndicator color={COLORS.text.onPrimary} />
                                            ) : (
                                                <Search size={22} color={COLORS.text.onPrimary} strokeWidth={1.75} />
                                            )}
                                        </PrimaryGradientFill>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );

                        return Platform.OS === 'web' ? (
                            searchField
                        ) : (
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                {searchField}
                            </TouchableWithoutFeedback>
                        );
                    })()}

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

                            {informesPendientes.length > 0 ? (
                                <View style={styles.informesPendientesCard}>
                                    <View style={styles.informesPendientesHeader}>
                                        <View style={styles.informesPendientesIconWrap}>
                                            <ClipboardList
                                                size={20}
                                                color={COLORS.brand?.magenta || COLORS.primary[500]}
                                                strokeWidth={2}
                                            />
                                        </View>
                                        <View style={styles.informesPendientesTitleCol}>
                                            <Text style={styles.informesPendientesEyebrow}>
                                                Historial en la red
                                            </Text>
                                            <Text style={styles.informesPendientesTitle}>
                                                {informesPendientes.length === 1
                                                    ? '1 servicio con checklist'
                                                    : `${informesPendientes.length} servicios con checklist`}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.informesPendientesBody}>
                                        {claimTokensFromProof.length > 0
                                            ? 'Al registrar el auto, ese servicio del taller quedará en el historial del vehículo. La salud se calcula aparte, con lo que indiques abajo o con servicios futuros en la app.'
                                            : 'Para guardar estos servicios en el historial necesitas el QR o el enlace del informe del taller. La patente sola no alcanza: así protegemos al dueño real del auto.'}
                                    </Text>
                                    {informesPendientes.map((informe) => (
                                        <View
                                            key={informe.id || `${informe.taller_nombre}-${informe.fecha_servicio}`}
                                            style={styles.informePendienteRow}
                                        >
                                            <Text style={styles.informePendienteTaller} numberOfLines={1}>
                                                {informe.taller_nombre || 'Taller Mecanimovil'}
                                            </Text>
                                            <Text style={styles.informePendienteMeta}>
                                                {informe.fecha_servicio
                                                    ? new Date(informe.fecha_servicio).toLocaleDateString('es-CL')
                                                    : 'Servicio reciente'}
                                                {informe.kilometraje_servicio
                                                    ? ` · ${Number(informe.kilometraje_servicio).toLocaleString('es-CL')} km`
                                                    : ''}
                                            </Text>
                                        </View>
                                    ))}
                                    {claimTokensFromProof.length > 0 ? (
                                        <View style={styles.informesProofBadge}>
                                            <CircleCheck
                                                size={16}
                                                color={COLORS.success[600]}
                                                strokeWidth={2}
                                            />
                                            <Text style={styles.informesProofBadgeText}>
                                                {claimTokensFromProof.length === 1
                                                    ? '1 informe listo para vincular al registrar'
                                                    : `${claimTokensFromProof.length} informes listos para vincular al registrar`}
                                            </Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.scanInformeCta}
                                            onPress={() =>
                                                navigation.navigate(ROUTES.ESCANEAR_INFORME_SERVICIO)
                                            }
                                            activeOpacity={0.85}
                                            accessibilityRole="button"
                                            accessibilityLabel="Escanear QR del informe de servicio"
                                        >
                                            <QrCode
                                                size={18}
                                                color={COLORS.brand?.magenta || COLORS.primary[500]}
                                                strokeWidth={2.25}
                                            />
                                            <Text style={styles.scanInformeCtaText}>
                                                Escanear QR del informe
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : null}

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

                                <View style={styles.specsList}>
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Motor</Text>
                                        <Text style={styles.specValue}>{vehicleData.motor || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Color</Text>
                                        <Text style={styles.specValue}>{vehicleData.color || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.specRow, !(hayMileageSii && mileageSiiRegistro != null) && styles.specRowLast]}>
                                        <Text style={styles.specLabel}>VIN</Text>
                                        <Text
                                            style={[styles.specValue, styles.specValueVin]}
                                            numberOfLines={1}
                                            ellipsizeMode="middle"
                                        >
                                            {vehicleData.vin || 'N/A'}
                                        </Text>
                                    </View>
                                    {hayMileageSii && mileageSiiRegistro != null ? (
                                        <View style={[styles.specRow, styles.specRowLast]}>
                                            <Text style={styles.specLabel}>Km registro (SII)</Text>
                                            <Text style={styles.specValueSii}>
                                                {mileageSiiRegistro.toLocaleString('es-CL')} km
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.engineSelectBlock}>
                                    <Text style={styles.engineSelectTitle}>Tipo de motor</Text>
                                    <Text style={styles.engineSelectHint}>
                                        Elige el combustible o propulsión de tu auto. Esto ajusta el checklist de mantenimientos.
                                    </Text>
                                    <View
                                        style={styles.engineToggleGrid}
                                        accessibilityRole="radiogroup"
                                        accessibilityLabel="Tipo de motor del vehículo"
                                    >
                                        {ENGINE_OPTIONS.map((opt) => {
                                            const active = selectedEngineType === opt.id;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.id}
                                                    style={[
                                                        styles.engineToggle,
                                                        active && styles.engineToggleActive,
                                                    ]}
                                                    onPress={() => setSelectedEngineType(opt.id)}
                                                    activeOpacity={0.85}
                                                    accessibilityRole="radio"
                                                    accessibilityState={{ checked: active }}
                                                    accessibilityLabel={opt.label}
                                                >
                                                    {active ? (
                                                        <PrimaryGradientFill style={styles.engineToggleFill}>
                                                            <Text style={[styles.engineToggleText, styles.engineToggleTextActive]}>
                                                                {opt.label}
                                                            </Text>
                                                        </PrimaryGradientFill>
                                                    ) : (
                                                        <View style={styles.engineToggleInner}>
                                                            <Text style={styles.engineToggleText}>{opt.label}</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
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
                                <View
                                    style={[
                                        styles.fieldInputWrapper,
                                        kmFocused && styles.fieldInputWrapperFocused,
                                        kmValidationHint?.tipo === 'error' && styles.fieldInputWrapperError,
                                    ]}
                                >
                                    <TextInput
                                        style={[
                                            styles.fieldInput,
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
                                        placeholderTextColor={COLORS.text.hint}
                                        onFocus={() => setKmFocused(true)}
                                        onBlur={() => setKmFocused(false)}
                                    />
                                    <Text style={styles.fieldSuffix}>km</Text>
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
                                        {claimTokensFromProof.length > 0 || informesPendientes.length > 0 ? (
                                            <View style={styles.officialNoticeBoxNeutral}>
                                                <Info size={16} color={COLORS.text.secondary} strokeWidth={2} />
                                                <Text style={styles.officialNoticeTextNeutral}>
                                                    El informe del taller se guarda en el historial del vehículo.
                                                    Lo que indiques aquí alimenta la salud estimada; no se pisa
                                                    con el checklist externo.
                                                </Text>
                                            </View>
                                        ) : null}
                                        <View style={styles.maintenanceItems}>
                                            {checklistItems.map((item) => {
                                                const handlers = maintenanceItemHandlers.get(item.id);
                                                const isOfficial = componentesOficialesIds.includes(Number(item.id));
                                                return (
                                                    <MaintenanceChecklistItem
                                                        key={item.id}
                                                        item={item}
                                                        isChecked={maintenanceSelections[item.id] !== undefined}
                                                        kmVal={maintenanceSelections[item.id]}
                                                        isWideLayout={isWideLayout}
                                                        onToggle={handlers?.onToggle}
                                                        onKmChange={handlers?.onKmChange}
                                                        readOnly={isOfficial}
                                                        readOnlyLabel={isOfficial ? 'Ya registrado oficialmente ✓' : undefined}
                                                    />
                                                );
                                            })}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setMaintenanceSelections((prev) => {
                                                    const next = {};
                                                    componentesOficialesIds.forEach((id) => {
                                                        if (prev[id] !== undefined) next[id] = prev[id];
                                                    });
                                                    return next;
                                                });
                                            }}
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
                                <CircleAlert size={20} color={COLORS.text.secondary} strokeWidth={1.75} />
                                <Text style={styles.warningText}>
                                    <Text style={styles.warningTextStrong}>Importante: </Text>
                                    Para garantizar la veracidad de la información, los datos del vehículo no podrán ser editados después del registro.
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
        padding: SPACING.lg,
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
        ...TYPOGRAPHY.styles.h5,
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
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        maxWidth: '90%',
    },
    searchCardShell: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 420,
        gap: SPACING.sm,
    },
    patenteInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.background.paper,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.input.md,
        ...SHADOWS.none,
    },
    patenteInputContainerFocused: {
        borderColor: COLORS.neutral.gray[700],
    },
    patenteDecorator: {
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    patenteFlag: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        lineHeight: TYPOGRAPHY.fontSize['2xl'],
    },
    patenteInput: {
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.text.primary,
        letterSpacing: 2,
        flex: 1,
        paddingVertical: 0,
        textTransform: 'uppercase',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
    },
    searchButtonWrap: {
        width: 52,
        height: 52,
        borderRadius: BORDERS.radius.button.md,
        overflow: 'hidden',
    },
    searchButton: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
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
        ...TYPOGRAPHY.styles.h3,
        color: COLORS.text.primary,
        marginTop: SPACING.xs,
    },
    successHeader: {
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
        marginTop: SPACING.xs,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.success[50],
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs + 2,
        borderRadius: BORDERS.radius.pill,
        gap: SPACING.xs,
    },
    successBadgeText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.success[700],
    },
    informesPendientesCard: {
        marginBottom: SPACING.md,
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: BORDERS.radius.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.selection?.border || COLORS.border.light,
        backgroundColor: COLORS.selection?.background || COLORS.base?.soft || COLORS.background.paper,
    },
    informesPendientesHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    informesPendientesIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background.paper,
        alignItems: 'center',
        justifyContent: 'center',
    },
    informesPendientesTitleCol: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    informesPendientesEyebrow: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.secondary,
    },
    informesPendientesTitle: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.primary,
    },
    informesPendientesBody: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
    informePendienteRow: {
        paddingTop: SPACING.sm,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.selection?.border || COLORS.border.light,
        gap: 2,
    },
    informePendienteTaller: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    informePendienteMeta: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    informesProofBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.xs,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.success[50] || COLORS.background.paper,
    },
    informesProofBadgeText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.success[700] || COLORS.text.primary,
        flex: 1,
    },
    scanInformeCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        minHeight: 48,
        marginTop: SPACING.xs,
        borderRadius: BORDERS.radius.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.brand?.magenta || COLORS.primary[500],
        backgroundColor: COLORS.background.paper,
        paddingHorizontal: SPACING.md,
    },
    scanInformeCtaText: {
        ...TYPOGRAPHY.styles.button,
        color: COLORS.brand?.magenta || COLORS.primary[500],
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    vehicleCard: {
        marginBottom: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
        paddingBottom: SPACING.md,
        marginBottom: SPACING.md,
    },
    brandText: {
        ...TYPOGRAPHY.styles.h6,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
    },
    modelText: {
        ...TYPOGRAPHY.styles.h2,
        color: COLORS.text.primary,
        marginTop: SPACING.xxs,
    },
    yearText: {
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.secondary,
        marginTop: SPACING.xxs,
    },
    specsList: {
        gap: 0,
    },
    specRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
        minHeight: 44,
    },
    specRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    specLabel: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.tertiary,
        flexShrink: 0,
    },
    specValue: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.primary,
        textAlign: 'right',
        flex: 1,
    },
    specValueVin: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    specValueSii: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.primary[700],
        textAlign: 'right',
        flex: 1,
    },
    carIconContainer: {
        width: 52,
        height: 52,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    kmReferenciaSii: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    kmReferenciaSiiMuted: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.sm,
    },
    kmInputError: {
        color: COLORS.error[600],
    },
    kmHintError: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.error[600],
    },
    kmHintAviso: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.warning[700],
    },
    kmHintBlock: {
        marginTop: SPACING.sm,
        gap: SPACING.xs,
    },
    kmSugeridoButton: {
        alignSelf: 'flex-start',
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDERS.radius.pill,
        backgroundColor: COLORS.primary[50],
    },
    kmSugeridoButtonText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.primary[700],
    },
    engineSelectBlock: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    engineSelectTitle: {
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    engineSelectHint: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginBottom: SPACING.md,
    },
    engineToggleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    engineToggle: {
        flexGrow: 1,
        flexBasis: '46%',
        minHeight: 48,
        borderRadius: BORDERS.radius.button.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.main,
        backgroundColor: COLORS.background.paper,
        overflow: 'hidden',
    },
    engineToggleActive: {
        borderColor: COLORS.primary[500],
        padding: 0,
    },
    engineToggleFill: {
        flex: 1,
        minHeight: 48,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    engineToggleInner: {
        flex: 1,
        minHeight: 48,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    engineToggleText: {
        ...TYPOGRAPHY.styles.button,
        color: COLORS.text.primary,
    },
    engineToggleTextActive: {
        color: COLORS.text.onPrimary,
    },
    formSectionCard: {
        marginBottom: SPACING.md,
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
        marginBottom: SPACING.md,
    },
    maintenanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    maintenanceSubtitle: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginTop: SPACING.xxs,
        maxWidth: 520,
    },
    maintenanceList: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    maintenanceQuestion: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    maintenanceHint: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginBottom: SPACING.md,
    },
    officialNoticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
        padding: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.success[50] || COLORS.background.paper,
    },
    officialNoticeText: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.success[700] || COLORS.text.primary,
        flex: 1,
    },
    officialNoticeBoxNeutral: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
        padding: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.neutral.gray[50] || COLORS.background.paper,
    },
    officialNoticeTextNeutral: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        flex: 1,
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
        borderColor: COLORS.border.main,
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
    },
    checkboxCheckedWrap: {
        borderColor: COLORS.primary[500],
        overflow: 'hidden',
        padding: 0,
    },
    checkboxFill: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    maintenanceLabel: {
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.primary,
    },
    maintenanceLabelWrap: {
        flex: 1,
        gap: 2,
    },
    maintenanceOfficialBadge: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.success.main,
        fontWeight: '600',
    },
    maintenanceItemReadOnly: {
        opacity: 0.92,
        backgroundColor: withOpacity(COLORS.success.main, 0.06),
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
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xxs,
    },
    maintenanceKmInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.input.md,
        paddingHorizontal: SPACING.md,
        minHeight: 48,
    },
    maintenanceKmInputWrapperWide: {
        width: 200,
        maxWidth: '100%',
    },
    maintenanceKmInput: {
        flex: 1,
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.primary,
        paddingVertical: Platform.OS === 'web' ? SPACING.xs : SPACING.sm,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    maintenanceKmSuffix: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.tertiary,
        marginLeft: SPACING.xxs,
    },
    skipLink: {
        marginTop: SPACING.xs,
        paddingVertical: SPACING.xs,
    },
    skipLinkText: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.primary[600],
    },
    sectionLabel: {
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    fieldInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        borderRadius: BORDERS.radius.input.md,
        paddingHorizontal: SPACING.md,
        height: 52,
    },
    fieldInputWrapperFocused: {
        borderColor: COLORS.neutral.gray[700],
    },
    fieldInputWrapperError: {
        borderColor: COLORS.border.error,
        backgroundColor: COLORS.background.error,
    },
    fieldInput: {
        flex: 1,
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.text.primary,
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
    },
    fieldSuffix: {
        ...TYPOGRAPHY.styles.body,
        color: COLORS.text.tertiary,
    },
    saveButton: {
        marginBottom: SPACING.md,
    },
    retryLink: {
        alignItems: 'center',
        padding: SPACING.sm,
    },
    retryText: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.secondary,
    },
    photoSection: {
        marginBottom: SPACING.md,
    },
    photoUpload: {
        width: '100%',
        height: 200,
        backgroundColor: COLORS.neutral.gray[50],
        borderRadius: BORDERS.radius.card.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.main,
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
        gap: SPACING.sm,
    },
    photoText: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.primary[600],
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: SPACING.md,
        right: SPACING.md,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.65),
        width: 36,
        height: 36,
        borderRadius: BORDERS.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.neutral.gray[50],
        padding: SPACING.md,
        borderRadius: BORDERS.radius.md,
        marginBottom: SPACING.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        gap: SPACING.sm,
    },
    warningCardRow: {
        alignItems: 'flex-start',
    },
    warningText: {
        flex: 1,
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    warningTextStrong: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
});

export default VehicleRegistrationScreen;
