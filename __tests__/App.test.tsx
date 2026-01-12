/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));
jest.mock('react-native-incall-manager', () => ({
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

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
