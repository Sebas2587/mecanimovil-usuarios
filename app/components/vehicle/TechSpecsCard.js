import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from '../base/Icon/Icon';
import {
    getRevisionTecnicaUiState,
    getRevisionTecnicaToneStyles,
    parseMesRevisionTecnica,
    saveRtRenewalAfterConfirm,
} from '../../utils/revisionTecnica';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

/**
 * Sección aparte (perfil vehículo): revisión técnica con reglas de vencimiento y confirmación.
 */
export function RevisionTecnicaCard({ vehicle, revisionRenewalDueISO = null, onRevisionRenewalConfirmed }) {
    if (!vehicle?.mes_revision_tecnica) return null;

    const mesRaw = vehicle.mes_revision_tecnica;
    const rtParsed = parseMesRevisionTecnica(mesRaw);

    return (
        <View style={styles.rtSection}>
            <Text style={styles.rtSectionTitle}>Revisión técnica</Text>
            <View style={styles.rtOuterCard}>
                {rtParsed !== null ? (
                    <RevisionTecnicaInner
                        vehicle={vehicle}
                        mesRaw={mesRaw}
                        renewalDueISO={revisionRenewalDueISO}
                        onRenewalSaved={onRevisionRenewalConfirmed}
                    />
                ) : (
                    <View style={styles.rtFallbackInner}>
                        <Text style={styles.rtInnerLabel}>Mes indicado</Text>
                        <Text style={styles.rtInnerValue}>{mesRaw}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const RevisionTecnicaInner = ({ vehicle, mesRaw, renewalDueISO, onRenewalSaved }) => {
    const ui = getRevisionTecnicaUiState(mesRaw, renewalDueISO, { publicViewer: false });
    const toneStyles = getRevisionTecnicaToneStyles(ui?.tone || 'calm');

    const handleConfirm = () => {
        Alert.alert(
            'Revisión técnica',
            '¿Ya realizaste la Revisión Técnica en planta para este período?',
            [
                { text: 'Aún no', style: 'cancel' },
                {
                    text: 'Sí, confirmar',
                    onPress: async () => {
                        try {
                            const iso = await saveRtRenewalAfterConfirm(vehicle.id, mesRaw);
                            if (iso) onRenewalSaved?.(iso);
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo guardar la confirmación. Intenta de nuevo.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.rtInner}>
            <View style={styles.rtHeaderRow}>
                <View style={styles.rtTextCol}>
                    <Text style={styles.rtInnerLabel}>Mes de revisión</Text>
                    <Text style={styles.rtInnerValue} numberOfLines={1}>
                        {mesRaw}
                    </Text>
                </View>
                {ui?.hint ? (
                    <View style={[styles.rtChip, { backgroundColor: toneStyles.chipBg }]}>
                        <Text style={[styles.rtChipText, { color: toneStyles.chipText }]} numberOfLines={1}>
                            {ui.hint}
                        </Text>
                    </View>
                ) : null}
            </View>
            {ui?.showConfirmButton ? (
                <TouchableOpacity
                    style={styles.rtButton}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                >
                    <Text style={styles.rtButtonText}>Confirmar revisión</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const SpecGridCell = ({ label, value, icon }) => (
    <View style={styles.specCell}>
        <View style={styles.specCellContent}>
            <View style={styles.specCellIconWrap}>
                <Icon name={icon} size={16} color={COLORS.primary[500]} />
            </View>
            <Text style={styles.specCellLabel} numberOfLines={2}>
                {label}
            </Text>
            <Text style={styles.specCellValue} numberOfLines={4}>
                {value || '—'}
            </Text>
        </View>
    </View>
);

/**
 * Ficha técnica en grid 2 columnas (sin revisión técnica; va en RevisionTecnicaCard).
 */
const TechSpecsCard = ({ vehicle }) => {
    if (!vehicle) return null;

    const specs = [
        { label: 'Año', value: vehicle.year, icon: 'calendar-outline' },
        { label: 'Versión', value: vehicle.version, icon: 'layers-outline' },
        {
            label: 'Kilometraje',
            value:
                vehicle.kilometraje_api && vehicle.kilometraje_api !== vehicle.kilometraje
                    ? `${vehicle.kilometraje?.toLocaleString()} km (Manual)\n${vehicle.kilometraje_api?.toLocaleString()} km (API)`
                    : `${vehicle.kilometraje?.toLocaleString() || 0} km`,
            icon: 'speedometer-outline',
        },
        { label: 'Transmisión', value: vehicle.transmision, icon: 'hardware-chip-outline' },
        { label: 'Cilindraje', value: vehicle.cilindraje || vehicle.motor, icon: 'flash-outline' },
        { label: 'Combustible', value: vehicle.tipo_motor, icon: 'water-outline' },
        { label: 'Puertas', value: vehicle.puertas, icon: 'car-outline' },
        { label: 'Color', value: vehicle.color, icon: 'color-palette-outline' },
        { label: 'VIN', value: vehicle.vin, icon: 'finger-print-outline' },
        { label: 'Nº Motor', value: vehicle.numero_motor, icon: 'settings-outline' },
        { label: 'Patente', value: vehicle.patente, icon: 'barcode-outline' },
    ].filter((spec) => spec.value);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Ficha técnica</Text>
            <View style={styles.grid}>
                {specs.map((spec) => (
                    <SpecGridCell key={spec.label} label={spec.label} value={String(spec.value)} icon={spec.icon} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.md,
    },
    headerTitle: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    specCell: {
        width: '48%',
        minHeight: 96,
        borderRadius: BORDERS.radius.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        backgroundColor: COLORS.background.paper,
    },
    specCellContent: {
        padding: SPACING.sm,
        paddingTop: 10,
    },
    specCellIconWrap: {
        width: 28,
        height: 28,
        borderRadius: BORDERS.radius.sm,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    specCellLabel: {
        ...TYPOGRAPHY.styles.small,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: SPACING.xxs,
    },
    specCellValue: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    rtSection: {
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.md,
    },
    rtSectionTitle: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    rtOuterCard: {
        borderRadius: BORDERS.radius.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        backgroundColor: COLORS.background.paper,
    },
    rtInner: {
        padding: SPACING.md,
    },
    rtFallbackInner: {
        padding: SPACING.md,
    },
    rtTextCol: {
        flex: 1,
        paddingRight: SPACING.sm,
    },
    rtInnerLabel: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.tertiary,
    },
    rtInnerValue: {
        ...TYPOGRAPHY.styles.bodyBold,
        color: COLORS.text.primary,
        marginTop: 2,
    },
    rtHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rtChip: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDERS.radius.pill,
        maxWidth: '48%',
    },
    rtChipText: {
        ...TYPOGRAPHY.styles.captionBold,
        fontSize: 12,
    },
    rtButton: {
        marginTop: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDERS.radius.lg,
        backgroundColor: COLORS.primary[500],
    },
    rtButtonText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.base.white,
    },
});

export default TechSpecsCard;
