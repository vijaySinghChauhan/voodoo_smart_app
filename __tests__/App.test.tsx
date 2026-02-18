/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
(globalThis as any).jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));
(globalThis as any).jest.mock('react-native-incall-manager', () => ({
  startRingtone: () => {},
  vibrate: () => {},
  stopRingtone: () => {},
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}));
jest.mock('react-native-webrtc', () => ({
  mediaDevices: {
    getUserMedia: () => Promise.resolve({}),
  },
  RTCPeerConnection: function () {},
  RTCIceCandidate: function () {},
  RTCSessionDescription: function () {},
  MediaStream: function () {},
}));
jest.mock('react-native-razorpay', () => ({
  default: {
    open: () => Promise.resolve(),
  },
}));
jest.mock('react-native-fs', () => ({
  stat: () => Promise.resolve({ size: 0 }),
}));
jest.mock('react-native-background-timer', () => ({
  setTimeout: (fn: Function, ms: number) => {
    const id = setTimeout(fn as any, ms);
    return id;
  },
  clearTimeout: (id: any) => clearTimeout(id),
  setInterval: (fn: Function, ms: number) => {
    const id = setInterval(fn as any, ms);
    return id;
  },
  clearInterval: (id: any) => clearInterval(id),
}));
jest.mock('react-native-background-fetch', () => ({
  configure: () => Promise.resolve(),
  start: () => Promise.resolve(),
  registerHeadlessTask: () => {},
  finish: () => {},
  NETWORK_TYPE_ANY: 0,
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
