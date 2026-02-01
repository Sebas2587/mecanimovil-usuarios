import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';
import SPACING from '../../design-system/tokens/spacing';

const ServicesList = ({ services, onServicePress }) => {
    if (!services || services.length === 0) return null;

    const formatPrice = (price) => {
        if (price == null || price === '' || isNaN(Number(price))) return null;
        return `$${Number(price).toLocaleString('es-CL')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="construct" size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Servicios Principales</Text>
            </View>

            <View style={styles.listContainer}>
                {services.map((service, index) => {
                    const price = service.precio_desde ?? service.precio_publicado_cliente ?? service.price;
                    const formattedPrice = formatPrice(price);
                    return (
                        <View key={service.id || index} style={styles.serviceCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="construct-outline" size={20} color={COLORS.primary[500]} />
                                </View>
                                <View style={styles.headerTextContainer}>
                                    <Text style={styles.serviceName}>{service.nombre || service.name}</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                {formattedPrice ? (
                                    <View style={styles.priceRow}>
                                        <Text style={styles.startLabel}>Desde</Text>
                                        <Text style={styles.priceText}>{formattedPrice}</Text>
                                    </View>
                                ) : null}
                                <TouchableOpacity
                                    style={styles.agendarButton}
                                    onPress={() => onServicePress?.(service)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="calendar-outline" size={16} color={COLORS.base.white} style={styles.agendarIcon} />
                                    <Text style={styles.agendarButtonText}>Agendar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
    },
    listContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    serviceCard: {
        width: '48%', // Approx half with gap
        backgroundColor: COLORS.base.white,
        borderRadius: 16,
        padding: 12, // Reduced padding for compact card
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[100],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 4, // Slight bottom margin if wrapping issues occur
    },
    cardHeader: {
        flexDirection: 'column', // Stack icon and text for better space usage in grid
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.neutral.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8, // Separator from text since we stacked them
    },
    headerTextContainer: {
        width: '100%',
    },
    serviceName: {
        fontSize: 14, // Slightly smaller font for compact grid
        fontWeight: '600',
        color: COLORS.base.inkBlack,
        marginBottom: 2,
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.neutral.gray[100],
    },
    priceRow: {
        marginBottom: 10,
    },
    startLabel: {
        fontSize: 11,
        color: COLORS.text.secondary,
        marginBottom: 2,
    },
    priceText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary[500],
    },
    agendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary[500],
        borderRadius: BORDERS.radius.button?.md ?? 12,
        paddingHorizontal: SPACING.buttonPadding?.horizontal ?? 20,
        paddingVertical: SPACING.buttonPadding?.vertical ?? 14,
    },
    agendarIcon: {
        marginRight: 6,
    },
    agendarButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.base.white,
    },
});

export default ServicesList;
