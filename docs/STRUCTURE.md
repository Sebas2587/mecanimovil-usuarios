# 📁 Estructura de Componentes - MecaniMóvil

## Organización Unificada

Todos los componentes están organizados en una sola carpeta `app/components/` con estructura clara y lógica.

## 📂 Estructura de Carpetas

```
app/components/
├── base/              # Componentes base reutilizables
│   ├── Avatar/
│   ├── Badge/
│   ├── Button/
│   ├── Card/
│   ├── Divider/
│   ├── Icon/
│   ├── Input/
│   ├── Progress/
│   └── Tags/
│
├── layout/            # Componentes de layout
│   ├── Container/
│   ├── Grid/
│   └── List/
│
├── feedback/          # Componentes de feedback
│   ├── Modal/
│   ├── Skeleton/
│   ├── Toast/
│   └── Tooltip/
│
├── navigation/         # Componentes de navegación
│   ├── Header/
│   ├── Menu/
│   └── Tabs/
│
├── forms/             # Componentes de formularios
│   ├── Slider/
│   └── Switch/
│
└── [otros]/           # Componentes específicos del dominio
    ├── AddressSelector.js
    ├── ProviderCard.js
    ├── ServiceCard.js
    └── ...
```

## 🎯 Principios de Organización

### 1. Componentes Base (`base/`)
Componentes fundamentales que se usan en toda la aplicación:
- **Avatar** - Imágenes de perfil, iniciales
- **Badge** - Etiquetas y badges
- **Button** - Botones reutilizables
- **Card** - Tarjetas contenedoras
- **Divider** - Separadores
- **Icon** - Wrapper de iconos
- **Input** - Campos de entrada
- **Progress** - Barras de progreso
- **Tags** - Etiquetas interactivas

### 2. Componentes de Layout (`layout/`)
Componentes para estructurar el contenido:
- **Container** - Contenedores responsivos
- **Grid** - Sistema de grillas
- **List** - Listas con separadores

### 3. Componentes de Feedback (`feedback/`)
Componentes para interacción y retroalimentación:
- **Modal** - Modales y overlays
- **Skeleton** - Placeholders de carga
- **Toast** - Notificaciones temporales
- **Tooltip** - Información contextual

### 4. Componentes de Navegación (`navigation/`)
Componentes para navegación:
- **Header** - Headers globales
- **Menu** - Menús desplegables
- **Tabs** - Pestañas de navegación

### 5. Componentes de Formularios (`forms/`)
Componentes para formularios:
- **Slider** - Deslizadores de rango
- **Switch** - Interruptores on/off

## 📝 Convenciones de Importación

### Importación Recomendada (Estructura Organizada)
```javascript
// Componentes base
import Button from '../components/base/Button/Button';
import Input from '../components/base/Input/Input';
import Card from '../components/base/Card/Card';

// Componentes de layout
import Container from '../components/layout/Container/Container';
import Grid from '../components/layout/Grid/Grid';

// Componentes de feedback
import Toast from '../components/feedback/Toast/Toast';
import Skeleton from '../components/feedback/Skeleton/Skeleton';

// Componentes de navegación
import Header from '../components/navigation/Header/Header';
```

### Importación de Compatibilidad (Funciona pero no recomendada)
```javascript
// Estos wrappers mantienen compatibilidad hacia atrás
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Skeleton from '../components/Skeleton';
import CustomHeader from '../components/CustomHeader';
```

## 🎨 Uso de Tokens del Design System

Todos los componentes usan tokens del design-system:

```javascript
import { COLORS, TYPOGRAPHY, SPACING, BORDERS, SHADOWS } from '../design-system/tokens';
// O mejor aún:
import { useTheme } from '../design-system/theme/useTheme';
const { colors, typography, spacing, borders, shadows } = useTheme();
```

## ✅ Beneficios de Esta Estructura

1. **Una sola carpeta** - No hay duplicación ni confusión
2. **Organización clara** - Fácil encontrar componentes
3. **Escalable** - Fácil agregar nuevos componentes
4. **Mantenible** - Estructura lógica y predecible
5. **Consistente** - Todos los componentes siguen el mismo patrón

## 🔄 Migración de Componentes Existentes

Los componentes existentes (AddressSelector, ProviderCard, etc.) pueden migrarse gradualmente para usar tokens del design-system sin cambiar su ubicación.

**Ejemplo:**
```javascript
// Antes
import { COLORS } from '../utils/constants';
backgroundColor: COLORS.primary

// Después
import { COLORS } from '../design-system/tokens';
backgroundColor: COLORS.primary[500]
```

## 📚 Documentación

- **Tokens**: `app/design-system/tokens/`
- **Theme Provider**: `app/design-system/theme/`
- **Componentes**: `app/components/` (esta carpeta)

