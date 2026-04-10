import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
    getRevisionTecnicaUiState,
    getRevisionTecnicaToneStyles,
    parseMesRevisionTecnica,
    saveRtRenewalAfterConfirm,
} from '../../utils/revisionTecnica';

const GLASS_FILL =
    Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';

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
                {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_FILL }]} pointerEvents="none" />
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
                            <Ionicons name="checkmark-circle-outline" size={18} color="rgba(255,255,255,0.45)" />
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
                    <Text style={[styles.rtInnerLabel, { color: 'rgba(255,255,255,0.75)' }]}>Mes de revisión</Text>
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
        {Platform.OS === 'ios' && <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_FILL }]} pointerEvents="none" />
        <View style={styles.specCellContent}>
            <View style={styles.specCellIconWrap}>
                <Ionicons name={icon} size={16} color="rgba(147,197,253,0.85)" />
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
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    specCell: {
        width: '48%',
        minHeight: 108,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 12,
        overflow: 'hidden',
    },
    specCellContent: {
        padding: 12,
        paddingTop: 10,
    },
    specCellIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(147,197,253,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    specCellLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    specCellValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F9FAFB',
        lineHeight: 19,
    },
    rtSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    rtSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    rtOuterCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    rtInner: {
        padding: 14,
        paddingLeft: 12,
    },
    rtFallbackInner: {
        padding: 14,
    },
    rtFallbackLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginLeft: 10,
    },
    rtFallbackValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 8,
        marginLeft: 28,
    },
    rtFallbackHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 10,
        marginLeft: 28,
        lineHeight: 17,
    },
    rtInnerLabel: {
        fontSize: 14,
        marginLeft: 10,
    },
    rtInnerValue: {
        fontSize: 14,
        fontWeight: '600',
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
        fontSize: 12,
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
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    rtButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default TechSpecsCard;
