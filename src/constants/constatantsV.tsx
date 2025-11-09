// export const BASE_URL = 'http://192.168.1.6:3001/api'; // Replace with your actual base URL
// export const CHAT_BASE_URL = 'http://192.168.1.6:3001'; 
export const BASE_URL = 'https://apnabanda.in/voodoo/api'; // Keep API calls on production
// Socket.IO should connect to origin host; server path is set separately
// export const CHAT_BASE_URL = 'http://192.168.1.2:5002';
export const CHAT_BASE_URL = 'https://apnabanda.in';

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
