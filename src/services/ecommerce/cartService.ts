import AsyncStorage from '@react-native-async-storage/async-storage';
import productService from './productService';

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl: string;
}

class CartService {
  private CART_STORAGE_KEY = 'CART_ITEMS';
  
  // Get all items in the cart
  async getCartItems(): Promise<CartItem[]> {
    try {
      const cartJson = await AsyncStorage.getItem(this.CART_STORAGE_KEY);
      return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
      console.error('Failed to get cart items:', error);
      return [];
    }
  }
  
  // Add a product to the cart
  async addToCart(item: Partial<CartItem> & { productId: string, quantity: number }): Promise<CartItem> {
    try {
      const cartItems = await this.getCartItems();
      
      // Check if the product is already in the cart
      const existingItemIndex = cartItems.findIndex(i => i.productId === item.productId);
      
      if (existingItemIndex !== -1) {
        // Update quantity if already in cart
        cartItems[existingItemIndex].quantity += item.quantity;
        await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartItems));
        return cartItems[existingItemIndex];
      } else {
        // If not in cart, fetch product details if needed
        let newItem: CartItem;
        
        if (item.name && item.price && item.imageUrl) {
          // If all details are provided
          newItem = {
            id: 'cart_' + Date.now(),
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            imageUrl: item.imageUrl
          };
        } else {
          // Fetch product details
          const product = await productService.getProductById(item.productId);
          if (!product) throw new Error('Product not found');
          
          newItem = {
            id: 'cart_' + Date.now(),
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            name: product.name,
            imageUrl: product.imageUrl
          };
        }
        
        cartItems.push(newItem);
        await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartItems));
        return newItem;
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }
  
  // Update the quantity of an item in the cart
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      const itemIndex = cartItems.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) return false;
      
      cartItems[itemIndex].quantity = quantity;
      await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartItems));
      return true;
    } catch (error) {
      console.error('Failed to update cart item quantity:', error);
      return false;
    }
  }
  
  // Remove an item from the cart
  async removeFromCart(itemId: string): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      const updatedItems = cartItems.filter(item => item.id !== itemId);
      
      await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(updatedItems));
      return true;
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      return false;
    }
  }
  
  // Clear the entire cart
  async clearCart(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return false;
    }
  }
  
  // Calculate the total price of items in the cart
  async getCartTotal(): Promise<number> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    } catch (error) {
      console.error('Failed to calculate cart total:', error);
      return 0;
    }
  }
  
  // Get the count of items in the cart
  async getCartItemCount(): Promise<number> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.reduce((count, item) => count + item.quantity, 0);
    } catch (error) {
      console.error('Failed to get cart item count:', error);
      return 0;
    }
  }
}

export default new CartService();