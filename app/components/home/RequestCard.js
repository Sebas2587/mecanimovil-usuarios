import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';
// Using linear gradient or just solid colors based on design? User said dynamic background for icon.

// 0. Category Images Mapping
const CATEGORY_IMAGES = {
    'mantención': require('../../../assets/images/mantencion_motor_icon.jpg'),
    'mantencion': require('../../../assets/images/mantencion_motor_icon.jpg'),
    'frenos': require('../../../assets/images/frenos_seguridad_icon.jpg'),
    'electricidad': require('../../../assets/images/electricidad_luces_icon.jpg'),
    'diagnóstico': require('../../../assets/images/diagnostico_icon.jpg'),
    'diagnostico': require('../../../assets/images/diagnostico_icon.jpg'),
    'estética': require('../../../assets/images/estetica_limpieza_icon.jpg'),
    'estetica': require('../../../assets/images/estetica_limpieza_icon.jpg'),
    'suspensión': require('../../../assets/images/suspension .jpg'),
    'suspension': require('../../../assets/images/suspension .jpg'),
    'aceite': require('../../../assets/images/aceite y filtro.jpg'),
    'motor': require('../../../assets/images/mantencion_motor_icon.jpg'),
    'climatización': require('../../../assets/images/aire acondicionado.jpg'),
    'aire acondicionado': require('../../../assets/images/aire acondicionado.jpg'),
};

