import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Simple boot log to help diagnose blank screens
console.log('[Web] Booting React Native Web app:', appName);

// Register and run the RN app on Web via AppRegistry
AppRegistry.registerComponent(appName, () => App);
const rootTag = document.getElementById('root');
if (!rootTag) {
  const created = document.createElement('div');
  created.id = 'root';
  created.style.height = '100%';
  document.body.appendChild(created);
  console.warn('[Web] Root tag missing; created one dynamically');
}
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
