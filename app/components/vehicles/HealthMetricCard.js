import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken } from '../../utils/healthFormat';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const ICON_MAP = {
    'aceite-motor':        { lib: 'MaterialCommunityIcons', name: 'oil' },
    'filtro-aceite':       { lib: 'MaterialCommunityIcons', name: 'filter' },
    'filtro-aire':         { lib: 'MaterialCommunityIcons', name: 'air-filter' },
    'filtro-cabina':       { lib: 'MaterialCommunityIcons', name: 'air-conditioner' },
    'refrigerante':        { lib: 'MaterialCommunityIcons', name: 'car-coolant-level' },
    'adblue':              { lib: 'MaterialCommunityIcons', name: 'water-plus' },
    'pastillas-freno':     { lib: 'MaterialCommunityIcons', name: 'car-brake-pad' },
    'discos-freno':        { lib: 'MaterialCommunityIcons', name: 'disc' },
    'liquido-frenos':      { lib: 'MaterialCommunityIcons', name: 'car-brake-fluid-level' },
    'neumaticos':          { lib: 'MaterialCommunityIcons', name: 'car-tire-alert' },
    'bujias':              { lib: 'MaterialCommunityIcons', name: 'spark-plug' },
    'bateria':             { lib: 'MaterialCommunityIcons', name: 'car-battery' },
    'correa-distribucion': { lib: 'MaterialCommunityIcons', name: 'link-variant' },
    'amortiguadores':      { lib: 'MaterialCommunityIcons', name: 'car-shocks' },
    'dpf':                 { lib: 'MaterialCommunityIcons', name: 'exhaust' },
    'default':             { lib: 'Ionicons',               name: 'construct-outline' },
};

const HealthMetricCard = ({ item, onPress }) => {
    const name       = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    const percentage = item.salud_porcentaje ?? item.salud ?? item.percentage ?? 0;
    const slug       = item.slug || item.componente_detail?.slug || item.icon_slug || '';
    const status     = item.nivel_alerta_display || item.status || 'NORMAL';
    const remainingKm = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;

    // historial_conocido=false → datos estimados (sin historial real de servicio)
    const esEstimado = item.historial_conocido === false;

    const color = esEstimado
        ? COLORS.neutral.gray[400]   // gris suave para estimados
        : getHealthColorToken(COLORS, percentage);

    const getIcon = () => {
        const iconConfig = ICON_MAP[slug] || ICON_MAP['default'];
        const size = 24;
        switch (iconConfig.lib) {
            case 'MaterialCommunityIcons':
                return <MaterialCommunityIcons name={iconConfig.name} size={size} color={color} />;
            case 'FontAwesome5':
                return <FontAwesome5 name={iconConfig.name} size={size} color={color} />;
            default:
                return <Ionicons name={iconConfig.name} size={size} color={color} />;
        }
    };

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: withOpacity(color, 0.12) }]}>
                {getIcon()}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{name}</Text>
                        {esEstimado && (
                            <View style={styles.estimadoBadge}>
                                <Text style={styles.estimadoText}>Estimado</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.percentage, { color }]}>{Math.round(percentage)}%</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[
                        styles.progressBar,
                        {
                            width: `${percentage}%`,
                            backgroundColor: color,
                            // línea discontinua visual para estimados (opacity)
                            opacity: esEstimado ? 0.55 : 1,
                        }
                    ]} />
                </View>

                <View style={styles.footerRow}>
                    <Text style={[styles.statusText, esEstimado && { color: COLORS.neutral.gray[400] }]}>
                        {esEstimado ? 'Sin historial' : status}
                    </Text>
                    {!esEstimado && remainingKm != null && (
                        <Text style={styles.remainingText}>Restan {remainingKm.toLocaleString()} km</Text>
                    )}
                    {esEstimado && (
                        <Text style={styles.estimadoHint}>Actualiza el km de servicio</Text>
                    )}
                </View>
            </View>

            <ChevronRight size={16} color={COLORS.text.tertiary} style={{ marginLeft: SPACING.xs }} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background.paper,
        padding: SPACING.md,
        borderRadius: BORDERS.radius.card.lg,
        marginBottom: SPACING.sm,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.xs,
        gap: 6,
    },
    title: {
        fontSize: 15,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        flexShrink: 1,
    },
    estimadoBadge: {
        backgroundColor: COLORS.neutral.gray[200],
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    estimadoText: {
        fontSize: 9,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.neutral.gray[500],
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    percentage: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    progressContainer: {
        height: 5,
        backgroundColor: COLORS.neutral.gray[200],
        borderRadius: 3,
        marginBottom: SPACING.xs,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
    },
    remainingText: {
        fontSize: 11,
        color: COLORS.text.secondary,
    },
    estimadoHint: {
        fontSize: 10,
        color: COLORS.neutral.gray[400],
        fontStyle: 'italic',
    },
});

export default HealthMetricCard;
