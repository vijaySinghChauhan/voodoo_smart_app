const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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

    // 🔥 THIS FIXES ALL YOUR ERRORS
    fullySpecified: false,

    alias: {
      'react-native$': 'react-native-web',
      'react-native-reanimated': path.resolve(__dirname, 'src/shims/reanimatedShim.web.ts'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/shims/asyncStorageShim.web.ts'),
      'react-native-toast-message': path.resolve(__dirname, 'src/shims/toastShim.web.ts'),
      'react-native-webrtc': path.resolve(__dirname, 'src/shims/webrtcShim.web.ts'),
      'react-native-webrtc/lib/commonjs': path.resolve(__dirname, 'src/shims/webrtcShim.web.ts'),
      'react-native-network-info': path.resolve(__dirname, 'src/shims/networkInfoShim.web.ts'),
      '@react-native-community/datetimepicker': path.resolve(__dirname, 'src/shims/datetimepickerShim.web.js'),
    },
  },

  module: {
    rules: [
      // 🔥 THIS IS REQUIRED FOR ESM MODULES
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },

      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: (modulePath) => {
          return /node_modules/.test(modulePath) &&
            !/node_modules\/(react-native\/|react-native-safe-area-context|react-native-svg|react-native-gesture-handler|react-native-toast-message|@react-native-community\/datetimepicker)/.test(modulePath);
        },
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
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),

    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
      filename: 'index.html',
      inject: 'body',
      scriptLoading: 'blocking',
      cache: false,
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    historyApiFallback: true,
    hot: true,
    port: 8084,
  },
};
