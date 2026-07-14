import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';
import Button from '../base/Button/Button';
import { useVehicleValuationForecast } from '../../hooks/useVehicleValuationForecast';
import {
  VehicleValueHorizonRow,
} from './VehicleValueSignals';

/**
 * Valorización del vehículo — layout mínimo: valor hoy, proyección, CTA.
 */
const VehicleValuationCard = ({
    vehicle,
    marketValue,
    suggestedValue,
    healthScore,
    onSellPress,
    onTransferPress,
    onEditPress,
}) => {
    const onTransfer = onTransferPress || onSellPress;
    const { data, isLoading } = useVehicleValuationForecast(vehicle, { enabled: !!vehicle?.id });

    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value || 0);

    const valorReal = data?.valor_real_hoy || suggestedValue || marketValue || 0;
    const valorMercado = data?.meta?.valor_getapi_ajustado || marketValue || 0;
    const tasaDep = data?.meta?.tasa_depreciacion_anual_pct;
    const score = Math.round(Number(healthScore) || data?.meta?.salud_aplicada || 0);
    const needsMarketValue = (valorMercado === 0 || valorMercado === '0') && onEditPress;

    return (
        <View style={styles.container}>
            <Text style={[TYPOGRAPHY.styles.h5, styles.title]}>Valorización</Text>

            {isLoading ? (
                <ActivityIndicator color={COLORS.primary[500]} style={{ marginVertical: SPACING.sm }} />
            ) : null}

            <Text style={styles.heroValue}>{formatCurrency(valorReal)}</Text>

            <VehicleValueHorizonRow
                valorHoy={valorReal}
                tasaAnualPct={tasaDep}
                healthScore={score}
                fuenteTasa={data?.meta?.fuente_tasa}
                proyeccion={data?.proyeccion}
            />

            {needsMarketValue ? (
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

            <View style={styles.ctaWrap}>
                <Button title="Transferir vehículo" onPress={onTransfer} fullWidth />
            </View>
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
    heroValue: {
        ...TYPOGRAPHY.styles.h3,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    editLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
        marginTop: SPACING.sm,
    },
    editLinkText: {
        color: COLORS.primary[600],
    },
    ctaWrap: {
        marginTop: SPACING.md,
    },
});

export default VehicleValuationCard;
