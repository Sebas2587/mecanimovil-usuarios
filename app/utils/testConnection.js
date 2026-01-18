import { getDebugInfo, forceReconnect } from '../services/api';

/**
 * Utilidad para probar la conectividad del servidor
 * Útil para debugging y verificación de la configuración
 */

/**
 * Prueba la conectividad actual y muestra información detallada
 * @returns {Promise<Object>} Resultado de la prueba
 */
export const testCurrentConnection = async () => {
  console.log('🔍 Probando conectividad actual...');
  
  try {
    const debugInfo = getDebugInfo();
    
    console.log('📊 Información de configuración:');
    console.log('   📡 API URL:', debugInfo.baseURL);
    console.log('   🎨 Media URL:', debugInfo.mediaURL);
    console.log('   📱 Plataforma:', debugInfo.platform);
    console.log('   🔧 Modo desarrollo:', debugInfo.isDev);
    console.log('   🌐 Conectado:', debugInfo.isConnected);
    console.log('   ⏰ Última verificación:', debugInfo.lastCheck ? new Date(debugInfo.lastCheck).toLocaleString() : 'Nunca');
    
    return {
      success: true,
      debugInfo
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo información de debug:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fuerza una reconexión y prueba la conectividad
 * @returns {Promise<Object>} Resultado de la reconexión
 */
export const testReconnection = async () => {
  console.log('🔄 Forzando reconexión...');
  
  try {
    const success = await forceReconnect();
    
    if (success) {
      console.log('✅ Reconexión exitosa');
      
      // Obtener información actualizada
      const debugInfo = getDebugInfo();
      console.log('📊 Nueva configuración:');
      console.log('   📡 API URL:', debugInfo.baseURL);
      console.log('   🎨 Media URL:', debugInfo.mediaURL);
      console.log('   🌐 Estado:', debugInfo.isConnected ? 'Conectado' : 'Desconectado');
      
      return {
        success: true,
        debugInfo
      };
    } else {
      console.log('❌ Fallo en reconexión');
      return {
        success: false,
        error: 'No se pudo reconectar al servidor'
      };
    }
    
  } catch (error) {
    console.error('❌ Error en reconexión:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Ejecuta una prueba completa de conectividad
 * @returns {Promise<Object>} Resultado completo de la prueba
 */
export const runFullConnectivityTest = async () => {
  console.log('🚀 Ejecutando prueba completa de conectividad...\n');
  
  const results = {
    currentConnection: null,
    reconnection: null,
    overall: 'pending'
  };
  
  try {
    // 1. Probar conexión actual
    console.log('1️⃣ Probando conexión actual...');
    results.currentConnection = await testCurrentConnection();
    
    // 2. Probar reconexión
    console.log('\n2️⃣ Probando reconexión...');
    results.reconnection = await testReconnection();
    
    // 3. Evaluar resultado general
    if (results.currentConnection.success && results.reconnection.success) {
      results.overall = 'success';
      console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
      console.log('✅ El sistema de configuración automática está funcionando correctamente');
    } else {
      results.overall = 'failure';
      console.log('\n❌ Algunas pruebas fallaron');
      console.log('🔧 Revisar la configuración del servidor y la conectividad de red');
    }
    
  } catch (error) {
    results.overall = 'error';
    console.error('\n💥 Error en prueba completa:', error);
  }
  
  return results;
};

/**
 * Muestra consejos de troubleshooting
 */
export const showTroubleshootingTips = () => {
  console.log('\n🔧 Consejos de troubleshooting:');
  console.log('');
  console.log('1️⃣ Verificar que el servidor esté ejecutándose:');
  console.log('   cd mecanimovil-backend');
  console.log('   python manage.py runserver 0.0.0.0:8000');
  console.log('');
  console.log('2️⃣ Verificar IP de la máquina:');
  console.log('   macOS/Linux: ifconfig | grep -E "inet 192|inet 10"');
  console.log('   Windows: ipconfig | findstr "IPv4"');
  console.log('');
  console.log('3️⃣ Verificar firewall:');
  console.log('   - Desactivar temporalmente');
  console.log('   - O permitir puerto 8000');
  console.log('');
  console.log('4️⃣ Verificar que dispositivo esté en la misma red:');
  console.log('   - Usar la misma WiFi');
  console.log('   - Ping desde dispositivo hacia IP del servidor');
  console.log('');
  console.log('5️⃣ Reiniciar la aplicación:');
  console.log('   - Cerrar y abrir la app');
  console.log('   - Limpiar caché si es necesario');
};

export default {
  testCurrentConnection,
  testReconnection,
  runFullConnectivityTest,
  showTroubleshootingTips
}; 