const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin para configurar launchMode="singleTask" en Android
 * Esto evita que se abran múltiples instancias de la app cuando se recibe un deep link
 */
const withAndroidSingleTask = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      return config;
    }

    const application = manifest.application[0];
    if (!application.activity) {
      return config;
    }

    // Buscar la actividad principal (MainActivity)
    const mainActivity = application.activity.find(
      (activity) =>
        activity.$['android:name'] === '.MainActivity' ||
        activity.$['android:name'] === 'com.mecanimovil.app.MainActivity' ||
        activity.$['android:name'] === 'expo.modules.core.MainActivity'
    );

    if (mainActivity) {
      // Establecer launchMode="singleTask" para evitar múltiples instancias
      mainActivity.$['android:launchMode'] = 'singleTask';
      console.log('✅ Configurado android:launchMode="singleTask" para MainActivity');
    } else {
      // Si no se encuentra MainActivity, aplicar a todas las actividades
      application.activity.forEach((activity) => {
        if (!activity.$['android:launchMode']) {
          activity.$['android:launchMode'] = 'singleTask';
        }
      });
      console.log('✅ Configurado android:launchMode="singleTask" para todas las actividades');
    }

    return config;
  });
};

module.exports = withAndroidSingleTask;

