/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { BackgroundDeviceHeadless, initBackgroundDevicePolling } from './src/services/background/backgroundService';

AppRegistry.registerComponent(appName, () => App);
BackgroundFetch.registerHeadlessTask(BackgroundDeviceHeadless);
try { initBackgroundDevicePolling(); } catch {}
