// Learn more https://docs.expo.dev/guides/customizing-metro
// Polyfill para toReversed() si no está disponible (Node.js < 20.10.0)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limita workers para que Expo Go no sature la RAM (SDK 57 bundlea iOS + web/SSR).
config.maxWorkers = 2;

module.exports = config;
