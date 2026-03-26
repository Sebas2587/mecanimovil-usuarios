import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const SpecRow = ({ label, value, icon, isLast }) => (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
        <View style={styles.labelContainer}>
            <Ionicons name={icon} size={18} color="rgba(255,255,255,0.35)" />
            <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value} numberOfLines={1}>{value || '-'}</Text>
    </View>
);

const TechSpecsCard = ({ vehicle }) => {
    if (!vehicle) return null;

    const specs = [
        { label: 'Año', value: vehicle.year, icon: 'calendar-outline' },
        { label: 'Versión', value: vehicle.version, icon: 'layers-outline' },
        {
            label: 'Kilometraje',
            value: vehicle.kilometraje_api && vehicle.kilometraje_api !== vehicle.kilometraje
                ? `${vehicle.kilometraje?.toLocaleString()} km (Manual)\n${vehicle.kilometraje_api?.toLocaleString()} km (API)`
                : `${vehicle.kilometraje?.toLocaleString() || 0} km`,
            icon: 'speedometer-outline'
        },
        { label: 'Transmisión', value: vehicle.transmision, icon: 'hardware-chip-outline' },
        { label: 'Cilindraje', value: vehicle.cilindraje || vehicle.motor, icon: 'flash-outline' },
        { label: 'Combustible', value: vehicle.tipo_motor, icon: 'water-outline' },
        { label: 'Puertas', value: vehicle.puertas, icon: 'car-outline' },
        { label: 'Color', value: vehicle.color, icon: 'color-palette-outline' },
        { label: 'Rev. Técnica', value: vehicle.mes_revision_tecnica, icon: 'checkmark-circle-outline' },
        { label: 'VIN', value: vehicle.vin, icon: 'finger-print-outline' },
        { label: 'Nº Motor', value: vehicle.numero_motor, icon: 'settings-outline' },
        { label: 'Patente', value: vehicle.patente, icon: 'barcode-outline' },
    ].filter(spec => spec.value);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Ficha Técnica</Text>
            <View style={styles.card}>
                {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
                {specs.map((spec, index) => (
                    <SpecRow key={index} {...spec} isLast={index === specs.length - 1} />
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    card: {
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginLeft: 10,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
        maxWidth: '50%',
        textAlign: 'right',
    }
});

export default TechSpecsCard;