const RequestCard = ({ request, onPress }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};

    const styles = getStyles(theme);

    // 1. Status Configuration
    const getStatusConfig = (status, offersCount) => {
        // Ofertas adicionales pendientes: priorizar sobre completada/finalizada
        if (status === 'ofertas_adicionales_pendientes') {
            return { bg: COLORS.warning[100], color: COLORS.warning[700] };
        }
        if (status === 'con_ofertas' || (offersCount && offersCount > 0)) {
            return { bg: COLORS.success[100], color: COLORS.success[600] };
        }
        if (['aceptada_por_proveedor', 'en_proceso', 'checklist_en_progreso', 'en_ejecucion'].includes(status)) {
            return { bg: COLORS.info[100], color: COLORS.info[700] };
        }
        if (status === 'completada') {
            return { bg: COLORS.success[100], color: COLORS.success[700] };
        }
        return { bg: COLORS.neutral.gray[100], color: COLORS.text.secondary };
    };

    const statusEfectivo = request.estado_efectivo ?? request.estado;
    const statusConfig = getStatusConfig(statusEfectivo, request.total_ofertas);

    // 2. Service Image/Icon
    // Priority: Service Photo -> Category Image -> Category Icon -> Default Icon
    const serviceDetail = request.servicios_solicitados_detail?.[0] || {};
    const hasPhoto = !!serviceDetail.foto;

    // Determine Category Image
    const categoryName = serviceDetail.categoria ? serviceDetail.categoria.toLowerCase() : '';
    let categoryImage = null;

    // Search for fuzzy match in keys
    if (!hasPhoto && categoryName) {
        // Try exact match first
        if (CATEGORY_IMAGES[categoryName]) {
            categoryImage = CATEGORY_IMAGES[categoryName];
        } else {
            // Try identifying key words
            const keys = Object.keys(CATEGORY_IMAGES);
            for (const key of keys) {
                if (categoryName.includes(key)) {
                    categoryImage = CATEGORY_IMAGES[key];
                    break;
                }
            }
        }
    }

    const categoryIcon = serviceDetail.categoria_icono || 'construct';

    // 3. Vehicle Info
    const vehicleName = request.vehiculo_info
        ? `${request.vehiculo_info.marca} ${request.vehiculo_info.modelo}`
        : 'Mi Vehículo';
    const plate = request.vehiculo_info?.patente;

    // 4. Offers Avatars
    // request.ofertas contains array of offers with proveedor_foto
    const offers = request.ofertas || [];
    const hasOffers = offers.length > 0;

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={onPress}
        >
            {/* Header: Service Image/Icon + Status */}
            <View style={styles.header}>
                <View style={[styles.iconContainer, (hasPhoto || categoryImage) && styles.imageContainer]}>
                    {hasPhoto ? (
                        <Image
                            source={{ uri: serviceDetail.foto }}
                            style={styles.serviceImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    ) : categoryImage ? (
                        <Image
                            source={categoryImage}
                            style={styles.serviceImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        // contentFit="contain" // Maybe better for icons? No, cover fills the box.
                        />
                    ) : (
                        <Icon name={categoryIcon} size={20} color={colors.primary?.main || COLORS.primary[500]} />
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {request.estado_display_efectivo || request.estado_display || request.estado || 'PENDIENTE'}
                    </Text>
                </View>
            </View>

            {/* Body: Title + Vehicle Info */}
            <View style={styles.body}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                    {serviceDetail.nombre || request.servicio || 'Servicio Mecánico'}
                </Text>

                <View style={styles.vehicleRow}>
                    <Icon name="car-sport" size={14} color={COLORS.text.tertiary} />
                    <Text style={styles.vehicleName} numberOfLines={1}>
                        {vehicleName}
                    </Text>
                    {plate && (
                        <View style={styles.plateBadge}>
                            <Text style={styles.plateText}>{plate}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Footer: Offers/Provider or Time */}
            <View style={styles.footer}>
                {hasOffers ? (
                    <View style={styles.offersContainer}>
                        {/* Stacked Avatars */}
                        <View style={styles.avatarStack}>
                            {offers.slice(0, 3).map((offer, i) => (
                                <View key={offer.id || i} style={[styles.miniAvatarContainer, { left: i * 14, zIndex: 3 - i }]}>
                                    {offer.proveedor_foto ? (
                                        <Image
                                            source={{ uri: offer.proveedor_foto }}
                                            style={styles.miniAvatar}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.miniAvatar, { backgroundColor: COLORS.neutral.gray[300], justifyContent: 'center', alignItems: 'center' }]}>
                                            <Icon name="person" size={14} color={COLORS.text.inverse} />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                        <Text style={styles.offersText}>
                            {request.total_ofertas} {request.total_ofertas === 1 ? 'Oferta' : 'Ofertas'}
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.noOffersText}>Esperando ofertas...</Text>
                    </View>
                )}

                {/* Always show time remaining if available */}
                {request.tiempo_restante && (
                    <View style={styles.timeBadge}>
                        <Icon name="time" size={12} color={colors.secondary?.[500] || COLORS.secondary[500]} />
                        <Text style={styles.timeText}>
                            {request.tiempo_restante}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const getStyles = (theme) => {
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    return StyleSheet.create({
        container: {
            width: 280,
            backgroundColor: COLORS.background.paper,
            borderRadius: 12,
            padding: 12,
            marginRight: 16,
            borderWidth: 1,
            borderColor: COLORS.border.light,
            shadowColor: COLORS.base.inkBlack,
            shadowOffset: { width: 0, height: 1 }, // Matched HomeVehicleCard
            shadowOpacity: 0.05,
            shadowRadius: 2, // Matched HomeVehicleCard
            elevation: 2,    // Matched HomeVehicleCard
            justifyContent: 'space-between',
            height: 170,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 16,
            backgroundColor: COLORS.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
        imageContainer: {
            backgroundColor: 'transparent',
            overflow: 'hidden',
            padding: 0,
        },
        serviceImage: {
            width: '100%',
            height: '100%',
            fontWeight: '600',
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        statusText: {
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
        body: {
            marginBottom: 16,
        },
        serviceTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: COLORS.text.primary,
            marginBottom: 4,
            lineHeight: 20,
        },
        vehicleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        vehicleName: {
            fontSize: 12,
            fontWeight: '500',
            color: COLORS.text.tertiary,
            maxWidth: 120,
        },
        plateBadge: {
            backgroundColor: COLORS.neutral.gray[100],
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        plateText: {
            fontSize: 10,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: COLORS.text.tertiary,
            fontWeight: '600',
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.background.default,
        },
        offersContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        avatarStack: {
            flexDirection: 'row',
            width: 44, // Space for stack
            height: 24,
            position: 'relative',
        },
        miniAvatarContainer: {
            position: 'absolute',
            width: 24,
            height: 24,
            borderRadius: 12,
        },
        miniAvatar: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: COLORS.neutral.gray[200],
            borderWidth: 2,
            borderColor: COLORS.background.paper,
        },
        offersText: {
            fontSize: 12,
            fontWeight: '600',
            color: COLORS.neutral.gray[700],
            marginLeft: 4,
        },
        noOffersText: {
            fontSize: 12,
            color: COLORS.neutral.gray[400],
            fontStyle: 'italic',
            fontWeight: '500',
        },
        timeBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.primary[50],
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            gap: 4,
        },
        timeText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.secondary?.[500] || COLORS.secondary[500],
        }
    });
};

export default RequestCard;
