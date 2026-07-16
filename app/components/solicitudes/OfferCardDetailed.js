import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../base/Icon/Icon';
import PrimaryGradientFill from '../base/PrimaryGradientFill/PrimaryGradientFill';
import VerifiedSeal from '../base/VerifiedSeal/VerifiedSeal';
import { Image } from 'expo-image';
import { COLORS, SPACING, BORDERS, SHADOWS, TYPOGRAPHY } from '../../design-system/tokens';
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
import { getEstadoOfertaDisplay } from '../../utils/solicitudEstadoDisplay';
import { resolveTecnicoPreferido } from '../../utils/solicitudTecnicoPreferido';
import TecnicoPreferidoRow from './TecnicoPreferidoRow';
import {
    resolveModalidadServicio,
    servicioEsADomicilio,
} from '../../utils/solicitudModalidadServicio';
import { useOfertaProveedorFotoUrl } from '../../hooks/useResolvedMediaUrl';

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
    checklistPendienteFirma = false,
    embedded = false,
    resumidoCatalogo = false,
}) => {
    const estadoOfertaDisplay = useMemo(
        () => getEstadoOfertaDisplay(oferta, { checklistPendienteFirma, catalogoPendienteConfirmacion }),
        [oferta, checklistPendienteFirma, catalogoPendienteConfirmacion],
    );

    const proveedorFotoUrl = useOfertaProveedorFotoUrl(oferta);

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
    const tecnicoAsignado = useMemo(
        () => resolveTecnicoPreferido(solicitud, oferta),
        [solicitud, oferta],
    );
    const modalidadServicio = useMemo(
        () => resolveModalidadServicio(solicitud, oferta),
        [solicitud, oferta],
    );
    const esServicioDomicilio = servicioEsADomicilio(modalidadServicio);
    const etiquetaTipoProveedor = useMemo(() => {
        const tipoNav = String(oferta.proveedor_tipo_detail || oferta.tipo_proveedor || '').toLowerCase();
        if (tipoNav === 'mecanico') return 'Mecánico a domicilio';
        if (esServicioDomicilio) return 'Servicio a domicilio';
        return 'Taller certificado';
    }, [oferta.proveedor_tipo_detail, oferta.tipo_proveedor, esServicioDomicilio]);

    return (
        <View style={[styles.card, embedded && styles.cardEmbedded]}>
            {!resumidoCatalogo && etiquetaServicios ? (
                <View style={styles.servicioLabelRow}>
                    <View style={styles.servicioLabelLeft}>
                        <Icon name="construct-outline" size={14} color={COLORS.text.tertiary} />
                        <Text style={styles.servicioLabelText} numberOfLines={2}>
                            {etiquetaServicios}
                        </Text>
                    </View>
                    <View style={[styles.tag, styles.tagGarantia]}>
                        <Icon name="shield-checkmark-outline" size={14} color={COLORS.primary[600]} />
                        <Text style={[styles.tagText, styles.tagGarantiaText]}>
                            Garantía {oferta.garantia_ofrecida || '3 meses'}
                        </Text>
                    </View>
                </View>
            ) : null}
            {!resumidoCatalogo && multiServicio && lineasServicio.length > 0 ? (
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
            <View style={[styles.header, resumidoCatalogo && styles.headerCompact]}>
                <TouchableOpacity
                    style={styles.profileRow}
                    onPress={() => onProfilePress && onProfilePress(oferta)}
                    activeOpacity={0.7}
                >
                    {proveedorFotoUrl ? (
                        <Image
                            source={{ uri: proveedorFotoUrl }}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={300}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                                {(oferta.nombre_proveedor || '?').trim().charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.providerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.providerName} numberOfLines={1}>
                                {oferta.nombre_proveedor}
                            </Text>
                            {oferta.proveedor_verificado && (
                                <VerifiedSeal size={16} checkSize={10} accessibilityLabel="Proveedor verificado" />
                            )}
                        </View>
                        <View style={styles.viewProfileRow}>
                            <Text style={styles.providerType}>
                                {etiquetaTipoProveedor}
                            </Text>
                            <Icon name="chevron-forward" size={12} color={COLORS.text.tertiary} style={{ marginLeft: 4, marginTop: 1 }} />
                        </View>
                    </View>
                </TouchableOpacity>

                {resumidoCatalogo ? (
                    <View style={[styles.tag, styles.tagGarantia]}>
                        <Icon name="shield-checkmark-outline" size={14} color={COLORS.primary[600]} />
                        <Text style={[styles.tagText, styles.tagGarantiaText]}>
                            Garantía {oferta.garantia_ofrecida || '3 meses'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.ratingBadge}>
                        <Icon name="star" size={14} color={COLORS.warning[600]} />
                        <Text style={styles.ratingScore}>{rating.toFixed(1)}</Text>
                    </View>
                )}
            </View>

            {tecnicoAsignado && !resumidoCatalogo ? (
                <TecnicoPreferidoRow tecnico={tecnicoAsignado} variant="inline" />
            ) : null}

            {/* 2. Duración (garantía va junto al título del servicio) */}
            {duracionTagTexto ? (
                <View style={[styles.tagsRow, resumidoCatalogo && styles.tagsRowCompact]}>
                    <View style={[styles.tag, styles.tagDuracion]}>
                        <Icon name="time-outline" size={14} color={COLORS.text.secondary} />
                        <Text style={[styles.tagText, styles.tagDuracionText]}>
                            {duracionTagTexto} est.
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* 3. Desglose de Costos */}
            <View style={[styles.costContainer, embedded && styles.costContainerFlat]}>
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

            {/* Acciones: chat + CTA o chat + estado informativo */}
            {resumidoCatalogo && isAccepted ? (
                <TouchableOpacity
                    style={styles.chatWideButton}
                    onPress={() => onChatPress(oferta)}
                    accessibilityLabel={
                        chatUnreadCount > 0
                            ? `Chat, ${chatUnreadCount} mensajes sin leer`
                            : 'Abrir chat con el proveedor'
                    }
                >
                    <Icon name="chatbubble-ellipses-outline" size={20} color={COLORS.primary[600]} />
                    <Text style={styles.chatWideButtonText}>Chat con el proveedor</Text>
                    {chatUnreadCount > 0 ? (
                        <View style={styles.chatWideUnreadBadge}>
                            <Text style={styles.chatUnreadBadgeText}>
                                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                            </Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            ) : (
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
                        <Icon name="chatbubble-ellipses-outline" size={22} color={COLORS.primary[600]} />
                    </TouchableOpacity>
                    {chatUnreadCount > 0 ? (
                        <View style={styles.chatUnreadBadge} accessibilityElementsHidden>
                            <Text style={styles.chatUnreadBadgeText}>
                                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {isAccepted ? (
                    <View
                        style={[
                            styles.acceptedInfoBox,
                            styles.acceptedInfoBoxInRow,
                            estadoOfertaDisplay.pending && styles.acceptedInfoBoxPending,
                        ]}
                    >
                        <Icon
                            name={estadoOfertaDisplay.icon}
                            size={18}
                            color={estadoOfertaDisplay.color}
                        />
                        <View style={styles.acceptedInfoTextCol}>
                            <Text style={styles.acceptedInfoLabel}>Estado de la oferta</Text>
                            <Text
                                style={[
                                    styles.acceptedInfoValue,
                                    estadoOfertaDisplay.pending && styles.acceptedInfoValuePending,
                                ]}
                                numberOfLines={2}
                            >
                                {estadoOfertaDisplay.texto}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => onAceptarPress(oferta)}
                        disabled={disabled}
                    >
                        {disabled ? (
                            <View style={[styles.acceptButtonFill, styles.disabledButtonFill]}>
                                <Text style={styles.acceptButtonText}>Aceptar Oferta</Text>
                                <Icon name="arrow-forward" size={18} color={COLORS.text.onPrimary} />
                            </View>
                        ) : (
                            <PrimaryGradientFill style={styles.acceptButtonFill}>
                                <Text style={styles.acceptButtonText}>Aceptar Oferta</Text>
                                <Icon name="arrow-forward" size={18} color={COLORS.text.onPrimary} />
                            </PrimaryGradientFill>
                        )}
                    </TouchableOpacity>
                )}
            </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
        ...SHADOWS.sm,
    },
    cardEmbedded: {
        marginBottom: 0,
        borderWidth: 0,
        borderRadius: 0,
        paddingTop: SPACING.sm,
        ...SHADOWS.none,
    },
    servicioLabelRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.border.light,
    },
    servicioLabelLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
        minWidth: 0,
    },
    servicioLabelText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
        flex: 1,
        minWidth: 0,
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
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    servicioLineaPrecio: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    costSectionLabel: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        marginBottom: SPACING.xs,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    headerCompact: {
        marginBottom: SPACING.sm,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.sm,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: BORDERS.radius.full,
        backgroundColor: COLORS.neutral.gray[100],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
    },
    avatarPlaceholder: {
        backgroundColor: COLORS.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: COLORS.primary[100],
    },
    avatarInitial: {
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.primary[500],
    },
    providerInfo: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
    },
    providerName: {
        ...TYPOGRAPHY.styles.h4,
        color: COLORS.text.primary,
        flexShrink: 1,
    },
    providerType: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    viewProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning[50],
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.xxs,
        borderRadius: BORDERS.radius.sm,
        gap: SPACING.xxs,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.warning[200],
    },
    ratingScore: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.warning[800],
    },
    ratingCount: {
        ...TYPOGRAPHY.styles.small,
        color: COLORS.warning[700],
        opacity: 0.9,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    tagsRowCompact: {
        marginBottom: SPACING.sm,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 5,
        borderRadius: BORDERS.radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        flexShrink: 0,
        maxWidth: '48%',
    },
    tagGarantia: {
        backgroundColor: COLORS.primary[50],
        borderColor: COLORS.primary[200],
    },
    tagDuracion: {
        backgroundColor: COLORS.neutral.gray[50],
        borderColor: COLORS.border.light,
    },
    tagText: {
        ...TYPOGRAPHY.styles.small,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
    },
    tagGarantiaText: {
        color: COLORS.primary[700],
    },
    tagDuracionText: {
        color: COLORS.text.secondary,
    },
    costContainer: {
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
        gap: SPACING.xs,
    },
    costContainerFlat: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
        marginBottom: SPACING.sm,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    costLabel: {
        flex: 1,
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    costValue: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
        fontVariant: ['tabular-nums'],
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
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.xs,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    totalLabel: {
        ...TYPOGRAPHY.styles.h5,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.text.primary,
    },
    totalValue: {
        ...TYPOGRAPHY.styles.h4,
        fontFamily: TYPOGRAPHY.fontFamily.semibold,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        color: COLORS.primary[500],
        fontVariant: ['tabular-nums'],
    },
    reconciliacionNota: {
        marginTop: SPACING.xs,
        ...TYPOGRAPHY.styles.small,
        color: COLORS.text.tertiary,
        lineHeight: 16,
    },
    fechaSection: {
        marginBottom: SPACING.md,
    },
    fechaRow: {
        marginBottom: SPACING.xs,
    },
    fechaLabel: {
        ...TYPOGRAPHY.styles.caption,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.secondary,
        marginBottom: 2,
    },
    fechaValue: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
    },
    fechaAlternativaBlock: {
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: COLORS.primary[50],
        borderRadius: BORDERS.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.primary[100],
        gap: SPACING.xxs,
    },
    fechaAlternativaTitle: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.primary[700],
        marginBottom: SPACING.xxs,
    },
    fechaAlternativaRow: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    fechaAlternativaMotivo: {
        ...TYPOGRAPHY.styles.small,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xxs,
    },
    tiemposPanel: {
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.background.paper,
        borderRadius: BORDERS.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.border.light,
        gap: SPACING.xs,
    },
    tiemposPanelTitle: {
        ...TYPOGRAPHY.styles.caption,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.secondary,
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
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
    },
    tiemposRowValue: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.text.primary,
        fontVariant: ['tabular-nums'],
    },
    tiemposDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border.light,
        marginVertical: SPACING.xs,
    },
    tiemposLineasLista: {
        gap: SPACING.xxs,
    },
    tiemposHint: {
        ...TYPOGRAPHY.styles.small,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xxs,
        lineHeight: 16,
    },
    descripcionSection: {
        marginBottom: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border.light,
    },
    descripcionLabel: {
        ...TYPOGRAPHY.styles.caption,
        fontFamily: TYPOGRAPHY.fontFamily.medium,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xs,
    },
    descripcionText: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: SPACING.sm,
    },
    chatWideButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        minHeight: 48,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDERS.radius.pill,
        backgroundColor: COLORS.primary[50],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.primary[100],
    },
    chatWideButtonText: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.primary[500],
    },
    chatWideUnreadBadge: {
        backgroundColor: COLORS.error.main,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    chatButtonWrap: {
        position: 'relative',
        width: 48,
        height: 48,
    },
    chatButton: {
        width: 48,
        height: 48,
        borderRadius: BORDERS.radius.full,
        backgroundColor: COLORS.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.primary[100],
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
        borderRadius: BORDERS.radius.pill,
        overflow: 'hidden',
        height: 48,
    },
    acceptButtonFill: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.xs,
        height: 48,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.primary[500],
    },
    acceptedInfoBox: {
        backgroundColor: COLORS.primary[50],
        borderRadius: BORDERS.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.primary[100],
    },
    acceptedInfoBoxInRow: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
    },
    acceptedInfoBoxPending: {
        backgroundColor: COLORS.primary[50],
        borderColor: COLORS.primary[100],
    },
    acceptedInfoTextCol: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        gap: 2,
    },
    acceptedInfoLabel: {
        ...TYPOGRAPHY.styles.caption,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    acceptedInfoValue: {
        ...TYPOGRAPHY.styles.captionBold,
        color: COLORS.primary[700],
    },
    acceptedInfoValuePending: {
        color: COLORS.primary[700],
    },
    disabledButtonFill: {
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
