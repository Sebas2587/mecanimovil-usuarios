import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HeartPulse, Clock, ChevronRight } from 'lucide-react-native';
import { COLORS, withOpacity } from '../../design-system/tokens/colors';
import { getHealthColorToken } from '../../utils/healthFormat';
import { SPACING } from '../../design-system/tokens/spacing';
import { BORDERS } from '../../design-system/tokens/borders';
import { SHADOWS } from '../../design-system/tokens/shadows';
import { TYPOGRAPHY } from '../../design-system/tokens/typography';

const QuickActionGrid = ({ healthScore, serviceCount, onHealthPress, onHistoryPress }) => {
    const healthColor = getHealthColorToken(COLORS, healthScore || 0);

    const ActionCard = ({ children, onPress }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
            {children}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ActionCard onPress={onHealthPress}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: withOpacity(healthColor, 0.12) }]}>
                        <HeartPulse size={22} color={healthColor} />
                    </View>
                    <ChevronRight size={16} color={COLORS.text.tertiary} />
                </View>
                <View>
                    <Text style={styles.title}>Salud del Motor</Text>
                    <Text style={styles.subtitle}>{healthScore || 0}% de condición óptima</Text>
                </View>
            </ActionCard>

            <ActionCard onPress={onHistoryPress}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: COLORS.warning[50] }]}>
                        <Clock size={22} color={COLORS.warning[600]} />
                    </View>
                    <ChevronRight size={16} color={COLORS.text.tertiary} />
                </View>
                <View>
                    <Text style={styles.title}>Historial</Text>
                    <Text style={styles.subtitle}>{serviceCount || 0} servicios registrados</Text>
                </View>
            </ActionCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.container.horizontal,
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        justifyContent: 'space-between',
        minHeight: 140,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    subtitle: {
        fontSize: 11,
        color: COLORS.text.tertiary,
        lineHeight: 16,
    },
});

export default QuickActionGrid;
