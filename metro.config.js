const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Prevent dev reloads caused by non-RN build outputs
    blockList: exclusionList([
      /dist\/.*/,
      /voodooHome-api\/.*/,
      /web\/.*/,
      /vendor\/.*/,
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
