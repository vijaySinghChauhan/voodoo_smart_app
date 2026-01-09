module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-gesture-handler|@react-navigation/.*|react-native-safe-area-context|react-native-reanimated|react-native-vector-icons))',
  ],
};
