# design-system Specification (delta)

Reemplaza `design-system-coinbase-usuarios`. Paleta y tipografía Airbnb-style.

## ADDED Requirements

### Requirement: Paleta semántica Airbnb
La app **SHALL** usar exclusivamente tokens de color definidos en `app/design-system/tokens/colors.js` con la paleta: texto `#030a1d`, canvas `#f2f6fe`, primary `#205ae9`, secondary `#a983f3`, accent `#b55aef`.

#### Scenario: Color de fondo de pantalla
- GIVEN cualquier pantalla autenticada
- WHEN se renderiza el contenedor raíz
- THEN el fondo usa `COLORS.background.default` (`#f2f6fe`)

#### Scenario: CTA primario
- GIVEN un botón de acción principal
- WHEN se renderiza
- THEN usa `COLORS.primary.500` (`#205ae9`) y nunca secondary ni accent

#### Scenario: Sin hardcode
- GIVEN un componente fuera de `design-system/tokens/`
- WHEN se necesita un color
- THEN se importa de tokens y no se usa hex literal

### Requirement: Tipografía Poppins
La app **SHALL** cargar Poppins vía `@expo-google-fonts/poppins` y aplicar la escala h1–h6 definida en `typography.js`.

#### Scenario: Título de pantalla
- GIVEN un AppHeader o título de sección principal
- WHEN se muestra el título
- THEN usa `TYPOGRAPHY.styles.h2` o `h3` con `fontFamily` Poppins SemiBold

#### Scenario: Carga de fuentes
- GIVEN el arranque de la app
- WHEN `App.js` monta
- THEN Poppins Regular, Medium y SemiBold están cargadas antes del primer render de UI

### Requirement: Sin glass ni gradientes
Los tokens **SHALL NOT** exponer `glass.*` ni `gradients.*` para uso en UI nueva. Componentes **SHALL NOT** usar `expo-linear-gradient` en pantallas migradas.

#### Scenario: Card de listado
- GIVEN un ProviderCard o ActivityCard
- WHEN se renderiza
- THEN fondo sólido `background.paper`, sombra con opacity ≤ 0.06, sin gradiente

### Requirement: API de tokens estable
Los exports `COLORS`, `TYPOGRAPHY`, `SPACING`, `BORDERS`, `SHADOWS`, `TOKENS`, `useTheme()` **SHALL** mantenerse para compatibilidad de imports.

#### Scenario: useTheme en pantalla existente
- GIVEN una pantalla que usa `useTheme().colors.primary[500]`
- WHEN se actualiza la paleta
- THEN el import sigue funcionando con el nuevo valor `#205ae9`
