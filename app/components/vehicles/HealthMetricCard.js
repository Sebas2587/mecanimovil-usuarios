import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ChevronRight } from 'lucide-react-native';

const ICON_MAP = {
    'aceite-motor': { lib: 'MaterialCommunityIcons', name: 'oil' },
    'filtro-aceite': { lib: 'MaterialCommunityIcons', name: 'filter' },
    'filtro-aire': { lib: 'MaterialCommunityIcons', name: 'air-filter' },
    'filtro-cabina': { lib: 'MaterialCommunityIcons', name: 'air-conditioner' },
    'refrigerante': { lib: 'MaterialCommunityIcons', name: 'car-coolant-level' },
    'adblue': { lib: 'MaterialCommunityIcons', name: 'water-plus' },
    'pastillas-freno': { lib: 'MaterialCommunityIcons', name: 'car-brake-pad' },
    'discos-freno': { lib: 'MaterialCommunityIcons', name: 'disc' },
    'liquido-frenos': { lib: 'MaterialCommunityIcons', name: 'car-brake-fluid-level' },
    'neumaticos': { lib: 'MaterialCommunityIcons', name: 'car-tire-alert' },
    'bujias': { lib: 'MaterialCommunityIcons', name: 'spark-plug' },
    'bateria': { lib: 'MaterialCommunityIcons', name: 'car-battery' },
    'correa-distribucion': { lib: 'MaterialCommunityIcons', name: 'link-variant' },
    'amortiguadores': { lib: 'MaterialCommunityIcons', name: 'car-shocks' },
    'dpf': { lib: 'MaterialCommunityIcons', name: 'exhaust' },
    'default': { lib: 'Ionicons', name: 'construct-outline' }
};

const HealthMetricCard = ({ item, onPress }) => {
    const name = item.nombre || (typeof item.componente === 'string' ? item.componente : item.name) || 'Componente';
    const percentage = item.salud_porcentaje ?? item.salud ?? item.percentage ?? 0;
    const slug = item.slug || item.componente_detail?.slug || item.icon_slug || '';
    const status = item.nivel_alerta_display || item.status || 'NORMAL';
    const remainingKm = item.km_estimados_restantes ?? item.vida_util_restante_km ?? item.remaining_km;

    const getHealthColor = (p) => {
        if (p >= 80) return '#10B981';
        if (p >= 60) return '#F59E0B';
        if (p >= 40) return '#F97316';
        return '#EF4444';
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
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
            {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
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

            <ChevronRight size={16} color="rgba(255,255,255,0.25)" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
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
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 8,
    },
    percentage: {
        fontSize: 14,
        fontWeight: '700',
    },
    progressContainer: {
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.10)',
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
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
    },
    remainingText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
    }
});

export default HealthMetricCard;
