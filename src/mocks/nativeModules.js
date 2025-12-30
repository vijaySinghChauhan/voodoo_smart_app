// Mock for native modules on web

export default {
  // Generic mock for methods
  addListener: () => {},
  removeListeners: () => {},
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  getCurrentWifiSSID: () => Promise.resolve('Web-WiFi'),
  loadWifiList: () => Promise.resolve([]),
  forceWifiUsage: () => Promise.resolve(),
  connectToProtectedSSID: () => {
    console.log('Mock: connectToProtectedSSID called');
    return Promise.resolve();
  },
  // Add other methods as needed
  configure: () => {},
  localNotification: () => {},
  cancelAllLocalNotifications: () => {},
  open: () => {},
  start: () => {},
  stop: () => {},
};

export const RazorpayCheckout = {
  open: () => {
    console.warn('Razorpay Native Module not supported on Web. Use Web SDK.');
    alert('Payment not supported on Web Preview');
  }
};
