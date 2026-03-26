import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { TOKENS } from '../../design-system/tokens';

const AcuerdoServicioModal = ({ visible, onClose, proveedorNombre }) => {
    const { colors, typography, spacing, borders } = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <SafeAreaView style={styles.modalSafeArea}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <Ionicons name="document-text" size={24} color={TOKENS.colors.primary[600]} />
                                <Text style={styles.headerTitle}>Acuerdo de Servicio</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={TOKENS.colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.paragraph}>
                                Al aceptar este acuerdo y proceder con el pago, estableces un contrato de prestación de servicios directamente con <Text style={styles.bold}>{proveedorNombre || 'el proveedor seleccionado'}</Text>.
                            </Text>

                            <Text style={styles.sectionTitle}>1. Responsabilidad del Servicio</Text>
                            <Text style={styles.paragraph}>
                                El proveedor es el único responsable legal y técnico de la ejecución del servicio, la calidad del mismo y el cumplimiento de los tiempos acordados en la cotización.
                            </Text>

                            <Text style={styles.sectionTitle}>2. Garantía MecaniMovil</Text>
                            <Text style={styles.paragraph}>
                                MecaniMovil actúa como plataforma intermediaria de contacto. Sin embargo, para tu tranquilidad, todas las transacciones realizadas a través de la app están respaldadas por nuestra <Text style={styles.bold}>Garantía de Confianza</Text>.
                            </Text>
                            <Text style={styles.paragraph}>
                                En caso de fraude comprobado o abandono del trabajo por parte del proveedor verificado, MecaniMovil respaldará tu pago e iniciará las acciones legales correspondientes contra el proveedor, asegurando que no pierdas tu dinero.
                            </Text>

                            <Text style={styles.sectionTitle}>3. Gestión de Repuestos</Text>
                            <Text style={styles.paragraph}>
                                Si delegaste la compra de repuestos al proveedor, este se compromete a adquirir piezas nuevas y de la calidad acordada. Si seleccionaste la opción de "Comprar mis propios repuestos", el proveedor se exime de garantías relacionadas directamente con fallas de fábrica de dichas piezas.
                            </Text>

                            <Text style={styles.sectionTitle}>4. Liberación de Pagos</Text>
                            <Text style={styles.paragraph}>
                                El pago se realiza de manera segura mediante Mercado Pago. Conservarás en todo momento el comprobante digital de la transacción, el cual tiene plena validez legal.
                            </Text>

                            <View style={styles.bottomPadding} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
                                <Text style={styles.acceptButtonText}>Entendido</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slate-900 with opacity
        justifyContent: 'flex-end',
    },
    modalSafeArea: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: TOKENS.colors.background.paper,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '60%',
        flexShrink: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: TOKENS.spacing.lg,
        paddingVertical: TOKENS.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: TOKENS.colors.border.light,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: TOKENS.spacing.sm,
    },
    headerTitle: {
        fontSize: TOKENS.typography.fontSize.lg,
        fontWeight: TOKENS.typography.fontWeight.bold,
        color: TOKENS.colors.text.primary,
    },
    closeButton: {
        padding: TOKENS.spacing.xs,
        backgroundColor: TOKENS.colors.neutral.gray[100],
        borderRadius: TOKENS.borders.radius.full,
    },
    scrollContent: {
        padding: TOKENS.spacing.lg,
    },
    sectionTitle: {
        fontSize: TOKENS.typography.fontSize.md,
        fontWeight: TOKENS.typography.fontWeight.bold,
        color: TOKENS.colors.text.primary,
        marginTop: TOKENS.spacing.lg,
        marginBottom: TOKENS.spacing.sm,
    },
    paragraph: {
        fontSize: TOKENS.typography.fontSize.base,
        color: TOKENS.colors.text.secondary,
        lineHeight: 24,
        marginBottom: TOKENS.spacing.md,
    },
    bold: {
        fontWeight: TOKENS.typography.fontWeight.bold,
        color: TOKENS.colors.text.primary,
    },
    bottomPadding: {
        height: 40,
    },
    footer: {
        padding: TOKENS.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: TOKENS.colors.border.light,
        backgroundColor: TOKENS.colors.background.paper,
    },
    acceptButton: {
        backgroundColor: TOKENS.colors.primary[600],
        paddingVertical: TOKENS.spacing.md,
        borderRadius: TOKENS.borders.radius.md,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: TOKENS.colors.text.inverse,
        fontSize: TOKENS.typography.fontSize.md,
        fontWeight: TOKENS.typography.fontWeight.bold,
    }
});

export default AcuerdoServicioModal;
