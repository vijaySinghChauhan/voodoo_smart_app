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
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import orderService from '../../services/ecommerce/orderService';
import cartService from '../../services/ecommerce/cartService';
import RazorpayCheckout from 'react-native-razorpay';
import paymentService from '../../services/ecommerce/paymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CheckoutProps {
  route: { params: { totalAmount: number } };
  navigation: any;
}

const CheckoutScreen: React.FC<CheckoutProps> = ({ route, navigation }) => {
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

  const handlePhonePePay = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Construct a callback URL to return to the app post payment
      const callbackUrl = 'voodoohomeS2://payment/phonepe?status=success';
      const { redirectUrl } = await paymentService.initiatePhonePePayment({
        amount: totalAmount,
        currency: 'INR',
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        orderId: undefined,
        callbackUrl,
      });

      if (!redirectUrl) {
        throw new Error('PhonePe redirect URL not available');
      }

      await Linking.openURL(redirectUrl);

      Alert.alert(
        'Complete Payment',
        'After completing PhonePe payment, tap Confirm to place your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              const storedTxn = await AsyncStorage.getItem('last_phonepe_txn_id');
              await handlePaymentSuccess(storedTxn || ('phonepe_' + Date.now()));
            },
          },
        ]
      );
    } catch (error) {
      Toast.show({ type: 'error', text1: 'PhonePe Error', text2: (error as any)?.message || 'Unable to start PhonePe payment', position: 'bottom' });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let keyId = await paymentService.getRazorpayKey();
      // Fallback to test key if backend key is not available
      if (!keyId) {
        keyId = 'rzp_test_q6jv7paIUDvF6t';
      }

      // Initialize Razorpay payment
      const options = {
        description: 'VoodooTech Smart Home Products',
        image: 'https://your-app-logo-url.png',
        currency: 'INR',
        key: keyId,
        amount: totalAmount * 100,
        name: 'VoodooTech Smart',
        order_id: '',
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
        text2: '' + (error instanceof Error ? error.message : String(error)),
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

      const items = await cartService.getCartItems();
      await orderService.createOrder({ paymentId, amount: totalAmount, shippingAddress, items });

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
{/* 
        <TouchableOpacity
          style={[styles.payButton, styles.phonepeButton]}
          onPress={handlePhonePePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay with PhonePe</Text>
          )}
        </TouchableOpacity> */}
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
  phonepeButton: {
    backgroundColor: '#6b1f9d',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;