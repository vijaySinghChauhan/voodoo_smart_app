// export const BASE_URL = 'http://192.168.1.6:3001/api'; // Replace with your actual base URL
// export const CHAT_BASE_URL = 'http://192.168.1.6:3001'; 
export const BASE_URL = 'https://apnabanda.in/voodoo/api'; // Replace with your actual base URL
// Socket.IO must connect to the origin; use `path: '/voodoo/socket.io'` to target the resource path.
export const CHAT_BASE_URL = 'https://apnabanda.in'; 
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
