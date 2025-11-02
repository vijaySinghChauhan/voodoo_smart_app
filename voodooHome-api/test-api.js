const axios = require('axios');

// Base URL for the API
const BASE_URL = 'http://127.0.0.1:3001/api';

// Test credentials
const testUser = {
  email: 'john@example.com',
  password: 'password123'
};

let authToken = '';
let deviceId = '';

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testLogin = async () => {
  console.log('\n🔐 Testing user login...');
  const response = await makeRequest('POST', '/auth/login', testUser);
  authToken = response.token;
  console.log('✅ Login successful!');
  console.log('Token:', authToken.substring(0, 20) + '...');
};

const testGetDevices = async () => {
  console.log('\n📱 Testing get devices...');
  const response = await makeRequest('GET', '/devices');
  console.log(`✅ Found ${response.count} devices`);
  if (response.data.length > 0) {
    deviceId = response.data[0]._id;
    console.log('First device:', {
      id: response.data[0]._id,
      name: response.data[0].name,
      isOn: response.data[0].isOn,
      brightness: response.data[0].brightness
    });
  }
  return response.data;
};

const testDeviceControl = async () => {
  if (!deviceId) {
    console.log('❌ No device ID available for testing');
    return;
  }

  console.log('\n🎛️  Testing device control...');
  
  // Test turning device on
  console.log('\n🔆 Turning device ON...');
  let response = await makeRequest('POST', `/devices/${deviceId}/control`, {
    action: 'on',
    brightness: 75
  });
  console.log('✅', response.message);
  console.log('Device state:', response.data);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test getting device state
  console.log('\n📊 Getting device state...');
  response = await makeRequest('GET', `/devices/${deviceId}/state`);
  console.log('✅ Device state retrieved:');
  console.log(response.data);

  // Test turning device off
  console.log('\n🔅 Turning device OFF...');
  response = await makeRequest('POST', `/devices/${deviceId}/control`, {
    action: 'off'
  });
  console.log('✅', response.message);
  console.log('Device state:', response.data);

  // Test toggle
  console.log('\n🔄 Toggling device...');
  response = await makeRequest('POST', `/devices/${deviceId}/control`, {
    action: 'toggle',
    brightness: 50
  });
  console.log('✅', response.message);
  console.log('Device state:', response.data);
};

const testGetRooms = async () => {
  console.log('\n🏠 Testing get rooms...');
  const response = await makeRequest('GET', '/rooms');
  console.log(`✅ Found ${response.count} rooms`);
  if (response.data.length > 0) {
    console.log('First room:', {
      id: response.data[0]._id,
      name: response.data[0].name,
      type: response.data[0].type,
      deviceCount: response.data[0].devices.length
    });
  }
};

const testGetProducts = async () => {
  console.log('\n🛒 Testing get products...');
  const response = await makeRequest('GET', '/products');
  console.log(`✅ Found ${response.count} products`);
  if (response.data.length > 0) {
    console.log('First product:', {
      id: response.data[0]._id,
      name: response.data[0].name,
      price: response.data[0].price,
      rating: response.data[0].rating,
      reviewCount: response.data[0].reviews.length
    });
  }
};

// Main test function
const runTests = async () => {
  try {
    console.log('🚀 Starting API Tests...');
    console.log('='.repeat(50));
    
    await testLogin();
    await testGetDevices();
    await testDeviceControl();
    await testGetRooms();
    await testGetProducts();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Available API Endpoints:');
    console.log('• POST /api/auth/login - User login');
    console.log('• GET  /api/devices - Get user devices');
    console.log('• POST /api/devices/:id/control - Control device (on/off/toggle)');
    console.log('• GET  /api/devices/:id/state - Get device state');
    console.log('• GET  /api/rooms - Get user rooms');
    console.log('• GET  /api/products - Get products');
    console.log('\n🔧 Device Control Actions:');
    console.log('• action: "on" - Turn device on');
    console.log('• action: "off" - Turn device off');
    console.log('• action: "toggle" - Toggle device state');
    console.log('• brightness: 0-100 - Set brightness level');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
};

// Check if axios is available
if (typeof require !== 'undefined') {
  runTests();
} else {
  console.log('❌ This script requires Node.js and axios package');
}