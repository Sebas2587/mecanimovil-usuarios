import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    getRevisionTecnicaUiState,
    getRevisionTecnicaToneStyles,
    parseMesRevisionTecnica,
    saveRtRenewalAfterConfirm,
} from '../../utils/revisionTecnica';
import { COLORS } from '../../design-system/tokens/colors';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
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
                        <View style={styles.labelContainer}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.text.tertiary} />
                            <Text style={styles.rtFallbackLabel}>Mes indicado</Text>
                        </View>
                        <Text style={styles.rtFallbackValue}>{mesRaw}</Text>
                        <Text style={styles.rtFallbackHint}>
                            No pudimos calcular alertas automáticas para este texto. Verifica el mes en tu padrón.
                        </Text>
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
        <View
            style={[
                styles.rtInner,
                {
                    borderLeftWidth: 3,
                    borderLeftColor: toneStyles.accent,
                    backgroundColor: toneStyles.bg,
                },
            ]}
        >
            <View style={styles.rtHeaderRow}>
                <View style={styles.labelContainer}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={toneStyles.accent} />
                    <Text style={[styles.rtInnerLabel, { color: COLORS.text.secondary }]}>Mes de revisión</Text>
                </View>
                <Text style={[styles.rtInnerValue, { color: toneStyles.accent }]} numberOfLines={2}>
                    {mesRaw}
                </Text>
            </View>
            {ui?.hint ? <Text style={[styles.rtHint, { color: toneStyles.subtext }]}>{ui.hint}</Text> : null}
            {ui?.showConfirmButton ? (
                <TouchableOpacity
                    style={[styles.rtButton, { borderColor: toneStyles.border }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                >
                    <Ionicons name="checkmark-done-outline" size={18} color={toneStyles.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.rtButtonText, { color: toneStyles.accent }]}>
                        ¿Ya realicé la revisión técnica?
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const SpecGridCell = ({ label, value, icon }) => (
    <View style={styles.specCell}>
        <View style={styles.specCellContent}>
            <View style={styles.specCellIconWrap}>
                <Ionicons name={icon} size={16} color={COLORS.primary[500]} />
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
        marginBottom: SPACING.lg,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    specCell: {
        width: '48%',
        minHeight: 108,
        borderRadius: BORDERS.radius.card.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
        backgroundColor: COLORS.background.paper,
        ...SHADOWS.sm,
    },
    specCellContent: {
        padding: SPACING.sm,
        paddingTop: 10,
    },
    specCellIconWrap: {
        width: 28,
        height: 28,
        borderRadius: BORDERS.radius.sm,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    specCellLabel: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: SPACING.xxs,
    },
    specCellValue: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        lineHeight: 19,
    },
    rtSection: {
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: 20,
    },
    rtSectionTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    rtOuterCard: {
        borderRadius: BORDERS.radius.card.lg,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        backgroundColor: COLORS.background.paper,
        ...SHADOWS.sm,
    },
    rtInner: {
        padding: 14,
        paddingLeft: 12,
    },
    rtFallbackInner: {
        padding: 14,
    },
    rtFallbackLabel: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        marginLeft: 10,
    },
    rtFallbackValue: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        marginTop: SPACING.xs,
        marginLeft: 28,
    },
    rtFallbackHint: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        marginTop: 10,
        marginLeft: 28,
        lineHeight: 17,
    },
    rtInnerLabel: {
        fontSize: TYPOGRAPHY.fontSize.base,
        marginLeft: 10,
    },
    rtInnerValue: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        maxWidth: '52%',
        textAlign: 'right',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    rtHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    rtHint: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        lineHeight: 17,
        marginTop: 10,
        marginLeft: 28,
    },
    rtButton: {
        marginTop: 12,
        marginLeft: 28,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: BORDERS.radius.input.md,
        borderWidth: BORDERS.width.thin,
        backgroundColor: COLORS.background.paper,
    },
    rtButtonText: {
        fontSize: 13,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
});

export default TechSpecsCard;
