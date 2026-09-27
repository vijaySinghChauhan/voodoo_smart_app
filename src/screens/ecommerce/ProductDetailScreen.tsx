import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import productService from '../../services/ecommerce/productService';
import cartService from '../../services/ecommerce/cartService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SHADOWS, SIZES, FONTS } from '../../theme/theme';

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

const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const loadProductDetails = useCallback(async () => {
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
  }, [productId]);

  useEffect(() => {
    loadProductDetails();
  }, [loadProductDetails]);

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
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
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
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <View style={styles.headerBar}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: SIZES.base * 1.5, padding: SIZES.base * 0.5 }}>
            <Icon name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>Product Details</Text>
      </View>
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
            <ActivityIndicator color={COLORS.white} size="small" />
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.base * 1.25,
    fontSize: SIZES.body1,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  errorText: {
    fontSize: SIZES.h3,
    color: COLORS.error,
    marginBottom: SIZES.padding,
  },
  backButton: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SIZES.base * 1.25,
    paddingHorizontal: SIZES.margin,
    borderRadius: SIZES.base * 0.625,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.base * 1.5,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: SIZES.margin,
  },
  productName: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: SIZES.base * 0.625,
  },
  productPrice: {
    fontSize: SIZES.h2,
    color: COLORS.primaryDark,
    fontWeight: 'bold',
    marginBottom: SIZES.base * 0.625,
  },
  productCategory: {
    fontSize: SIZES.body2,
    color: COLORS.textLight,
    marginBottom: SIZES.base * 1.875,
  },
  outOfStockContainer: {
    backgroundColor: COLORS.error,
    paddingVertical: SIZES.base * 0.625,
    paddingHorizontal: SIZES.base * 1.25,
    borderRadius: SIZES.base * 0.625,
    alignSelf: 'flex-start',
    marginBottom: SIZES.base * 1.875,
  },
  outOfStockText: {
    color: COLORS.white,
    fontSize: SIZES.body2,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: SIZES.margin,
    marginBottom: SIZES.base * 1.25,
  },
  description: {
    fontSize: SIZES.body1,
    color: COLORS.textDark,
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: SIZES.base * 1.25,
  },
  featureItem: {
    marginBottom: SIZES.base * 0.625,
  },
  featureText: {
    fontSize: SIZES.body1,
    color: COLORS.textDark,
    lineHeight: 24,
  },
  specsList: {
    marginBottom: SIZES.margin,
  },
  specItem: {
    flexDirection: 'row',
    marginBottom: SIZES.base,
    paddingBottom: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specKey: {
    flex: 1,
    fontSize: SIZES.body1,
    color: COLORS.textLight,
  },
  specValue: {
    flex: 2,
    fontSize: SIZES.body1,
    color: COLORS.textDark,
  },
  bottomContainer: {
    flexDirection: 'row',
    padding: SIZES.margin,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.base * 1.875,
  },
  quantityButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  quantityText: {
    fontSize: SIZES.body1,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginHorizontal: SIZES.base * 1.875,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.base * 0.625,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.textVeryLight,
  },
  addToCartButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body2,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
