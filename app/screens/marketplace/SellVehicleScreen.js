import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Switch, ActivityIndicator, Alert, Modal, TextInput, RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Services
import * as vehicleService from '../../services/vehicle';
import Skeleton from '../../components/feedback/Skeleton/Skeleton';

const SellVehicleScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Get vehicle data from params
    const { vehicle } = route.params || {};

    // States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Marketplace Data
    const [isPublished, setIsPublished] = useState(false);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [suggestedPrice, setSuggestedPrice] = useState(0);
    const [healthBonus, setHealthBonus] = useState(0);
    const [appraisalData, setAppraisalData] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        views: 0,
        favorites: 0,
        leads: 0
    });

    // UI States
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [newPriceInput, setNewPriceInput] = useState('');

    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders, insets);

    // Initial Load
    useEffect(() => {
        if (vehicle?.id) fetchMarketplaceData();
    }, [vehicle?.id]);

    const fetchMarketplaceData = async () => {
        try {
            // Parallel Fetch: Settings + Stats + Appraisal
            const [settings, statsData, appraisal] = await Promise.all([
                vehicleService.getMarketplaceData(vehicle.id),
                vehicleService.getMarketplaceStats(vehicle.id),
                vehicleService.getVehicleAppraisal(vehicle.id)
            ]);

            setIsPublished(settings.is_published);
            setAppraisalData(appraisal);

            // Prefer appraisal data for suggested price and bonus if available
            // settings.suggested_price might be stale if it was saved long ago
            const finalSuggestedPrice = appraisal?.suggested_price || settings.suggested_price || 0;
            const finalHealthBonus = appraisal?.bonus_percentage || settings.health_bonus_percentage || 0;

            setSuggestedPrice(finalSuggestedPrice);
            setHealthBonus(finalHealthBonus);

            // If selling price is null (never set), default to suggested or 0
            setSellingPrice(settings.precio_venta || finalSuggestedPrice || 0);

            setStats({
                views: statsData.views || 0,
                favorites: statsData.favorites || 0,
                leads: statsData.leads || 0
            });
        } catch (error) {
            Alert.alert("Error", "No se pudo cargar la información del marketplace.");
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMarketplaceData();
    }, []);

    const togglePublish = async (newValue) => {
        // Optimistic Update
        const previousState = isPublished;
        setIsPublished(newValue);

        try {
            // Check if price is set before publishing
            if (newValue === true && (!sellingPrice || sellingPrice <= 0)) {
                Alert.alert("Requerido", "Debes establecer un precio de venta antes de publicar.");
                setIsPublished(previousState);
                return;
            }

            await vehicleService.updateMarketplaceData(vehicle.id, {
                is_published: newValue
            });
        } catch (error) {
            // Rollback
            setIsPublished(previousState);
            Alert.alert("Error", "No se pudo actualizar el estado de publicación.");
        }
    };

    const handleSavePrice = async () => {
        const priceValue = parseInt(newPriceInput.replace(/[^0-9]/g, ''));

        if (isNaN(priceValue) || priceValue <= 0) {
            Alert.alert("Error", "Ingresa un precio válido.");
            return;
        }

        try {
            await vehicleService.updateMarketplaceData(vehicle.id, {
                precio_venta: priceValue
            });
            setSellingPrice(priceValue);
            setPriceModalVisible(false);
            Alert.alert("Éxito", "Precio de venta actualizado.");
        } catch (error) {
            Alert.alert("Error", "No se pudo actualizar el precio.");
        }
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

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                {/* Header Skeleton */}
                <View style={{ height: 200, backgroundColor: '#1F2937' }}>
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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
            >
                {/* 1. Immersive Header */}
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

                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={[
                            styles.statusBadge,
                            isPublished ? styles.statusPublished : styles.statusDraft
                        ]}>
                            <View style={[
                                styles.statusDot,
                                isPublished ? styles.dotPublished : styles.dotDraft
                            ]} />
                            <Text style={[
                                styles.statusText,
                                isPublished ? styles.textPublished : styles.textDraft
                            ]}>
                                {isPublished ? 'PUBLICADO' : 'BORRADOR'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerSubtitle}>Gestión de Venta</Text>
                        <Text style={styles.headerTitle}>
                            {vehicle?.marca_nombre || vehicle?.marca} {vehicle?.modelo_nombre || vehicle?.modelo}
                        </Text>
                        <Text style={styles.headerSubtitle}>{vehicle?.year} • {vehicle?.patente}</Text>
                    </View>
                </View>

                {/* 2. Body Content */}
                <View style={styles.bodyContainer}>

                    {/* Price Control Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Precio de Venta</Text>
                            <TouchableOpacity style={styles.editButton} onPress={openPriceModal}>
                                <Ionicons name="pencil" size={16} color={colors.primary?.main || '#003459'} />
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
                                <Text style={styles.insightValue}>+{healthBonus}%</Text>
                            </View>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(healthBonus * 10, 100)}%` }]} />
                            </View>
                            <Text style={styles.insightDescription}>
                                Tu auto tiene una bonificación por buen estado de salud.
                            </Text>
                        </View>
                    </View>

                    {/* Visibility Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="eye-outline" size={20} color={colors.text?.primary || '#111827'} />
                            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Visibilidad en Marketplace</Text>
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>Publicar Vehículo</Text>
                            <Switch
                                trackColor={{ false: colors.neutral?.gray?.[300] || '#D1D5DB', true: colors.success?.main || '#10B981' }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={colors.neutral?.gray?.[300] || '#D1D5DB'}
                                onValueChange={togglePublish}
                                value={isPublished}
                            />
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.toggleRow}>
                            <Text style={[styles.toggleLabel, { color: colors.text?.disabled || '#9CA3AF' }]}>Destacar Publicación</Text>
                            <Switch
                                trackColor={{ false: '#E5E7EB', true: '#E5E7EB' }}
                                thumbColor={'#F3F4F6'}
                                value={false}
                                disabled={true}
                            />
                        </View>
                    </View>

                    {/* Performance Card (Dark) - Only show if published or has stats */}
                    {(isPublished || stats.views > 0) && (
                        <View style={styles.darkCard}>
                            {/* Decorative Circle */}
                            <View style={styles.decorativeCircle} />

                            <View style={styles.cardHeaderRow}>
                                <Ionicons name="stats-chart-outline" size={20} color={colors.primary?.light || '#38BDF8'} />
                                <Text style={styles.darkCardTitle}>Rendimiento</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.views}</Text>
                                    <Text style={styles.statLabel}>VISTAS</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.favorites}</Text>
                                    <Text style={styles.statLabel}>FAVORITOS</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.leads}</Text>
                                    <Text style={styles.statLabel}>INTERESADOS</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Padding before footer */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* 3. Footer Actions */}
            <View style={styles.footerContainer}>
                <TouchableOpacity style={styles.outlineButton} onPress={() => Alert.alert("Compartir", "Funcionalidad próximamente")}>
                    <Ionicons name="share-outline" size={20} color={colors.text?.primary || '#374151'} />
                    <Text style={styles.outlineButtonText}>Compartir Ficha</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.textButton}>
                    <Text style={styles.textButtonText}>Eliminar Publicación</Text>
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
                        <Text style={styles.modalTitle}>Editar Precio de Venta</Text>
                        <Text style={styles.modalSubtitle}>
                            Define el precio al que quieres vender tu vehículo.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 8000000"
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

