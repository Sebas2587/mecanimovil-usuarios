import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { COLORS } from '../../design-system/tokens/colors';

const ICON_MAP = {
    // Engine & Fluids
    'aceite-motor': { lib: 'MaterialCommunityIcons', name: 'oil' },
    'filtro-aceite': { lib: 'MaterialCommunityIcons', name: 'filter' },
    'filtro-aire': { lib: 'MaterialCommunityIcons', name: 'air-filter' },
    'filtro-cabina': { lib: 'MaterialCommunityIcons', name: 'air-conditioner' },
    'refrigerante': { lib: 'MaterialCommunityIcons', name: 'car-coolant-level' },
    'adblue': { lib: 'MaterialCommunityIcons', name: 'water-plus' },

    // Brakes & Tires
    'pastillas-freno': { lib: 'MaterialCommunityIcons', name: 'car-brake-pad' },
    'discos-freno': { lib: 'MaterialCommunityIcons', name: 'disc' },
    'liquido-frenos': { lib: 'MaterialCommunityIcons', name: 'car-brake-fluid-level' },
    'neumaticos': { lib: 'MaterialCommunityIcons', name: 'car-tire-alert' },

    // Electrical & Ignition
    'bujias': { lib: 'MaterialCommunityIcons', name: 'spark-plug' },
    'bateria': { lib: 'MaterialCommunityIcons', name: 'car-battery' },

    // Mechanical
    'correa-distribucion': { lib: 'MaterialCommunityIcons', name: 'link-variant' }, // Symbolizing chain/belt
    'amortiguadores': { lib: 'MaterialCommunityIcons', name: 'car-shocks' },
    'dpf': { lib: 'MaterialCommunityIcons', name: 'exhaust' },

    // Default
    'default': { lib: 'Ionicons', name: 'construct-outline' }
};

const HealthMetricCard = ({ item, onPress }) => {
    const theme = useTheme();

    // Fallback safe values for Hybrid Data Sources (ViewSet vs Serializer)
    const name = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    // Prioritize salud_porcentaje (ViewSet) -> salud (Serializer) -> percentage (Generic)
    const percentage = item.salud_porcentaje ?? item.salud ?? item.percentage ?? 0;
    const slug = item.slug || item.componente_detail?.slug || item.icon_slug || '';
    const status = item.nivel_alerta_display || item.status || 'NORMAL';
    const remainingKm = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;

    const getHealthColor = (p) => {
        if (p >= 70) return COLORS.success[500];
        if (p >= 40) return COLORS.warning[500];
        return COLORS.error[500];
    };

    const color = getHealthColor(percentage);

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
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                {getIcon()}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.percentage, { color }]}>{Math.round(percentage)}%</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.statusText}>{status}</Text>
                    {remainingKm != null && (
                        <Text style={styles.remainingText}>Restan {remainingKm.toLocaleString()} km</Text>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9', // Gray 100
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.base.inkBlack, // Dark Slate
    },
    percentage: {
        fontSize: 14,
        fontWeight: '700',
    },
    progressContainer: {
        height: 6,
        backgroundColor: '#E2E8F0', // Slate 200
        borderRadius: 3,
        marginBottom: 8,
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
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B', // Slate 500
        textTransform: 'uppercase',
    },
    remainingText: {
        fontSize: 12,
        color: '#94A3B8', // Slate 400
    }
});

export default HealthMetricCard;
