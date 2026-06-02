import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Switch, ActivityIndicator, Alert, Modal, TextInput, RefreshControl, Platform, Share,
    Dimensions, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ShieldAlert, ClipboardCheck, Camera, Trash2, ImagePlus } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// React Query Imports
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Services
import * as vehicleService from '../../services/vehicle';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import { buildPublicListingUrl, buildDeepLinkListingUrl } from '../../config/publicListing';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { ROUTES } from '../../utils/constants';

const SCREEN_W = Dimensions.get('window').width;
const MAX_FOTOS = 10;
const DESCRIPTION_MAX_CHARS = 600;

const SellVehicleScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const queryClient = useQueryClient();

    // Get vehicle data from params (support both `vehicle` and `vehicleId`)
    const { vehicle: vehicleFromParams, vehicleId } = route.params || {};
    const [vehicle, setVehicle] = useState(vehicleFromParams || null);

    useEffect(() => {
        let isMounted = true;

        const hydrate = async () => {
            if (vehicleFromParams?.id) {
                if (isMounted) setVehicle(vehicleFromParams);
                return;
            }

            if (vehicleId != null && vehicleId !== '') {
                try {
                    const v = await vehicleService.getVehicleById(vehicleId);
                    if (isMounted) setVehicle(v || null);
                } catch (e) {
                    if (isMounted) setVehicle(null);
                }
            }
        };

        hydrate();
        return () => {
            isMounted = false;
        };
    }, [vehicleFromParams, vehicleId]);

    // UI States (Modal & Input)
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [newPriceInput, setNewPriceInput] = useState('');
    // Modal de inspección requerida (publicación bloqueada por componentes USUARIO_DECLARADO)
    const [inspeccionModal, setInspeccionModal] = useState({ visible: false, componentes: [] });

    // Fotos de venta
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [deletingFotoId, setDeletingFotoId] = useState(null);

    // Descripción de venta
    const [descripcion, setDescripcion] = useState('');
    const [descripcionSaved, setDescripcionSaved] = useState(false);
    const [savingDescripcion, setSavingDescripcion] = useState(false);
    const descripcionRef = useRef('');

    // 1. QUERY: Fetch all Marketplace Data
    const {
        data: marketplaceData,
        isLoading,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: ['marketplaceData', vehicle?.id],
        queryFn: async () => {
            const [settings, statsData, appraisal, receivedOffers] = await Promise.all([
                vehicleService.getMarketplaceData(vehicle.id),
                vehicleService.getMarketplaceStats(vehicle.id),
                vehicleService.getVehicleAppraisal(vehicle.id),
                vehicleService.getReceivedOffers().catch(() => [])
            ]);
            return { settings, statsData, appraisal, receivedOffers };
        },
        enabled: !!vehicle?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Derive state from data (safe access with defaults)
    const settings = marketplaceData?.settings || {};
    const stats = marketplaceData?.statsData || { views: 0, favorites: 0, leads: 0 };
    const appraisal = marketplaceData?.appraisal || {};
    const fotosVenta = Array.isArray(settings.fotos) ? settings.fotos : [];

    // Sync descripcion from remote when data loads
    useEffect(() => {
        if (settings.descripcion_venta !== undefined && settings.descripcion_venta !== null) {
            const val = settings.descripcion_venta || '';
            setDescripcion(val);
            descripcionRef.current = val;
        }
    }, [settings.descripcion_venta]);

    // Calculate offers count for this vehicle
    const vehicleOffers = (marketplaceData?.receivedOffers || []).filter(o =>
        o.vehiculo === vehicle.id || o.vehiculo_id === vehicle.id || o.vehiculo?.id === vehicle.id
    );
    const offersCount = vehicleOffers.length;

    const isPublished = settings.is_published || false;

    // Smart fallback logic for prices
    // prefer appraisal if available, else settings, else 0
    const suggestedPrice = appraisal.suggested_price || settings.suggested_price || 0;
    const healthBonus = appraisal.bonus_percentage || settings.health_bonus_percentage || 0;

    // Selling price: settings.precio_venta (user set) -> fallback to suggested -> 0
    const sellingPrice = settings.precio_venta || suggestedPrice || 0;

    // 2. MUTATION: Toggle Publish
    const togglePublishMutation = useMutation({
        mutationFn: (newStatus) => vehicleService.updateMarketplaceData(vehicle.id, { is_published: newStatus }),
        onMutate: async (newStatus) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['marketplaceData', vehicle.id] });

            // Snapshot previous value
            const previousData = queryClient.getQueryData(['marketplaceData', vehicle.id]);

            // Optimistically update
            queryClient.setQueryData(['marketplaceData', vehicle.id], (old) => ({
                ...old,
                settings: { ...old.settings, is_published: newStatus }
            }));

            return { previousData };
        },
        onError: (err, newStatus, context) => {
            // Rollback
            if (context?.previousData) {
                queryClient.setQueryData(['marketplaceData', vehicle.id], context.previousData);
            }
            const responseData = err?.response?.data;
            if (responseData?.error_code === 'INSPECCION_REQUERIDA') {
                setInspeccionModal({
                    visible: true,
                    componentes: responseData.componentes_sin_verificar || [],
                });
                return;
            }
            Alert.alert('Error', responseData?.error || 'No se pudo actualizar el estado de publicación.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceData', vehicle.id] });
        }
    });

    // 3. MUTATION: Update Price
    const updatePriceMutation = useMutation({
        mutationFn: (newPrice) => vehicleService.updateMarketplaceData(vehicle.id, { precio_venta: newPrice }),
        onSuccess: () => {
            setPriceModalVisible(false);
            Alert.alert("Éxito", "Precio de venta actualizado.");
            queryClient.invalidateQueries({ queryKey: ['marketplaceData', vehicle.id] });
        },
        onError: () => {
            Alert.alert("Error", "No se pudo actualizar el precio.");
        }
    });

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // ── Fotos handlers ──────────────────────────────────────────────
    const handlePickFoto = useCallback(async () => {
        if (fotosVenta.length >= MAX_FOTOS) {
            Alert.alert('Límite alcanzado', `Puedes subir hasta ${MAX_FOTOS} fotos.`);
            return;
        }

        const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permStatus !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.85,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        setUploadingFoto(true);
        try {
            await vehicleService.uploadMarketplaceFoto(vehicle.id, asset);
            queryClient.invalidateQueries({ queryKey: ['marketplaceData', vehicle.id] });
        } catch (err) {
            Alert.alert('Error', 'No se pudo subir la foto. Intenta nuevamente.');
            console.error('[uploadMarketplaceFoto]', err);
        } finally {
            setUploadingFoto(false);
        }
    }, [fotosVenta.length, vehicle?.id, queryClient]);

    const handleDeleteFoto = useCallback(async (fotoId) => {
        Alert.alert('Eliminar foto', '¿Estás seguro de que deseas eliminar esta foto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    setDeletingFotoId(fotoId);
                    try {
                        await vehicleService.deleteMarketplaceFoto(vehicle.id, fotoId);
                        queryClient.invalidateQueries({ queryKey: ['marketplaceData', vehicle.id] });
                    } catch {
                        Alert.alert('Error', 'No se pudo eliminar la foto.');
                    } finally {
                        setDeletingFotoId(null);
                    }
                },
            },
        ]);
    }, [vehicle?.id, queryClient]);

    // ── Descripción handlers ─────────────────────────────────────────
    const handleSaveDescripcion = useCallback(async () => {
        if (savingDescripcion) return;
        setSavingDescripcion(true);
        setDescripcionSaved(false);
        try {
            await vehicleService.updateMarketplaceData(vehicle.id, { descripcion_venta: descripcionRef.current });
            queryClient.invalidateQueries({ queryKey: ['marketplaceData', vehicle.id] });
            setDescripcionSaved(true);
            setTimeout(() => setDescripcionSaved(false), 2500);
        } catch {
            Alert.alert('Error', 'No se pudo guardar la descripción.');
        } finally {
            setSavingDescripcion(false);
        }
    }, [savingDescripcion, vehicle?.id, queryClient]);

    const togglePublish = (newValue) => {
        if (newValue === true && (!sellingPrice || sellingPrice <= 0)) {
            Alert.alert("Requerido", "Debes establecer un precio de venta antes de publicar.");
            return;
        }
        togglePublishMutation.mutate(newValue);
    };

    const handleSolicitarInspeccion = () => {
        setInspeccionModal({ visible: false, componentes: [] });
        const componentesStr = inspeccionModal.componentes.join(', ');
        const descripcion = `INSPECCIÓN TÉCNICA REQUERIDA PARA PUBLICACIÓN EN MARKETPLACE.\n\nComponentes a verificar: ${componentesStr}.\n\nEl usuario declaró manualmente el estado de estos componentes. Se requiere certificación por taller antes de publicar el vehículo.`;
        navigation.navigate(ROUTES.CREAR_SOLICITUD, {
            vehicle,
            descripcionPrellenada: descripcion,
        });
    };

    const handleShareFicha = useCallback(async () => {
        if (!vehicle?.id) return;

        const runShare = async () => {
            const webUrl = buildPublicListingUrl(vehicle.id);
            const deepUrl = buildDeepLinkListingUrl(vehicle.id);
            const title = [vehicle.marca_nombre, vehicle.modelo_nombre].filter(Boolean).join(' ').trim() || 'Vehículo';
            const message =
                `Mirá esta ficha en MecaniMóvil: ${title}\n\nVer en la web:\n${webUrl}\n\nAbrir en la app:\n${deepUrl}`;
            try {
                if (Platform.OS === 'web') {
                    await Share.share({ message, title: 'MecaniMóvil', url: webUrl });
                } else {
                    await Share.share({ message, url: webUrl });
                }
            } catch {
                /* cancelado por el usuario */
            }
        };

        if (!isPublished) {
            Alert.alert(
                'Publicá el vehículo',
                'Para que otros vean la ficha, el auto debe estar publicado en el marketplace.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Publicar y compartir',
                        onPress: () => {
                            if (!sellingPrice || sellingPrice <= 0) {
                                Alert.alert('Precio requerido', 'Definí un precio de venta antes de publicar.');
                                return;
                            }
                            togglePublishMutation.mutate(true, {
                                onSuccess: () => {
                                    runShare();
                                },
                            });
                        },
                    },
                ]
            );
            return;
        }

        await runShare();
    }, [vehicle, isPublished, sellingPrice, togglePublishMutation]);

    const handleSavePrice = () => {
        const priceValue = parseInt(newPriceInput.replace(/[^0-9]/g, ''));

        if (isNaN(priceValue) || priceValue <= 0) {
            Alert.alert("Error", "Ingresa un precio válido.");
            return;
        }

        updatePriceMutation.mutate(priceValue);
    };

    const openPriceModal = () => {
        setNewPriceInput(sellingPrice.toString());
        setPriceModalVisible(true);
    };

    const formatPrice = (value) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'decimal',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    const safeTop = Math.max(
        insets.top,
        Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
    );
    const styles = getStyles(insets, safeTop);
    const webScreenFrame = isWeb
        ? {
            height: windowHeight,
            maxHeight: windowHeight,
            minHeight: 0,
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
        }
        : null;

    if (isLoading) {
        return (
            <View style={[styles.container, webScreenFrame]}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                {/* Header Skeleton */}
                <View style={{ height: 228, backgroundColor: COLORS.neutral.gray[200] }}>
                    <View style={{ position: 'absolute', top: insets.top + 10, left: 20 }}>
                        <Skeleton width={40} height={40} borderRadius={20} style={{ opacity: 0.35 }} />
                    </View>
                    <View style={{ position: 'absolute', bottom: 20, left: 20 }}>
                        <Skeleton width={200} height={32} style={{ marginBottom: 8, opacity: 0.35 }} />
                        <Skeleton width={120} height={20} style={{ opacity: 0.35 }} />
                    </View>
                </View>

                <View style={styles.bodyContainer}>
                    {/* Price Card Skeleton */}
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Skeleton width={120} height={20} />
                            <Skeleton width={60} height={20} />
                        </View>
                        <Skeleton width={180} height={40} style={{ marginBottom: 8 }} />
                        <Skeleton width={220} height={16} style={{ marginBottom: 20 }} />
                        <Skeleton width="100%" height={80} borderRadius={12} />
                    </View>

                    {/* Visibility Card Skeleton */}
                    <View style={styles.card}>
                        <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Skeleton width={120} height={20} />
                            <Skeleton width={50} height={28} borderRadius={14} />
                        </View>
                        <View style={{ height: 1, backgroundColor: COLORS.border.light, marginVertical: 12 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Skeleton width={140} height={20} />
                            <Skeleton width={50} height={28} borderRadius={14} />
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, webScreenFrame]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={[styles.scrollView, isWeb && styles.scrollViewWeb]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
                }
            >
                {/* 1. Immersive Header (sin topBar aquí: va fijo encima para que nada se solape) */}
                <View style={styles.headerContainer}>
                    <View style={styles.imageWrapper}>
                        {vehicle?.foto ? (
                            <Image
                                source={{ uri: vehicle.foto }}
                                style={styles.headerImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.headerImage, { backgroundColor: COLORS.neutral.gray[300] }]} />
                        )}
                        <View style={styles.headerScrim} pointerEvents="none" />
                    </View>

                    <View style={styles.headerTextSafeZone} pointerEvents="none">
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerSubtitle}>Gestión de Venta</Text>
                            <Text
                                style={styles.headerTitle}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {vehicle?.marca_nombre || vehicle?.marca} {vehicle?.modelo_nombre || vehicle?.modelo}
                            </Text>
                            <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
                                {vehicle?.year} • {vehicle?.patente}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 2. Body Content */}
                <View style={styles.bodyContainer}>

                    {/* ── Fotos del vehículo ─────────────────────────────────── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Camera size={18} color={COLORS.primary[500]} />
                                <Text style={styles.cardTitle}>Fotos del vehículo</Text>
                            </View>
                            <Text style={styles.fotosCounter}>{fotosVenta.length}/{MAX_FOTOS}</Text>
                        </View>

                        {/* Grid de fotos */}
                        <View style={styles.fotosGrid}>
                            {fotosVenta.map((foto) => (
                                <View key={foto.id} style={styles.fotoThumb}>
                                    <Image
                                        source={{ uri: foto.foto_url }}
                                        style={styles.fotoThumbImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                    {deletingFotoId === foto.id ? (
                                        <View style={styles.fotoDeleteOverlay}>
                                            <ActivityIndicator size="small" color={COLORS.base.white} />
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.fotoDeleteBtn}
                                            onPress={() => handleDeleteFoto(foto.id)}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                            <Trash2 size={13} color={COLORS.base.white} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {/* Botón añadir foto */}
                            {fotosVenta.length < MAX_FOTOS && (
                                <TouchableOpacity
                                    style={[styles.fotoThumb, styles.fotoAddBtn]}
                                    onPress={handlePickFoto}
                                    disabled={uploadingFoto}
                                >
                                    {uploadingFoto ? (
                                        <ActivityIndicator size="small" color={COLORS.primary[500]} />
                                    ) : (
                                        <>
                                            <ImagePlus size={22} color={COLORS.primary[500]} />
                                            <Text style={styles.fotoAddText}>Agregar</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.fotosHint}>
                            Las fotos se muestran como carrusel en el marketplace.
                        </Text>
                    </View>

                    {/* ── Descripción de la venta ────────────────────────────── */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Descripción de la venta</Text>
                            {descripcionSaved && (
                                <View style={styles.savedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success[600]} />
                                    <Text style={styles.savedBadgeText}>Guardado</Text>
                                </View>
                            )}
                        </View>
                        <TextInput
                            style={styles.descripcionInput}
                            placeholder="Describe el estado, extras, historial de mantenimiento, motivo de la venta…"
                            placeholderTextColor={COLORS.text.disabled}
                            multiline
                            maxLength={DESCRIPTION_MAX_CHARS}
                            value={descripcion}
                            onChangeText={(t) => {
                                setDescripcion(t);
                                descripcionRef.current = t;
                            }}
                            onBlur={handleSaveDescripcion}
                            textAlignVertical="top"
                        />
                        <View style={styles.descripcionFooter}>
                            <Text style={styles.descripcionCounter}>
                                {descripcion.length}/{DESCRIPTION_MAX_CHARS}
                            </Text>
                            <TouchableOpacity
                                style={[styles.saveDescBtn, savingDescripcion && { opacity: 0.6 }]}
                                onPress={handleSaveDescripcion}
                                disabled={savingDescripcion}
                            >
                                {savingDescripcion ? (
                                    <ActivityIndicator size="small" color={COLORS.base.white} />
                                ) : (
                                    <Text style={styles.saveDescBtnText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Price Control Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Precio de Venta</Text>
                            <TouchableOpacity style={styles.editButton} onPress={openPriceModal}>
                                <Ionicons name="pencil" size={16} color={COLORS.primary[500]} />
                                <Text style={styles.editButtonText}>Editar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.priceContainer}>
                            <Text style={styles.priceSymbol}>$</Text>
                            <Text style={styles.priceValue}>{formatPrice(sellingPrice)}</Text>
                        </View>
                        <Text style={styles.suggestedPrice}>Sugerido Certificado: ${formatPrice(suggestedPrice)}</Text>

                        {/* Insight Box */}
                        <View style={styles.insightBox}>
                            <View style={styles.insightHeader}>
                                <Text style={styles.insightTitle}>Potencial de Ganancia</Text>
                                <Text style={styles.insightValue}>{healthBonus > 0 ? '+' : ''}${formatPrice(healthBonus)}</Text>
                            </View>

                            {/* Visual Bar: Scale relative to Suggested Price (max 20% gain visualization) */}
                            <View style={styles.progressBarBackground}>
                                <View style={[
                                    styles.progressBarFill,
                                    { width: `${Math.min((healthBonus / (suggestedPrice || 1)) * 500, 100)}%` }
                                ]} />
                            </View>

                            <Text style={styles.insightDescription}>
                                {healthBonus > 0
                                    ? "Repara tus alertas de salud para desbloquear este valor adicional."
                                    : "Tu vehículo está en excelente estado. ¡Estás obteniendo el máximo valor!"}
                            </Text>
                        </View>
                    </View>

                    {/* Visibility Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="eye-outline" size={20} color={COLORS.text.primary} />
                            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Visibilidad en Marketplace</Text>
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>Publicar Vehículo</Text>
                            <Switch
                                trackColor={{ false: COLORS.neutral.gray[200], true: COLORS.success[500] }}
                                thumbColor={COLORS.base.white}
                                ios_backgroundColor={COLORS.neutral.gray[200]}
                                onValueChange={togglePublish}
                                value={isPublished}
                            />
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.toggleRow}>
                            <Text style={[styles.toggleLabel, styles.toggleLabelDisabled]}>Destacar Publicación</Text>
                            <Switch
                                trackColor={{ false: COLORS.neutral.gray[200], true: COLORS.neutral.gray[200] }}
                                thumbColor={COLORS.neutral.gray[100]}
                                value={false}
                                disabled={true}
                            />
                        </View>
                    </View>

                    {(isPublished || stats.views > 0 || offersCount > 0) && (
                        <View style={styles.statsCard}>
                            <View style={styles.cardHeaderRow}>
                                <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary[500]} />
                                <Text style={styles.statsCardTitle}>Rendimiento</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.views}</Text>
                                    <Text style={styles.statLabel}>VISITAS</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.favorites}</Text>
                                    <Text style={styles.statLabel}>FAVORITOS</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{offersCount}</Text>
                                    <Text style={styles.statLabel}>OFERTAS</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Espacio para que la card Rendimiento no quede bajo el sticky inferior */}
                    <View style={{ height: 100 + insets.bottom + 80 }} />
                </View>
            </ScrollView>

            {/* Barra back + badge FUERA del scroll: siempre encima; los textos solo se pintan en headerTextSafeZone */}
            <View style={styles.headerTopOverlay} pointerEvents="box-none">
                <View style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <View
                        style={[
                            styles.statusBadge,
                            isPublished ? styles.statusPublished : styles.statusDraft
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                isPublished ? styles.dotPublished : styles.dotDraft
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                isPublished ? styles.textPublished : styles.textDraft
                            ]}
                        >
                            {isPublished ? 'PUBLICADO' : 'BORRADOR'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* 3. Footer: solo Compartir Ficha (eliminada opción eliminar publicación) */}
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={handleShareFicha}
                >
                    <Ionicons name="share-outline" size={20} color={COLORS.primary[500]} />
                    <Text style={styles.outlineButtonText}>Compartir Ficha</Text>
                </TouchableOpacity>
            </View>

            {/* Modal: Inspección técnica requerida */}
            <Modal
                visible={inspeccionModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setInspeccionModal({ visible: false, componentes: [] })}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setInspeccionModal({ visible: false, componentes: [] })}
                    />
                    <View style={[styles.modalContent, { gap: 0 }]} onStartShouldSetResponder={() => true}>
                        {/* Icono de alerta */}
                        <View style={styles.inspeccionIconWrap}>
                            <ShieldAlert size={36} color={COLORS.warning[600]} />
                        </View>

                        <Text style={styles.modalTitle}>Inspección técnica requerida</Text>
                        <Text style={styles.modalSubtitle}>
                            Tienes componentes declarados manualmente sin certificar por un taller.
                            Para publicar tu vehículo, un mecánico debe verificarlos presencialmente.
                        </Text>

                        {/* Lista de componentes bloqueantes */}
                        {inspeccionModal.componentes.length > 0 && (
                            <View style={styles.inspeccionComponentesList}>
                                <Text style={styles.inspeccionComponentesLabel}>Componentes a certificar:</Text>
                                {inspeccionModal.componentes.map((nombre, i) => (
                                    <View key={i} style={styles.inspeccionComponenteRow}>
                                        <ClipboardCheck size={14} color={COLORS.warning[600]} />
                                        <Text style={styles.inspeccionComponenteText}>{nombre}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Text style={styles.inspeccionExplainer}>
                            Al solicitar la inspección, el taller revisará estos componentes y certificará
                            su estado real. Una vez verificados, podrás publicar tu vehículo.
                        </Text>

                        {/* Botón principal */}
                        <TouchableOpacity
                            style={styles.inspeccionCTA}
                            onPress={handleSolicitarInspeccion}
                        >
                            <Ionicons name="construct-outline" size={18} color={COLORS.text.onPrimary} />
                            <Text style={styles.inspeccionCTAText}>Solicitar inspección técnica</Text>
                        </TouchableOpacity>

                        {/* Botón secundario */}
                        <TouchableOpacity
                            style={styles.inspeccionCancelBtn}
                            onPress={() => setInspeccionModal({ visible: false, componentes: [] })}
                        >
                            <Text style={styles.inspeccionCancelText}>Ahora no</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Price Edit Modal */}
            <Modal
                visible={priceModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPriceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setPriceModalVisible(false)}
                    />
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Editar Precio de Venta</Text>
                        <Text style={styles.modalSubtitle}>
                            Define el precio al que quieres vender tu vehículo.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 8000000"
                            placeholderTextColor={COLORS.text.disabled}
                            keyboardType="numeric"
                            value={newPriceInput}
                            onChangeText={setNewPriceInput}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setPriceModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSavePrice}
                            >
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (insets, safeTop = insets.top) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewWeb: {
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
    },
    scrollContent: {
        paddingBottom: 0,
    },
    headerContainer: {
        height: 228,
        width: '100%',
        position: 'relative',
        backgroundColor: COLORS.neutral.gray[200],
        overflow: 'hidden',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.neutral.gray[200],
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    headerScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.45),
        zIndex: 0,
    },
    // Overlay fijo encima del ScrollView (back + badge)
    headerTopOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        elevation: 20,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: safeTop + 8,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: withOpacity(COLORS.base.white, 0.94),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPublished: {
        backgroundColor: COLORS.success.light,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.success[300],
    },
    statusDraft: {
        backgroundColor: COLORS.neutral.gray[200],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    dotPublished: {
        backgroundColor: COLORS.success[600],
    },
    dotDraft: {
        backgroundColor: COLORS.text.tertiary,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textPublished: {
        color: COLORS.success[800],
    },
    textDraft: {
        color: COLORS.text.secondary,
    },
    // Solo esta banda puede mostrar textos; overflow hidden recorta cualquier cosa que suba
    // safeTop + fila back (~56) + margen extra para que nunca toque el botón
    headerTextSafeZone: {
        position: 'absolute',
        top: safeTop + 8 + 44 + 8 + 20,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 20,
        overflow: 'hidden',
        zIndex: 1,
    },
    headerInfo: {
        width: '100%',
    },
    headerTitle: {
        color: COLORS.text.inverse,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 2,
        textShadowColor: withOpacity(COLORS.base.inkBlack, 0.35),
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        color: withOpacity(COLORS.base.white, 0.9),
        fontSize: 14,
        fontWeight: '500',
    },
    bodyContainer: {
        marginTop: -16,
        backgroundColor: COLORS.background.default,
        zIndex: 0,
        borderTopLeftRadius: BORDERS.radius.xl,
        borderTopRightRadius: BORDERS.radius.xl,
        paddingHorizontal: 20,
        paddingTop: 32,
    },
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: 20,
        marginBottom: 20,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    editButtonText: {
        color: COLORS.primary[600],
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 4,
    },
    priceSymbol: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginTop: 6,
        marginRight: 2,
    },
    priceValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text.primary,
    },
    suggestedPrice: {
        textAlign: 'center',
        fontSize: 13,
        color: COLORS.text.tertiary,
        marginBottom: 20,
    },
    insightBox: {
        backgroundColor: COLORS.primary[50],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[200],
        borderRadius: BORDERS.radius.md,
        padding: 16,
    },
    insightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    insightTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary[700],
    },
    insightValue: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.success[700],
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: COLORS.neutral.gray[200],
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBarFill: {
        height: 6,
        backgroundColor: COLORS.primary[500],
        borderRadius: 3,
    },
    insightDescription: {
        fontSize: 11,
        color: COLORS.text.secondary,
    },
    // Visibility
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text.primary,
    },
    toggleLabelDisabled: {
        color: COLORS.text.disabled,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border.light,
        marginVertical: 12,
    },
    statsCard: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: 20,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    statsCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginLeft: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.text.tertiary,
        letterSpacing: 0.5,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
        backgroundColor: COLORS.background.paper,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
        zIndex: 5,
        ...SHADOWS.sm,
    },
    outlineButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: BORDERS.radius.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[500],
        backgroundColor: COLORS.background.paper,
    },
    outlineButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary[600],
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.background.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: BORDERS.radius.xl,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.paper,
        ...SHADOWS.lg,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: COLORS.text.primary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: 16,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
        textAlign: 'center',
        color: COLORS.text.primary,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.neutral.gray[100],
    },
    saveButton: {
        backgroundColor: COLORS.primary[500],
    },
    cancelButtonText: {
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    saveButtonText: {
        fontWeight: '600',
        color: COLORS.text.onPrimary,
    },
    // Modal de inspección requerida
    inspeccionIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.warning[50],
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.warning[200],
    },
    inspeccionComponentesList: {
        width: '100%',
        backgroundColor: COLORS.warning[50],
        borderRadius: BORDERS.radius.md,
        padding: 12,
        marginTop: 8,
        marginBottom: 12,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.warning[200],
    },
    inspeccionComponentesLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.warning[700],
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    inspeccionComponenteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    inspeccionComponenteText: {
        fontSize: 14,
        color: COLORS.text.primary,
        fontWeight: '500',
        flex: 1,
    },
    inspeccionExplainer: {
        fontSize: 12,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        lineHeight: 17,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    inspeccionCTA: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary[500],
        borderRadius: BORDERS.radius.md,
        paddingVertical: 15,
        marginBottom: 10,
    },
    inspeccionCTAText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text.onPrimary,
    },
    inspeccionCancelBtn: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 12,
    },
    inspeccionCancelText: {
        fontSize: 14,
        color: COLORS.text.tertiary,
        fontWeight: '500',
    },

    // ── Fotos ────────────────────────────────────────────────────────
    fotosCounter: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text.tertiary,
    },
    fotosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    fotoThumb: {
        width: (SCREEN_W - 40 - 40 - 24) / 4,
        aspectRatio: 1,
        borderRadius: BORDERS.radius.md,
        overflow: 'hidden',
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    fotoThumbImage: {
        width: '100%',
        height: '100%',
    },
    fotoDeleteOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fotoDeleteBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 10,
        padding: 4,
    },
    fotoAddBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary[50],
        borderColor: COLORS.primary[200],
        borderStyle: 'dashed',
        gap: 4,
    },
    fotoAddText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.primary[500],
    },
    fotosHint: {
        fontSize: 11,
        color: COLORS.text.tertiary,
        lineHeight: 15,
    },

    // ── Descripción ───────────────────────────────────────────────────
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.success[50],
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    savedBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.success[700],
    },
    descripcionInput: {
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.md,
        padding: 14,
        fontSize: 14,
        color: COLORS.text.primary,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        minHeight: 120,
        marginBottom: 10,
    },
    descripcionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    descripcionCounter: {
        fontSize: 12,
        color: COLORS.text.tertiary,
    },
    saveDescBtn: {
        backgroundColor: COLORS.primary[500],
        borderRadius: BORDERS.radius.sm,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    saveDescBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text.onPrimary,
    },
});

export default SellVehicleScreen;
