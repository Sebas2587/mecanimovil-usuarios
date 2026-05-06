import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DollarSign, ChevronRight, Pencil } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const VehicleValuationCard = ({ marketValue, suggestedValue, onSellPress, onEditPress }) => {
    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value || 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <DollarSign size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Gestión de Activo</Text>
            </View>

            <View style={styles.valuesContainer}>
                <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Valor de Mercado</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.valueText}>{formatCurrency(marketValue)}</Text>
                        {(marketValue === 0 || marketValue === '0') && onEditPress && (
                            <TouchableOpacity onPress={onEditPress} style={styles.editLink}>
                                <Pencil size={12} color={COLORS.primary[500]} />
                                <Text style={styles.editLinkText}>Establecer Valor</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.valueRow}>
                    <View>
                        <Text style={styles.valueLabel}>Valor Sugerido Certificado</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>+5% por Salud</Text>
                        </View>
                    </View>
                    <Text style={[styles.valueText, styles.highlightValue]}>{formatCurrency(suggestedValue)}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={onSellPress} activeOpacity={0.8} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Gestionar Venta</Text>
                <ChevronRight size={16} color={COLORS.text.inverse} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
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
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
    valuesContainer: {
        marginBottom: SPACING.md,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: SPACING.xxs,
    },
    valueLabel: {
        fontSize: 13,
        color: COLORS.text.secondary,
    },
    valueText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    highlightValue: {
        color: COLORS.primary[600],
        fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.neutral.gray[200],
        marginVertical: 10,
    },
    badge: {
        backgroundColor: COLORS.success[50],
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.xs,
        paddingVertical: 3,
        borderRadius: BORDERS.radius.xs,
        marginTop: SPACING.xxs,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.success[700],
    },
    editLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
        marginTop: SPACING.xxs,
    },
    editLinkText: {
        color: COLORS.primary[600],
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    actionButton: {
        borderRadius: BORDERS.radius.button.md,
        paddingVertical: 13,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary[500],
    },
    actionButtonText: {
        color: COLORS.text.inverse,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        fontSize: TYPOGRAPHY.fontSize.base,
        marginRight: 6,
    },
});

export default VehicleValuationCard;
