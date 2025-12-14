const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

function escapeForRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectDirsToBlock = ['dist', 'voodooHome-api', 'web', 'vendor'];
const absoluteBlockList = projectDirsToBlock.map((dir) => {
  const abs = path.resolve(__dirname, dir);
  // Block ONLY the project-level directories, not similarly named folders inside node_modules
  return new RegExp(`^${escapeForRegExp(abs)}/.*$`);
});

const config = {
  resolver: {
    // Prevent dev reloads caused by non-RN build outputs, scoped to project dirs only
    blockList: exclusionList(absoluteBlockList),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
