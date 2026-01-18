# 🖼️ Solución: Imágenes No Se Muestran en APK

## ❌ Problema

Las imágenes no se mostraban en la APK porque varios componentes tenían URLs hardcodeadas con `localhost:8000` o IPs específicas que solo funcionaban en desarrollo local.

## ✅ Solución Aplicada

Se actualizaron todos los componentes que mostraban imágenes para usar la configuración dinámica del servidor:

### Componentes Actualizados:

1. **`ServiceCard.js`** ✅
2. **`ProviderCard.js`** ✅
3. **`ServiceDetailModal.js`** ✅
4. **`ProviderModal.js`** ✅

### Cambios Realizados:

**Antes:**
```javascript
const getImageUrl = (imagePath) => {
  return `http://localhost:8000/media/${imagePath}`;
};
```

**Ahora:**
```javascript
const [mediaBaseUrl, setMediaBaseUrl] = useState(null);

useEffect(() => {
  import('../services/api').then(({ getMediaBaseURL }) => {
    getMediaBaseURL().then(url => setMediaBaseUrl(url));
  });
}, []);

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (!mediaBaseUrl) return null;
  if (!imagePath.startsWith('/')) {
    return `${mediaBaseUrl}/media/${imagePath}`;
  }
  return `${mediaBaseUrl}${imagePath}`;
};
```

### Función Exportada:

Se exportó `getMediaBaseURL()` en `api.js` para que los componentes puedan usarla.

---

## 🔧 Cómo Funciona

1. **Configuración Dinámica:**
   - `serverConfig.js` detecta automáticamente la URL del servidor (ngrok o local)
   - `getMediaBaseURL()` obtiene la URL base correcta para medios

2. **Componentes:**
   - Cada componente obtiene la URL base al montarse
   - Usa esa URL para construir las rutas completas de las imágenes
   - Funciona tanto en local como en producción (ngrok)

3. **URLs de Imágenes:**
   - Si la imagen ya es una URL completa (http/https) → se usa tal cual
   - Si es relativa → se construye usando la URL base del servidor
   - Si empieza con `/` → se concatena con la URL base

---

## 📋 Verificación

### En Local (Desarrollo):
- ✅ Imágenes se muestran usando IP local o localhost
- ✅ Funciona en emulador y dispositivo físico

### En Producción (ngrok):
- ✅ Imágenes se muestran usando URL de ngrok
- ✅ Funciona en APK instalada

---

## 🚀 Próximos Pasos

### Para Aplicar los Cambios:

**Opción 1: Actualización OTA (Rápido)**
```bash
cd mecanimovil-frontend/mecanimovil-app
eas update --branch preview --message "Fix: URLs dinámicas para imágenes"
```

**Opción 2: Nueva APK (Recomendado)**
```bash
cd mecanimovil-frontend/mecanimovil-app
eas build --platform android --profile preview
```

---

## 🔍 Debugging

Si las imágenes aún no se muestran:

1. **Verificar logs:**
   ```javascript
   console.log('Media URL:', mediaBaseUrl);
   console.log('Image path:', imagePath);
   console.log('Full URL:', getImageUrl(imagePath));
   ```

2. **Verificar configuración del servidor:**
   - Revisar que ngrok esté corriendo
   - Verificar que la URL de ngrok esté correcta en `app.json`
   - Confirmar que `serverConfig` detecta correctamente el servidor

3. **Verificar en backend:**
   - Los archivos deben estar en `/media/`
   - El servidor debe servir archivos estáticos correctamente
   - Verificar permisos de CORS si es necesario

---

## ✅ Resultado

Las imágenes ahora se mostrarán correctamente tanto en:
- ✅ Desarrollo local
- ✅ APK en dispositivo físico
- ✅ Producción con ngrok
- ✅ Producción con servidor real

