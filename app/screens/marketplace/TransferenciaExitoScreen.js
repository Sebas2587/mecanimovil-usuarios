import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import Container from '../../components/layout/Container/Container';
import Button from '../../components/base/Button/Button';
import { ROUTES } from '../../utils/constants';

const TransferenciaExitoScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const theme = useTheme();

    const { vehicleName, newOwner } = route.params || {};

    const colors = theme.colors;
    const typography = theme.typography;
    const spacing = theme.spacing;

    const handleFinish = () => {
        // Navegar a Mis Vehículos y resetear el stack para evitar volver atrás
        navigation.reset({
            index: 0,
            routes: [{ name: 'TabNavigator', state: { routes: [{ name: ROUTES.MIS_VEHICULOS }] } }],
        });
    };

    return (
        <Container safeArea style={styles.container}>
            <View style={styles.content}>
                <Animatable.View
                    animation="bounceIn"
                    duration={1500}
                    style={[styles.iconContainer, { backgroundColor: colors.success.light }]}
                >
                    <Ionicons name="checkmark" size={80} color={colors.success.main} />
                </Animatable.View>

                <Animatable.Text
                    animation="fadeInUp"
                    delay={500}
                    style={[styles.title, { color: colors.text.primary, fontSize: typography.fontSize['3xl'] }]}
                >
                    ¡Transferencia Exitosa!
                </Animatable.Text>

                <Animatable.View animation="fadeInUp" delay={800} style={styles.details}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
                        Vehículo transferido:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary, fontSize: typography.fontSize.xl }]}>
                        {vehicleName || 'Vehículo'}
                    </Text>

                    <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
                        Nuevo Dueño:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text.primary, fontSize: typography.fontSize.lg }]}>
                        {newOwner || 'Usuario'}
                    </Text>

                    <Text style={[styles.infoText, { color: colors.text.hint, marginTop: spacing.lg }]}>
                        El historial de mantenimiento ha sido transferido junto con el vehículo.
                    </Text>
                </Animatable.View>
            </View>

            <Animatable.View animation="fadeInUp" delay={1200} style={styles.footer}>
                <Button
                    title="Ir a mi Garaje"
                    onPress={handleFinish}
                    style={styles.button}
                />
            </Animatable.View>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
    },
    details: {
        width: '100%',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        marginBottom: 5,
    },
    detailValue: {
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    divider: {
        width: '60%',
        height: 1,
        marginVertical: 15,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 12,
        fontStyle: 'italic',
    },
    footer: {
        padding: 20,
        marginBottom: 20,
    },
    button: {
        width: '100%',
    },
});

export default TransferenciaExitoScreen;
