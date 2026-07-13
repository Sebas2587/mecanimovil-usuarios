# Diseño — Rediseño Airbnb Mecanimovil Usuarios

## Referencia visual

Patrón de referencia: [Airbnb iOS en Mobbin](https://mobbin.com/apps/airbnb-ios-e62cd3cf-0432-4936-903f-b9c01124e2bb/239b58e6-8b7e-4d12-b009-748fb6bb5926/screens)

Principios:
- Hub and spoke: home simple → flujo guiado → volver
- Progressive disclosure: poco arriba del fold, detalle al tocar
- Una acción primaria por pantalla
- Cards foto-arriba en listados; bottom sheets para filtros y selectores

## Paleta

| Rol | Hex | Token |
|-----|-----|-------|
| Texto | `#030a1d` | `text.primary` |
| Canvas app | `#f2f6fe` | `background.default` |
| Superficie card | `#ffffff` | `background.paper` |
| CTA / links | `#205ae9` | `primary.500` |
| Datos / gráficos | `#a983f3` | `secondary.500` |
| Highlights | `#b55aef` | `accent.500` |
| Hairline | `#e3e8f2` | `border.light` |
| Texto secundario | `#5a6072` | `text.secondary` |
| Texto terciario | `#8b91a0` | `text.tertiary` |

Regla 60-30-10: 60% canvas `#f2f6fe`, 30% blanco en cards, 10% primary en CTAs y estados activos. Secondary/accent nunca en CTAs.

## Tipografía — Poppins

Fuente: `@expo-google-fonts/poppins` (Regular 400, Medium 500, SemiBold 600).

| Token | Size | Weight | Uso |
|-------|------|--------|-----|
| h1 | 30 | 600 | Hero wizard |
| h2 | 24 | 600 | Título pantalla |
| h3 | 20 | 600 | Sección |
| h4 | 17 | 600 | Título card |
| h5 | 15 | 500 | Subtítulo, tab |
| h6 | 13 | 500 | Label sección (uppercase) |
| body | 15 | 400 | Cuerpo |
| caption | 13 | 400 | Metadatos |
| small | 11 | 400 | Legal |
| button | 15 | 600 | CTAs |

## Forma y elevación

- Card radius: 16 (`BORDERS.radius.card.lg`)
- Button radius: 12, height 48–52
- Bottom sheet top radius: 24
- Shadow: opacity ≤ 0.06, elevation 1–2
- Sin gradientes en UI; sin glass

## Iconografía

Solo `lucide-react-native`, stroke 1.75–2, tamaños 20 y 24.

## Plantillas de pantalla (6)

1. **Hub** — Inicio, Actividad, Cuenta
2. **Wizard** — CrearSolicitud, Calendario, Comparador, Pago
3. **Listing** — ExploreProviders
4. **Detail** — ProviderDetail, VehicleProfile, DetalleSolicitud
5. **List/Form** — historial, pagos, registro
6. **Focus** — transferencia QR, auth, onboarding, MP WebView

## Headers (2 variantes)

- **AppHeader**: back + título centrado h5, fondo `background.default`
- **FlowHeader**: back + barra progreso + cerrar; wizard fullscreen

## Cards de dominio (8)

`ProviderCard`, `ServiceCard`, `VehicleCard`, `HealthCard`, `ActivityCard`, `OfferCard`, `HistoryItemCard`, `TransferCard`

Layout ProviderCard (Airbnb listing):
- Imagen 4:3 arriba, radius 16
- Nombre h4, rating ★ + distancia caption
- Tag especialista/multimarca
- Sin sombras pesadas

## Navegación

4 tabs: Inicio | Agendar (centro) | Actividad | Cuenta

Transferencia: VehicleProfile → Transferir → QR (sin tab marketplace).

## Migración de tokens

Mantener API exportada (`COLORS`, `TYPOGRAPHY`, `TOKENS`, `useTheme`) para no romper imports masivos. Eliminar `glass`, `gradients` del objeto exportado (o dejar aliases vacíos deprecados si hay referencias).
