import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ChevronRight,
  Wrench,
  Droplet,
  Filter,
  Wind,
  AirVent,
  Thermometer,
  Droplets,
  CircleStop,
  Disc,
  CircleAlert,
  Zap,
  Battery,
  Link,
  ArrowUpDown,
  Cloud,
} from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken } from '../../utils/healthFormat';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const COMPONENT_ICON_MAP = {
    'aceite-motor': Droplet,
    'filtro-aceite': Filter,
    'filtro-aire': Wind,
    'filtro-cabina': AirVent,
    refrigerante: Thermometer,
    adblue: Droplets,
    'pastillas-freno': CircleStop,
    'discos-freno': Disc,
    'liquido-frenos': Droplet,
    neumaticos: CircleAlert,
    bujias: Zap,
    bateria: Battery,
    'correa-distribucion': Link,
    amortiguadores: ArrowUpDown,
    dpf: Cloud,
};

/**
 * Nivel de confianza del historial según fuente del backend.
 *  - 'alta'  → CHECKLIST / REGISTRO_INICIAL (taller verificó)
 *  - 'media' → USUARIO_DECLARADO (el usuario declaró retroactivamente)
 *  - 'baja'  → ENGINE (estimado por el motor sin datos reales)
 */
const resolveConfianza = (item) => {
    if (item.confianza_historial) return item.confianza_historial;
    const fuente = item.historial_fuente;
    if (fuente === 'CHECKLIST' || fuente === 'REGISTRO_INICIAL') return 'alta';
    if (fuente === 'USUARIO_DECLARADO') return 'media';
    if (item.historial_conocido === false) return 'baja';
    return 'alta';
};

const HealthMetricCard = ({ item, onPress }) => {
    const name       = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    const percentage = item.salud_porcentaje ?? item.salud ?? item.percentage ?? 0;
    const slug       = item.slug || item.componente_detail?.slug || item.icon_slug || '';
    const status     = item.nivel_alerta_display || item.status || 'NORMAL';
    const remainingKm = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;

    const confianza  = resolveConfianza(item);
    const esEstimado = confianza === 'baja';
    const esDeclarado = confianza === 'media';

    const color = esEstimado
        ? COLORS.neutral.gray[400]
        : getHealthColorToken(COLORS, percentage);

    const getIcon = () => {
        const Cmp = COMPONENT_ICON_MAP[slug] || Wrench;
        return <Cmp size={24} color={color} strokeWidth={1.75} />;
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
                        {esDeclarado && (
                            <View style={styles.declaradoBadge}>
                                <Text style={styles.declaradoText}>Declarado</Text>
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
                    <Text style={[
                        styles.statusText,
                        esEstimado && { color: COLORS.neutral.gray[400] },
                        esDeclarado && { color: COLORS.warning[700] },
                    ]}>
                        {esEstimado ? 'Sin historial' : status}
                    </Text>
                    {!esEstimado && remainingKm != null && (
                        <Text style={styles.remainingText}>Restan {remainingKm.toLocaleString()} km</Text>
                    )}
                    {esEstimado && (
                        <Text style={styles.estimadoHint}>Toca para declarar el km de servicio</Text>
                    )}
                    {esDeclarado && (
                        <Text style={styles.declaradoHint}>Pendiente verificación taller</Text>
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
    declaradoBadge: {
        backgroundColor: COLORS.warning[50],
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: COLORS.warning[200],
    },
    declaradoText: {
        fontSize: 9,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.warning[700],
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    declaradoHint: {
        fontSize: 10,
        color: COLORS.warning[600],
        fontStyle: 'italic',
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
