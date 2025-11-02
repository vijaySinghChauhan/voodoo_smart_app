import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import productService from '../../services/ecommerce/productService';
import cartService from '../../services/ecommerce/cartService';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  features?: string[];
  specifications?: { [key: string]: string };
}

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    loadProductDetails();
  }, []);

  const loadProductDetails = async () => {
    setIsLoading(true);
    try {
      const productData = await productService.getProductById(productId);
      setProduct(productData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load product details',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    setIsAddingToCart(true);
    try {
      await cartService.addToCart({
        productId: product.id,
        quantity,
        price: product.price,
        name: product.name,
        imageUrl: product.imageUrl
      });
      
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${quantity} x ${product.name} added to your cart`,
        position: 'bottom'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add product to cart',
        position: 'bottom'
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
        
        <View style={styles.contentContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
          <Text style={styles.productCategory}>{product.category}</Text>
          
          {!product.inStock && (
            <View style={styles.outOfStockContainer}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
          
          {product.features && product.features.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresList}>
                {product.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureText}>• {feature}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specsList}>
                {Object.entries(product.specifications).map(([key, value], index) => (
                  <View key={index} style={styles.specItem}>
                    <Text style={styles.specKey}>{key}</Text>
                    <Text style={styles.specValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      
      <View style={styles.bottomContainer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= 1 || !product.inStock}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= 10 || !product.inStock}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.addToCartButton, !product.inStock && styles.disabledButton]}
          onPress={handleAddToCart}
          disabled={isAddingToCart || !product.inStock}
        >
          {isAddingToCart ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addToCartButtonText}>
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 20,
    color: '#4a90e2',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  outOfStockContainer: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 10,
  },
  featureItem: {
    marginBottom: 5,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  specsList: {
    marginBottom: 20,
  },
  specItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  specKey: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  specValue: {
    flex: 2,
    fontSize: 16,
    color: '#333',
  },
  bottomContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  quantityButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9e9e9e',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;