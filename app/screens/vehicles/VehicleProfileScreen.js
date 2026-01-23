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
import { ROUTES } from '../../utils/constants';
import { useTheme } from '../../design-system/theme/useTheme';
// Button y Card no se usan en este componente, se removieron para evitar errores
// import Button from '../../components/base/Button/Button';
// import Card from '../../components/base/Card/Card';
import * as vehicleService from '../../services/vehicle';
import ScrollContainer from '../../components/base/ScrollContainer';

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
    const [totalInvertido, setTotalInvertido] = useState(0);
    const [currentVehicle, setCurrentVehicle] = useState(vehicle);

    // Sistema de diseño
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography && theme?.typography?.fontSize && theme?.typography?.fontWeight
        ? theme.typography
        : {
            fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36 },
            fontWeight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
            fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
        };
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || { radius: {}, width: {} };

    // Validar borders
    const safeBorders = (borders?.radius && typeof borders.radius.full !== 'undefined')
        ? borders
        : {
            radius: {
                none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 24,
                full: 9999,
                button: { sm: 8, md: 12, lg: 16, full: 9999 },
                input: { sm: 8, md: 12, lg: 16 },
                card: { sm: 8, md: 12, lg: 16, xl: 20 },
                modal: { sm: 12, md: 16, lg: 20, xl: 24 },
                avatar: { sm: 16, md: 24, lg: 32, full: 9999 },
                badge: { sm: 4, md: 8, lg: 12, full: 9999 },
            },
            width: { none: 0, thin: 1, medium: 2, thick: 4 }
        };

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
    const [isDeleting, setIsDeleting] = useState(false);

    // Image Picker Options
    const imagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
    };



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

            // Fetch service count and total invertido
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

            // Calcular total invertido de servicios completados
            const serviciosCompletados = vehicleServices.filter(
                (solicitud) => solicitud.estado === 'completado' || solicitud.estado === 'COMPLETADO'
            );

            const total = serviciosCompletados.reduce((sum, solicitud) => {
                // Intentar obtener el monto de diferentes campos posibles
                const monto = solicitud.monto_total ||
                    solicitud.precio_total ||
                    solicitud.total_pagado ||
                    solicitud.oferta_aceptada?.precio_total_ofrecido ||
                    solicitud.oferta_aceptada_detail?.precio_total_ofrecido ||
                    0;
                return sum + (parseFloat(monto) || 0);
            }, 0);

            setTotalInvertido(total);
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
                    if (value !== null && value !== undefined) {
                        // Asegurar que los números se conviertan a string para FormData
                        if (typeof value === 'number') {
                            formattedData.append(key, value.toString());
                        } else {
                            formattedData.append(key, value);
                        }
                    }
                });
                formattedData.append('foto', {
                    uri: formData.foto.uri,
                    type: 'image/jpeg',
                    name: `vehicle_${Date.now()}.jpg`,
                });

                // Log para debugging
                console.log('📤 Actualizando vehículo con foto (FormData)');

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

    const handleDeleteVehicle = () => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm(
                `⚠️ Eliminar Vehículo\n\n¿Estás seguro que deseas eliminar permanentemente ${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}?\n\n❗ ESTA ACCIÓN NO SE PUEDE DESHACER.\n\nSe borrará todo el historial de servicios y datos asociados. No habrá respaldo.`
            );

            if (confirm) {
                (async () => {
                    try {
                        setIsDeleting(true);
                        await vehicleService.deleteVehicle(currentVehicle.id);
                        window.alert('Vehículo eliminado correctamente');
                        navigation.navigate(ROUTES.MY_VEHICLES, { refresh: true });
                    } catch (error) {
                        setIsDeleting(false);
                        console.error('Error eliminando vehículo:', error);

                        if (error?.message?.includes('404') || error?.response?.status === 404) {
                            window.alert('Aviso: El vehículo ya no existe.');
                            navigation.navigate(ROUTES.MY_VEHICLES, { refresh: true });
                            return;
                        }

                        if (error?.response?.status === 400 && error?.response?.data?.error) {
                            window.alert(`🚫 Acción Bloqueada: ${error.response.data.error}`);
                            return;
                        }

                        window.alert('Error: No se pudo eliminar el vehículo.');
                    }
                })();
            }
        } else {
            Alert.alert(
                '⚠️ Eliminar Vehículo',
                `¿Estás seguro que deseas eliminar permanentemente ${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}?\n\n❗ ESTA ACCIÓN NO SE PUEDE DESHACER.\n\nSe borrará todo el historial de servicios y datos asociados.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Sí, Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setIsDeleting(true);
                                await vehicleService.deleteVehicle(currentVehicle.id);
                                // Invalidación manejada por hook
                                Alert.alert('Éxito', 'Vehículo eliminado correctamente');
                                navigation.navigate(ROUTES.MY_VEHICLES, { refresh: true });
                            } catch (error) {
                                setIsDeleting(false);
                                console.error('Error eliminando vehículo:', error);

                                // Manejo de 404 (ya borrado)
                                if (error?.message?.includes('404') || error?.response?.status === 404) {
                                    Alert.alert('Aviso', 'El vehículo ya no existe.');
                                    navigation.navigate(ROUTES.MY_VEHICLES, { refresh: true });
                                    return;
                                }

                                // MANEJO DE BLOQUEO DE SEGURIDAD (400)
                                if (error?.response?.status === 400 && error?.response?.data?.error) {
                                    Alert.alert('🚫 Acción Bloqueada', error.response.data.error);
                                    return;
                                }

                                Alert.alert('Error', 'No se pudo eliminar el vehículo.');
                            }
                        }
                    }
                ]
            );
        }
    };

    // Configurar Header con botones de acción
    // Configurar Header con botones de acción
    useEffect(() => {
        if (currentVehicle) {
            navigation.setOptions({
                title: `${currentVehicle.marca_nombre} ${currentVehicle.modelo_nombre}`,
                headerShown: true,
                headerTransparent: true, // Header transparente sobre la imagen
                headerTintColor: '#fff',
                headerTitleStyle: { opacity: 0 }, // Ocultar título en header al inicio (opcional)
            });
        }
    }, [currentVehicle, navigation]);


    const getHealthColor = (percentage) => {
        if (percentage >= 70) return colors.success?.[500] || '#10B981';
        if (percentage >= 40) return colors.warning?.[500] || '#F59E0B';
        if (percentage >= 20) return colors.error?.[500] || '#EF4444';
        return colors.error?.[600] || '#DC2626';
    };

    // Crear estilos dinámicos con los tokens del tema
    const styles = createStyles(colors, typography, spacing, safeBorders);

    if (!currentVehicle) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary?.[500] || '#003459'} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScrollContainer
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 0 }}
            >

                {/* Header Image */}
                <View style={styles.imageContainer}>
                    {currentVehicle.foto ? (
                        (() => {
                            const imageUri = currentVehicle.foto;
                            console.log(`📸 [VehicleProfileScreen] Vehículo ${currentVehicle.id} - URI de imagen: ${imageUri}`);
                            return <Image source={{ uri: imageUri }} style={styles.vehicleImage} />;
                        })()
                    ) : (
                        (() => {
                            console.log(`⚠️ [VehicleProfileScreen] Vehículo ${currentVehicle?.id} - No tiene foto`);
                            return (
                                <View style={styles.placeholderImage}>
                                    <Ionicons name="car-sport" size={100} color={colors.text?.secondary || '#5D6F75'} />
                                </View>
                            );
                        })()
                    )}
                    {/* Overlay reducido solo en la parte inferior para mejor visibilidad */}
                    <View style={styles.imageOverlay} />
                    {/* Floating Action Buttons - Abajo a la derecha sobre la imagen */}
                    <View style={styles.floatingActions}>
                        <TouchableOpacity style={[styles.floatingButton, styles.editButton]} onPress={handleEdit}>
                            <Ionicons name="create-outline" size={22} color={colors.primary?.[500] || '#003459'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.floatingButton, styles.deleteButton]} onPress={handleDeleteVehicle}>
                            <Ionicons name="trash-outline" size={22} color={colors.error?.[500] || '#EF4444'} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.badgeContainer}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{currentVehicle.year}</Text>
                            </View>
                        </View>
                        <Text style={styles.headerTitle}>{currentVehicle.marca_nombre} {currentVehicle.modelo_nombre}</Text>
                        <Text style={styles.headerSubtitle}>{currentVehicle.patente}</Text>
                    </View>
                </View>

                <View style={styles.contentContainer}>

                    {/* Quick Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionButtonCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(ROUTES.VEHICLE_HEALTH, { vehicleId: currentVehicle.id, vehicle: currentVehicle })}
                        >
                            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.primary?.[500] || '#003459'}15` }]}>
                                <Ionicons name="pulse" size={24} color={colors.primary?.[500] || '#003459'} />
                            </View>
                            <Text style={styles.actionButtonTitle}>Salud</Text>
                            <Text style={styles.actionButtonSubtitle}>Ver estado del vehículo</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.primary?.[500] || '#003459'}
                                style={styles.actionButtonChevron}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButtonCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate(ROUTES.VEHICLE_HISTORY, { vehicleId: currentVehicle.id, vehicle: currentVehicle })}
                        >
                            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.warning?.[500] || '#F59E0B'}15` }]}>
                                <Ionicons name="time" size={24} color={colors.warning?.[500] || '#F59E0B'} />
                            </View>
                            <Text style={styles.actionButtonTitle}>Historial</Text>
                            <Text style={styles.actionButtonSubtitle}>Servicios realizados</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.warning?.[500] || '#F59E0B'}
                                style={styles.actionButtonChevron}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Specs Grid */}
                    <Text style={styles.sectionTitle}>Especificaciones</Text>
                    <View style={styles.specsGrid}>
                        <SpecItem icon="speedometer-outline" label="Kilometraje" value={`${currentVehicle.kilometraje || 0} km`} colors={colors} styles={styles} />
                        <SpecItem icon="flash-outline" label="Motor" value={currentVehicle.tipo_motor} colors={colors} styles={styles} />
                        <SpecItem icon="hardware-chip-outline" label="Cilindraje" value={currentVehicle.cilindraje || 'N/A'} colors={colors} styles={styles} />
                        <SpecItem icon="calendar-outline" label="Año" value={currentVehicle.year} colors={colors} styles={styles} />
                        <SpecItem icon="barcode-outline" label="Patente" value={currentVehicle.patente} colors={colors} styles={styles} />
                        <SpecItem icon="color-palette-outline" label="Color" value="N/A" colors={colors} styles={styles} />
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
                                <Text style={styles.statValue}>
                                    ${totalInvertido.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </Text>
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
            </ScrollContainer>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.base?.pureWhite || '#FFFFFF'} />
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
                                <Ionicons name="close" size={24} color={colors.text?.primary || '#00171F'} />
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
                                    <Ionicons name="chevron-down" size={20} color={colors.text?.secondary || '#5D6F75'} />
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
                                    <Ionicons name="chevron-down" size={20} color={colors.text?.secondary || '#5D6F75'} />
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
                                            <Ionicons name="camera" size={24} color={colors.text?.secondary || '#5D6F75'} />
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
                                        <ActivityIndicator size="small" color={colors.base?.pureWhite || '#FFFFFF'} />
                                    ) : (
                                        <Ionicons name="save-outline" size={20} color={colors.base?.pureWhite || '#FFFFFF'} />
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

// SpecItem necesita recibir styles como prop o acceder a ellos de otra forma
const SpecItem = ({ icon, label, value, colors, styles }) => (
    <View style={styles.specItem}>
        <View style={styles.specIconContainer}>
            <Ionicons name={icon} size={20} color={colors.primary?.[500] || '#003459'} />
        </View>
        <View>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
        </View>
    </View>
);

// Función para crear estilos dinámicos con el sistema de diseño
const createStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F8F9FA',
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
        backgroundColor: colors.neutral?.gray?.[200] || '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%', // Solo overlay en la parte inferior para mejor visibilidad
        backgroundColor: 'rgba(0,0,0,0.3)',
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
        backgroundColor: colors.primary?.[500] || '#003459',
        paddingHorizontal: spacing.sm || 10,
        paddingVertical: spacing.xs || 4,
        borderRadius: borders.radius?.badge?.md || 12,
    },
    badgeText: {
        color: colors.base?.pureWhite || '#FFFFFF',
        fontSize: typography.fontSize?.xs || 12,
        fontWeight: typography.fontWeight?.bold || '700',
    },
    headerTitle: {
        color: colors.base?.pureWhite || '#FFFFFF',
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: typography.fontSize?.lg || 18,
        marginTop: spacing.xs || 4,
        fontWeight: typography.fontWeight?.medium || '500',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    contentContainer: {
        padding: spacing.md || 16,
        marginTop: -30,
        borderTopLeftRadius: borders.radius?.card?.xl || 24,
        borderTopRightRadius: borders.radius?.card?.xl || 24,
        backgroundColor: colors.background?.default || '#F8F9FA',
        flexGrow: 1,
        paddingBottom: spacing.xl || 40,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md || 12,
        marginBottom: spacing.xl || 24,
        marginTop: spacing.sm || 12,
    },
    actionButtonCard: {
        flex: 1,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.card?.md || 12,
        padding: spacing.md || 16,
        position: 'relative',
        borderWidth: borders.width?.thin || 1,
        borderColor: colors.border?.light || '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    floatingActions: {
        position: 'absolute',
        bottom: 20, // Abajo en la imagen
        right: spacing.md || 20, // Derecha
        flexDirection: 'row',
        gap: spacing.sm || 12,
        zIndex: 99,
        elevation: 5,
    },
    floatingButton: {
        width: 48,
        height: 48,
        borderRadius: borders.radius?.full || 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background?.paper || '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    editButton: {
        // Icon color uses colors.primary[500] from theme
    },
    deleteButton: {
        // Icon color uses colors.error[500] from theme
    },

    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: borders.radius?.full || 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm || 8,
    },
    actionButtonTitle: {
        fontSize: typography.fontSize?.sm || 14,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#00171F',
        marginBottom: spacing.xs || 4,
    },
    actionButtonSubtitle: {
        fontSize: typography.fontSize?.xs || 11,
        color: colors.text?.secondary || '#5D6F75',
        fontWeight: typography.fontWeight?.regular || '400',
    },
    actionButtonChevron: {
        position: 'absolute',
        top: spacing.md || 16,
        right: spacing.md || 16,
    },
    sectionTitle: {
        fontSize: typography.fontSize?.xl || 20,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#00171F',
        marginBottom: spacing.md || 16,
        marginLeft: spacing.xs || 4,
    },
    specsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: spacing.xl || 24,
    },
    specItem: {
        width: '48%',
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.card?.lg || 16,
        padding: spacing.sm || 12,
        marginBottom: spacing.sm || 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    specIconContainer: {
        width: 36,
        height: 36,
        borderRadius: borders.radius?.md || 10,
        backgroundColor: `${colors.primary?.[500] || '#003459'}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm || 10,
    },
    specLabel: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.text?.secondary || '#5D6F75',
        marginBottom: spacing.xs || 2,
    },
    specValue: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#00171F',
    },
    statsCard: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.card?.lg || 16,
        padding: spacing.lg || 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
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
        fontSize: typography.fontSize?.['2xl'] || 22,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#00171F',
    },
    statLabel: {
        fontSize: typography.fontSize?.sm || 13,
        color: colors.text?.secondary || '#5D6F75',
        marginTop: spacing.xs || 4,
    },
    verticalDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border?.light || '#E5E7EB',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderTopLeftRadius: borders.radius?.modal?.xl || 24,
        borderTopRightRadius: borders.radius?.modal?.xl || 24,
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg || 20,
        paddingVertical: spacing.md || 16,
        borderBottomWidth: borders.width?.thin || 1,
        borderBottomColor: colors.border?.light || '#E5E7EB',
    },
    modalTitle: {
        fontSize: typography.fontSize?.xl || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#00171F',
    },
    modalScrollView: {
        flexGrow: 1,
    },
    modalScrollContent: {
        padding: spacing.lg || 20,
        paddingBottom: spacing.xl || 40,
    },

    // Form Styles
    formGroup: {
        marginBottom: spacing.lg || 20,
    },
    label: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#00171F',
        marginBottom: spacing.sm || 8,
    },
    input: {
        paddingHorizontal: spacing.md || 16,
        paddingVertical: spacing.sm || 14,
        backgroundColor: colors.background?.default || '#F8F9FA',
        borderRadius: borders.radius?.input?.md || 12,
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E7EB',
        fontSize: typography.fontSize?.base || 15,
        color: colors.text?.primary || '#00171F',
        minHeight: 50,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md || 16,
        paddingVertical: spacing.sm || 14,
        backgroundColor: colors.background?.default || '#F8F9FA',
        borderRadius: borders.radius?.input?.md || 12,
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E7EB',
        minHeight: 50,
    },
    selectButtonText: {
        fontSize: typography.fontSize?.base || 15,
        color: colors.text?.primary || '#00171F',
    },
    disabledButton: {
        opacity: 0.6,
        backgroundColor: colors.neutral?.gray?.[100] || '#F0F0F0',
    },
    dropdown: {
        marginTop: spacing.sm || 8,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.md || 12,
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E7EB',
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    dropdownItem: {
        paddingHorizontal: spacing.md || 16,
        paddingVertical: spacing.sm || 14,
        borderBottomWidth: borders.width?.thin || 1,
        borderBottomColor: colors.border?.light || '#F0F0F0',
    },
    errorText: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.error?.[500] || '#E74C3C',
        marginTop: spacing.xs || 6,
        marginLeft: spacing.xs || 4,
    },
    radioGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm || 8,
    },
    radioButton: {
        paddingHorizontal: spacing.md || 16,
        paddingVertical: spacing.sm || 10,
        borderRadius: borders.radius?.full || 20,
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E7EB',
        backgroundColor: colors.background?.default || '#F8F9FA',
    },
    radioButtonSelected: {
        backgroundColor: `${colors.primary?.[500] || '#003459'}15`,
        borderColor: colors.primary?.[500] || '#003459',
    },
    radioText: {
        color: colors.text?.primary || '#00171F',
        fontWeight: typography.fontWeight?.medium || '500',
    },
    radioTextSelected: {
        color: colors.primary?.[500] || '#003459',
        fontWeight: typography.fontWeight?.semibold || '600',
    },
    photoButton: {
        borderRadius: borders.radius?.md || 12,
        overflow: 'hidden',
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E5E5',
        borderStyle: 'dashed',
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background?.default || '#F8F9FA',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        alignItems: 'center',
    },
    photoText: {
        marginTop: spacing.sm || 8,
        color: colors.text?.secondary || '#5D6F75',
        fontWeight: typography.fontWeight?.medium || '500',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg || 20,
        paddingVertical: spacing.md || 16,
        borderTopWidth: borders.width?.thin || 1,
        borderTopColor: colors.border?.light || '#E5E7EB',
        gap: spacing.sm || 12,
        marginBottom: spacing.lg || 20,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.sm || 14,
        paddingHorizontal: spacing.lg || 20,
        borderRadius: borders.radius?.button?.md || 12,
        backgroundColor: colors.background?.default || '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: borders.width?.medium || 1.5,
        borderColor: colors.border?.light || '#E5E7EB',
    },
    cancelButtonText: {
        fontSize: typography.fontSize?.base || 16,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#00171F',
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm || 14,
        paddingHorizontal: spacing.lg || 20,
        borderRadius: borders.radius?.button?.md || 12,
        backgroundColor: colors.primary?.[500] || '#003459',
        gap: spacing.sm || 8,
        shadowColor: colors.primary?.[500] || '#003459',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: typography.fontSize?.base || 16,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.base?.pureWhite || '#FFFFFF',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
});

export default VehicleProfileScreen;
