import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const SpecRow = ({ label, value, icon, isLast, styles, colors }) => (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
        <View style={styles.labelContainer}>
            <Ionicons name={icon} size={18} color={colors.text?.tertiary || '#9CA3AF'} />
            <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value} numberOfLines={1}>{value || '-'}</Text>
    </View>
);

const TechSpecsCard = ({ vehicle }) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

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
    ].filter(spec => spec.value); // Optional: filter out undefined/null if desired, or keep to show missing info

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Ficha Técnica</Text>
            <View style={styles.card}>
                {specs.map((spec, index) => (
                    <SpecRow
                        key={index}
                        {...spec}
                        isLast={index === specs.length - 1}
                        styles={styles}
                        colors={colors}
                    />
                ))}
            </View>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md || 16,
        marginBottom: spacing.xl || 32,
    },
    headerTitle: {
        fontSize: typography.fontSize?.lg || 18,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
        marginBottom: spacing.sm || 12,
    },
    card: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md || 16,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border?.light || '#F3F4F6',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: typography.fontSize?.base || 14,
        color: colors.text?.secondary || '#6B7280',
        marginLeft: spacing.sm || 8,
    },
    value: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.medium || '500',
        color: colors.text?.primary || '#111827',
    }
});

export default TechSpecsCard;
