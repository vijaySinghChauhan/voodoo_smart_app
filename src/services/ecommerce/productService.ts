import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  features?: string[];
  specifications?: { [key: string]: string };
}

class ProductService {
  // private baseUrl: string = 'http://localhost:3001/api/products';
  // private baseUrl: string = 'http://192.168.1.6:3001/api/products';
  private baseUrl: string = constantsV.BASE_URL + '/products';

  // Get all products
  // This is correct for getProducts
  async getProducts(): Promise<Product[]> {
    const response = await axios.get(`${this.baseUrl}`);
    return response.data.data; // ✅ Correct
  }
  
  // This is WRONG for getProductById
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/${productId}`);
      return response.data.data; // Changed from response.data to response.data.data
    } catch (error) {
      console.error('Failed to get product:', error);
      return null;
    }
  }
  
  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/category/${category}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get products by category:', error);
      return [];
    }
  }
  
  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }
  
  // Add a new product (admin functionality)
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      const response = await axios.post(`${this.baseUrl}`, product);
      return response.data;
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  }
  
  // Update a product (admin functionality)
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const response = await axios.put(`${this.baseUrl}/${productId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update product:', error);
      return null;
    }
  }
  
  // Delete a product (admin functionality)
  async deleteProduct(productId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/${productId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete product:', error);
      return false;
    }
  }
  
  // Get categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/categories`);
      return response.data;
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  // Sample products for initial data (kept for reference)
  // private getSampleProducts(): Product[] {
  //   return [
  //     {
  //       id: 'product_1',
  //       name: 'Smart LED Bulb',
  //       description: 'WiFi-enabled LED bulb with adjustable brightness and color temperature. Control from anywhere using the VoodooTech app.',
  //       price: 19.99,
  //       imageUrl: 'https://images.unsplash.com/photo-1563461661004-ba69c0c5a5eb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  //       category: 'Lighting',
  //       inStock: true,
  //       features: [
  //         'WiFi connectivity',
  //         'Adjustable brightness',
  //         'Color temperature control (2700K-6500K)',
  //         'Voice control compatible',
  //         'Schedule and timer functions'
  //       ],
  //       specifications: {
  //         'Wattage': '9W',
  //         'Lumens': '800lm',
  //         'Voltage': '110-240V',
  //         'Lifespan': '25,000 hours',
  //         'Connectivity': 'WiFi 2.4GHz'
  //       }
  //     },
  //     {
  //       id: 'product_2',
  //       name: 'Smart Plug',
  //       description: 'Turn any appliance into a smart device with this WiFi-enabled smart plug. Monitor energy usage and control remotely.',
  //       price: 24.99,
  //       imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  //       category: 'Plugs & Outlets',
  //       inStock: true,
  //       features: [
  //         'WiFi connectivity',
  //         'Energy monitoring',
  //         'Scheduling',
  //         'Voice control compatible',
  //         'Overload protection'
  //       ],
  //       specifications: {
  //         'Maximum Load': '1800W',
  //         'Voltage': '110-240V',
  //         'Current': '10A max',
  //         'Connectivity': 'WiFi 2.4GHz',
  //         'Dimensions': '2.4 x 1.6 x 1.2 inches'
  //       }
  //     },
  //     {
  //       id: 'product_3',
  //       name: 'Smart Thermostat',
  //       description: 'Intelligent thermostat that learns your preferences and optimizes heating and cooling for comfort and energy savings.',
  //       price: 129.99,
  //       imageUrl: 'https://images.unsplash.com/photo-1567318943997-c0dce6eeea60?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  //       category: 'Climate Control',
  //       inStock: true,
  //       features: [
  //         'Learning algorithm',
  //         'Energy usage reports',
  //         'Remote control via app',
  //         'Compatible with most HVAC systems',
  //         'Geofencing capability'
  //       ],
  //       specifications: {
  //         'Display': '2.8" color LCD',
  //         'Sensors': 'Temperature, Humidity, Occupancy',
  //         'Connectivity': 'WiFi 2.4GHz, Bluetooth',
  //         'Compatibility': '95% of 24V heating and cooling systems',
  //         'Power': 'Hardwired with battery backup'
  //       }
  //     },
  //     {
  //       id: 'product_4',
  //       name: 'Security Camera',
  //       description: 'HD security camera with night vision, motion detection, and two-way audio. Keep an eye on your home from anywhere.',
  //       price: 79.99,
  //       imageUrl: 'https://images.unsplash.com/photo-1557862921-37829c790f19?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  //       category: 'Security',
  //       inStock: false,
  //       features: [
  //         '1080p HD video',
  //         'Night vision up to 30ft',
  //         'Motion detection alerts',
  //         'Two-way audio',
  //         'Cloud storage options'
  //       ],
  //       specifications: {
  //         'Resolution': '1920x1080',
  //         'Field of View': '130°',
  //         'Audio': 'Built-in microphone and speaker',
  //         'Storage': 'Cloud or local microSD (up to 128GB)',
  //         'Power': 'DC 5V/2A'
  //       }
  //     },
  //     {
  //       id: 'product_5',
  //       name: 'Smart Door Lock',
  //       description: 'Keyless entry smart lock with fingerprint, PIN code, and app control. Receive notifications when your door is unlocked.',
  //       price: 199.99,
  //       imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  //       category: 'Security',
  //       inStock: true,
  //       features: [
  //         'Multiple entry methods: fingerprint, PIN, app, physical key',
  //         'Activity log',
  //         'Temporary access codes',
  //         'Auto-lock functionality',
  //         'Low battery alerts'
  //       ],
  //       specifications: {
  //         'Battery': '4 AA batteries (lasts up to 6 months)',
  //         'Fingerprint Capacity': 'Up to 100 fingerprints',
  //         'PIN Capacity': 'Up to 100 unique codes',
  //         'Connectivity': 'Bluetooth, WiFi (with bridge)',
  //         'Material': 'Zinc alloy and stainless steel'
  //       }
  //     }
  //   ];
  // }
}

export default new ProductService();