import axios from 'axios';
import { CartItem } from './cartService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as constantsV from '../../constants/constatantsV';

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  paymentId: string;
  shippingAddress: ShippingAddress;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

class OrderService {
  private baseUrl: string = constantsV.BASE_URL + '/orders';
  // Create a new order (for Razorpay integration)
  async createOrder(orderData: { amount: number, currency: string, receipt: string }): Promise<{ id: string }> {
    try {
      const response = await axios.post<{ id: string }>(`${this.baseUrl}/`, orderData);
      return response.data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  // Complete an order after successful payment
  async completeOrder(orderData: { paymentId: string, amount: number, shippingAddress: ShippingAddress, items: CartItem[] }): Promise<Order> {
    try {
      const response = await axios.post<Order>(`${this.baseUrl}/complete`, orderData);
      return response.data;
    } catch (error) {
      console.error('Failed to complete order:', error);
      throw error;
    }
  }

  // Get all orders for the current user
  async getOrders(): Promise<Order[]> {
    try {
      const response = await axios.get<Order[]>(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Failed to get orders:', error);
      return [];
    }
  }
  
  // Get a specific order by ID
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orders = await this.getOrders();
      const order = orders.find(o => o.id === orderId);
      return order || null;
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }
  
  // Update order status
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    try {
      const orders = await this.getOrders();
      const orderIndex = orders.findIndex(o => o.id === orderId);
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        await AsyncStorage.setItem(this.ORDERS_STORAGE_KEY, JSON.stringify(orders));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update order status:', error);
      return false;
    }
  }
}

export default new OrderService();