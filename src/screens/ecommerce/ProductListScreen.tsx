import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import productService from '../../services/ecommerce/productService';
import cartService from '../../services/ecommerce/cartService';
import Toast from 'react-native-toast-message';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

const ProductListScreen = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const productsData = await productService.getProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(productsData.map(p => p.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load products',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const filterProducts = () => {
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const handleAddToCart = async (product: Product) => {
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
        text2: `${product.name} added to your cart`,
        position: 'bottom'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add product to cart',
        position: 'bottom'
      });
    }
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item && styles.selectedCategoryItem,
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item && styles.selectedCategoryText,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <TouchableOpacity
        style={styles.addToCartButton}
        onPress={() => handleAddToCart(item)}
      >
        <Text style={styles.addToCartButtonText}>Add to Cart</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VoodooTech Shop</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartButtonText}>Cart</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  cartButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryItem: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
  },
  selectedCategoryText: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsList: {
    padding: 16,
  },
  productItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#757575',
  },
  addToCartButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
  },
});

export default ProductListScreen;