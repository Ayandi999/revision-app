const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'wasm' to assetExts so expo-sqlite web worker can load wa-sqlite.wasm
config.resolver.assetExts.push("wasm");

module.exports = config;
