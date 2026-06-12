# Propuesta: Evidencias de checklist visibles (R2) y aviso de pago antes de cerrar

## Why
Tras que el proveedor completa el checklist y firma, el cliente ve el informe pero las fotos de evidencia no cargan (URLs relativas o keys de Cloudflare R2 sin resolver). Además, si solo pagó repuestos, no hay aviso claro en el detalle de la solicitud de que debe pagar la mano de obra antes de firmar y cerrar el servicio.

## What Changes
- `ChecklistViewerModal`: resolver URLs con `resolveToAbsoluteMediaUrl`, ocultar texto meta «N foto(s) de evidencia» en ítems PHOTO y mostrar imagen + descripción; aviso si hay fotos pero ninguna URL válida.
- `DetalleSolicitudScreen`: banner visible en el contenido cuando hay checklist disponible y saldo de mano de obra pendiente, con CTA a `OpcionesPago`.
- Spec delta en `ordenes-seguimiento` para cierre con pago parcial.

## Non-goals
- No cambiar almacenamiento R2 ni serializers del backend (las URLs absolutas ya las entrega `get_image_url` cuando el cliente las resuelve bien).
- No modificar flujo de firma del proveedor.
