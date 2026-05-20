# Propuesta: Home discovery — Fase 8 (agendamiento unificado)

## Why
El home fase 7 mostraba proveedores pero no conectaba con `CrearSolicitud`, IA asistida ni servicios por desgaste. La búsqueda abría Explore sin utilidad para agendar.

## What Changes
- `HomeAgendamientoSheet`: IA (`analizarNecesidad`) + servicios sugeridos → `CREAR_SOLICITUD`.
- `HomeHealthServicesRow`: servicios por desgaste (`servicios_asociados` + salud).
- `HomeTrendingServicesRow` → agendar por `servicio_id`.
- `HomeContextualBanner`: CTA Agendar en salud/clima.
- Explore: menos copy, botón Agendar en cards.
- Utilidades `homeScheduleNavigation`, `homeHealthRecommendations`.

## Non-goals
- Comparador IA completo desde sheet sin pasar por dirección/fecha (sigue en formulario).
- Reescribir `FormularioSolicitud`.
