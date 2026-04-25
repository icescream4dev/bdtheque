const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajout du support pour les fichiers .wasm (nécessaire pour expo-sqlite sur le web)
config.resolver.assetExts.push('wasm');

module.exports = config;
