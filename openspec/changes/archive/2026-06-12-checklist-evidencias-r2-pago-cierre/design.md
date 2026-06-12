# Diseño: checklist evidencias R2 y pago antes de cierre

## Evidencias fotográficas
- Reutilizar `resolveToAbsoluteMediaUrl` (mismo patrón que `ServicePhotosCarousel` y chat R2).
- Prioridad de campos: `imagen_url` > `imagen_comprimida_url` > `imagen` > otros.
- Ítems `PHOTO` guardan conteo en `respuesta_texto`; no mostrar ese texto en «Verificación» si hay fotos o si coincide con el patrón de conteo.
- Si `fotos.length > 0` pero ninguna URL resuelve, mostrar mensaje de error amigable (no dejar solo el conteo).

## Pago parcial antes de firma
- Reutilizar `ofertaConSaldoPendiente` y `calcularMontosPagoOferta` ya presentes en `DetalleSolicitudScreen`.
- Mostrar `PagoSaldoPendienteCierreBanner` en el scroll cuando `ofertaConSaldoPendiente && checklistPrincipalVisible`.
- `PendingClientSignatureCard` sigue oculto hasta `ofertaEstaTotalmentePagada` (sin cambio de regla de negocio).
