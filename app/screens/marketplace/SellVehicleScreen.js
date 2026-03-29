import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Switch, ActivityIndicator, Alert, Modal, TextInput, RefreshControl, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// React Query Imports
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Services
import * as vehicleService from '../../services/vehicle';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';

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

    const Background = () => (
        <>
            <LinearGradient colors={['#030712', '#0a1628', '#030712']} style={StyleSheet.absoluteFill} />
            <View style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(16,185,129,0.08)' }} />
            <View style={{ position: 'absolute', bottom: 100, left: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(99,102,241,0.06)' }} />
        </>
    );

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Background />
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                {/* Header Skeleton */}
                <View style={{ height: 228, backgroundColor: '#0a1628' }}>
                    <View style={{ position: 'absolute', top: insets.top + 10, left: 20 }}>
                        <Skeleton width={40} height={40} borderRadius={20} style={{ opacity: 0.2 }} />
                    </View>
                    <View style={{ position: 'absolute', bottom: 20, left: 20 }}>
                        <Skeleton width={200} height={32} style={{ marginBottom: 8, opacity: 0.2 }} />
                        <Skeleton width={120} height={20} style={{ opacity: 0.2 }} />
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
                        <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 }} />
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
            <Background />
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FFF" />}
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
                            <View style={[styles.headerImage, { backgroundColor: '#1F2937' }]} />
                        )}
                        <View style={styles.overlay} />
                    </View>

                    {/* Bandas oscuras bajo la zona del back: los textos solo en la parte baja del header */}
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
                                <Ionicons name="pencil" size={16} color="#93C5FD" />
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
                            <Ionicons name="eye-outline" size={20} color="#E5E7EB" />
                            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Visibilidad en Marketplace</Text>
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>Publicar Vehículo</Text>
                            <Switch
                                trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#10B981' }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor="rgba(255,255,255,0.15)"
                                onValueChange={togglePublish}
                                value={isPublished}
                            />
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.toggleRow}>
                            <Text style={[styles.toggleLabel, styles.toggleLabelDisabled]}>Destacar Publicación</Text>
                            <Switch
                                trackColor={{ false: '#E5E7EB', true: '#E5E7EB' }}
                                thumbColor={'#F3F4F6'}
                                value={false}
                                disabled={true}
                            />
                        </View>
                    </View>

                    {/* Performance Card (Dark) - Only show if published or has stats */}
                    {(isPublished || stats.views > 0 || offersCount > 0) && (
                        <View style={styles.darkCard}>
                            {/* Decorative Circle */}
                            <View style={styles.decorativeCircle} />

                            <View style={styles.cardHeaderRow}>
                                <Ionicons name="stats-chart-outline" size={20} color="#38BDF8" />
                                <Text style={styles.darkCardTitle}>Rendimiento</Text>
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
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
                    onPress={() => Alert.alert('Compartir', 'Funcionalidad próximamente')}
                >
                    <Ionicons name="share-outline" size={20} color="rgba(255,255,255,0.85)" />
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
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPriceModalVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {Platform.OS === 'ios' && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
                        <View style={styles.modalGlassFill} pointerEvents="none" />
                        <Text style={styles.modalTitle}>Editar Precio de Venta</Text>
                        <Text style={styles.modalSubtitle}>
                            Define el precio al que quieres vender tu vehículo.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 8000000"
                            placeholderTextColor="rgba(255,255,255,0.35)"
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
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const GLASS = Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';

const getStyles = (insets, safeTop = insets.top) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    // Header (más alto para que la zona de textos no quede comprimida bajo el overlay)
    headerContainer: {
        height: 228,
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000', // Adjusted: ensure black bg behind image
    },
    headerImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6, // Adjusted opacity for legibility
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
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
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backdropFilter: 'blur(10px)',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusPublished: {
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        borderWidth: 1,
        borderColor: '#10B981',
    },
    statusDraft: {
        backgroundColor: 'rgba(75, 85, 99, 0.8)',
        borderWidth: 1,
        borderColor: '#9CA3AF',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    dotPublished: {
        backgroundColor: '#FFFFFF',
    },
    dotDraft: {
        backgroundColor: '#D1D5DB',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textPublished: {
        color: '#FFFFFF',
    },
    textDraft: {
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 2,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
    },
    bodyContainer: {
        marginTop: -16,
        backgroundColor: '#030712',
        zIndex: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 32,
    },
    card: {
        backgroundColor: GLASS,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
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
        color: '#FFFFFF',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    editButtonText: {
        color: '#93C5FD',
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
        color: 'rgba(255,255,255,0.85)',
        marginTop: 6,
        marginRight: 2,
    },
    priceValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    suggestedPrice: {
        textAlign: 'center',
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 20,
    },
    insightBox: {
        backgroundColor: 'rgba(59,130,246,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(147,197,253,0.25)',
        borderRadius: 12,
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
        color: '#93C5FD',
    },
    insightValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6EE7B7',
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBarFill: {
        height: 6,
        backgroundColor: '#007EA7',
        borderRadius: 3,
    },
    insightDescription: {
        fontSize: 11,
        color: 'rgba(147,197,253,0.9)',
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
        color: 'rgba(255,255,255,0.9)',
    },
    toggleLabelDisabled: {
        color: 'rgba(255,255,255,0.35)',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 12,
    },
    // Performance Card
    darkCard: {
        backgroundColor: 'rgba(15,23,42,0.85)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    decorativeCircle: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        zIndex: 0,
    },
    darkCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
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
        backgroundColor: 'rgba(3,7,18,0.92)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        zIndex: 5,
    },
    outlineButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    outlineButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: GLASS,
    },
    modalGlassFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: GLASS,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#FFFFFF',
        zIndex: 1,
    },
    modalSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: 20,
        zIndex: 1,
    },
    input: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
        textAlign: 'center',
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        zIndex: 1,
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
        backgroundColor: '#F3F4F6',
    },
    saveButton: {
        backgroundColor: '#007EA7',
    },
    cancelButtonText: {
        fontWeight: '600',
        color: '#4B5563',
    },
    saveButtonText: {
        fontWeight: '600',
        color: 'white',
    }
});

export default SellVehicleScreen;
