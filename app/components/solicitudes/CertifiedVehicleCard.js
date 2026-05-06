import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';

const CertifiedVehicleCard = ({ vehiculo }) => {
    if (!vehiculo) return null;

    return (
        <View style={styles.card}>
            <View style={styles.content}>
                <View style={styles.iconWrapper}>
                    <Ionicons name="car-sport" size={24} color={COLORS.primary[500]} />
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.vehicleBrand}>
                            {vehiculo.marca}
                        </Text>
                    </View>

                    <Text style={styles.vehicleModel}>
                        {vehiculo.modelo}
                    </Text>

                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.text.secondary} />
                            <Text style={styles.detailText}>
                                {vehiculo.year || vehiculo.anio || vehiculo.año || '----'}
                            </Text>
                        </View>

                        {(vehiculo.cilindraje) && (
                            <>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailItem}>
                                    <Ionicons name="hardware-chip-outline" size={14} color={COLORS.text.secondary} />
                                    <Text style={styles.detailText}>{vehiculo.cilindraje}L</Text>
                                </View>
                            </>
                        )}

                        <View style={styles.detailDivider} />

                        <View style={styles.detailItem}>
                            <Ionicons name="car-outline" size={14} color={COLORS.text.secondary} />
                            <Text style={styles.detailText}>{vehiculo.patente || 'Sin Patente'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[100],
    },
    infoContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    vehicleBrand: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.secondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    vehicleModel: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
        letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.gray[100],
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.sm,
        gap: SPACING.sm,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    detailDivider: {
        width: BORDERS.width.thin,
        height: 12,
        backgroundColor: COLORS.border.light,
    },
});

export default CertifiedVehicleCard;
