const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.web.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: 'auto',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
    alias: {
      'react-native': 'react-native-web',
      'react-native-reanimated': path.resolve(__dirname, 'src/shims/reanimatedShim.web.ts'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/shims/asyncStorageShim.web.ts'),
      'react-native-toast-message': path.resolve(__dirname, 'src/shims/toastShim.web.ts'),
      'react-native-webrtc': path.resolve(__dirname, 'src/shims/webrtcShim.web.ts'),
      'react-native-webrtc/lib/commonjs': path.resolve(__dirname, 'src/shims/webrtcShim.web.ts'),
      'react-native-network-info': path.resolve(__dirname, 'src/shims/networkInfoShim.web.ts'),
      '@react-navigation/native': path.resolve(__dirname, 'node_modules/@react-navigation/native/lib/module/index.js'),
      '@react-navigation/drawer': path.resolve(__dirname, 'node_modules/@react-navigation/drawer/lib/module/index.js'),
      '@react-navigation/stack': path.resolve(__dirname, 'node_modules/@react-navigation/stack/lib/module/index.js'),
      '@react-navigation/elements/lib/module/useFrameSize.js': path.resolve(__dirname, 'src/shims/useFrameSizeShim.web.js'),
      // Leave @react-navigation packages to resolve via their package exports
    },
    mainFields: ['browser', 'module', 'main'],
    // Use default package exports resolution to support modern ESM packages
    byDependency: {
      esm: { fullySpecified: false },
    },
  },
  module: {
    rules: [
      {
        test: /node_modules\/react-native-gesture-handler\/lib\/module\/.*\.(ts|js)$/,
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
        test: /node_modules\/(?:@react-navigation|react-native-safe-area-context)\/lib\/module\/.+\.js$/,
        type: 'javascript/auto',
      },
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
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    // Replace problematic ESM file using CommonJS require with a safe shim
    new webpack.NormalModuleReplacementPlugin(
      /@react-navigation\/elements\/lib\/module\/useFrameSize\.js$/,
      path.resolve(__dirname, 'src/shims/useFrameSizeShim.web.js')
    ),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
      inject: 'body',
      scriptLoading: 'defer',
    }),
  ],
  devServer: {
    static: false,
    devMiddleware: {
      publicPath: '/',
      writeToDisk: true,
    },
    hot: true,
    historyApiFallback: true,
    port: 8084,
    client: {
      overlay: true,
    },
    // Proxy ESP8266 device requests to avoid browser CORS.
    // Set DEVICE_IP env var when starting the dev server, e.g.:
    // DEVICE_IP=192.168.1.50 npm run web
    proxy: [
      {
        context: ['/esp'],
        target: `http://${process.env.DEVICE_IP || '192.168.4.1'}`,
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/esp': '' },
        logLevel: 'info',
      },
    ],
  },
};
