// Learn more https://docs.expo.dev/guides/customizing-metro
// Polyfill para toReversed() si no está disponible (Node.js < 20.10.0)
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;

