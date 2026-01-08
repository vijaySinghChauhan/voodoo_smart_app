import { Product } from '../ecommerce/productService';

// Mock user used in offline mode
export const mockUser = {
  id: 'u001',
  name: 'Voodoo Demo',
  email: 'mock@voodoo.local',
  role: 'user' as const,
  phone: '+1-555-0100',
  profilePicture: undefined,
  subscriptionType: 'Premium',
  subscriptionStartDate: '2025-01-01',
  subscriptionExpiryDate: '2025-12-31',
  subdeviceIds: ['d2', 'd4', 'd6'],
};

export const mockUsers = [
  { id: 'u002', name: 'Alice Johnson', email: 'alice@example.com', role: 'user' },
  { id: 'u003', name: 'Bob Singh', email: 'bob@example.com', role: 'user' },
  { id: 'u004', name: 'Charlie Kumar', email: 'charlie@example.com', role: 'user' },
  { id: 'u005', name: 'Diana Verma', email: 'diana@example.com', role: 'user' },
];

// Mock products for ecommerce
export const mockProducts: Product[] = [
  {
    id: 'product_1',
    name: 'Smart LED Bulb',
    description: 'WiFi-enabled LED bulb with adjustable brightness and color temperature.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1563461661004-ba69c0c5a5eb?auto=format&fit=crop&w=800&q=80',
    category: 'Lighting',
    inStock: true,
    features: ['WiFi', 'Adjustable brightness', 'Color temperature control'],
    specifications: { Wattage: '9W', Lumens: '800lm' },
  },
  {
    id: 'product_2',
    name: 'Smart Plug',
    description: 'Turn any appliance into a smart device with energy monitoring.',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
    category: 'Plugs & Outlets',
    inStock: true,
  },
  {
    id: 'product_3',
    name: 'Motion Sensor',
    description: 'Detects movement and triggers automations.',
    price: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1518432031339-7603c55e0619?auto=format&fit=crop&w=800&q=80',
    category: 'Sensors',
    inStock: true,
  },
];

export const mockCategories = ['Lighting', 'Plugs & Outlets', 'Sensors'];

// Rooms and devices
export const mockRooms = [
  { id: 'r1', name: 'Living Room', deviceCount: 3 },
  { id: 'r2', name: 'Bedroom', deviceCount: 2 },
  { id: 'r3', name: 'Kitchen', deviceCount: 2 },
];

export const mockSubscriptionPlans = [
  { id: 'plan_1_month', name: '1 Subdevice Monthly', price: 49.0, currency: 'INR', interval: 'month' },
  { id: 'plan_1_year', name: '1 Subdevice Annual', price: 499.0, currency: 'INR', interval: 'year' },
  { id: 'plan_2_month', name: '2 Subdevices Monthly', price: 89.0, currency: 'INR', interval: 'month' },
  { id: 'plan_2_year', name: '2 Subdevices Annual', price: 899.0, currency: 'INR', interval: 'year' },
  { id: 'plan_3_month', name: '3 Subdevices Monthly', price: 129.0, currency: 'INR', interval: 'month' },
  { id: 'plan_3_year', name: '3 Subdevices Annual', price: 1299.0, currency: 'INR', interval: 'year' },
  { id: 'plan_4_month', name: '4 Subdevices Monthly', price: 169.0, currency: 'INR', interval: 'month' },
  { id: 'plan_4_year', name: '4 Subdevices Annual', price: 1699.0, currency: 'INR', interval: 'year' },
  { id: 'plan_5_month', name: '5 Subdevices Monthly', price: 199.0, currency: 'INR', interval: 'month' },
  { id: 'plan_5_year', name: '5 Subdevices Annual', price: 1999.0, currency: 'INR', interval: 'year' }
];

export const mockDevices = [
  { 
    id: 'd1', 
    name: 'Ceiling Light', 
    deviceType: 'light', 
    isOn: true, 
    room: 'r1', 
    sharedWith: [],
    // Subscriptions for sub-devices (1-5)
    subDeviceSubscriptions: {
      device1: { active: false, expiry: null },
      device2: { active: false, expiry: null },
      device3: { active: false, expiry: null },
      device4: { active: false, expiry: null },
      device5: { active: false, expiry: null }
    }
  },
  { 
    id: 'd2', 
    name: 'Smart Plug TV', 
    deviceType: 'plug', 
    isOn: false, 
    room: 'r1', 
    sharedWith: [],
    subDeviceSubscriptions: {
      device1: { active: true, expiry: '2025-12-31' }, // Example: active
      device2: { active: false, expiry: null },
      device3: { active: false, expiry: null },
      device4: { active: false, expiry: null },
      device5: { active: false, expiry: null }
    }
  },
  { id: 'd3', name: 'AC', deviceType: 'switch', isOn: false, room: 'r1', sharedWith: [] },
  { id: 'd4', name: 'Bed Lamp', deviceType: 'light', isOn: true, room: 'r2', sharedWith: [] },
  { id: 'd5', name: 'Heater', deviceType: 'switch', isOn: false, room: 'r2', sharedWith: [] },
  { id: 'd6', name: 'Kitchen Light', deviceType: 'light', isOn: true, room: 'r3', sharedWith: [] },
  { id: 'd7', name: 'Water Pump', deviceType: 'switch', isOn: false, room: 'r3', sharedWith: [] },
];

// Chat demo messages per room id (or user-to-user room key)
export const mockMessagesByRoom: Record<string, Array<{ id: string; text: string; sender: string; timestamp: string }>> = {
  general: [
    { id: 'm1', text: 'Welcome to Voodoo Smart!', sender: 'System', timestamp: new Date().toISOString() },
    { id: 'm2', text: 'This is offline demo chat.', sender: 'Voodoo Demo', timestamp: new Date().toISOString() },
  ],
};

// Minimal address/order examples for ecommerce flows
export const mockAddresses = [
  { id: 'a1', line1: '123 Demo Street', city: 'Demo City', state: 'CA', zip: '90001', country: 'USA' },
];

export const mockOrders = [
  { id: 'o1', total: 44.98, items: [{ productId: 'product_2', qty: 1 }, { productId: 'product_3', qty: 1 }], placedAt: new Date().toISOString() },
];

export const mockSubscriptions = [
  {
    id: 'sub_1',
    userId: 'u001',
    subscriptionType: 'Premium',
    startDate: '2025-01-01',
    expiryDate: '2025-12-31',
    status: 'active',
    planId: 'plan_premium'
  }
];
