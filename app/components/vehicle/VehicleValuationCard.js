import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

const VehicleValuationCard = ({ marketValue, suggestedValue, onSellPress, onEditPress }) => {
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
        }).format(value || 0);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="cash-outline" size={20} color={colors.success?.[600]} />
                </View>
                <Text style={styles.title}>Gestión de Activo</Text>
            </View>

            <View style={styles.valuesContainer}>
                <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Valor de Mercado</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.valueText}>{formatCurrency(marketValue)}</Text>
                        {(marketValue === 0 || marketValue === '0') && onEditPress && (
                            <TouchableOpacity onPress={onEditPress} style={{ marginTop: 4 }}>
                                <Text style={{ color: colors.primary?.DEFAULT || '#2563EB', fontSize: 12, fontWeight: '600' }}>
                                    Establecer Valor
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Suggested Value */}
                <View style={styles.valueRow}>
                    <View>
                        <Text style={styles.valueLabel}>Valor Sugerido Certificado</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>+5% por Salud</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.valueText, styles.highlightValue]}>{formatCurrency(suggestedValue)}</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity onPress={onSellPress}>
                <LinearGradient
                    colors={[colors.primary?.[600] || '#002A47', colors.primary?.[800] || '#001524']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                >
                    <Text style={styles.actionButtonText}>Gestionar Venta</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (colors, typography, spacing, borders) => StyleSheet.create({
    container: {
        backgroundColor: colors.background?.paper || '#FFFFFF',
        borderRadius: borders.radius?.lg || 12,
        padding: spacing.md || 16,
        marginHorizontal: spacing.md || 16,
        marginBottom: spacing.lg || 24,
        borderWidth: 1,
        borderColor: colors.border?.light || '#E5E7EB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md || 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.success?.light || '#E6F7F4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm || 8,
    },
    title: {
        fontSize: typography.fontSize?.md || 16,
        fontWeight: typography.fontWeight?.bold || '700',
        color: colors.text?.primary || '#111827',
    },
    valuesContainer: {
        marginBottom: spacing.md || 16,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    valueLabel: {
        fontSize: typography.fontSize?.sm || 14,
        color: colors.text?.secondary || '#6B7280',
    },
    valueText: {
        fontSize: typography.fontSize?.md || 16,
        fontWeight: typography.fontWeight?.semibold || '600',
        color: colors.text?.primary || '#111827',
    },
    highlightValue: {
        color: colors.success?.[600] || '#059669',
        fontWeight: typography.fontWeight?.bold || '700',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border?.light || '#F3F4F6',
        marginVertical: spacing.sm || 8,
    },
    badge: {
        backgroundColor: colors.success?.light || '#ECFDF5',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: typography.fontWeight?.medium || '500',
        color: colors.success?.[700] || '#047857',
    },
    actionButton: {
        borderRadius: borders.radius?.md || 8,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: typography.fontWeight?.medium || '500',
        fontSize: typography.fontSize?.sm || 14,
        marginRight: 8,
    }
});

export default VehicleValuationCard;
