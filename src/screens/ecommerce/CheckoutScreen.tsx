import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import orderService from '../../services/ecommerce/orderService';
import cartService from '../../services/ecommerce/cartService';
import RazorpayCheckout from 'react-native-razorpay';

const CheckoutScreen = ({ route, navigation }) => {
  const { totalAmount } = route.params;
  const [name, setName] = useState('Vijay Singh Chauhan');
  const [email, setEmail] = useState('vijaychaauhan0056@gmail.com');
  const [phone, setPhone] = useState('9891234473');
  const [address, setAddress] = useState('F-113, rajnagar 2');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [zipCode, setZipCode] = useState('110077');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!name || !email || !phone || !address || !city || !state || !zipCode) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
        position: 'bottom'
      });
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Create an order on your backend
      const orderData = {
        amount: totalAmount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: 'order_' + Date.now(),
      };

      const order = await orderService.createOrder(orderData);

      // Initialize Razorpay payment
      const options = {
        description: 'VoodooTech Smart Home Products',
        image: 'https://your-app-logo-url.png',
        currency: 'INR',
        key: 'rzp_test_q6jv7paIUDvF6t', // Replace with your Razorpay Key ID
        amount: totalAmount * 100,
        name: 'VoodooTech Smart',
        order_id: order.id,
        prefill: {
          email,
          contact: phone,
          name,
        },
        theme: { color: '#2196F3' },
      };

      RazorpayCheckout.open(options)
        .then((data) => {
          // Handle success
          handlePaymentSuccess(data.razorpay_payment_id);
        })
        .catch((error) => {
          // Handle failure
          setIsLoading(false);
          Toast.show({
            type: 'error',
            text1: 'Payment Failed',
            text2: error.description || 'Something went wrong',
            position: 'bottom'
          });
        });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to initiate payment',
        position: 'bottom'
      });
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setIsLoading(true);
    try {
      // Create the order in your system
      const shippingAddress = {
        name,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
      };

      await orderService.completeOrder({
        paymentId,
        amount: totalAmount,
        shippingAddress,
      });

      // Clear the cart
      await cartService.clearCart();

      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Order Placed',
        text2: 'Your order has been placed successfully',
        position: 'bottom'
      });

      // Navigate to order history
      navigation.navigate('OrderHistory');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete order',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Checkout</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="State"
              value={state}
              onChangeText={setState}
            />
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="ZIP Code"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay with Razorpay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  payButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;