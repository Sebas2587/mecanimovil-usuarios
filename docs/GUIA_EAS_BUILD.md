# 🚀 Guía Completa: EAS Build para MecaniMóvil App Clientes

Esta guía te llevará paso a paso para configurar y usar EAS Build para crear builds instalables de tu aplicación.

## 📋 Requisitos Previos

- ✅ Cuenta de Expo (gratuita)
- ✅ Node.js instalado
- ✅ npm o yarn instalado

---

## Paso 1: Instalar EAS CLI

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Verificar instalación
eas --version
```

**Resultado esperado:** Deberías ver la versión de EAS CLI (ej: `eas-cli/8.0.0`)

---

## Paso 2: Iniciar Sesión en Expo

```bash
# Iniciar sesión (te pedirá credenciales)
eas login

# Si no tienes cuenta, crea una en: https://expo.dev
# O regístrate desde la CLI:
eas register
```

**Resultado esperado:** 
```
✔ Logged in as tu-usuario
```

---

## Paso 3: Configurar el Proyecto

El archivo `eas.json` ya está creado y configurado. Verifica que esté en:
```
mecanimovil-frontend/mecanimovil-app/eas.json
```

### Perfiles de Build Disponibles:

1. **`development`** - Build para desarrollo con hot reload
2. **`preview`** - APK/IPA para testing (recomendado para empezar)
3. **`production`** - Build para producción (Google Play / App Store)

---

## Paso 4: Crear tu Primer Build

### Para Android (APK - Recomendado para empezar):

```bash
cd mecanimovil-frontend/mecanimovil-app

# Crear build de preview (genera APK instalable)
eas build --platform android --profile preview
```

**¿Qué pasará?**
1. EAS subirá tu código a sus servidores
2. Compilará la app en la nube (5-10 minutos)
3. Te dará un link para descargar el APK

**Opciones durante el build:**
- `Would you like to create a new project?` → Presiona `Enter` (sí)
- `What would you like to name your project?` → `mecanimovil-app` o presiona `Enter`
- `Would you like to configure credentials?` → `y` (sí, para producción) o `n` (no, para preview)

---

## Paso 5: Descargar y Compartir el APK

Una vez completado el build:

1. **Ver el build en el dashboard:**
   - Ve a: https://expo.dev/accounts/[tu-usuario]/projects/mecanimovil-app/builds
   - O usa el link que te muestra EAS CLI

2. **Descargar el APK:**
   - Haz clic en el build completado
   - Descarga el archivo `.apk`

3. **Compartir el APK:**
   - Envía el archivo APK directamente
   - O comparte el link de descarga que proporciona Expo
   - O escanea el QR code que genera EAS

---

## Paso 6: Instalar el APK

### En Android:

1. **Habilitar instalación de fuentes desconocidas:**
   - Ve a: Configuración → Seguridad → Fuentes desconocidas (activar)

2. **Instalar el APK:**
   - Abre el archivo APK descargado
   - Sigue las instrucciones de instalación

3. **Abrir la app:**
   - La app aparecerá en tu lista de aplicaciones
   - Funciona completamente offline (excepto para llamadas API)

---

## 🔧 Comandos Útiles

### Ver builds en progreso:
```bash
eas build:list
```

### Ver detalles de un build específico:
```bash
eas build:view [BUILD_ID]
```

### Cancelar un build:
```bash
eas build:cancel [BUILD_ID]
```

### Crear build para iOS (requiere cuenta de desarrollador):
```bash
eas build --platform ios --profile preview
```

### Crear build de producción:
```bash
# Android (genera AAB para Google Play)
eas build --platform android --profile production

