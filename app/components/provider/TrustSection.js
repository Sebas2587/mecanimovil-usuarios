import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';

const DOCUMENT_LABELS = {
    curriculum: 'Curriculum Vitae',
    certificado_antecedentes: 'Antecedentes Penales',
    rut_fiscal: 'RUT del Negocio',
    licencia_conducir: 'Licencia de Conducir',
};

const getDocumentLabel = (doc) => {
    if (doc.tipo_documento_display) return doc.tipo_documento_display;
    const key = (doc.tipo_documento || '').toLowerCase();
    return DOCUMENT_LABELS[key] || doc.tipo_documento || 'Documento Verificado';
};

const TrustSection = ({ documents }) => {
    if (!documents || documents.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.primary[500]} />
                </View>
                <Text style={styles.title}>Verificaciones</Text>
            </View>

            <View style={styles.badgesGrid}>
                {documents.map((doc, index) => (
                    <View key={doc.id || index} style={styles.badgeCard}>
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={COLORS.success[500]}
                            style={styles.checkIcon}
                        />
                        <Text style={styles.badgeLabel}>{getDocumentLabel(doc)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const CARD_RADIUS = BORDERS.radius.card?.md ?? 12;

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.base.inkBlack,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    badgeCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.base.white,
        borderRadius: CARD_RADIUS,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.neutral.gray[100],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    checkIcon: {
        marginRight: 8,
    },
    badgeLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.primary,
        lineHeight: 16,
    },
});

export default TrustSection;
