import React, { useState, useRef, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // Lucide substitute
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../design-system/tokens/colors';
import * as vehicleService from '../../services/vehicle';
import Button from '../../components/base/Button/Button';
import Input from '../../components/base/Input/Input'; // Reused for kilometraje
import * as ImagePicker from 'expo-image-picker'; // New import
import { useQueryClient } from '@tanstack/react-query'; // For invalidation

// Utility
const formatPatente = (text) => {
    // Only alphanumeric, max 6, uppercase
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
};

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
    const queryClient = useQueryClient();

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
            const data = await vehicleService.getVehicleByPatente(patente);

            if (data && (data.marca || data.marca_nombre)) {
                setVehicleData(data);
                setStep('success');
            } else {
                Alert.alert(
                    'Vehículo no encontrado',
                    'No encontramos información para esta patente. ¿Deseas ingresarlo manualmente?',
                    [
                        { text: 'Intentar de nuevo', style: 'cancel' },
                        { text: 'Ingreso Manual', onPress: () => handleManualEntry() }
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
                    { text: 'Ingreso Manual', onPress: () => handleManualEntry() }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleManualEntry = () => {
        // Navigate back to MisVehiculos but maybe with a param to open the OLD modal?
        // Or implement manual flow here? The requirement says "fallback al formulario antiguo".
        // Simplest: Go back with a param.
        navigation.navigate('MisVehiculos', { promptManual: true, prefillPatente: patente });
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
        if (!kilometraje.trim()) {
            Alert.alert('Falta Kilometraje', 'Por favor ingresa el kilometraje actual del vehículo.');
            return;
        }

        setSaving(true);
        try {
            // Prepare FormData for creation with image
            // Normalize fuel type
            let tipoMotor = vehicleData.tipo_motor || 'Gasolina';
            if (tipoMotor.toUpperCase() === 'BENCINA') tipoMotor = 'GASOLINA';
            if (tipoMotor.toUpperCase() === 'DIESEL' || tipoMotor.toUpperCase() === 'DIÉSEL') tipoMotor = 'DIESEL';

            const formData = new FormData();

            // Append explicit fields
            formData.append('patente', patente);

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
            formData.append('tipo_motor', tipoMotor);

            // Optional fields - Strict checks
            if (vehicleData.cilindraje) formData.append('cilindraje', vehicleData.cilindraje);
            if (vehicleData.color) formData.append('color', vehicleData.color);
            if (vehicleData.vin) formData.append('vin', vehicleData.vin);
            if (vehicleData.motor) formData.append('numero_motor', vehicleData.motor); // Mapping backend field 'numero_motor'
            if (vehicleData.transmision) formData.append('transmision', vehicleData.transmision);
            if (vehicleData.version) formData.append('version', vehicleData.version);
            if (vehicleData.puertas) formData.append('puertas', String(vehicleData.puertas));
            if (vehicleData.mes_revision_tecnica) formData.append('mes_revision_tecnica', vehicleData.mes_revision_tecnica);

            // Append Image if exists
            if (image) {
                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('foto', { uri: image, name: filename, type });
            }

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
            Alert.alert('Error', 'No se pudo guardar el vehículo. Inténtalo más tarde.');
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
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { marginTop: insets.top }]}>
                <Text style={styles.headerTitle}>Nuevo Vehículo</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={COLORS.base.inkBlack} />
                </TouchableOpacity>
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

                                <View style={styles.searchCard}>
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
                                <TouchableOpacity onPress={handleManualEntry} style={styles.manualLink}>
                                    <Text style={styles.manualLinkText}>¿No tienes la patente? Ingreso Manual</Text>
                                </TouchableOpacity>
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
                            <View style={styles.vehicleCard}>
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
                                        <Text style={styles.gridValue}>{vehicleData.tipo_motor || 'N/A'}</Text>
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
                            </View>

                            {/* Kilometraje Input */}
                            <View style={styles.kilometerSection}>
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
                            </View>

                            {/* Photo Upload Section */}
                            <View style={styles.photoSection}>
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
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Title centered
        height: 60,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        padding: 4,
    },
    keyboardContainer: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
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
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: '80%',
    },
    searchCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24, // Rounder as requested
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        width: '100%',
        alignItems: 'center',
    },
    patenteInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
    },
    patenteDecorator: {
        width: 24,
        height: 16,
        backgroundColor: '#FFDD00', // Yellow strip simulation? Or Chile flag
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2,
    },
    patenteFlag: {
        fontSize: 10,
    },
    patenteInput: {
        fontSize: 24,
        fontWeight: '800', // Bold/Black
        color: '#1E293B',
        letterSpacing: 2,
        flex: 1,
        textTransform: 'uppercase',
    },
    searchButton: {
        backgroundColor: COLORS.primary[600],
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
    manualLink: {
        marginTop: 32,
        padding: 12,
    },
    manualLinkText: {
        color: COLORS.primary[600],
        fontWeight: '600',
        fontSize: 14,
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
        backgroundColor: '#DCFCE7', // Green 100
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    successBadgeText: {
        color: '#15803D', // Green 700
        fontWeight: '700',
        fontSize: 14,
    },
    vehicleCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 2,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 20,
        marginBottom: 20,
    },
    brandText: {
        fontSize: 14,
        textTransform: 'uppercase',
        color: '#64748B',
        fontWeight: '700',
        letterSpacing: 1,
    },
    modelText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 4,
    },
    yearText: {
        fontSize: 18,
        color: '#64748B',
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
        color: '#94A3B8',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    monospace: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
    },
    kilometerSection: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    kmInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 4,
        height: 64,
    },
    kmInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
    },
    kmSuffix: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#0F172A', // Slate 900
        borderRadius: 16,
        height: 56,
        marginBottom: 16,
    },
    retryLink: {
        alignItems: 'center',
        padding: 12,
    },
    retryText: {
        color: '#64748B',
        fontWeight: '600',
    },
    // PHOTO STYLES
    photoSection: {
        marginBottom: 32,
    },
    photoUpload: {
        width: '100%',
        height: 200,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        color: COLORS.primary[500],
        fontWeight: '600',
        fontSize: 16,
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: COLORS.base.inkBlack,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    }
});

export default VehicleRegistrationScreen;
