import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Camera, X } from 'lucide-react-native';
import AppHeader from '../../components/navigation/AppHeader';
import Button from '../../components/base/Button/Button';
import TransferenciaService from '../../services/transferenciaService';
import { ROUTES } from '../../utils/constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, withOpacity } from '../../design-system/tokens';

const SCAN_AREA_SIZE = 280;

const TransferenciaCompradorScreen = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const token = data;

            const result = await TransferenciaService.completeTransfer(token);

            const vName = result.vehicle_name || 'Vehículo';
            const vYear = result.vehicle_year || '';

            navigation.replace(ROUTES.TRANSFERENCIA_EXITO || 'TransferenciaExito', {
                vehicleId: result.vehicle_id,
                vehicleName: vYear ? `${vName} ${vYear}` : vName,
                newOwner: result.new_owner_name || result.new_owner || 'Tú',
            });

        } catch (error) {
            Alert.alert(
                'Error de Transferencia',
                error.message || 'Código inválido o expirado.',
                [{ text: 'Intentar de nuevo', onPress: () => setScanned(false) }]
            );
        }
    };

    const handleGoBack = () => navigation.goBack();

    if (!permission) {
        return <View style={styles.cameraPlaceholder} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.focusRoot} edges={['top', 'bottom']}>
                <AppHeader title="Escanear código" onBack={handleGoBack} />
                <View style={styles.permissionBody}>
                    <View style={styles.permissionIcon}>
                        <Camera size={32} color={COLORS.primary[500]} strokeWidth={2} />
                    </View>
                    <Text style={[TYPOGRAPHY.styles.h3, styles.permissionTitle]}>
                        Permiso de cámara
                    </Text>
                    <Text style={[TYPOGRAPHY.styles.body, styles.permissionMessage]}>
                        Necesitamos acceso a la cámara para escanear el código QR del vendedor.
                    </Text>
                    <Button title="Conceder permiso" onPress={requestPermission} fullWidth />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.cameraRoot}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />

            <SafeAreaView style={styles.overlay} edges={['top']}>
                <View style={styles.overlayTop}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleGoBack}
                        hitSlop={12}
                    >
                        <X size={28} color={COLORS.base.white} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                <View style={styles.row}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanArea}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.overlaySide} />
                </View>

                <View style={styles.overlayBottom}>
                    <Text style={[TYPOGRAPHY.styles.h5, styles.instructionText]}>
                        Escanea el código del vendedor
                    </Text>
                    <Text style={[TYPOGRAPHY.styles.caption, styles.instructionHint]}>
                        Centra el QR dentro del marco
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    focusRoot: {
        flex: 1,
        backgroundColor: COLORS.background.default,
    },
    cameraRoot: {
        flex: 1,
        backgroundColor: COLORS.text.primary,
    },
    cameraPlaceholder: {
        flex: 1,
        backgroundColor: COLORS.text.primary,
    },
    permissionBody: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.container.horizontal,
        gap: SPACING.md,
    },
    permissionIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    permissionTitle: {
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    permissionMessage: {
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        lineHeight: 22,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xs,
        zIndex: 2,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.45),
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    row: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        height: SCAN_AREA_SIZE,
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.55),
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.primary[500],
        borderRadius: BORDERS.radius.md,
    },
    overlayBottom: {
        flex: 1,
        width: '100%',
        backgroundColor: withOpacity(COLORS.base.inkBlack, 0.55),
        alignItems: 'center',
        paddingTop: SPACING.lg,
        gap: SPACING.xs,
    },
    instructionText: {
        color: COLORS.base.white,
        textAlign: 'center',
    },
    instructionHint: {
        color: withOpacity(COLORS.base.white, 0.75),
        textAlign: 'center',
    },
    corner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderColor: COLORS.base.white,
        borderWidth: 3,
    },
    topLeft: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
});

export default TransferenciaCompradorScreen;
