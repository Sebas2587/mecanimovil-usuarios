import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import TransferenciaService from '../../services/transferenciaService';
import { ROUTES } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = 280;

const TransferenciaCompradorScreen = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const navigation = useNavigation();
    const theme = useTheme();

    const colors = theme.colors;
    const typography = theme.typography;

    useEffect(() => {
        // Solicitar permiso al montar si no está concedido
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            // El data debería ser el token. El backend complete_transfer espera { token: '...' }
            // Pero el QR tiene el token puro?
            // Revisemos generate_transfer_token en backend:
            // return Response({ 'token': ..., 'qr_data': ... })
            // El QRCode en Vendedor usa `tokenData.token`.
            // Entonces el data escaneado ES el token.

            const token = data;

            const result = await TransferenciaService.completeTransfer(token);

            navigation.replace(ROUTES.TRANSFERENCIA_EXITO || 'TransferenciaExito', {
                vehicleId: result.vehicle_id,
                vehicleName: 'Vehículo', // El backend no devuelve nombre, podríamos mejorarlo, pero ok por ahora
                newOwner: result.new_owner
            });

        } catch (error) {
            Alert.alert(
                'Error de Transferencia',
                error.message || 'Código inválido o expirado.',
                [{ text: 'Intentar de nuevo', onPress: () => setScanned(false) }]
            );
        }
    };

    if (!permission) {
        return <View style={{ flex: 1, backgroundColor: 'black' }} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={[styles.message, { color: colors.text.primary }]}>
                    Necesitamos permiso para usar la cámara y escanear el código QR.
                </Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.buttonText}>Conceder Permiso</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            {/* Overlay Oscuro */}
            <View style={styles.overlay}>
                <View style={styles.overlayTop} />
                <View style={styles.row}>
                    <View style={styles.overlaySide} />
                    <View style={[styles.scanArea, { borderColor: colors.primary[500] }]}>
                        {/* Esquinas del scanner para estética */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                    <Text style={[styles.instructionText, { fontSize: typography.fontSize.lg }]}>
                        Escanea el código del vendedor
                    </Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="close-circle" size={50} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white'
    },
    button: {
        padding: 10,
        backgroundColor: '#007EA7',
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTop: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    row: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        height: SCAN_AREA_SIZE,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    overlayBottom: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: 30,
    },
    instructionText: {
        color: 'white',
        fontWeight: 'bold',
        marginBottom: 20,
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: 'white',
        borderWidth: 4,
    },
    topLeft: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
    closeButton: {
        marginTop: 20,
    }
});

export default TransferenciaCompradorScreen;
