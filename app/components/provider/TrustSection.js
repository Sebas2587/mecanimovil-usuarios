import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../design-system/tokens/colors';
import { BORDERS } from '../../design-system/tokens/borders';

const GLASS_BG = Platform.select({
    ios: 'rgba(255,255,255,0.06)',
    android: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.08)',
});

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
                    <Ionicons name="shield-checkmark" size={18} color="#93C5FD" />
                </View>
                <Text style={styles.title}>Verificaciones</Text>
            </View>

            <View style={styles.badgesGrid}>
                {documents.map((doc, index) => (
                    <View key={doc.id || index} style={styles.badgeCard}>
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#6EE7B7"
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
        backgroundColor: 'rgba(147,197,253,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
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
        backgroundColor: GLASS_BG,
        borderRadius: CARD_RADIUS,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    checkIcon: {
        marginRight: 8,
    },
    badgeLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 16,
    },
});

export default TrustSection;
