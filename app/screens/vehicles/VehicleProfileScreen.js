import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, ROUTES, LAYOUT, SPACING, FONT_SIZES, SHADOWS, BORDERS } from '../../utils/constants';
import Button from '../../components/base/Button/Button';
import Card from '../../components/base/Card/Card';
import * as vehicleService from '../../services/vehicle';

const { width } = Dimensions.get('window');

const tiposMotor = [
    { id: 1, nombre: 'Gasolina' },
    { id: 2, nombre: 'Diésel' },
];

const VehicleProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { vehicle } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [healthData, setHealthData] = useState(null);
    const [serviceCount, setServiceCount] = useState(0);
    const [currentVehicle, setCurrentVehicle] = useState(vehicle);

    // Edit Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [marcas, setMarcas] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
    const [showMarcasDropdown, setShowMarcasDropdown] = useState(false);
    const [showModelosDropdown, setShowModelosDropdown] = useState(false);
    const [showTiposMotorDropdown, setShowTiposMotorDropdown] = useState(false);
    const [formData, setFormData] = useState({
        marca: '',
        modelo: '',
        cilindraje: '',
        tipo_motor: '',
        year: '',
        patente: '',
        foto: null,
        kilometraje: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingMarcas, setLoadingMarcas] = useState(false);
    const [loadingModelos, setLoadingModelos] = useState(false);

    // Image Picker Options
    const imagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
    };

    useEffect(() => {
        if (vehicle) {
            navigation.setOptions({
                title: `${vehicle.marca_nombre} ${vehicle.modelo_nombre}`,
                headerShown: true,
                headerTransparent: true,
                headerTintColor: '#fff',
                headerTitleStyle: { opacity: 0 }, // Ocultar título en header al inicio
            });
        }
    }, [vehicle, navigation]);

    useEffect(() => {
        if (route.params?.vehicle) {
            setCurrentVehicle(route.params.vehicle);
            fetchVehicleHealthAndServices(route.params.vehicle.id);
        }
    }, [route.params]);

    const fetchVehicleHealthAndServices = async (vehicleId) => {
        try {
            // Fetch health data
            const VehicleHealthService = require('../../services/vehicleHealthService').default;
            const health = await VehicleHealthService.getVehicleHealth(vehicleId);
            setHealthData(health);

            // Fetch service count
            const userService = require('../../services/user');
            const response = await userService.getServicesHistory();
            const rawSolicitudes = Array.isArray(response?.results)
                ? response.results
                : Array.isArray(response)
                    ? response
                    : [];

            const vehicleServices = rawSolicitudes.filter(
                (solicitud) =>
                    solicitud.vehiculo_detail?.id?.toString() === vehicleId.toString() ||
                    solicitud.vehiculo?.toString() === vehicleId.toString()
            );
            setServiceCount(vehicleServices.length);
        } catch (error) {
            console.error('Error fetching health/services:', error);
        }
    };

    useEffect(() => {
        if (modalVisible) {
            fetchMarcas();
        }
    }, [modalVisible]);

    useEffect(() => {
        if (marcaSeleccionada) {
            fetchModelos(marcaSeleccionada.id);
        } else {
            setModelos([]);
        }
    }, [marcaSeleccionada]);

    const fetchMarcas = async () => {
        try {
            setLoadingMarcas(true);
            const marcasData = await vehicleService.getCarBrands();
            setMarcas(Array.isArray(marcasData) ? marcasData : marcasData?.results || []);
        } catch (error) {
            console.error('Error cargando marcas:', error);
            Alert.alert('Error', 'No se pudieron cargar las marcas.');
        } finally {
            setLoadingMarcas(false);
        }
    };

    const fetchModelos = async (marcaId) => {
        try {
            setLoadingModelos(true);
            const modelosData = await vehicleService.getCarModels(marcaId);
            setModelos(Array.isArray(modelosData) ? modelosData : modelosData?.results || []);
        } catch (error) {
            console.error('Error cargando modelos:', error);
            setModelos([]);
        } finally {
            setLoadingModelos(false);
        }
    };

    const findTipoMotorIdByName = (name) => {
        if (!name) return '';
        const match = tiposMotor.find(t => String(t.nombre).toLowerCase() === String(name).toLowerCase());
        return match ? String(match.id) : '';
    };

    const handleEdit = async () => {
        const vehicle = currentVehicle;
        const marcaObj = { id: vehicle.marca, nombre: vehicle.marca_nombre };
        setMarcaSeleccionada(marcaObj);

        try {
            await fetchModelos(marcaObj.id);
        } catch (e) {
            console.error("Error cargando modelos al editar", e);
        }

        setFormData({
            marca: String(marcaObj.id),
            modelo: String(vehicle.modelo || ''),
            cilindraje: vehicle.cilindraje || '',
            tipo_motor: findTipoMotorIdByName(vehicle.tipo_motor) || '',
            year: vehicle.year ? String(vehicle.year) : '',
            patente: vehicle.patente || '',
            foto: null,
            kilometraje: vehicle.kilometraje ? String(vehicle.kilometraje) : ''
        });
        setErrors({});
        setModalVisible(true);
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!marcaSeleccionada) newErrors.marca = 'Selecciona una marca';
        if (!formData.modelo) newErrors.modelo = 'Selecciona un modelo';
        if (!formData.tipo_motor) newErrors.tipo_motor = 'Selecciona el tipo de motor';

        if (!formData.year) {
            newErrors.year = 'Ingresa el año';
        } else {
            const year = parseInt(formData.year);
            const currentYear = new Date().getFullYear();
            if (isNaN(year) || year < 1900 || year > currentYear + 1) {
                newErrors.year = `El año debe estar entre 1900 y ${currentYear + 1}`;
            }
        }

        if (!formData.patente) {
            newErrors.patente = 'Ingresa la patente';
        } else if (formData.patente.length < 4 || formData.patente.length > 8) {
            newErrors.patente = 'Formato de patente inválido';
        }

        if (!formData.kilometraje) {
            newErrors.kilometraje = 'Ingresa el kilometraje';
        } else if (isNaN(formData.kilometraje) || Number(formData.kilometraje) < 0) {
            newErrors.kilometraje = 'Kilometraje inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFotoSelect = async () => {
        Alert.alert('Foto del Vehículo', '¿Cómo deseas agregar la foto?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Galería', onPress: () => openImagePicker('library') },
            { text: 'Cámara', onPress: () => openImagePicker('camera') },
        ]);
    };

    const openImagePicker = async (type) => {
        try {
            let result;
            if (type === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') return Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara');
                result = await ImagePicker.launchCameraAsync(imagePickerOptions);
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return Alert.alert('Permiso denegado', 'Se necesita acceso a la galería');
                result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
            }

            if (!result.canceled && result.assets.length > 0) {
                setFormData({
                    ...formData,
                    foto: {
                        uri: result.assets[0].uri,
                        type: 'image/jpeg',
                        name: 'vehicle.jpg',
                    }
                });
            }
        } catch (error) {
            console.error('Error al seleccionar imagen:', error);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const vehicleData = {
                marca: Number(marcaSeleccionada.id),
                modelo: typeof formData.modelo === 'object' ? Number(formData.modelo.id) : Number(formData.modelo),
                year: parseInt(formData.year, 10),
                kilometraje: parseInt(formData.kilometraje || '0', 10),
                patente: formData.patente.trim().toUpperCase(),
                cilindraje: formData.cilindraje ? formData.cilindraje.trim() : null,
                tipo_motor: tiposMotor.find(t => t.id.toString() === formData.tipo_motor)?.nombre || 'Gasolina',
            };

            // No enviar cliente ID en actualización - el vehículo ya está asociado

            let updatedVehicle;
            if (formData.foto) {
                const formattedData = new FormData();
                Object.entries(vehicleData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) formattedData.append(key, value);
                });
                formattedData.append('foto', {
                    uri: formData.foto.uri,
                    type: 'image/jpeg',
                    name: `vehicle_${Date.now()}.jpg`,
                });
                updatedVehicle = await vehicleService.updateVehicle(currentVehicle.id, formattedData);
            } else {
                updatedVehicle = await vehicleService.updateVehicle(currentVehicle.id, vehicleData);
            }

            setModalVisible(false);
            Alert.alert('Éxito', 'Vehículo actualizado correctamente');

            // Actualizar estado local con los datos devueltos por el servidor
            setCurrentVehicle(updatedVehicle);

            // Notificar a la lista anterior para que refresque
            navigation.navigate('TabNavigator', {
                screen: ROUTES.MIS_VEHICULOS,
                params: { refresh: true }
            });

        } catch (error) {
            console.error('Error al actualizar vehículo:', error);
            Alert.alert('Error', 'Ha ocurrido un error al actualizar el vehículo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Vehículo',
            `¿Estás seguro que deseas eliminar ${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await vehicleService.deleteVehicle(currentVehicle.id);
                            Alert.alert('Éxito', 'Vehículo eliminado correctamente');
                            navigation.navigate('TabNavigator', {
                                screen: ROUTES.MIS_VEHICULOS,
                                params: { refresh: true }
                            });
                        } catch (error) {
                            console.error('Error eliminando vehículo:', error);
                            Alert.alert('Error', 'No se pudo eliminar el vehículo.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };


    const getHealthColor = (percentage) => {
        if (percentage >= 70) return '#4CAF50';
        if (percentage >= 40) return '#FF9800';
        if (percentage >= 20) return '#F44336';
        return '#D32F2F';
    };

    if (!currentVehicle) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Header Image */}
                <View style={styles.imageContainer}>
                    {currentVehicle.foto ? (
                        <Image source={{ uri: currentVehicle.foto }} style={styles.vehicleImage} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="car-sport" size={100} color={COLORS.textLight} />
                        </View>
                    )}
                    <View style={styles.imageOverlay} />
                    <View style={styles.headerInfo}>
                        <View style={styles.badgeContainer}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{currentVehicle.year}</Text>
                            </View>
                        </View>
                        <Text style={styles.headerTitle}>{currentVehicle.marca_nombre} {currentVehicle.modelo_nombre}</Text>
                        <Text style={styles.headerSubtitle}>{currentVehicle.patente}</Text>
                    </View>

                    {/* Floating Action Buttons */}
                    <View style={styles.floatingActions}>
                        <TouchableOpacity style={[styles.floatingButton, styles.editButton]} onPress={handleEdit}>
                            <Ionicons name="create" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.floatingButton, styles.deleteButton]} onPress={handleDelete}>
                            <Ionicons name="trash" size={24} color={COLORS.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.contentContainer}>

                    {/* Quick Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: currentVehicle.id, vehicle: currentVehicle })}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="pulse" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionText}>Salud</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate(ROUTES.VEHICLE_HISTORY, { vehicleId: currentVehicle.id, vehicle: currentVehicle })}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="time" size={24} color={COLORS.warning} />
                            </View>
                            <Text style={styles.actionText}>Historial</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Specs Grid */}
                    <Text style={styles.sectionTitle}>Especificaciones</Text>
                    <View style={styles.specsGrid}>
                        <SpecItem icon="speedometer-outline" label="Kilometraje" value={`${currentVehicle.kilometraje || 0} km`} />
                        <SpecItem icon="flash-outline" label="Motor" value={currentVehicle.tipo_motor} />
                        <SpecItem icon="hardware-chip-outline" label="Cilindraje" value={currentVehicle.cilindraje || 'N/A'} />
                        <SpecItem icon="calendar-outline" label="Año" value={currentVehicle.year} />
                        <SpecItem icon="barcode-outline" label="Patente" value={currentVehicle.patente} />
                        <SpecItem icon="color-palette-outline" label="Color" value="N/A" />
                    </View>

                    {/* Stats Summary */}
                    <Text style={styles.sectionTitle}>Resumen</Text>
                    <View style={styles.statsCard}>
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{serviceCount}</Text>
                                <Text style={styles.statLabel}>Servicios</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>$0</Text>
                                <Text style={styles.statLabel}>Invertido</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: getHealthColor(healthData?.salud_general_porcentaje || 0) }]}>
                                    {healthData?.salud_general_porcentaje ? Math.round(healthData.salud_general_porcentaje) : 0}%
                                </Text>
                                <Text style={styles.statLabel}>Salud</Text>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.white} />
                </View>
            )}

            {/* Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editar Vehículo</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Marca */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Marca</Text>
                                <TouchableOpacity
                                    style={styles.selectButton}
                                    onPress={() => {
                                        setShowMarcasDropdown(!showMarcasDropdown);
                                        setShowModelosDropdown(false);
                                    }}
                                >
                                    <Text style={styles.selectButtonText}>
                                        {marcaSeleccionada ? marcaSeleccionada.nombre : 'Selecciona una marca'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                                {showMarcasDropdown && (
                                    <View style={styles.dropdown}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                            {marcas.map(marca => (
                                                <TouchableOpacity
                                                    key={marca.id}
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setMarcaSeleccionada(marca);
                                                        setShowMarcasDropdown(false);
                                                    }}
                                                >
                                                    <Text>{marca.nombre}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {errors.marca && <Text style={styles.errorText}>{errors.marca}</Text>}
                            </View>

                            {/* Modelo */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Modelo</Text>
                                <TouchableOpacity
                                    style={[styles.selectButton, !marcaSeleccionada && styles.disabledButton]}
                                    disabled={!marcaSeleccionada}
                                    onPress={() => {
                                        setShowModelosDropdown(!showModelosDropdown);
                                        setShowMarcasDropdown(false);
                                    }}
                                >
                                    <Text style={styles.selectButtonText}>
                                        {formData.modelo ? modelos.find(m => m.id.toString() === formData.modelo)?.nombre : 'Selecciona un modelo'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                                {showModelosDropdown && (
                                    <View style={styles.dropdown}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                            {modelos.map(modelo => (
                                                <TouchableOpacity
                                                    key={modelo.id}
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        handleChange('modelo', modelo.id.toString());
                                                        setShowModelosDropdown(false);
                                                    }}
                                                >
                                                    <Text>{modelo.nombre}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {errors.modelo && <Text style={styles.errorText}>{errors.modelo}</Text>}
                            </View>

                            {/* Año */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Año</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.year}
                                    onChangeText={(text) => handleChange('year', text)}
                                    keyboardType="numeric"
                                    placeholder="Ej. 2020"
                                />
                                {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
                            </View>

                            {/* Patente */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Patente</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.patente}
                                    onChangeText={(text) => handleChange('patente', text)}
                                    placeholder="ABCD12"
                                    autoCapitalize="characters"
                                />
                                {errors.patente && <Text style={styles.errorText}>{errors.patente}</Text>}
                            </View>

                            {/* Kilometraje */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Kilometraje</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.kilometraje}
                                    onChangeText={(text) => handleChange('kilometraje', text)}
                                    keyboardType="numeric"
                                    placeholder="Ej. 50000"
                                />
                                {errors.kilometraje && <Text style={styles.errorText}>{errors.kilometraje}</Text>}
                            </View>

                            {/* Cilindraje */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Cilindraje (Opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.cilindraje}
                                    onChangeText={(text) => handleChange('cilindraje', text)}
                                    placeholder="Ej. 1.6"
                                />
                            </View>

                            {/* Tipo Motor */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Tipo de Motor</Text>
                                <View style={styles.radioGroup}>
                                    {tiposMotor.map(tipo => (
                                        <TouchableOpacity
                                            key={tipo.id}
                                            style={[
                                                styles.radioButton,
                                                formData.tipo_motor === tipo.id.toString() && styles.radioButtonSelected
                                            ]}
                                            onPress={() => handleChange('tipo_motor', tipo.id.toString())}
                                        >
                                            <Text style={[
                                                styles.radioText,
                                                formData.tipo_motor === tipo.id.toString() && styles.radioTextSelected
                                            ]}>
                                                {tipo.nombre}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {errors.tipo_motor && <Text style={styles.errorText}>{errors.tipo_motor}</Text>}
                            </View>

                            {/* Foto */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Foto</Text>
                                <TouchableOpacity style={styles.photoButton} onPress={handleFotoSelect}>
                                    {formData.foto ? (
                                        <Image source={{ uri: formData.foto.uri }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.photoPlaceholder}>
                                            <Ionicons name="camera" size={24} color={COLORS.textLight} />
                                            <Text style={styles.photoText}>Cambiar foto</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <Ionicons name="save-outline" size={20} color={COLORS.white} />
                                    )}
                                    <Text style={styles.submitButtonText}>
                                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const SpecItem = ({ icon, label, value }) => (
    <View style={styles.specItem}>
        <View style={styles.specIconContainer}>
            <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <View>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    vehicleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#CFD8DC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    headerInfo: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    badgeContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    badge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: 32,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 18,
        marginTop: 4,
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    contentContainer: {
        padding: SPACING.md,
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: COLORS.background,
        minHeight: 500,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Changed from space-between to center the remaining 2 buttons
        marginBottom: SPACING.xl,
        marginTop: SPACING.sm,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 16,
        ...SHADOWS.medium,
    },
    actionButton: {
        alignItems: 'center',
        width: '40%', // Increased width since there are only 2 buttons
    },
    floatingActions: {
        position: 'absolute',
        bottom: 60, // Higher position to avoid overlap with action buttons
        right: 20,
        flexDirection: 'row',
        gap: 12,
        zIndex: 99,
        elevation: 5,
    },
    floatingButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        ...SHADOWS.medium,
    },
    editButton: {
        // Icon color will be COLORS.primary
    },
    deleteButton: {
        // Icon color will be COLORS.danger
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 11,
        color: COLORS.text,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: SPACING.md,
        marginLeft: 4,
    },
    specsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    specItem: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.light,
    },
    specIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 122, 255, 0.1)', // Primary color with opacity
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    specLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    specValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        ...SHADOWS.medium,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 4,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        ...SHADOWS.medium,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight || '#E5E5E5',
    },
    modalTitle: {
        fontSize: FONT_SIZES?.h3 || 18,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    modalScrollView: {
        flexGrow: 1,
    },
    modalScrollContent: {
        padding: 20,
        paddingBottom: 40,
    },

    // Form Styles
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: FONT_SIZES?.body || 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: COLORS.background || '#F8F9FA',
        borderRadius: BORDERS?.radius?.md || 12,
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
        fontSize: FONT_SIZES?.body || 15,
        color: COLORS.text,
        minHeight: 50,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: COLORS.background || '#F8F9FA',
        borderRadius: BORDERS?.radius?.md || 12,
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
        minHeight: 50,
    },
    selectButtonText: {
        fontSize: FONT_SIZES?.body || 15,
        color: COLORS.text,
    },
    disabledButton: {
        opacity: 0.6,
        backgroundColor: '#F0F0F0',
    },
    dropdown: {
        marginTop: 8,
        backgroundColor: COLORS.white,
        borderRadius: BORDERS?.radius?.md || 12,
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight || '#F0F0F0',
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger || '#E74C3C',
        marginTop: 6,
        marginLeft: 4,
    },
    radioGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    radioButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
        backgroundColor: COLORS.background || '#F8F9FA',
    },
    radioButtonSelected: {
        backgroundColor: `${COLORS.primary}15`, // 15% opacity
        borderColor: COLORS.primary,
    },
    radioText: {
        color: COLORS.text,
        fontWeight: '500',
    },
    radioTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    photoButton: {
        borderRadius: BORDERS?.radius?.md || 12,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
        borderStyle: 'dashed',
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background || '#F8F9FA',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        alignItems: 'center',
    },
    photoText: {
        marginTop: 8,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight || '#E5E5E5',
        gap: 12,
        marginBottom: 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: BORDERS?.radius?.md || 12,
        backgroundColor: COLORS.background || '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.borderLight || '#E5E5E5',
    },
    cancelButtonText: {
        fontSize: FONT_SIZES?.body || 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: BORDERS?.radius?.md || 12,
        backgroundColor: COLORS.primary,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: FONT_SIZES?.body || 16,
        fontWeight: '700',
        color: COLORS.white,
    },
});

export default VehicleProfileScreen;
