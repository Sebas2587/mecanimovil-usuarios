import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design-system/theme/useTheme';
import { getMediaURL } from '../../services/api';

const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) {
        return null;
    }
};
const formatTime = (timeString) => {
    if (!timeString) return '';
    const s = String(timeString);
    return s.length >= 5 ? s.substring(0, 5) : s;
};

const OfferCardDetailed = ({
    oferta,
    solicitud = null,
    onChatPress,
    onAceptarPress,
    onProfilePress,
    disabled = false,
    isAccepted = false
}) => {
    const theme = useTheme();
    const [proveedorFotoUrl, setProveedorFotoUrl] = useState(null);

    // Cargar foto del proveedor
    useEffect(() => {
        const cargarFoto = async () => {
            // Prioridad: proveedor_foto (del serializer) > usuario.foto_perfil > fallback
            let foto = oferta.proveedor_foto ||
                oferta.proveedor_info?.usuario?.foto_perfil ||
                oferta.taller_info?.usuario?.foto_perfil ||
                null;

            if (foto) {
                if (foto.startsWith('http')) {
                    setProveedorFotoUrl(foto);
                } else {
                    try {
                        const url = await getMediaURL(foto);
                        setProveedorFotoUrl(url);
                    } catch (e) {
                        console.log('Error loading provider photo', e);
                    }
                }
            }
        };
        cargarFoto();
    }, [oferta]);

    // Cálculos de costos
    const costoManoObra = parseFloat(oferta.costo_mano_obra || 0);
    const costoRepuestos = parseFloat(oferta.costo_repuestos || 0);
    const costoGestion = parseFloat(oferta.costo_gestion_compra || 0);
    const precioTotal = parseFloat(oferta.precio_total_ofrecido || 0);

    // Rating
    const rating = oferta.rating_proveedor || 0;
    const reviewsCount = oferta.total_reviews || 0;

    return (
        <View style={styles.card}>
            {/* 1. Perfil del Ofertante */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.profileRow}
                    onPress={() => onProfilePress && onProfilePress(oferta)}
                    activeOpacity={0.7}
                >
                    <Image
                        source={{ uri: proveedorFotoUrl || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop' }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={300}
                    />
                    <View style={styles.providerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.providerName} numberOfLines={1}>
                                {oferta.nombre_proveedor}
                            </Text>
                            {oferta.proveedor_verificado && (
                                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                            )}
                        </View>
                        <View style={styles.viewProfileRow}>
                            <Text style={styles.providerType}>
                                {oferta.tipo_proveedor === 'taller' ? 'Taller Certificado' : 'Mecánico a Domicilio'}
                            </Text>
                            <Ionicons name="chevron-forward" size={12} color="#64748B" style={{ marginLeft: 4, marginTop: 1 }} />
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.ratingScore}>{rating.toFixed(1)}</Text>
                </View>
            </View>

            {/* 2. Promesas de Valor (Tags) */}
            <View style={styles.tagsRow}>
                <View style={styles.tag}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
                    <Text style={styles.tagText}>Garantía {oferta.garantia_ofrecida || '3 meses'}</Text>
                </View>
                <View style={styles.tag}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.tagText}>{oferta.tiempo_estimado_total || '2h'} est.</Text>
                </View>
            </View>

            {/* 3. Desglose de Costos (Container Gris) */}
            <View style={styles.costContainer}>
                {/* Detalles - Solo mostrar si hay desglose > 0 */}
                {costoManoObra > 0 && (
                    <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Mano de Obra</Text>
                        <Text style={styles.costValue}>${Math.round(costoManoObra).toLocaleString()}</Text>
                    </View>
                )}

                {costoRepuestos > 0 && (
                    <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Repuestos {oferta.incluye_repuestos ? '(Incluidos)' : '(No incl.)'}</Text>
                        <Text style={styles.costValue}>${Math.round(costoRepuestos).toLocaleString()}</Text>
                    </View>
                )}

                {(costoManoObra > 0 || costoRepuestos > 0) && <View style={styles.divider} />}

                {/* TOTAL */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalValue}>${Math.round(precioTotal).toLocaleString()}</Text>
                </View>
            </View>

            {/* Fecha de la oferta y bloque fecha alternativa */}
            {(() => {
                const fechaOferta = oferta?.fecha_disponible;
                const horaOferta = oferta?.hora_disponible;
                const esFechaAlt = oferta?.es_fecha_alternativa === true;
                const fechaPref = solicitud?.fecha_preferida;
                const horaPref = solicitud?.hora_preferida;
                const motivoAlt = (oferta?.motivo_fecha_alternativa || '').trim();
                const fechasDiferentes = solicitud && fechaPref && fechaOferta && (
                    fechaPref !== fechaOferta ||
                    (horaPref && horaOferta && String(horaPref).substring(0, 5) !== String(horaOferta).substring(0, 5))
                );
                const mostrarFechaAlternativa = esFechaAlt || fechasDiferentes;

                return (
                    <View style={styles.fechaSection}>
                        {fechaOferta && (
                            <View style={styles.fechaRow}>
                                <Text style={styles.fechaLabel}>Fecha de la oferta:</Text>
                                <Text style={styles.fechaValue}>
                                    {formatDate(fechaOferta) || 'No especificada'}
                                    {horaOferta ? ` ${formatTime(horaOferta)}` : ''}
                                </Text>
                            </View>
                        )}
                        {mostrarFechaAlternativa && solicitud && (
                            <View style={styles.fechaAlternativaBlock}>
                                <Text style={styles.fechaAlternativaTitle}>
                                    El proveedor propone una fecha diferente a la que solicitaste.
                                </Text>
                                {fechaPref && (
                                    <Text style={styles.fechaAlternativaRow}>
                                        Tu fecha solicitada: {formatDate(fechaPref) || fechaPref}
                                        {horaPref ? ` ${formatTime(horaPref)}` : ''}
                                    </Text>
                                )}
                                <Text style={styles.fechaAlternativaRow}>
                                    Fecha propuesta: {fechaOferta ? (formatDate(fechaOferta) || fechaOferta) : 'No especificada'}
                                    {horaOferta ? ` ${formatTime(horaOferta)}` : ''}
                                </Text>
                                {motivoAlt ? (
                                    <Text style={styles.fechaAlternativaMotivo}>Motivo: {motivoAlt}</Text>
                                ) : null}
                            </View>
                        )}
                    </View>
                );
            })()}

            {/* Descripción de la oferta (texto que escribe el proveedor) */}
            {(oferta?.descripcion_oferta || '').trim() ? (
                <View style={styles.descripcionSection}>
                    <Text style={styles.descripcionLabel}>Descripción de la oferta</Text>
                    <Text style={styles.descripcionText}>{(oferta.descripcion_oferta || '').trim()}</Text>
                </View>
            ) : null}

            {/* 4. Acciones */}
            <View style={styles.actionsRow}>
                {/* Botón Chat */}
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => onChatPress(oferta)}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#0F172A" />
                </TouchableOpacity>

                {/* Botón Aceptar o Badge Aceptado */}
                {isAccepted ? (
                    <View style={styles.acceptedButton}>
                        <Text style={styles.acceptButtonText}>Oferta Aceptada</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.acceptButton, disabled && styles.disabledButton]}
                        onPress={() => onAceptarPress(oferta)}
                        disabled={disabled}
                    >
                        <Text style={styles.acceptButtonText}>Aceptar Oferta</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        // Sombra Premium
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9', // Slate-100
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16, // Rounded square look
        backgroundColor: '#F1F5F9',
    },
    providerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    providerName: {
        fontSize: 16,
        fontWeight: '800', // Extra bold
        color: '#0F172A',
    },
    providerType: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    viewProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', // Amber-50
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingScore: {
        fontSize: 13,
        fontWeight: '700',
        color: '#B45309', // Amber-700
    },
    ratingCount: {
        fontSize: 12,
        color: '#B45309',
        opacity: 0.8,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#F8FAFC', // Slate-50
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tagText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    costContainer: {
        backgroundColor: '#F8FAFC', // Slate-50
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    costLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    costValue: {
        fontSize: 14,
        color: '#334155', // Slate-700
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0', // Slate-200
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 0.5,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    fechaSection: {
        marginBottom: 16,
    },
    fechaRow: {
        marginBottom: 6,
    },
    fechaLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2,
    },
    fechaValue: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '500',
    },
    fechaAlternativaBlock: {
        marginTop: 10,
        padding: 12,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
    },
    fechaAlternativaTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#B45309',
        marginBottom: 6,
    },
    fechaAlternativaRow: {
        fontSize: 13,
        color: '#334155',
        marginBottom: 4,
    },
    fechaAlternativaMotivo: {
        fontSize: 13,
        color: '#64748B',
        fontStyle: 'italic',
        marginTop: 4,
    },
    descripcionSection: {
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    descripcionLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 6,
    },
    descripcionText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chatButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F1F5F9', // Slate-100
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledChatButton: {
        backgroundColor: '#E5E7EB',
        opacity: 0.5,
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#2563EB', // Blue-600
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        height: 48,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowRadius: 8,
        elevation: 4,
    },
    acceptedButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#10B981', // Emerald-500
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        height: 48,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#94A3B8',
        elevation: 0,
        shadowOpacity: 0,
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});

export default OfferCardDetailed;
