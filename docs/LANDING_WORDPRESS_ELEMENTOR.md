# Landing Mecanimovil Usuarios — WordPress + Elementor

Documento listo para copiar y pegar en WordPress con Elementor. Inspirado en estructura tipo [Nexor](https://www.getnexor.ai), con identidad visual alineada a la app (`#0052FF`, `#0A0B0D`).

---

## 1. Configuración global (Elementor → Site Settings)

### Colores globales

| Nombre en Elementor | Hex | Uso |
|---------------------|-----|-----|
| Primary | `#0052FF` | Botones, links, acentos |
| Primary Dark | `#003ECC` | Hover botones |
| Ink | `#0A0B0D` | Títulos, sección CTA oscura |
| Background | `#FFFFFF` | Secciones claras |
| Surface | `#F7F8FA` | Secciones alternas |
| Text Secondary | `#666666` | Subtítulos, párrafos |
| Border | `#E5E7EB` | Cards, divisores |
| Success | `#10B981` | Salud del vehículo, badges positivos |

### Tipografía global

| Rol | Fuente sugerida | Desktop | Tablet | Móvil | Peso |
|-----|-----------------|---------|--------|-------|------|
| Primary (títulos) | Inter o DM Sans | — | — | — | 600–700 |
| Secondary (cuerpo) | Inter | 18px | 17px | 16px | 400 |
| H1 Hero | Primary | 56px | 44px | 32px | 700 |
| H2 Sección | Primary | 40px | 34px | 28px | 700 |
| H3 Card | Primary | 22px | 20px | 18px | 600 |
| Eyebrow / badge | Primary | 12px | 12px | 11px | 600, uppercase, letter-spacing 0.08em |

### Layout

- **Ancho contenido:** 1140px  
- **Padding sección:** 96px arriba/abajo (desktop), 64px (tablet), 48px (móvil)  
- **Gap entre columnas:** 48px  
- **Border radius cards:** 16px  
- **Border radius botones:** 8px  

---

## 2. SEO y metadatos (pegar en Yoast / Rank Math / campo SEO de la página)

**Título SEO:**  
`Mecanimovil — App para agendar servicios mecánicos y cuidar tu auto`

**Meta descripción:**  
`Descarga Mecanimovil: encuentra mecánicos cerca, agenda servicios según tu vehículo, revisa la salud de tu auto y sigue tus órdenes en tiempo real. Disponible en iOS y Android.`

**Slug sugerido:** `app` o `descargar-app`

**Open Graph (opcional):** imagen 1200×630 con mockup del home de la app + logo.

---

## 3. Header (Theme Builder o sección fija)

**Logo:** Mecanimovil (enlace a inicio del sitio)

**Menú (opcional):**  
- Cómo funciona → ancla `#como-funciona`  
- Funciones → ancla `#funciones`  
- Descargar → ancla `#descargar`  

**Botón header (Primary):**  
- Texto: `Descargar app`  
- Enlace: `#descargar`  
- Estilo: fondo `#0052FF`, texto blanco, padding 10px 20px  

---

## 4. SECCIÓN 1 — Hero (ID: sin ancla / primera pantalla)

**Layout Elementor:** Container full width, fondo `#FFFFFF`, 2 columnas 55% / 45%, alineación vertical center.

### Columna izquierda

**Eyebrow (Text Editor):**  
```
LA APP PARA CONDUCTORES
```

**H1 (Heading):**  
```
Mecanimovil: el cuidado de tu auto, en una sola app.
```

**Párrafo (Text Editor):**  
```
Encuentra mecánicos cerca de ti, agenda servicios según tu vehículo, conoce la salud de tu auto y sigue cada orden hasta que quede lista. Sin llamadas perdidas ni WhatsApps desordenados.
```

**Fila de badges (3× Text Editor en horizontal o Icon List):**  
- `Según tu vehículo`  
- `Proveedores cerca`  
- `Seguimiento en app`  

**Botones (2× Button widget):**

| Botón | Texto | URL |
|-------|-------|-----|
| Primario | Descargar en Google Play | `https://play.google.com/store/apps/details?id=com.mecanimovil.app` |
| Secundario (outline) | Descargar en App Store | `https://apps.apple.com/search?term=MecaniM%C3%B3vil` |

*Nota: cuando tengas el enlace directo de App Store (no búsqueda), reemplázalo en `app.json` → `extra.appStoreUrl` y aquí.*

**Texto pequeño bajo botones:**  
```
Gratis para descargar · Disponible en iOS y Android
```

### Columna derecha

**Imagen:** mockup de teléfono con captura del Home (vehículo, categorías, salud).  
- Alt text: `Pantalla principal de la app Mecanimovil`  
- Sombra suave en la imagen (Custom CSS del widget: `box-shadow: 0 24px 48px rgba(10,11,13,0.12);`)

---

## 5. SECCIÓN 2 — Barra de confianza

**Layout:** Container ancho 1140px, fondo `#F7F8FA`, padding vertical 40px, texto centrado.

**Texto centrado (H3 pequeño o párrafo):**  
```
Diseñada para quienes quieren mantener su auto al día, sin perder tiempo.
```

**Subtítulo opcional:**  
```
Confían en Mecanimovil
```

**Logos:** fila de 4–6 imágenes (talleres aliados, asociaciones, prensa). Si aún no tienes logos, usa texto placeholder:  
`Talleres verificados · Pagos seguros · Soporte en app · Chile`

---

## 6. SECCIÓN 3 — Dos modos (estilo Nexor Inbound/Outbound)

**Layout:** Container 2 columnas iguales, gap 32px, fondo `#FFFFFF`.

**H2 centrado arriba (span ancho completo):**  
```
Solicita cuando lo necesitas. Controla hasta que termina.
```

**Subtítulo centrado:**  
```
Dos formas de usar la app: descubrir servicios y dar seguimiento a cada orden.
```

### Columna A — Card con borde

**Badge:** `SOLICITAR`  
**H3:** `Encuentra el servicio correcto para tu auto`  
**Párrafo:**  
```
Registra tu vehículo y ve categorías de servicios compatibles con tu marca y modelo. Explora proveedores "Para ti" y "Cerca", filtra por ubicación y agenda en pocos pasos.
```

**Lista (Icon List):**  
- Categorías según tu vehículo  
- Búsqueda de talleres y mecánicos cercanos  
- Servicios recomendados por salud del auto  
- Agendamiento guiado por servicio  

**Métrica destacada (Text grande + pequeño):**  
```
100%
```
```
de tus solicitudes visibles en un solo lugar.
```

### Columna B — Card con borde

**Badge:** `SEGUIR`  
**H3:** `Sigue tu orden sin salir de la app`  
**Párrafo:**  
```
Consulta el estado de tus solicitudes activas, chatea con el taller, recibe notificaciones y registra viajes para mantener actualizado el kilometraje de tu vehículo.
```

**Lista (Icon List):**  
- Estado de solicitudes en tiempo real  
- Chat con proveedores  
- Notificaciones de avances  
- Registro de viaje con GPS  

**Métrica destacada:**  
```
24/7
```
```
acceso a tu historial y mensajes.
```

**Estilo cards:** fondo blanco, borde `1px solid #E5E7EB`, border-radius 16px, padding 32px.

---

## 7. SECCIÓN 4 — Marquee de capacidades

**Layout:** ancho completo, fondo `#0A0B0D`, padding 24px 0.

**Texto que se repite (una sola línea, separado por ·):**  
```
Salud del vehículo · Proveedores cercanos · Para ti personalizado · Agendar servicio · Chat con taller · Mis solicitudes · Clima y desgaste · Marketplace · Registrar viaje GPS · Pagos en app · Historial del auto · Servicios en tendencia · Notificaciones
```

### HTML para widget "HTML" de Elementor (marquee)

Copia en un widget **HTML** de Elementor:

```html
<div class="mm-marquee" aria-hidden="true">
  <div class="mm-marquee-track">
    <span>Salud del vehículo · Proveedores cercanos · Para ti personalizado · Agendar servicio · Chat con taller · Mis solicitudes · Clima y desgaste · Marketplace · Registrar viaje GPS · Pagos en app · Historial del auto · Servicios en tendencia · Notificaciones · </span>
    <span>Salud del vehículo · Proveedores cercanos · Para ti personalizado · Agendar servicio · Chat con taller · Mis solicitudes · Clima y desgaste · Marketplace · Registrar viaje GPS · Pagos en app · Historial del auto · Servicios en tendencia · Notificaciones · </span>
  </div>
</div>
```

### CSS (Elementor → Custom CSS de la página o Apariencia → CSS adicional)

```css
.mm-marquee {
  overflow: hidden;
  width: 100%;
}
.mm-marquee-track {
  display: flex;
  width: max-content;
  animation: mm-marquee 40s linear infinite;
}
.mm-marquee-track span {
  flex-shrink: 0;
  padding-right: 3rem;
  font-family: Inter, system-ui, sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
}
@keyframes mm-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

---

## 8. SECCIÓN 5 — Cómo funciona (ID: `como-funciona`)

**Layout:** fondo `#F7F8FA`, 3 columnas, Icon Box o contenedores numerados.

**H2:**  
```
Cómo funciona Mecanimovil
```

**Subtítulo:**  
```
Tres pasos desde tu teléfono hasta el taller.
```

### Paso 01

**Número grande (decorativo):** `01`  
**Título:** `Registra tu vehículo`  
**Texto:**  
```
Agrega marca, modelo y patente. La app adapta categorías y recomendaciones a tu auto.
```

### Paso 02

**Número:** `02`  
**Título:** `Elige servicio y proveedor`  
**Texto:**  
```
Navega por categorías, explora "Para ti" o "Cerca", compara talleres y crea tu solicitud.
```

### Paso 03

**Número:** `03`  
**Título:** `Agenda y sigue la orden`  
**Texto:**  
```
Confirma el servicio, comunícate por chat y revisa el avance hasta el cierre.
```

**Texto bajo los 3 pasos (centrado):**  
```
Tiempo estimado para tu primera solicitud: menos de 5 minutos.
```

---

## 9. SECCIÓN 6 — Integración / flujo (estilo Nexor 01→02→03)

**Layout:** 3 columnas con conectores visuales (línea o flechas en desktop).

**H2:**  
```
Todo conectado en un solo flujo.
```

**Subtítulo:**  
```
Tu vehículo, los proveedores de la red Mecanimovil y tu seguimiento — sin cambiar de app.
```

### Bloque 01

**Label:** `01`  
**Título:** `Tu vehículo`  
**Texto:**  
```
Perfil del auto, salud, kilometraje y historial en un dashboard claro.
```

**Mini lista:**  
- Múltiples vehículos  
- Score de salud  
- Alertas por desgaste  

### Bloque 02

**Label:** `02`  
**Título:** `La red de proveedores`  
**Texto:**  
```
Talleres y mecánicos verificados según tu ubicación y el tipo de servicio que necesitas.
```

**Mini lista:**  
- Filtro por cercanía  
- Recomendaciones "Para ti"  
- Ficha con servicios y fotos  

### Bloque 03

**Label:** `03`  
**Título:** `Tu orden en la app`  
**Texto:**  
```
Solicitudes, chat, notificaciones y pagos — el ciclo completo sin perder el hilo.
```

**Mini lista:**  
- Estados de solicitud  
- Mensajes con el taller  
- Marketplace (venta de vehículo)  

---

## 10. SECCIÓN 7 — Módulos de la app (ID: `funciones`)

**Layout:** grid 3×2 (desktop), 1 columna (móvil). Cada celda = Icon Box.

**H2:**  
```
Todo lo que harías por llamadas y WhatsApp, en la app.
```

**Subtítulo:**  
```
Las mismas gestiones, con recordatorios, historial y datos de tu vehículo siempre a mano.
```

### Tarjetas (copiar cada fila en un Icon Box)

| # | Título | Descripción |
|---|--------|-------------|
| 1 | Salud del vehículo | Visualiza el estado de componentes y recibe sugerencias de servicios según desgaste. |
| 2 | Proveedores cerca | Encuentra talleres y mecánicos en tu zona con mapa y listado. |
| 3 | Agendar servicios | Crea solicitudes por categoría o servicio específico, adaptado a tu auto. |
| 4 | Mis solicitudes | Consulta órdenes activas y pasadas; retoma conversaciones cuando quieras. |
| 5 | Chat con el taller | Escribe al proveedor sin salir de Mecanimovil. |
| 6 | Clima y desgaste | Información contextual para frenos y neumáticos según condiciones. |
| 7 | Registrar viaje | Actualiza kilometraje con seguimiento GPS al manejar. |
| 8 | Marketplace | Publica o gestiona la venta de tu vehículo desde la app. |
| 9 | Notificaciones | Entérate al instante de cambios en tus solicitudes y mensajes. |

---

## 11. SECCIÓN 8 — Carrusel de pantallas

**Layout:** Image Carousel o Media Carousel (Elementor Pro).

**H2:**  
```
Así se ve por dentro
```

**Subtítulo:**  
```
Un home pensado para decidir rápido: tu auto, servicios y proveedores en un solo vistazo.
```

**Capturas sugeridas (subir en este orden):**

1. Home — vehículo, salud y categorías  
2. Explorar proveedores — mapa o lista "Cerca"  
3. Crear solicitud / agendar servicio  
4. Detalle de solicitud activa  
5. Chat con proveedor  
6. Salud del vehículo (dashboard)  

**Alt de cada imagen:** `Captura de pantalla de Mecanimovil — [nombre de pantalla]`

---

## 12. SECCIÓN 9 — Comparativa / valor (opcional)

**Layout:** 2 columnas, fondo blanco.

**H2:**  
```
Menos fricción. Más control.
```

| Sin Mecanimovil | Con Mecanimovil |
|-----------------|-----------------|
| Buscar taller por recomendaciones sueltas | Proveedores filtrados por ubicación y vehículo |
| Coordinar por WhatsApp sin historial | Chat y solicitudes en un solo lugar |
| Olvidar cuándo toca un servicio | Salud del auto y alertas de desgaste |
| No saber el estado del arreglo | Seguimiento de la orden en la app |

---

## 13. SECCIÓN 10 — FAQ

**Layout:** Accordion (Elementor Pro) o Toggle.

**H2:** `Preguntas frecuentes`

**P1 — ¿Mecanimovil es gratis?**  
```
Descargar la app es gratis. El costo de cada servicio mecánico lo define el proveedor que elijas; lo verás antes de confirmar tu solicitud.
```

**P2 — ¿En qué ciudades está disponible?**  
```
La disponibilidad de proveedores depende de tu ubicación. Al registrar tu dirección, la app muestra talleres y mecánicos cercanos a ti.
```

**P3 — ¿Puedo registrar más de un vehículo?**  
```
Sí. Puedes agregar varios autos y cambiar entre ellos desde el inicio de la app.
```

**P4 — ¿Cómo sé el estado de mi solicitud?**  
```
En "Mis solicitudes" ves el avance de cada orden. También puedes recibir notificaciones y escribir al taller por chat.
```

**P5 — ¿Qué es la salud del vehículo?**  
```
Es un resumen del estado de componentes clave de tu auto, con recomendaciones de servicios cuando conviene actuar.
```

**P6 — Soy taller o mecánico, ¿puedo unirme?**  
```
Sí. Contamos con Mecanimovil para proveedores. [ENLACE: página de proveedores o contacto comercial]
```

*Reemplaza el enlace del P6 por la URL real de proveedores.*

---

## 14. SECCIÓN 11 — CTA final (ID: `descargar`)

**Layout:** Container full width, fondo `#0A0B0D`, texto blanco, centrado, padding 80px 24px.

**H2 (color blanco):**  
```
Descarga Mecanimovil y cuida tu auto sin complicaciones.
```

**Párrafo (color rgba blanco 0.8):**  
```
Disponible en Google Play y App Store. Registra tu vehículo y agenda tu primer servicio en minutos.
```

**Botones (mismos enlaces que el hero):**  
- `Descargar en Google Play` → Play Store URL  
- `Descargar en App Store` → App Store URL  

**Opcional — QR:** imagen QR que apunte a `https://play.google.com/store/apps/details?id=com.mecanimovil.app`  
**Texto bajo QR:** `Escanea para Android · iOS desde App Store`

---

## 15. Footer

**Columna 1 — Marca**  
```
Mecanimovil
El ecosistema que conecta conductores con servicios mecánicos de confianza.
```

**Columna 2 — Enlaces**  
- Descargar app → `#descargar`  
- Cómo funciona → `#como-funciona`  
- Funciones → `#funciones`  
- Para proveedores → [URL proveedores]  
- Contacto → [URL contacto]  

**Columna 3 — Legal**  
- Política de privacidad → [URL]  
- Términos y condiciones → [URL]  

**Copyright:**  
```
© 2026 Mecanimovil. Todos los derechos reservados.
```

**Redes (opcional):** Instagram · LinkedIn · WhatsApp comercial

---

## 16. Enlaces oficiales (referencia)

| Uso | URL |
|-----|-----|
| Google Play | `https://play.google.com/store/apps/details?id=com.mecanimovil.app` |
| App Store (búsqueda actual) | `https://apps.apple.com/search?term=MecaniM%C3%B3vil` |
| Listing web técnico | `https://mecanimovil-usuarios.vercel.app` |

---

## 17. Orden de secciones en el canvas de Elementor

```
1. Header (sticky)
2. Hero
3. Confianza
4. Dos modos (2 cards)
5. Marquee (HTML + CSS)
6. Cómo funciona (#como-funciona)
7. Flujo 01-02-03
8. Grid funciones (#funciones)
9. Carrusel screenshots
10. Comparativa (opcional)
11. FAQ
12. CTA (#descargar)
13. Footer
```

---

## 18. Checklist antes de publicar

- [ ] Reemplazar `[URL proveedores]`, `[URL contacto]`, legales  
- [ ] Subir mockups y capturas reales de la app actual  
- [ ] Confirmar enlace directo de App Store (si ya está publicada)  
- [ ] Probar anclas `#descargar`, `#como-funciona`, `#funciones`  
- [ ] Optimizar imágenes (WebP, < 200 KB cada captura)  
- [ ] Activar caché (LiteSpeed / WP Rocket)  
- [ ] Probar en móvil: botones store abren la tienda correcta  

---

## 19. Bloque único — Copy completo en texto plano

Para pegar rápido en un documento o IA de maquetado:

```
HERO
LA APP PARA CONDUCTORES
Mecanimovil: el cuidado de tu auto, en una sola app.
Encuentra mecánicos cerca de ti, agenda servicios según tu vehículo, conoce la salud de tu auto y sigue cada orden hasta que quede lista. Sin llamadas perdidas ni WhatsApps desordenados.
Según tu vehículo · Proveedores cerca · Seguimiento en app
[Descargar Google Play] [Descargar App Store]
Gratis para descargar · Disponible en iOS y Android

CONFIANZA
Diseñada para quienes quieren mantener su auto al día, sin perder tiempo.

DOS MODOS
Solicita cuando lo necesitas. Controla hasta que termina.
SOLICITAR — Encuentra el servicio correcto para tu auto
SEGUIR — Sigue tu orden sin salir de la app

MARQUEE
Salud del vehículo · Proveedores cercanos · Para ti · Agendar · Chat · Solicitudes · Clima · Marketplace · Viaje GPS · Pagos · Notificaciones

CÓMO FUNCIONA
01 Registra tu vehículo
02 Elige servicio y proveedor
03 Agenda y sigue la orden

CTA
Descarga Mecanimovil y cuida tu auto sin complicaciones.
```

---

*Generado para mecanimovil-usuarios · Alineado a design tokens `#0052FF` / `#0A0B0D` · Actualizar métricas y logos cuando tengas datos reales de negocio.*