# iOS (requiere configuración adicional)
eas build --platform ios --profile production
```

---

## 📱 Configuración de Credenciales (Opcional)

### Para Android (Producción):

Si quieres subir a Google Play Store, necesitas:

1. **Crear cuenta de Google Play Console:**
   - Ve a: https://play.google.com/console
   - Paga la tarifa única de $25 USD

2. **Configurar credenciales en EAS:**
   ```bash
   eas credentials
   ```
   - Selecciona `Android`
   - Selecciona `Set up a new keystore`
   - EAS generará las credenciales automáticamente

### Para iOS (Producción):

Requiere:
- Cuenta de desarrollador de Apple ($99 USD/año)
- Certificados y provisioning profiles

```bash
eas credentials
# Selecciona iOS y sigue las instrucciones
```

---

## 🔄 Actualizaciones OTA (Over-The-Air)

EAS permite actualizar tu app sin recompilar:

### Publicar actualización:
```bash
# Después de hacer cambios en el código
eas update --branch production --message "Nueva funcionalidad"
```

### Configuración automática:
El `app.json` ya está configurado con:
- `runtimeVersion`: Usa la versión del SDK de Expo
- `updates.enabled`: true
- `updates.checkAutomatically`: "ON_LOAD"

**Nota:** Las actualizaciones OTA solo funcionan para cambios en JavaScript, no para cambios nativos.

---

## 🎯 Flujo de Trabajo Recomendado

### Desarrollo y Testing:
```bash
# 1. Crear build de preview
eas build --platform android --profile preview

# 2. Descargar y probar en dispositivo

# 3. Hacer cambios en el código

# 4. Publicar actualización OTA (sin recompilar)
eas update --branch preview --message "Fix de bug"
```

### Producción:
```bash
# 1. Crear build de producción
eas build --platform android --profile production

# 2. Subir a Google Play Store
eas submit --platform android

# 3. Para actualizaciones futuras (solo JS)
eas update --branch production --message "Nueva versión"
```

---

## ⚙️ Configuración Actual

### Perfiles Configurados:

**Development:**
- Genera APK con development client
- Permite hot reload
- Para desarrollo activo

**Preview:**
- Genera APK instalable
- Para testing y distribución interna
- **Recomendado para empezar**

**Production:**
- Genera AAB (Android App Bundle) para Google Play
- Auto-incrementa versión
- Para distribución pública

---

## 🔍 Verificar Configuración

### Verificar que todo esté listo:

```bash
cd mecanimovil-frontend/mecanimovil-app

# Verificar que eas.json existe
cat eas.json

# Verificar configuración de app.json
cat app.json | grep -A 5 "runtimeVersion"

# Verificar que estás logueado
eas whoami
```

---

## 📝 Checklist Antes de Build

Antes de crear tu primer build, verifica:

- [ ] EAS CLI instalado (`eas --version`)
- [ ] Logueado en Expo (`eas whoami`)
- [ ] `eas.json` existe en el proyecto
- [ ] `app.json` tiene `runtimeVersion` configurado
- [ ] Backend configurado (ngrok o producción)
- [ ] Iconos y splash screen configurados
- [ ] Versión de la app actualizada en `app.json`

---

## 🚨 Solución de Problemas

### Error: "Not logged in"
```bash
eas login
```

### Error: "Project not found"
```bash
# Crear proyecto nuevo
eas build:configure
```

### Error: "Missing credentials"
```bash
# Para preview, no necesitas credenciales
# Para producción:
eas credentials
```

### Build falla por dependencias:
```bash
# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de EAS Build](https://docs.expo.dev/build/introduction/)
- [Dashboard de Expo](https://expo.dev)
- [Guía de credenciales](https://docs.expo.dev/app-signing/managed-credentials/)

---

## ✅ Próximos Pasos

1. **Instalar EAS CLI:** `npm install -g eas-cli`
2. **Iniciar sesión:** `eas login`
3. **Crear primer build:** `eas build --platform android --profile preview`
4. **Descargar y probar:** Instala el APK en tu dispositivo
5. **Compartir:** Envía el APK o link a otros usuarios

---

**¿Listo para crear tu primer build?** Ejecuta:
```bash
cd mecanimovil-frontend/mecanimovil-app
eas build --platform android --profile preview
```

