# proveedor-modalidad-discovery

## Why

Con la unificación de proveedores por modalidad, la app de usuarios debe reflejar la
modalidad (en taller / a domicilio / ambas) en discovery y detalle, y el match a domicilio
debe incluir talleres con modalidad `ambas`/`a_domicilio`.

## What Changes

- Badges de modalidad en discovery/explore (`app/components/providers/explore/exploreProvidersConstants.js`,
  `app/utils/exploreProviderUtils.js`).
- Detalle de proveedor: mostrar modalidad (`app/screens/providers/ProviderDetailScreen.js`).
- Match/filtrado por modalidad (`app/services/providers.js`, `app/services/agendamientoAsistidoService.js`,
  `app/utils/solicitudModalidadServicio.js`).
- Disponibilidad sin cambios de contrato (la unión es interna del backend).

## Requirements

- REQ-USR-BADGE-MODALIDAD: SHALL mostrar la modalidad del proveedor en discovery y detalle.
- REQ-USR-MATCH-MODALIDAD: la búsqueda a domicilio SHALL incluir talleres con modalidad compatible.
