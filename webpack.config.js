const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const appDirectory = path.resolve(__dirname);

// Modules that need to be compiled by Babel (include RN packages)
const compileNodeModules = [
  'react-native',
  'react-native-web',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-safe-area-context',
  '@react-navigation',
  'react-native-drawer-layout', 
  'react-native-paper',
  'react-native-paper-dates',
  'react-native-toast-message',
  'react-native-vector-icons',
  'react-native-svg',
  '@react-native-async-storage/async-storage',
  'react-native-incall-manager',
].map(moduleName => path.resolve(appDirectory, `node_modules/${moduleName}`));

module.exports = {
  entry: './index.web.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.web.js',
    publicPath: '/',
  },
  resolve: {
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js'],
    alias: {
      'react-native$': 'react-native-web',
      // Mock native modules
      'react-native-wifi-reborn': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      'react-native-push-notification': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      'react-native-razorpay': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      'react-native-incall-manager': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      'react-native-network-info': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      // WebRTC needs to be mocked or properly handled if package is broken
      'react-native-webrtc': path.resolve(__dirname, 'src/mocks/nativeModules.js'),
      
      // Fix vector icons resolution for web
      'react-native-vector-icons': path.resolve(__dirname, 'node_modules/react-native-vector-icons/dist'),
      '@expo/vector-icons': path.resolve(__dirname, 'node_modules/react-native-vector-icons/dist'),
      '@react-native-vector-icons/material-design-icons': path.resolve(__dirname, 'node_modules/react-native-vector-icons/dist/MaterialCommunityIcons'),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: [
          path.resolve(appDirectory, 'index.web.tsx'),
          path.resolve(appDirectory, 'App.web.tsx'),
          path.resolve(appDirectory, 'src'),
          ...compileNodeModules,
        ],
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: [
              ['module:@react-native/babel-preset', { disableImportExportTransform: true }],
            ],
            plugins: [
              'react-native-web',
              'react-native-reanimated/plugin',
            ],
            sourceType: 'unambiguous',
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        loader: 'url-loader', 
        include: path.resolve(__dirname, 'node_modules/react-native-vector-icons'),
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      process: { env: {} },
    }),
  ],
  devServer: {
    historyApiFallback: true,
    port: 8084,
    hot: true,
    client: {
      overlay: false, // Disable overlay if errors are annoying but app works
    },
  },
};
