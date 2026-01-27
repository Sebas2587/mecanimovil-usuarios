import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const CertifiedVehicleCard = ({ vehiculo }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};

    if (!vehiculo) return null;

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                {/* Icono de Vehículo */}
                <View style={styles.iconWrapper}>
                    <Ionicons name="car-sport" size={24} color="#3B82F6" />
                </View>

                {/* Info Vehículo */}
                <View style={styles.infoContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.vehicleBrand}>
                            {vehiculo.marca}
                        </Text>
                        {/* Badge Certificado */}
                        <View style={styles.certifiedBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                            <Text style={styles.certifiedText}>Certificado</Text>
                        </View>
                    </View>

                    <Text style={styles.vehicleModel}>
                        {vehiculo.modelo}
                    </Text>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                            <Text style={styles.detailText}>
                                {vehiculo.year || vehiculo.anio || vehiculo.año || '----'}
                            </Text>
                        </View>

                        {(vehiculo.cilindraje) && (
                            <>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailItem}>
                                    <Ionicons name="hardware-chip-outline" size={14} color="#94A3B8" />
                                    <Text style={styles.detailText}>{vehiculo.cilindraje}L</Text>
                                </View>
                            </>
                        )}

                        <View style={styles.detailDivider} />

                        <View style={styles.detailItem}>
                            <Ionicons name="car-outline" size={14} color="#94A3B8" />
                            <Text style={styles.detailText}>{vehiculo.patente || 'Sin Patente'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Decoración de fondo (opcional, para dar textura) */}
            <View style={styles.decorationCircle} />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A', // Slate-900
        borderRadius: 24,
        padding: 16,
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative',
        // Sombra oscura
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        zIndex: 2,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue-500 transparent
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    infoContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    vehicleBrand: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8', // Slate-400
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    vehicleModel: {
        fontSize: 20,
        fontWeight: '800', // Black
        color: '#F8FAFC', // Slate-50
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate-800 translucent
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)', // Slate-700
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#E2E8F0', // Slate-200
        fontWeight: '500',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    detailDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#475569', // Slate-600
    },
    namesText: {
        fontSize: 14,
        color: '#CBD5E1', // Slate-300
        fontWeight: '400',
        marginBottom: 4,
    },
    decorationCircle: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        zIndex: 1,
    },
});

export default CertifiedVehicleCard;
