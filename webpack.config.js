const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.web.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
    alias: {
      'react-native': 'react-native-web',
      'react-native-drawer-layout': path.resolve(__dirname, 'node_modules/react-native-drawer-layout/lib/commonjs'),
      '@react-navigation/stack': path.resolve(__dirname, 'node_modules/@react-navigation/stack/lib/commonjs'),
      '@react-navigation/drawer': path.resolve(__dirname, 'node_modules/@react-navigation/drawer/lib/commonjs'),
      '@react-navigation/native': path.resolve(__dirname, 'node_modules/@react-navigation/native/lib/commonjs'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/shims/asyncStorageShim.web.ts'),
      'react-native-toast-message': path.resolve(__dirname, 'src/shims/toastShim.web.ts'),
      '@react-navigation/stack/lib/module/views/GestureHandler': path.resolve(__dirname, 'node_modules/@react-navigation/stack/lib/module/views/GestureHandler.js'),
      'react-native-drawer-layout/lib/module/views/Drawer': path.resolve(__dirname, 'node_modules/react-native-drawer-layout/lib/module/views/Drawer.js'),
    },
    mainFields: ['browser', 'main', 'module'],
    conditionNames: ['react-native', 'browser', 'require', 'default'],
    exportsFields: [],
    byDependency: {
      esm: { fullySpecified: false },
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx)$/,
        include: [path.resolve(__dirname, 'node_modules/react-native-toast-message')],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              'module:@react-native/babel-preset',
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules\/((?!(react-native|react-native-safe-area-context|react-native-svg|react-native-gesture-handler|react-native-toast-message|@react-navigation)).)*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              'module:@react-native/babel-preset',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'web'),
    },
    hot: true,
    historyApiFallback: true,
    port: 8084,
    client: {
      overlay: true,
    },
  },
};
