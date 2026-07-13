import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Pencil, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../base/Button/Button';
import { getHealthColorToken } from '../../utils/healthFormat';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';

const LIQUIDEZ_SHORT = {
  facil: 'Fácil de vender',
  moderado: 'Venta moderada',
  dificil: 'Difícil de vender',
  calculando: 'Liquidez en cálculo',
};

/**
 * Valorización del vehículo (Airbnb-style) con datos del motor valor-real.
 */
const VehicleValuationCard = ({
    vehicle,
    marketValue,
    suggestedValue,
    vehicleYear,
    healthScore,
    onSellPress,
    onTransferPress,
    onEditPress,
    onHealthPress,
}) => {
    const onTransfer = onTransferPress || onSellPress;
    const { data, isLoading } = useVehicleValuationForecast(vehicle, { enabled: !!vehicle?.id });

    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value || 0);

    const valorReal = data?.valor_real_hoy || suggestedValue || marketValue || 0;
    const valorMercado = data?.meta?.valor_getapi_ajustado || marketValue || 0;
    const proyeccion1 = (data?.proyeccion || []).find((p) => p.anio_offset === 1);
    const tasaDep = data?.meta?.tasa_depreciacion_anual_pct;
    const liquidezLabel = data?.liquidez?.label;
    const confianza = data?.confianza || 'estimado';

    const yearNum = Number(vehicleYear);
    const vehicleAge = Number.isFinite(yearNum) ? new Date().getFullYear() - yearNum : null;
    const showDepreciation = Number(valorReal) > 0 && (tasaDep != null || (vehicleAge != null && vehicleAge >= 0));
    const score = Math.round(Number(healthScore) || 0);
    const healthColor = getHealthColorToken(COLORS, score);

    return (
        <View style={styles.container}>
            <Text style={[TYPOGRAPHY.styles.h5, styles.title]}>Valorización</Text>

            {isLoading ? (
                <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: SPACING.sm }} />
            ) : null}

            {onHealthPress ? (
                <TouchableOpacity
                    style={styles.healthLink}
                    onPress={onHealthPress}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Salud del vehículo ${score} por ciento. Ver detalle`}
                >
                    <View style={styles.healthLinkLeft}>
                        <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
                        <Text style={[TYPOGRAPHY.styles.captionBold, styles.healthLinkText]}>
                            Salud {score}%
                        </Text>
                        <Text style={[TYPOGRAPHY.styles.caption, styles.healthLinkHint]}>
                            influye en el valor sugerido
                        </Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                </TouchableOpacity>
            ) : null}

            <View style={styles.valueRow}>
                <Text style={[TYPOGRAPHY.styles.body, styles.valueLabel]}>Valor real estimado</Text>
                <View style={styles.valueRight}>
                    <Text style={[TYPOGRAPHY.styles.bodyBold, styles.valueText]}>
                        {formatCurrency(valorReal)}
                    </Text>
                    {confianza === 'estimado' ? (
                        <Text style={[TYPOGRAPHY.styles.caption, styles.estimadoHint]}>Estimado</Text>
                    ) : null}
                </View>
            </View>

            {liquidezLabel ? (
                <View style={styles.liquidezRow}>
                    <Text style={[TYPOGRAPHY.styles.caption, styles.valueLabel]}>Facilidad de venta</Text>
                    <Text style={[TYPOGRAPHY.styles.captionBold, styles.liquidezValue]}>
                        {LIQUIDEZ_SHORT[liquidezLabel] || liquidezLabel}
                    </Text>
                </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.valueRow}>
                <View style={styles.valueLeft}>
                    <Text style={[TYPOGRAPHY.styles.body, styles.valueLabel]}>
                        Referencia de mercado
                    </Text>
                    <View style={styles.badge}>
                        <Text style={[TYPOGRAPHY.styles.captionBold, styles.badgeText]}>
                            GetAPI + salud
                        </Text>
                    </View>
                </View>
                <View style={styles.valueRight}>
                    <Text style={[TYPOGRAPHY.styles.bodyBold, styles.suggestedValue]}>
                        {formatCurrency(valorMercado)}
                    </Text>
                    {(valorMercado === 0 || valorMercado === '0') && onEditPress ? (
                        <TouchableOpacity
                            onPress={onEditPress}
                            style={styles.editLink}
                            accessibilityRole="button"
                            accessibilityLabel="Establecer valor de mercado"
                        >
                            <Pencil size={12} color={COLORS.primary[600]} />
                            <Text style={[TYPOGRAPHY.styles.captionBold, styles.editLinkText]}>
                                Establecer valor
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {showDepreciation ? (
                <>
                    <View style={styles.divider} />
                    <View style={styles.valueRow}>
                        <Text style={[TYPOGRAPHY.styles.caption, styles.depreciationLabel]}>
                            Proyección en 1 año
                        </Text>
                        <Text style={[TYPOGRAPHY.styles.captionBold, styles.depreciationLabel]}>
                            {proyeccion1 ? formatCurrency(proyeccion1.valor) : '—'}
                            {tasaDep != null ? ` · ≈ ${tasaDep}%/año` : ''}
                        </Text>
                    </View>
                </>
            ) : null}

            <Text style={[TYPOGRAPHY.styles.caption, styles.footnote]}>
                El valor se actualiza con datos de mercado y cada servicio registrado.
            </Text>

            <Button title="Transferir vehículo" onPress={onTransfer} fullWidth />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
    },
    title: {
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    healthLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        marginBottom: SPACING.sm,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.base.soft,
        paddingHorizontal: SPACING.sm,
    },
    healthLinkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        flex: 1,
        flexWrap: 'wrap',
    },
    healthDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    healthLinkText: {
        color: COLORS.text.primary,
    },
    healthLinkHint: {
        color: COLORS.text.secondary,
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 2,
    },
    liquidezRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xxs,
    },
    liquidezValue: {
        color: COLORS.primary[600],
    },
    valueLeft: {
        flexShrink: 1,
    },
    valueRight: {
        alignItems: 'flex-end',
    },
    valueLabel: {
        color: COLORS.text.secondary,
    },
    valueText: {
        color: COLORS.text.primary,
    },
    estimadoHint: {
        color: COLORS.warning.dark,
        marginTop: 2,
    },
    suggestedValue: {
        color: COLORS.primary[600],
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.xs,
    },
    badge: {
        backgroundColor: COLORS.primary[50],
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: BORDERS.radius.pill,
        marginTop: 2,
    },
    badgeText: {
        color: COLORS.primary[600],
    },
    depreciationLabel: {
        color: COLORS.text.secondary,
    },
    editLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
        marginTop: SPACING.xxs,
    },
    editLinkText: {
        color: COLORS.primary[600],
    },
    detailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    detailLinkText: {
        color: COLORS.primary[600],
        flex: 1,
    },
    footnote: {
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
});

export default VehicleValuationCard;
