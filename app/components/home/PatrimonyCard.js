import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';

/**
 * PatrimonyCard Component
 * Displays the user's total vehicle value, capital gain, and fleet health.
 * Features a dark gradient background with decorative elements.
 */
const PatrimonyCard = ({
    totalValue = 0,
    capitalGain = 0,
    fleetHealth = 100
}) => {
    const theme = useTheme();
    const colors = theme?.colors || {};
    const typography = theme?.typography || {};
    const spacing = theme?.spacing || {};
    const borders = theme?.borders || {};

    const styles = getStyles(colors, typography, spacing, borders);

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#111827', '#1F2937']} // Dark Slate to Dark Gray
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                {/* Decorative Background Elements */}
                <View style={styles.decoratorCircle1} />
                <View style={styles.decoratorCircle2} />

                {/* Header: Total Value */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="car-sport-outline" size={16} color={colors.primary?.[400] || '#3397C1'} />
                        </View>
                        <Text style={styles.label}>Valor Total Estimado</Text>
                    </View>
                    <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {/* Capital Gain */}
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Plusvalía Gestionada</Text>
                        <View style={styles.statValueContainer}>
                            <Ionicons
                                name={capitalGain >= 0 ? "trending-up" : "trending-down"}
                                size={14}
                                color={capitalGain >= 0 ? (colors.success?.[400] || '#33BFA7') : (colors.error?.[400] || '#EF4444')}
                            />
                            <Text style={capitalGain >= 0 ? styles.statValueSuccess : styles.statValueDanger}>
                                {capitalGain >= 0 ? '+' : ''}{formatCurrency(capitalGain)}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                            vs Mercado
                        </Text>
                    </View>

                    {/* Vertical Divider */}
                    <View style={styles.verticalDivider} />

                    {/* Fleet Health */}
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Salud de Flota</Text>
                        <View style={styles.statValueContainer}>
                            <Ionicons
                                name={fleetHealth >= 80 ? "arrow-up" : "arrow-down"}
                                size={14}
                                color={fleetHealth >= 80 ? (colors.success?.[400] || '#33BFA7') : (colors.warning?.[400] || '#F59E0B')}
                            />
                            <Text style={styles.statValueBrand}>{fleetHealth > 0 ? `${fleetHealth}%` : '--'}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: fleetHealth >= 80 ? (colors.success?.[400]) : (colors.warning?.[400]), marginTop: 2 }}>
                            {fleetHealth >= 80 ? 'Valorizada' : 'Requiere Atención'}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        marginHorizontal: spacing.md || 16,
        marginVertical: spacing.md || 16,
        borderRadius: borders.radius?.xl || 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    card: {
        borderRadius: borders.radius?.xl || 16,
        padding: spacing.lg || 20,
        overflow: 'hidden',
        position: 'relative',
    },
    decoratorCircle1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary?.[500] || '#003459',
        opacity: 0.1,
    },
    decoratorCircle2: {
        position: 'absolute',
        bottom: -30,
        left: 20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.primary?.[400] || '#3397C1',
        opacity: 0.05,
    },
    header: {
        marginBottom: spacing.md || 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs || 8,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm || 8,
    },
    label: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.neutral?.gray?.[400] || '#9CA3AF',
        fontWeight: typography.fontWeight?.medium || '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    totalValue: {
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.base?.white || '#FFFFFF',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: spacing.md || 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.neutral?.gray?.[400] || '#9CA3AF',
        marginBottom: 4,
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statValueSuccess: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.success?.[400] || '#33BFA7',
    },
    statValueDanger: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.error?.[400] || '#EF4444',
    },
    statValueBrand: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.primary?.[100] || '#CCE5EF',
    },
    verticalDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: spacing.md || 16,
    },
});

export default PatrimonyCard;
