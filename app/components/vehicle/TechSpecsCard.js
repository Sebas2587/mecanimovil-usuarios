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
        { label: 'Kilometraje', value: `${vehicle.kilometraje?.toLocaleString() || 0} km`, icon: 'speedometer-outline' },
        { label: 'Motor', value: vehicle.tipo_motor, icon: 'flash-outline' },
        { label: 'Patente', value: vehicle.patente, icon: 'barcode-outline' },
        // Add more specs if available
    ];

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
