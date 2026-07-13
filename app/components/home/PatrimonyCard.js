import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS } from '../../design-system/tokens';
import Icon from '../base/Icon/Icon';

/**
 * PatrimonyCard — valor total de flota, plusvalía y salud (estilo Airbnb, sin gradientes).
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
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.iconContainer}>
                            <Icon name="car-sport-outline" size={16} color={colors.primary?.[500] || COLORS.primary[500]} />
                        </View>
                        <Text style={styles.label}>Valor Total Estimado</Text>
                    </View>
                    <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Plusvalía Gestionada</Text>
                        <View style={styles.statValueContainer}>
                            <Icon
                                name={capitalGain >= 0 ? "trending-up" : "trending-down"}
                                size={14}
                                color={capitalGain >= 0 ? (colors.success?.[500] || COLORS.success[500]) : (colors.error?.[500] || COLORS.error[500])}
                            />
                            <Text style={capitalGain >= 0 ? styles.statValueSuccess : styles.statValueDanger}>
                                {capitalGain >= 0 ? '+' : ''}{formatCurrency(capitalGain)}
                            </Text>
                        </View>
                        <Text style={styles.statHint}>vs Mercado</Text>
                    </View>

                    <View style={styles.verticalDivider} />

                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Salud de Flota</Text>
                        <View style={styles.statValueContainer}>
                            <Icon
                                name={fleetHealth >= 70 ? "arrow-up" : "arrow-down"}
                                size={14}
                                color={fleetHealth >= 70 ? (colors.success?.[500] || COLORS.success[500]) : (colors.warning?.[500] || COLORS.warning[500])}
                            />
                            <Text style={styles.statValueBrand}>{fleetHealth > 0 ? `${fleetHealth}%` : '--'}</Text>
                        </View>
                        <Text style={[
                            styles.statHint,
                            { color: fleetHealth >= 70 ? (colors.success?.[500] || COLORS.success[500]) : (colors.warning?.[500] || COLORS.warning[500]) }
                        ]}>
                            {fleetHealth >= 70 ? 'Valorizada' : 'Requiere Atención'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        marginHorizontal: spacing.md || 16,
        marginVertical: spacing.md || 16,
        borderRadius: borders.radius?.xl || 16,
    },
    card: {
        borderRadius: borders.radius?.xl || 16,
        padding: spacing.lg || 20,
        backgroundColor: colors.background?.paper || COLORS.background.paper,
        borderWidth: 1,
        borderColor: colors.border?.light || COLORS.border.light,
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
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm || 8,
    },
    label: {
        fontSize: typography.fontSize?.xs || 12,
        color: colors.text?.secondary || COLORS.text.secondary,
        fontWeight: typography.fontWeight?.medium || '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    totalValue: {
        fontSize: typography.fontSize?.['3xl'] || 28,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || COLORS.text.primary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border?.light || COLORS.border.light,
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
        color: colors.text?.secondary || COLORS.text.secondary,
        marginBottom: 4,
    },
    statHint: {
        fontSize: 10,
        color: colors.text?.tertiary || COLORS.text.tertiary,
        marginTop: 2,
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statValueSuccess: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.success?.[500] || COLORS.success[500],
    },
    statValueDanger: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.error?.[500] || COLORS.error[500],
    },
    statValueBrand: {
        marginLeft: 6,
        fontSize: typography.fontSize?.base || 14,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.primary?.[600] || COLORS.primary[600],
    },
    verticalDivider: {
        width: 1,
        backgroundColor: colors.border?.light || COLORS.border.light,
        marginHorizontal: spacing.md || 16,
    },
});

export default PatrimonyCard;