const getStyles = (colors, typography, spacing, borders, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background?.default || '#F3F4F6',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    // Header
    headerContainer: {
        height: 200,
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
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
        backgroundColor: 'rgba(0,0,0,0.3)', // Extra overlay
    },
    topBar: {
        position: 'absolute',
        top: insets.top + 10,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
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
        backgroundColor: 'rgba(16, 185, 129, 0.9)', // More solid for visibility
        borderWidth: 1,
        borderColor: colors.success?.main || '#10B981',
    },
    statusDraft: {
        backgroundColor: 'rgba(75, 85, 99, 0.8)', // More solid
        borderWidth: 1,
        borderColor: colors.neutral?.gray?.[400] || '#9CA3AF',
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
    headerInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
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
    // Body
    bodyContainer: {
        marginTop: -16,
        backgroundColor: colors.background?.default || '#F3F4F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
        color: colors.text?.primary || '#111827',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    editButtonText: {
        color: colors.primary?.main || '#003459',
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
        color: colors.text?.primary || '#111827',
        marginTop: 6,
        marginRight: 2,
    },
    priceValue: {
        fontSize: 32, // Slightly smaller to prevent wrap
        fontWeight: '800',
        color: colors.text?.primary || '#111827',
    },
    suggestedPrice: {
        textAlign: 'center',
        fontSize: 13,
        color: colors.text?.secondary || '#6B7280',
        marginBottom: 20,
    },
    insightBox: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
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
        color: '#1E40AF',
    },
    insightValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.success?.main || '#10B981',
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#DBEAFE',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBarFill: {
        height: 6,
        backgroundColor: '#2563EB',
        borderRadius: 3,
    },
    insightDescription: {
        fontSize: 11,
        color: '#3B82F6',
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
        color: colors.text?.primary || '#374151',
    },
    separator: {
        height: 1,
        backgroundColor: colors.border?.light || '#F3F4F6',
        marginVertical: 12,
    },
    // Performance Card
    darkCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
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
    // Footer
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.border?.light || '#E5E7EB',
        paddingBottom: insets.bottom + 10,
    },
    outlineButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border?.medium || '#D1D5DB',
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
    },
    outlineButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text?.primary || '#374151',
    },
    textButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    textButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error?.main || '#EF4444',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#1F2937',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
        textAlign: 'center',
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
        backgroundColor: '#003459', // Primary Brand Color
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
