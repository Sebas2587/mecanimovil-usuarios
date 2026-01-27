import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../design-system/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as vehicleService from '../../services/vehicle';

const MarketplaceVehicleDetailScreen = ({ route }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    // Get basic vehicle data from params
    const { vehicle } = route?.params || {};

    const [fullVehicleData, setFullVehicleData] = useState(vehicle || {});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders, insets);

    useEffect(() => {
        if (vehicle?.id) fetchVehicleDetails();
    }, [vehicle?.id]);

    const fetchVehicleDetails = async () => {
        try {
            const data = await vehicleService.getMarketplaceVehicleDetail(vehicle.id);
            // Merge basic info with detailed info (history, etc)
            setFullVehicleData(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Error fetching vehicle details:", error);
            // Alert.alert("Error", "No se pudo cargar el detalle completo del vehículo.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchVehicleDetails();
    }, []);

    // Render Health Chart (Simple Circle)
    const renderHealthChart = (score) => {
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (score / 100) * circumference;

        return (
            <View style={styles.chartContainer}>
                <Svg height="80" width="80" viewBox="0 0 80 80">
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={colors.neutral?.gray?.[200] || '#E5E7EB'}
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <Circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={colors.success?.main || '#10B981'}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin="40, 40"
                    />
                </Svg>
                <View style={styles.chartTextContainer}>
                    <Text style={styles.chartScore}>{score}%</Text>
                </View>
            </View>
        );
    };

    const [modalVisible, setModalVisible] = useState(false);

    // Derived Data
    const healthScore = fullVehicleData.health_score || 100;
    const history = fullVehicleData.history || [];
    const healthDetails = fullVehicleData.health_details || [];
    const imageUrl = fullVehicleData.foto_url || fullVehicleData.image; // Fallback to list param image
    const brand = fullVehicleData.marca_nombre || fullVehicleData.brand;
    const model = fullVehicleData.modelo_nombre || fullVehicleData.model;
    const year = fullVehicleData.year;

    const renderHealthDetailItem = (item) => {
        let iconName = 'checkmark-circle';
        let iconColor = colors.success?.main || '#10B981';

        if (item.status === 'warning') {
            iconName = 'alert-circle';
            iconColor = colors.warning?.main || '#F59E0B';
        } else if (item.status === 'critical') {
            iconName = 'close-circle';
            iconColor = colors.error?.main || '#EF4444';
        }

        return (
            <View key={item.id} style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={styles.detailContent}>
                    <Text style={styles.detailName}>{item.name}</Text>
                    <View style={styles.detailStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: iconColor }]} />
                        <Text style={[styles.detailStatusText, { color: iconColor }]}>
                            {item.status === 'normal' ? 'Buen estado' : item.status === 'warning' ? 'Atención' : 'Crítico'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.detailScore}>{item.score}%</Text>
            </View>
        );
    };

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
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.headerImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.headerImage, { backgroundColor: '#1F2937' }]} />
                    )}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'transparent', colors.background?.overlay || 'rgba(17, 24, 39, 0.9)']}
                        style={styles.headerGradient}
                    />

                    {/* Header Controls */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        {healthScore > 90 && (
                            <View style={styles.certifiedBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                <Text style={styles.certifiedText}>CERTIFICADO</Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom Info */}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{brand} {model}</Text>
                        <Text style={styles.headerSubtitle}>{year}</Text>
                    </View>
                </View>

                {/* 2. Body Content (Negative Margin) */}
                <View style={styles.bodyContainer}>

                    {/* Health Summary Card */}
                    <View style={styles.healthCard}>
                        <View style={styles.healthRow}>
                            {renderHealthChart(healthScore)}
                            <View style={styles.healthInfo}>
                                <Text style={styles.healthTitle}>Salud Mecánica</Text>
                                <Text style={styles.healthSubtitle}>Basado en historial verificado</Text>
                                <TouchableOpacity
                                    style={styles.detailButton}
                                    onPress={() => setModalVisible(true)}
                                >
                                    <Text style={styles.detailButtonText}>Ver Detalle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Service Timeline */}
                    <View style={styles.sectionHeader}>
                        <Feather name="clock" size={20} color={colors.text?.secondary} />
                        <Text style={styles.sectionTitle}>Historial de Servicios</Text>
                    </View>

                    <View style={styles.timelineContainer}>
                        <View style={styles.timelineLine} />

                        {history.length > 0 ? (
                            history.map((item) => (
                                <View key={item.id} style={styles.timelineItem}>
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineHeader}>
                                            <Text style={styles.timelineDate}>{item.date}</Text>
                                            {item.verified && (
                                                <View style={styles.verifiedTag}>
                                                    <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
                                                    <Text style={styles.verifiedTagText}>Verificado</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.serviceName}>{item.service}</Text>
                                        <View style={styles.providerBox}>
                                            <Ionicons name="build-outline" size={14} color={colors.text?.tertiary} />
                                            <Text style={styles.providerText}>{item.provider}</Text>
                                        </View>
                                        <Text style={styles.mileageText}>{item.mileage}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyHistory}>
                                <Text style={styles.emptyHistoryText}>No hay servicios registrados en MecaniMóvil.</Text>
                            </View>
                        )}
                    </View>

                    {/* Padding for Footer */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* 3. Fixed Footer */}
            <View style={styles.footerContainer}>
                <TouchableOpacity style={styles.contactButton} activeOpacity={0.8} onPress={() => Alert.alert("Contactar", "Funcionalidad próximamente")}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.contactButtonText}>Contactar al Dueño</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}>
                    Tu compra está protegida por nuestra garantía de satisfacción de 7 días.
                </Text>
            </View>

            {/* 4. Health Details Modal */}
            {modalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalle de Salud</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.text?.primary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {healthDetails.length > 0 ? (
                                healthDetails.map(item => renderHealthDetailItem(item))
                            ) : (
                                <View style={styles.emptyDetails}>
                                    <Text style={styles.emptyDetailsText}>No hay información detallada disponible.</Text>
                                </View>
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            )}
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
        height: 320,
        width: '100%',
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        backgroundColor: 'rgba(255,255,255,0.2)', // Blur effect simulation
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    certifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)', // Success green translucent
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    certifiedText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 10,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    headerInfo: {
        position: 'absolute',
        bottom: 40, // Space for overlap
        left: 20,
        right: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        marginTop: 4,
    },
    // Body
    bodyContainer: {
        marginTop: -24,
        backgroundColor: colors.background?.default || '#F3F4F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    // Health Card
    healthCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 32,
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartContainer: {
        position: 'relative',
        width: 80,
        height: 80,
        marginRight: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartTextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartScore: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text?.primary || '#111827',
    },
    healthInfo: {
        flex: 1,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginBottom: 4,
    },
    healthSubtitle: {
        fontSize: 13,
        color: colors.text?.secondary || '#6B7280',
        marginBottom: 12,
    },
    detailButton: {
        backgroundColor: colors.info?.light || '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    detailButtonText: {
        color: colors.info?.main || '#2563EB',
        fontSize: 12,
        fontWeight: '600',
    },
    // Timeline
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginLeft: 10,
    },
    timelineContainer: {
        paddingLeft: 10,
    },
    timelineLine: {
        position: 'absolute',
        top: 10,
        bottom: 0,
        left: 14, // Center of dot
        width: 2,
        backgroundColor: colors.border?.light || '#E5E7EB',
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 24,
        position: 'relative',
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary?.main || '#003459',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        marginTop: 6,
        zIndex: 1,
        marginRight: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    timelineContent: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border?.light || '#F3F4F6',
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timelineDate: {
        fontSize: 12,
        color: colors.text?.tertiary || '#9CA3AF',
        fontWeight: '500',
    },
    verifiedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success?.main || '#10B981',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    verifiedTagText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '700',
        marginLeft: 2,
        textTransform: 'uppercase',
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
        marginBottom: 8,
    },
    providerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background?.default || '#F9FAFB',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    providerText: {
        fontSize: 12,
        color: colors.text?.secondary || '#4B5563',
        marginLeft: 6,
        fontWeight: '500',
    },
    mileageText: {
        fontSize: 12,
        color: colors.text?.tertiary || '#9CA3AF',
        alignSelf: 'flex-end',
    },
    // Footer
    footerContainer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.border?.light || '#E5E7EB',
        paddingBottom: insets.bottom + 10,
    },
    contactButton: {
        backgroundColor: '#111827', // Ink Black
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    legalText: {
        fontSize: 11,
        color: colors.text?.tertiary || '#9CA3AF',
        textAlign: 'center',
        lineHeight: 16,
    },
    // Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        minHeight: '40%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border?.light || '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: colors.background?.default || '#F9FAFB',
        borderRadius: 12,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text?.primary || '#111827',
    },
    detailStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    detailStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    detailScore: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text?.primary || '#111827',
    },
    emptyDetails: {
        padding: 20,
        alignItems: 'center',
    },
    emptyDetailsText: {
        color: colors.text?.secondary || '#6B7280',
    },
});

export default MarketplaceVehicleDetailScreen;
