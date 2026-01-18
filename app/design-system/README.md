# Sistema de Diseño MecaniMóvil

Sistema de diseño completo y consistente para la aplicación MecaniMóvil, basado en una paleta de colores que proyecta transparencia, calma, confianza, profesionalismo y claridad.

## Paleta de Colores

### Colores Base

- **White**: `#FFFFFF` - Brillante y absoluto, reflejando posibilidades infinitas
- **Ink Black**: `#00171F` - Ultra-oscuro con un toque de azul, evocando tinteros profundos
- **Deep Space Blue**: `#003459` - Azul oscuro infinito, inspirando asombro y ambición
- **Cerulean**: `#007EA7` - Vibrante y acuático, lleno de vida, libertad y conocimiento
- **Fresh Sky**: `#00A8E8` - Cian brillante, evoca cielos abiertos y optimismo

### Colores Principales

- **Primary**: Deep Space Blue (`#003459`) - Color principal de la aplicación
- **Secondary**: Cerulean (`#007EA7`) - Color secundario
- **Accent**: Fresh Sky (`#00A8E8`) - Color de acento para destacar elementos

### Colores Semánticos

- **Success**: Verde turquesa (`#00C9A7`) - Para estados exitosos
- **Warning**: Amarillo dorado (`#FFB84D`) - Para advertencias
- **Error**: Rojo coral (`#FF6B6B`) - Para errores
- **Info**: Cerulean (`#007EA7`) - Para información

## Estructura del Sistema

```
app/design-system/
├── tokens/              # Tokens de diseño
│   ├── colors.js       # Sistema de colores
│   ├── typography.js   # Tipografía
│   ├── spacing.js      # Espaciado
│   ├── shadows.js      # Sombras
│   ├── borders.js      # Bordes
│   ├── animations.js   # Animaciones
│   └── index.js        # Exportaciones centralizadas
├── components/          # Componentes reutilizables
│   ├── base/           # Componentes base
│   ├── layout/         # Componentes de layout
│   ├── feedback/       # Componentes de feedback
│   ├── navigation/     # Componentes de navegación
│   └── forms/          # Componentes de formularios
├── theme/              # Sistema de temas
│   ├── ThemeProvider.js
│   └── useTheme.js
└── README.md           # Esta documentación
```

## Uso de Tokens

### Importar Tokens

```javascript
// Importar tokens individuales
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '../design-system/tokens';

// O importar todos los tokens
import { TOKENS } from '../design-system/tokens';
```

### Usar Colores

```javascript
import { COLORS } from '../design-system/tokens';

// Colores primarios
const primaryColor = COLORS.primary[500]; // Deep Space Blue
const primaryLight = COLORS.primary[300];
const primaryDark = COLORS.primary[700];

// Colores semánticos
const successColor = COLORS.success[500];
const errorColor = COLORS.error[500];
const warningColor = COLORS.warning[500];

// Colores de texto
const textPrimary = COLORS.text.primary; // Ink Black
const textSecondary = COLORS.text.secondary;

// Colores de fondo
const backgroundDefault = COLORS.background.default;
const backgroundPaper = COLORS.background.paper;
```

### Usar Espaciado

```javascript
import { SPACING } from '../design-system/tokens';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,      // 16px (responsivo)
    marginBottom: SPACING.lg, // 24px (responsivo)
    gap: SPACING.sm,          // 8px (responsivo)
  },
});
```

### Usar Tipografía

```javascript
import { TYPOGRAPHY } from '../design-system/tokens';

const styles = StyleSheet.create({
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    lineHeight: TYPOGRAPHY.lineHeight.tight,
  },
  body: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
});
```

### Usar Sombras

```javascript
import { SHADOWS } from '../design-system/tokens';

const styles = StyleSheet.create({
  card: {
    ...SHADOWS.md, // Sombra mediana
  },
  elevated: {
    ...SHADOWS.lg, // Sombra grande
  },
});
```

### Usar Bordes

```javascript
import { BORDERS } from '../design-system/tokens';

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
  },
  rounded: {
    borderRadius: BORDERS.radius.full,
  },
});
```

## Componentes del Sistema

### Componentes Base

#### Badge
```javascript
import Badge from '../components/base/Badge/Badge';

<Badge variant="primary" size="md">Nuevo</Badge>
<Badge variant="success" size="sm">Verificado</Badge>
```

#### Avatar
```javascript
import Avatar from '../components/base/Avatar/Avatar';

<Avatar source={imageUrl} size="md" variant="circular" />
<Avatar name="Juan Pérez" size="lg" />
```

