// export const BASE_URL = 'http://192.168.1.6:3001/api'; // Replace with your actual base URL
// export const CHAT_BASE_URL = 'http://192.168.1.6:3001'; 
// Use local API/server during development to keep JWT and sockets aligned
export const BASE_URL = 'https://voodootechsystems.in/voodoo/api';
// Socket.IO should point to the host only; path is configured separately
export const CHAT_BASE_URL = 'https://voodootechsystems.in';
// Fallback Socket.IO host: ESP firmware currently posts updates here
export const CHAT_FALLBACK_URL = 'https://voodootechsystems.in';
// Control whether the app should attempt fallback Socket.IO host
export const DISABLE_FALLBACK_SOCKET = false;

// Default ICE servers; add TURN here for reliable media across carriers/NATs
export const ICE_SERVERS = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // TURN server placeholder: replace with your own credentials for reliable media
  // { urls: 'turn:your.turn.server:3478', username: 'TURN_USERNAME', credential: 'TURN_PASSWORD' },
];

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  PROFILE: `${BASE_URL}/user/profile`,
};

// API Versions
export const API_VERSION = 'v1';

// Timeout settings
export const API_TIMEOUT = 30000; // 30 seconds

// Offline mode: when true, services will return static mock data
export const OFFLINE_MODE = false;

// Mock user credentials for offline login
export const MOCK_CREDENTIALS = {
  email: 'mock@voodoo.local',
  password: 'Voodoo@123',
};

// Mock token used in offline mode
export const MOCK_TOKEN = 'mock-token-voodoo';
