import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Switch, ActivityIndicator, Alert, Modal, TextInput, RefreshControl, Platform, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// React Query Imports
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Services
import * as vehicleService from '../../services/vehicle';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';
import { buildPublicListingUrl, buildDeepLinkListingUrl } from '../../config/publicListing';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';

const SellVehicleScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
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
            Alert.alert("Error", "No se pudo actualizar el estado de publicación.");
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

    const togglePublish = (newValue) => {
        if (newValue === true && (!sellingPrice || sellingPrice <= 0)) {
            Alert.alert("Requerido", "Debes establecer un precio de venta antes de publicar.");
            return;
        }
        togglePublishMutation.mutate(newValue);
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

    if (isLoading) {
        return (
            <View style={styles.container}>
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
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
});

export default SellVehicleScreen;
