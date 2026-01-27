import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';

const ServicesList = ({ services }) => {
    // Mock data if empty
    const servicesList = services && services.length > 0 ? services : [
        { id: 1, nombre: 'Diagnóstico General', precio_desde: 15000 },
        { id: 2, nombre: 'Cambio de Aceite', precio_desde: 35000 },
        { id: 3, nombre: 'Revisión de Frenos', precio_desde: 25000 }
    ];

    const formatPrice = (price) => {
        if (!price) return 'Consultar';
        return `$${price.toLocaleString('es-CL')}`;
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
                {servicesList.map((service, index) => (
                    <View key={service.id || index} style={styles.serviceCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.iconBox}>
                                <Ionicons name="construct-outline" size={20} color={COLORS.primary[500]} />
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.serviceName}>{service.nombre || service.name}</Text>
                                {/* Description could go here if available */}
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.startLabel}>Desde</Text>
                            <Text style={styles.priceText}>
                                {formatPrice(service.precio_desde || service.price)}
                            </Text>
                        </View>
                    </View>
                ))}
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
        flexDirection: 'column', // Stack "Desde" and price for better readability in narrow cards
        alignItems: 'flex-start',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.neutral.gray[100],
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
});

export default ServicesList;
