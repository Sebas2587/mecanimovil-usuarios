import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

const QuickActionCard = ({ title, subtitle, icon, color, onPress, styles, colors }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral?.gray?.[300] || '#D1D5DB'} />
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    </TouchableOpacity>
);

const QuickActionGrid = ({
    healthScore,
    serviceCount,
    onHealthPress,
    onHistoryPress
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    return (
        <View style={styles.container}>
            {/* Health Card */}
            <QuickActionCard
                title="Salud del Motor"
                subtitle={`${healthScore || 0}% de condición óptima`}
                icon="pulse"
                color={colors.error?.[500] || '#EF4444'}
                onPress={onHealthPress}
                styles={styles}
                colors={colors}
            />

            {/* Spacer */}
            <View style={{ width: spacing.md || 16 }} />

            {/* History Card */}
            <QuickActionCard
                title="Historial"
                subtitle={`${serviceCount || 0} servicios registrados`}
                icon="time"
                color={colors.warning?.[500] || '#F59E0B'}
                onPress={onHistoryPress}
                styles={styles}
                colors={colors}
            />
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md || 16,
        marginBottom: spacing.lg || 24,
    },
    card: {
        flex: 1,
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        padding: spacing.md || 16,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
        justifyContent: 'space-between',
        minHeight: 140, // Ensure nice square-ish aspect ratio
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm || 8,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        // No margin bottom needed as it is at the bottom
    },
    title: {
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 11,
        color: colors.text?.tertiary || '#6B7280',
        lineHeight: 16,
    }
});

export default QuickActionGrid;
