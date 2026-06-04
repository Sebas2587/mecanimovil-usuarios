import Constants from 'expo-constants';

export function truthyFlag(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

/** Lee `extra` de app.json en dev, EAS y builds legacy (manifest / manifest2). */
export function readAppExtra(key) {
  const sources = [
    Constants.expoConfig?.extra,
    Constants.manifest2?.extra,
    Constants.manifest?.extra,
  ];
  for (const extra of sources) {
    if (extra && Object.prototype.hasOwnProperty.call(extra, key)) {
      return extra[key];
    }
  }
  return undefined;
}

export function readAppExtraFlag(key, { envKey = null, defaultValue = false } = {}) {
  if (envKey && truthyFlag(process.env[envKey])) return true;
  const fromExtra = readAppExtra(key);
  if (fromExtra != null) return truthyFlag(fromExtra);
  return defaultValue;
}
