import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { Check, Car, User } from 'lucide-react-native';
import Button from '../../components/base/Button/Button';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../../design-system/tokens';

const TransferenciaExitoScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const { vehicleName, newOwner } = route.params || {};

    const handleFinish = () => {
        navigation.reset({
            index: 1,
            routes: [
                { name: 'TabNavigator' },
                { name: ROUTES.MY_VEHICLES },
            ],
        });
    };

    return (
        <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
            <View style={styles.content}>
                <Animatable.View
                    animation="bounceIn"
                    duration={1500}
                    style={styles.iconContainer}
                >
                    <Check size={56} color={COLORS.success.main} strokeWidth={2.5} />
                </Animatable.View>

                <Animatable.Text
                    animation="fadeInUp"
                    delay={500}
                    style={[TYPOGRAPHY.styles.h2, styles.title]}
                >
                    ¡Transferencia exitosa!
                </Animatable.Text>

                <Animatable.View animation="fadeInUp" delay={800} style={[styles.detailsCard, SHADOWS.sm]}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <Car size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[TYPOGRAPHY.styles.caption, styles.detailLabel]}>
                                Vehículo transferido
                            </Text>
                            <Text style={[TYPOGRAPHY.styles.h4, styles.detailValue]}>
                                {vehicleName || 'Vehículo'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailIcon}>
                            <User size={18} color={COLORS.primary[500]} strokeWidth={2} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[TYPOGRAPHY.styles.caption, styles.detailLabel]}>
                                Nuevo dueño
                            </Text>
                            <Text style={[TYPOGRAPHY.styles.h5, styles.detailValue]}>
                                {newOwner || 'Usuario'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[TYPOGRAPHY.styles.caption, styles.infoText]}>
                        El historial de mantenimiento ha sido transferido junto con el vehículo.
                    </Text>
                </Animatable.View>
            </View>

            <Animatable.View animation="fadeInUp" delay={1200} style={styles.footer}>
                <Button
                    title="Ir a mi Garaje"
                    onPress={handleFinish}
                    fullWidth
                />
            </Animatable.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    focusRoot: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.container.horizontal,
    },
    iconContainer: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: COLORS.success.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    detailsCard: {
        width: '100%',
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.lg,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    detailIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        color: COLORS.text.secondary,
        marginBottom: SPACING.xxs,
    },
    detailValue: {
        color: COLORS.text.primary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.md,
    },
    infoText: {
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginTop: SPACING.md,
        lineHeight: 18,
    },
    footer: {
        paddingHorizontal: SPACING.container.horizontal,
        paddingBottom: SPACING.lg,
    },
});

export default TransferenciaExitoScreen;
