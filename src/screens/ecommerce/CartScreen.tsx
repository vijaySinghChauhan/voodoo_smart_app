import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import cartService from '../../services/ecommerce/cartService';
import productService from '../../services/ecommerce/productService';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
  };
}

const CartScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const items = await cartService.getCartItems();
      
      // Load product details for each cart item
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await productService.getProductById(item.productId);
          return { ...item, product };
        })
      );
      
      setCartItems(itemsWithProducts);
      
      // Calculate total amount
      const total = itemsWithProducts.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0
      );
      setTotalAmount(total);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load cart items',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    try {
      await cartService.updateCartItemQuantity(itemId, newQuantity);
      
      // Update local state
      const updatedItems = cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      
      setCartItems(updatedItems);
      
      // Recalculate total
      const total = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      );
      setTotalAmount(total);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update quantity',
        position: 'bottom'
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await cartService.removeFromCart(itemId);
      
      // Update local state
      const updatedItems = cartItems.filter(item => item.id !== itemId);
      setCartItems(updatedItems);
      
      // Recalculate total
      const total = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      );
      setTotalAmount(total);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Item removed from cart',
        position: 'bottom'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove item from cart',
        position: 'bottom'
      });
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Your cart is empty',
        position: 'bottom'
      });
      return;
    }
    // Navigate into nested Ecommerce stack when Cart is opened from Drawer
    navigation.navigate('Shop', {
      screen: 'Checkout',
      params: { totalAmount },
    });
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.productImage}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
        ₹{item.price.toFixed(2)}
        </Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping Cart</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
          />
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>
              ₹{totalAmount.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() =>
              navigation.navigate('Shop', {
                screen: 'ProductList',
              })
            }
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
  },
  removeButton: {
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#F44336',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginBottom: 16,
  },
  shopButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  shopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;
