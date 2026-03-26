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
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Lucide substitute
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { COLORS } from '../../design-system/tokens/colors';
import * as vehicleService from '../../services/vehicle';
import { useQuery } from '@tanstack/react-query';
import Button from '../../components/base/Button/Button';
import * as ImagePicker from 'expo-image-picker'; // New import
import { useQueryClient } from '@tanstack/react-query'; // For invalidation

// Utility
const formatPatente = (text) => {
    // Only alphanumeric, max 6, uppercase
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
};

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});
const BLUR_INTENSITY = Platform.OS === 'ios' ? 30 : 0;
const ENGINE_OPTIONS = ['GASOLINA', 'DIESEL', 'HIBRIDO', 'ELECTRICO'];

const GlassCard = ({ children, style }) => (
    <View style={[styles.glassOuter, style]}>
        <BlurView
            intensity={BLUR_INTENSITY}
            tint="dark"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
        <View style={[styles.glassInner, { backgroundColor: GLASS_BG }]}>
            {children}
        </View>
    </View>
);

const VehicleRegistrationScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

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

    const handleSearch = async () => {
        if (patente.length < 6) {
            Alert.alert('Patente inválida', 'La patente debe tener 6 caracteres.');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);
        try {
            // 1. Check if patente is already registered in the system
            const check = await vehicleService.verificarPatenteRegistrada(patente);
            if (check?.registered) {
                if (check.owner === 'self') {
                    Alert.alert(
                        'Patente ya registrada',
                        'Este vehículo ya se encuentra en tu garaje. Puedes verlo desde tu panel principal.',
                        [{ text: 'Entendido' }],
                    );
                } else {
                    Alert.alert(
                        'Patente no disponible',
                        'Esta patente ya se encuentra registrada por otro usuario en el sistema. Si crees que esto es un error, contáctanos a soporte.',
                        [{ text: 'Entendido' }],
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

                setStep('success');
            } else {
                Alert.alert(
                    'Vehículo no encontrado',
                    'No encontramos información para esta patente. Intenta con otra o revisa la patente ingresada.',
                    [
                        { text: 'Intentar de nuevo', style: 'cancel' },
                    ]
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert(
                'Error',
                'Hubo un problema consultando la patente. Intenta nuevamente o usa el ingreso manual.',
                [
                    { text: 'OK', style: 'cancel' },
                ]
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
            Alert.alert('Falta información', 'Por favor ingresa el kilometraje actual.');
            return;
        }

        if (!selectedEngineType) {
            Alert.alert('Falta información', 'Por favor selecciona el tipo de combustible.');
            return;
        }

        // Double-check patente availability before saving (race-condition guard)
        try {
            const recheck = await vehicleService.verificarPatenteRegistrada(patente);
            if (recheck?.registered && recheck.owner !== 'self') {
                Alert.alert(
                    'Patente no disponible',
                    'Esta patente fue registrada por otro usuario mientras completabas el formulario. Intenta con otra patente.',
                    [{ text: 'Entendido', onPress: handleReset }],
                );
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
                Alert.alert('Falta información', `Ingresa los km del odómetro cuando cambiaste "${item?.nombre || 'el componente'}".`);
                return;
            }
            const km = typeof kmVal === 'number' ? kmVal : parseInt(String(kmVal), 10);
            if (isNaN(km) || km < 0) {
                Alert.alert('Dato inválido', 'Los km deben ser un número mayor o igual a 0.');
                return;
            }
            if (km > kmActual) {
                Alert.alert('Dato inválido', `Los km del cambio no pueden ser mayores al kilometraje actual del auto (${kmActual.toLocaleString()} km).`);
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

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });

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

        } catch (error) {
            console.error(error);
            const status = error?.response?.status;
            const detail = error?.response?.data?.patente?.[0];
            if (status === 409 || (detail && detail.toLowerCase().includes('registrada'))) {
                Alert.alert(
                    'Patente no disponible',
                    detail || 'Esta patente ya se encuentra registrada por otro usuario.',
                    [{ text: 'Entendido', onPress: handleReset }],
                );
            } else {
                Alert.alert('Error', 'No se pudo guardar el vehículo. Inténtalo más tarde.');
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
        setImage(null);
        setMaintenanceSelections({});
    };

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient colors={['#030712', '#0a0f1a', '#030712']} style={StyleSheet.absoluteFill} />
                <View style={styles.blobEmerald} />
                <View style={styles.blobIndigo} />
                <View style={styles.blobCyan} />
            </View>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { marginTop: insets.top + 4 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="chevron-back" size={22} color="#E5E7EB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nuevo Vehículo</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Main Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardContainer}
            >
                <View style={styles.contentContainer}>

                    {/* SEARCH STATE */}
                    {step === 'search' && (
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
                                            placeholderTextColor="#CBD5E1"
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
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Ionicons name="search" size={24} color="white" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    )}

                    {/* SUCCESS STATE */}
                    {step === 'success' && vehicleData && (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.successScroll}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            <View style={styles.successHeader}>
                                <View style={styles.successBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="white" />
                                    <Text style={styles.successBadgeText}>Vehículo Identificado</Text>
                                </View>
                            </View>

                            {/* Data Card */}
                            <GlassCard style={styles.vehicleCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.brandText}>{vehicleData.marca_nombre || 'Marca'}</Text>
                                        <Text style={styles.modelText}>{vehicleData.modelo_nombre || 'Modelo'}</Text>
                                        <Text style={styles.yearText}>{vehicleData.year || vehicleData.anio || '----'}</Text>
                                    </View>
                                    <View style={styles.carIconContainer}>
                                        <Ionicons name="car-sport" size={48} color={COLORS.primary[100]} />
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
                            </GlassCard>

                            {/* Kilometraje Input */}
                            <GlassCard style={styles.kilometerSection}>
                                <Text style={styles.sectionLabel}>Kilometraje Actual</Text>
                                <View style={styles.kmInputWrapper}>
                                    <TextInput
                                        style={styles.kmInput}
                                        value={kilometraje}
                                        onChangeText={text => setKilometraje(text.replace(/[^0-9]/g, ''))}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor="#94A3B8"
                                    />
                                    <Text style={styles.kmSuffix}>km</Text>
                                </View>
                            </GlassCard>

                            {/* Mantenimientos Recientes (Opcional) */}
                            <GlassCard style={styles.maintenanceSection}>
                                <TouchableOpacity
                                    style={styles.maintenanceHeader}
                                    onPress={() => setMaintenanceExpanded(!maintenanceExpanded)}
                                    activeOpacity={0.7}
                                >
                                    <View>
                                        <Text style={styles.sectionLabel}>Mantenimientos Recientes (Opcional)</Text>
                                        <Text style={styles.maintenanceSubtitle}>Indica los km que tenía el auto cuando cambiaste cada pieza.</Text>
                                    </View>
                                    <Ionicons name={maintenanceExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="rgba(255,255,255,0.6)" />
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
                                                        {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
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
                                                                placeholderTextColor="#94A3B8"
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
                            </GlassCard>

                            {/* Photo Upload Section */}
                            <GlassCard style={styles.photoSection}>
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
                                            <Ionicons name="pencil" size={16} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </GlassCard>

                            {/* Warning Message */}
                            <View style={styles.warningCard}>
                                <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
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
        backgroundColor: '#030712',
    },
    blobEmerald: {
        position: 'absolute',
        top: -80,
        left: -70,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(16,185,129,0.12)',
    },
    blobIndigo: {
        position: 'absolute',
        bottom: 90,
        right: -40,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(99,102,241,0.10)',
    },
    blobCyan: {
        position: 'absolute',
        top: 280,
        right: 36,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(6,182,212,0.08)',
    },
    glassOuter: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    glassInner: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
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
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    // SEARCH STYLES
    centerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -60, // visual offset
    },
    instructionText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: '90%',
    },
    searchCardShell: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 4,
        width: '100%',
        alignItems: 'center',
        padding: 8,
        borderRadius: 24,
    },
    patenteInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        backgroundColor: 'rgba(2,6,23,0.52)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
        borderRadius: 16,
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
        fontWeight: '800',
        color: '#F9FAFB',
        letterSpacing: 3,
        flex: 1,
        textTransform: 'uppercase',
    },
    searchButton: {
        backgroundColor: '#6366F1',
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    disabledButton: {
        opacity: 0.7,
    },

    // SUCCESS STYLES
    successScroll: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 12,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16,185,129,0.22)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    successBadgeText: {
        color: '#6EE7B7',
        fontWeight: '700',
        fontSize: 14,
    },
    vehicleCard: {
        marginBottom: 32,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        paddingBottom: 20,
        marginBottom: 20,
    },
    brandText: {
        fontSize: 14,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '700',
        letterSpacing: 1,
    },
    modelText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#F9FAFB',
        marginTop: 4,
    },
    yearText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    gridItem: {
        width: '45%',
    },
    gridLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E5E7EB',
    },
    fuelChips: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 4,
    },
    fuelChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    fuelChipActive: {
        backgroundColor: COLORS.primary[600],
        borderColor: COLORS.primary[500],
    },
    fuelChipText: {
        color: 'rgba(255,255,255,0.65)',
        fontWeight: '700',
        fontSize: 10,
    },
    fuelChipTextActive: {
        color: '#FFFFFF',
    },
    monospace: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
    },
    kilometerSection: {
        marginBottom: 32,
    },
    maintenanceSection: {
        marginBottom: 32,
    },
    maintenanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    maintenanceSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    maintenanceList: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    maintenanceQuestion: {
        fontSize: 14,
        color: '#E5E7EB',
        marginBottom: 8,
    },
    maintenanceHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        lineHeight: 18,
        marginBottom: 12,
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
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.35)',
        marginRight: 12,
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
        color: '#E5E7EB',
    },
    kmInputInline: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        borderRadius: 8,
        paddingHorizontal: 10,
        width: 100,
    },
    kmInputSmall: {
        flex: 1,
        fontSize: 14,
        color: '#F9FAFB',
        paddingVertical: 6,
    },
    kmSuffixSmall: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.45)',
        marginLeft: 4,
    },
    skipLink: {
        marginTop: 8,
        paddingVertical: 8,
    },
    skipLinkText: {
        fontSize: 14,
        color: '#A5B4FC',
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
        marginBottom: 12,
    },
    kmInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 4,
        height: 64,
    },
    kmInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    kmSuffix: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        height: 56,
        marginBottom: 16,
    },
    retryLink: {
        alignItems: 'center',
        padding: 12,
    },
    retryText: {
        color: 'rgba(255,255,255,0.55)',
        fontWeight: '600',
    },
    // PHOTO STYLES
    photoSection: {
        marginBottom: 32,
    },
    photoUpload: {
        width: '100%',
        height: 200,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
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
        color: '#A5B4FC',
        fontWeight: '600',
        fontSize: 16,
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(2,6,23,0.75)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    warningCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(245,158,11,0.12)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    warningText: {
        flex: 1,
        color: '#FCD34D',
        fontSize: 13,
        lineHeight: 18,
    },
    warningTextStrong: {
        fontWeight: '700',
    }
});

export default VehicleRegistrationScreen;
