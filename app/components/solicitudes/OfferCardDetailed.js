import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
import { getMediaURL } from '../../services/api';
import { calcularDesgloseIvaOferta, resolverDesgloseIvaMostrado } from '../../utils/ofertaPrecioDesglose';
import { formatearMontoCLP } from '../../utils/calcularMontoPagoOferta';
import {
    resolveLineasServicioOferta,
    resolveServiciosSolicitud,
    formatServiciosTitulo,
    formatCLPServicio,
} from '../../utils/solicitudServicios';
import {
    aggregateDuracionOferta,
    buildVentanaTiemposEstimados,
    formatDurationFromTimedelta,
    formatMinutosDuracion,
    formatRangoDuracion,
} from '../../utils/ofertaTiemposEstimados';
import RepuestosExpandible from '../ofertas/RepuestosExpandible';
import {
    ofertaDebeMostrarRepuestos,
    resolveLineasServicioConRepuestos,
    lineasTienenRepuestos,
} from '../../utils/ofertaRepuestos';
import { resolveCostosOfertaParaDisplay } from '../../utils/ofertaPrecioRepuestos';

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
    chatUnreadCount = 0,
    onChatPress,
    onAceptarPress,
    onProfilePress,
    disabled = false,
    isAccepted = false,
    esOfertaSecundaria = false,
    catalogoPendienteConfirmacion = false,
}) => {
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

    // Cálculos de costos según modo con/sin repuestos de la propuesta
    const costosEfectivos = resolveCostosOfertaParaDisplay(oferta, solicitud);
    const costoManoObra = costosEfectivos.costoManoObra;
    const costoRepuestos = costosEfectivos.costoRepuestos;
    const costoGestion = costosEfectivos.costoGestion;
    const precioTotal = costosEfectivos.precioTotalOfrecido;
    const incluyeRepuestosEfectivo = costosEfectivos.incluyeRepuestos;
    const tieneDesgloseMontos =
        costoManoObra > 0 || costoRepuestos > 0 || costoGestion > 0;
    const desgloseIva = calcularDesgloseIvaOferta({
        costoManoObra,
        costoRepuestos,
        costoGestionCompra: costoGestion,
        precioTotalOfrecido: precioTotal,
    });
    const merged = resolverDesgloseIvaMostrado(
        incluyeRepuestosEfectivo ? oferta.desglose_iva : null,
        desgloseIva,
    );
    const subSinIva = merged.subSinIva;
    const ivaMonto = merged.iva;
    const mostrarNotaReconciliacion = desgloseIva.mostrarNotaReconciliacion;
    const mostrarLineasProveedor =
        costoManoObra > 0 ||
        costoRepuestos > 0 ||
        incluyeRepuestosEfectivo ||
        costoGestion > 0;

    // Rating
    const rating = oferta.rating_proveedor || 0;
    const reviewsCount = oferta.total_reviews || 0;

    const lineasServicio = resolveLineasServicioOferta(oferta, solicitud);
    const serviciosSolicitud = resolveServiciosSolicitud(solicitud);
    const multiServicio = lineasServicio.length > 1 || serviciosSolicitud.length > 1;
    const etiquetaServicios = multiServicio
        ? formatServiciosTitulo(serviciosSolicitud.length ? serviciosSolicitud : lineasServicio)
        : (lineasServicio[0]?.nombre || serviciosSolicitud[0]?.nombre || solicitud?.servicio_nombre || null);
    const lineasConPrecio = lineasServicio.filter((l) => l.precio > 0);
    const ventanaTiempos = buildVentanaTiemposEstimados(solicitud, oferta);
    const duracionCatalogo = aggregateDuracionOferta(oferta);
    const duracionTagTexto = ventanaTiempos?.rangoDuracionTexto
        || (duracionCatalogo
            ? formatMinutosDuracion(duracionCatalogo.minutosPromedioTotal)
            : formatDurationFromTimedelta(oferta.tiempo_estimado_total));

    const lineasConRepuestos = resolveLineasServicioConRepuestos(oferta);
    const mostrarListaRepuestos =
        ofertaDebeMostrarRepuestos(oferta, solicitud)
        && lineasTienenRepuestos(lineasConRepuestos);
    const totalRepuestosItems = useMemo(
        () => lineasConRepuestos.reduce(
            (acc, linea) => acc + (linea.repuestos_info?.length || 0),
            0,
        ),
        [lineasConRepuestos],
    );

    return (
        <View style={styles.card}>
            {etiquetaServicios ? (
                <View style={styles.servicioLabelRow}>
                    <Ionicons name="construct-outline" size={14} color={COLORS.text.tertiary} />
                    <Text style={styles.servicioLabelText}>{etiquetaServicios}</Text>
                </View>
            ) : null}
            {multiServicio && lineasServicio.length > 0 ? (
                <View style={styles.serviciosLista}>
                    {lineasServicio.map((linea) => (
                        <View key={String(linea.id ?? linea.nombre)} style={styles.servicioLineaRow}>
                            <Text style={styles.servicioLineaNombre} numberOfLines={2}>
                                {linea.nombre}
                            </Text>
                            {linea.precio > 0 ? (
                                <Text style={styles.servicioLineaPrecio}>{formatCLPServicio(linea.precio)}</Text>
                            ) : null}
                        </View>
                    ))}
                </View>
            ) : null}
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
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary[500]} />
                            )}
                        </View>
                        <View style={styles.viewProfileRow}>
                            <Text style={styles.providerType}>
                                {oferta.tipo_proveedor === 'taller' ? 'Taller Certificado' : 'Mecánico a Domicilio'}
                            </Text>
                            <Ionicons name="chevron-forward" size={12} color={COLORS.text.tertiary} style={{ marginLeft: 4, marginTop: 1 }} />
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color={COLORS.warning[600]} />
                    <Text style={styles.ratingScore}>{rating.toFixed(1)}</Text>
                </View>
            </View>

            {/* 2. Promesas de Valor (Tags) */}
            <View style={styles.tagsRow}>
                <View style={styles.tag}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.text.tertiary} />
                    <Text style={styles.tagText}>Garantía {oferta.garantia_ofrecida || '3 meses'}</Text>
                </View>
                {duracionTagTexto ? (
                    <View style={styles.tag}>
                        <Ionicons name="time-outline" size={14} color={COLORS.text.tertiary} />
                        <Text style={styles.tagText}>{duracionTagTexto} est.</Text>
                    </View>
                ) : null}
            </View>

            {/* 3. Desglose de Costos (Container Gris) */}
            <View style={styles.costContainer}>
                {multiServicio && lineasConPrecio.length > 1 && !mostrarLineasProveedor ? (
                    <>
                        <Text style={styles.costSectionLabel}>Por servicio</Text>
                        {lineasConPrecio.map((linea) => (
                            <View key={String(linea.id ?? linea.nombre)} style={styles.costRow}>
                                <Text style={styles.costLabel} numberOfLines={2}>{linea.nombre}</Text>
                                <Text style={styles.costValue}>{formatCLPServicio(linea.precio)}</Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                    </>
                ) : null}
                {mostrarLineasProveedor && (
                    <>
                        {costoManoObra > 0 && (
                            <View style={styles.costRow}>
                                <Text style={styles.costLabel}>Mano de obra (sin IVA)</Text>
                                <Text style={styles.costValue}>${formatearMontoCLP(costoManoObra)}</Text>
                            </View>
                        )}
                        {costoRepuestos > 0 && (
                            <View style={styles.costRow}>
                                <Text style={styles.costLabel}>
                                    {totalRepuestosItems > 0
                                        ? `Repuestos (${totalRepuestosItems} ${totalRepuestosItems === 1 ? 'ítem' : 'ítems'}) · sin IVA`
                                        : 'Repuestos (sin IVA) · incluidos'}
                                </Text>
                                <Text style={styles.costValue}>${formatearMontoCLP(costoRepuestos)}</Text>
                            </View>
                        )}
                        {(incluyeRepuestosEfectivo && costoGestion > 0) && (
                            <View style={styles.costRow}>
                                <Text style={[styles.costLabel, styles.costLabelGestion]}>Gestión de compra (sin IVA)</Text>
                                <Text style={[styles.costValue, styles.costValueGestion]}>
                                    ${formatearMontoCLP(costoGestion)}
                                </Text>
                            </View>
                        )}
                        {mostrarListaRepuestos ? (
                            <View style={styles.repuestosDetalleBlock}>
                                {lineasConRepuestos.map((linea) => (
                                    linea.repuestos_info?.length > 0 ? (
                                        <RepuestosExpandible
                                            key={String(linea.id ?? linea.nombre)}
                                            repuestos={linea.repuestos_info}
                                            servicioNombre={
                                                lineasConRepuestos.length > 1 ? linea.nombre : null
                                            }
                                            compact
                                            coinbase
                                            showHeaderTotal={false}
                                            showListTotal={false}
                                            headerTitle="Detalle de repuestos"
                                        />
                                    ) : null
                                ))}
                            </View>
                        ) : null}
                        <View style={styles.divider} />
                    </>
                )}
                <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Subtotal (sin IVA)</Text>
                    <Text style={styles.costValue}>${formatearMontoCLP(subSinIva)}</Text>
                </View>
                <View style={styles.costRow}>
                    <Text style={styles.costLabel}>IVA (19%)</Text>
                    <Text style={styles.costValue}>${formatearMontoCLP(ivaMonto)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total a pagar</Text>
                    <Text style={styles.totalValue}>${formatearMontoCLP(subSinIva + ivaMonto)}</Text>
                </View>
                {mostrarNotaReconciliacion ? (
                    <Text style={styles.reconciliacionNota}>
                        El total coincide con el precio de la oferta. Subtotal e IVA se reparten sobre ese monto; las
                        líneas superiores son el desglose declarado por el proveedor.
                    </Text>
                ) : null}
            </View>

            {/* Fecha de la oferta. Bloque "fecha alternativa" solo para ofertas principales (no secundarias) */}
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
                // En ofertas secundarias no mostramos "propone fecha diferente": es una nueva opción del proveedor para la misma solicitud, no una contrapropuesta de fecha
                const mostrarFechaAlternativa = !esOfertaSecundaria && (esFechaAlt || fechasDiferentes) && solicitud;

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
                        {mostrarFechaAlternativa && (
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

            {ventanaTiempos ? (
                <View style={styles.tiemposPanel}>
                    <Text style={styles.tiemposPanelTitle}>Tiempos estimados</Text>
                    {ventanaTiempos.lineas?.length > 1 ? (
                        <View style={styles.tiemposLineasLista}>
                            {ventanaTiempos.lineas.map((linea) => (
                                <View
                                    key={String(linea.id ?? linea.nombre)}
                                    style={styles.tiemposRow}
                                >
                                    <Text style={styles.tiemposRowLabel} numberOfLines={1}>
                                        {linea.nombre}
                                    </Text>
                                    <Text style={styles.tiemposRowValue}>
                                        {formatRangoDuracion(linea.minutosMin, linea.minutosMax)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : ventanaTiempos.rangoDuracionTexto ? (
                        <View style={styles.tiemposRow}>
                            <Text style={styles.tiemposRowLabel}>Duración configurada</Text>
                            <Text style={styles.tiemposRowValue}>{ventanaTiempos.rangoDuracionTexto}</Text>
                        </View>
                    ) : null}
                    {ventanaTiempos.horaInicio && ventanaTiempos.horaFinPromedio ? (
                        <>
                            <View style={styles.tiemposDivider} />
                            <View style={styles.tiemposRow}>
                                <Text style={styles.tiemposRowLabel}>Inicio estimado</Text>
                                <Text style={styles.tiemposRowValue}>{ventanaTiempos.horaInicio}</Text>
                            </View>
                            <View style={styles.tiemposRow}>
                                <Text style={styles.tiemposRowLabel}>Finalización estimada</Text>
                                <Text style={styles.tiemposRowValue}>
                                    {ventanaTiempos.horaFinPromedio}
                                </Text>
                            </View>
                            {ventanaTiempos.horaFinMin
                                && ventanaTiempos.horaFinMax
                                && ventanaTiempos.horaFinMin !== ventanaTiempos.horaFinMax ? (
                                    <Text style={styles.tiemposHint}>
                                        Ventana {ventanaTiempos.horaInicio} – {ventanaTiempos.horaFinMin}
                                        {' '}– {ventanaTiempos.horaFinMax} según duración mín./máx.
                                    </Text>
                                ) : null}
                        </>
                    ) : (
                        <Text style={styles.tiemposHint}>
                            Indica hora de servicio en tu solicitud para ver inicio y fin estimados.
                        </Text>
                    )}
                </View>
            ) : null}

            {/* Descripción de la oferta (texto que escribe el proveedor) */}
            {(oferta?.descripcion_oferta || '').trim() ? (
                <View style={styles.descripcionSection}>
                    <Text style={styles.descripcionLabel}>Descripción de la oferta</Text>
                    <Text style={styles.descripcionText}>{(oferta.descripcion_oferta || '').trim()}</Text>
                </View>
            ) : null}

            {/* 4. Acciones */}
            <View style={styles.actionsRow}>
                <View style={styles.chatButtonWrap}>
                    <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => onChatPress(oferta)}
                        accessibilityLabel={
                            chatUnreadCount > 0
                                ? `Chat, ${chatUnreadCount} mensajes sin leer`
                                : 'Abrir chat con el proveedor'
                        }
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary[600]} />
                    </TouchableOpacity>
                    {chatUnreadCount > 0 ? (
                        <View style={styles.chatUnreadBadge} accessibilityElementsHidden>
                            <Text style={styles.chatUnreadBadgeText}>
                                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Botón Aceptar o Badge Aceptado */}
                {isAccepted ? (
                    <View style={styles.acceptedButton}>
                        <Text style={styles.acceptButtonText}>
                            {catalogoPendienteConfirmacion
                                ? 'Proveedor elegido'
                                : 'Oferta Aceptada'}
                        </Text>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.text.onPrimary} />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.acceptButton, disabled && styles.disabledButton]}
                        onPress={() => onAceptarPress(oferta)}
                        disabled={disabled}
                    >
                        <Text style={styles.acceptButtonText}>Aceptar Oferta</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.text.onPrimary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.card.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    servicioLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.sm,
        borderBottomWidth: BORDERS.width.thin,
        borderBottomColor: COLORS.border.light,
    },
    servicioLabelText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.secondary,
    },
    serviciosLista: {
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
    },
    servicioLineaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.sm,
    },
    servicioLineaNombre: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    servicioLineaPrecio: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    costSectionLabel: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.sm,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    providerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
    },
    providerName: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
    },
    providerType: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    viewProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning[50],
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.sm,
        gap: SPACING.xxs,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.warning[200],
    },
    ratingScore: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.warning[800],
    },
    ratingCount: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.warning[700],
        opacity: 0.9,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        backgroundColor: COLORS.neutral.gray[100],
        borderRadius: BORDERS.radius.sm,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    tagText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    costContainer: {
        backgroundColor: COLORS.neutral.gray[50],
        borderRadius: BORDERS.radius.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    costLabel: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    costValue: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    costLabelGestion: {
        color: COLORS.warning[700],
    },
    costValueGestion: {
        color: COLORS.warning[800],
    },
    repuestosDetalleBlock: {
        marginTop: SPACING.xs,
        gap: SPACING.xs,
    },
    divider: {
        height: BORDERS.width.thin,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.sm,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: TYPOGRAPHY.fontSize.base,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.secondary,
        letterSpacing: 0.25,
    },
    totalValue: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.primary[600],
    },
    reconciliacionNota: {
        marginTop: SPACING.sm,
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.tertiary,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    fechaSection: {
        marginBottom: SPACING.md,
    },
    fechaRow: {
        marginBottom: 6,
    },
    fechaLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        marginBottom: 2,
    },
    fechaValue: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    fechaAlternativaBlock: {
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: COLORS.warning[50],
        borderRadius: BORDERS.radius.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning[500],
    },
    fechaAlternativaTitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.warning[800],
        marginBottom: SPACING.xs,
    },
    fechaAlternativaRow: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    fechaAlternativaMotivo: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontStyle: 'italic',
        marginTop: SPACING.xxs,
    },
    tiemposPanel: {
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.neutral.gray[50],
        borderRadius: BORDERS.radius.md,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.border.light,
        gap: SPACING.xs,
    },
    tiemposPanelTitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xxs,
    },
    tiemposRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    tiemposRowLabel: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    tiemposRowValue: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
        fontVariant: ['tabular-nums'],
    },
    tiemposDivider: {
        height: BORDERS.width.thin,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.xs,
    },
    tiemposLineasLista: {
        gap: SPACING.xxs,
    },
    tiemposHint: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xxs,
        lineHeight: 17,
    },
    descripcionSection: {
        marginBottom: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: BORDERS.width.thin,
        borderTopColor: COLORS.border.light,
    },
    descripcionLabel: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        marginBottom: SPACING.xs,
    },
    descripcionText: {
        fontSize: TYPOGRAPHY.fontSize.base,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    chatButtonWrap: {
        position: 'relative',
        width: 48,
        height: 48,
    },
    chatButton: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.md,
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[200],
    },
    chatUnreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: COLORS.error.main,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: COLORS.background.paper,
    },
    chatUnreadBadgeText: {
        color: COLORS.text.onError,
        fontSize: 10,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    disabledChatButton: {
        backgroundColor: COLORS.neutral.gray[100],
        opacity: 0.45,
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.primary[500],
        borderRadius: BORDERS.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.xs,
        height: 48,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.primary[600],
    },
    acceptedButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.success[500],
        borderRadius: BORDERS.radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.xs,
        height: 48,
        borderWidth: BORDERS.width.thin,
        borderColor: COLORS.success[600],
    },
    disabledButton: {
        backgroundColor: COLORS.neutral.gray[200],
        borderColor: COLORS.border.light,
    },
    acceptButtonText: {
        color: COLORS.text.onPrimary,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
});

export default OfferCardDetailed;