#### Button
```javascript
import Button from '../components/base/Button/Button';

<Button 
  title="Continuar" 
  type="primary" 
  onPress={handlePress}
  size="md"
/>
```

#### Card
```javascript
import Card from '../components/base/Card/Card';

<Card variant="default" onPress={handlePress}>
  <Text>Contenido de la tarjeta</Text>
</Card>
```

#### Input
```javascript
import Input from '../components/base/Input/Input';

<Input
  label="Email"
  placeholder="tu@email.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
/>
```

### Componentes de Layout

#### Container
```javascript
import Container from '../components/layout/Container/Container';

<Container variant="default" safeArea>
  <Text>Contenido</Text>
</Container>
```

#### Grid
```javascript
import Grid from '../components/layout/Grid/Grid';

<Grid columns={3} spacing={16}>
  <View>Item 1</View>
  <View>Item 2</View>
  <View>Item 3</View>
</Grid>
```

### Componentes de Feedback

#### Toast
```javascript
import Toast from '../components/feedback/Toast/Toast';

<Toast
  message="Operación exitosa"
  variant="success"
  position="top"
  visible={showToast}
  onClose={() => setShowToast(false)}
/>
```

#### Skeleton
```javascript
import Skeleton from '../components/feedback/Skeleton/Skeleton';

<Skeleton width="100%" height={20} />
```

## Guía de Migración

### Paso 1: Importar Tokens

Reemplazar colores hardcodeados con imports del design-system:

```javascript
// Antes
const COLORS = {
  primary: '#007AFF',
  // ...
};

// Después
import { COLORS } from '../design-system/tokens';
```

### Paso 2: Actualizar Colores

```javascript
// Antes
backgroundColor: '#007AFF'

// Después
backgroundColor: COLORS.primary[500]
```

### Paso 3: Actualizar Espaciado

```javascript
// Antes
padding: 16,
marginBottom: 8,

// Después
padding: SPACING.md,
marginBottom: SPACING.sm,
```

### Paso 4: Actualizar Tipografía

```javascript
// Antes
fontSize: 16,
fontWeight: '600',

// Después
fontSize: TYPOGRAPHY.fontSize.md,
fontWeight: TYPOGRAPHY.fontWeight.semibold,
```

### Paso 5: Actualizar Sombras y Bordes

```javascript
// Antes
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
borderRadius: 12,

// Después
...SHADOWS.md,
borderRadius: BORDERS.radius.md,
```

## Mejores Prácticas

1. **Siempre usar tokens**: Nunca hardcodear colores, espaciados o valores de diseño
2. **Usar componentes del sistema**: Preferir componentes del design-system sobre componentes custom
3. **Mantener consistencia**: Mismo componente, mismo estilo en toda la app
4. **Responsividad**: Los tokens ya incluyen responsividad, no duplicar lógica
5. **Documentar variantes**: Si creas una nueva variante, documentarla

## Ejemplos Completos

### Card con nueva paleta

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDERS, SHADOWS } from '../design-system/tokens';
import Card from '../components/base/Card/Card';

const MyCard = ({ title, content }) => {
  return (
    <Card variant="default">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  content: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
});
```

### Botón con gradiente

```javascript
import Button from '../components/base/Button/Button';

<Button
  title="Continuar"
  type="primary"
  useGradient={true}
  onPress={handlePress}
/>
```

## Referencia Rápida

### Colores Principales
- `COLORS.primary[500]` - Deep Space Blue
- `COLORS.secondary[500]` - Cerulean
- `COLORS.accent[500]` - Fresh Sky

### Colores Semánticos
- `COLORS.success[500]` - Verde turquesa
- `COLORS.error[500]` - Rojo coral
- `COLORS.warning[500]` - Amarillo dorado
- `COLORS.info[500]` - Cerulean

### Espaciado
- `SPACING.xs` - 4px
- `SPACING.sm` - 8px
- `SPACING.md` - 16px
- `SPACING.lg` - 24px
- `SPACING.xl` - 32px

### Tipografía
- `TYPOGRAPHY.fontSize.xs` - 10px
- `TYPOGRAPHY.fontSize.sm` - 12px
- `TYPOGRAPHY.fontSize.md` - 16px
- `TYPOGRAPHY.fontSize.lg` - 18px
- `TYPOGRAPHY.fontSize.xl` - 20px

## Soporte

Para preguntas o sugerencias sobre el sistema de diseño, consulta la documentación completa o contacta al equipo de desarrollo.

