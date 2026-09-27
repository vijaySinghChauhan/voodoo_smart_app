import React, { useEffect, useState } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import orderService from '../../services/ecommerce/orderService';
import cartService from '../../services/ecommerce/cartService';
import RazorpayCheckout from 'react-native-razorpay';
import paymentService from '../../services/ecommerce/paymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import addressApi, { AddressDTO } from '../../services/ecommerce/addressApi';
import * as constantsV from '../../constants/constatantsV';
import { COLORS, SHADOWS, SIZES, FONTS } from '../../theme/theme';

interface CheckoutProps {
  route: { params: { totalAmount: number } };
  navigation: any;
}

const CheckoutScreen: React.FC<CheckoutProps> = ({ route, navigation }) => {
  const { totalAmount } = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDefaultAddress = async () => {
    try {
      const list = await addressApi.list();
      const def = list.find(a => a.isDefault) || null;
      if (def) {
        setSelectedAddress(def);
        setName(def.name || '');
        setEmail(def.email || '');
        setPhone(def.phone || '');
        setAddress(def.addressLine1 || '');
        setCity(def.city || '');
        setState(def.state || '');
        setZipCode(def.zipCode || '');
        setCountry(def.country || '');
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    loadDefaultAddress();
    const unsubscribe = navigation.addListener('focus', loadDefaultAddress);
    return unsubscribe;
  }, [navigation]);

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
      const callbackUrl = 'voodoohomeS2://payment/phonepe?status=success';
      const env = (constantsV as any).PHONEPE_ENV === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
      const flowId = 'flow_' + Date.now();
      const merchantIdConst = String((constantsV as any).PHONEPE_MERCHANT_ID || '').trim();
      const initOk = await paymentService.initPhonePeSDK({ environment: env as any, merchantId: merchantIdConst || 'merchant', flowId, enableLogging: env !== 'PRODUCTION' });
      const order = await paymentService.createPhonePeOrder({ amount: totalAmount, currency: 'INR', callbackUrl });
      const mId = String(order?.merchantId || merchantIdConst || '').trim();
      const oId = order?.orderId;
      const token = order?.token;
      if (!oId || !token || !mId) throw new Error('Create Order failed');
      const request = JSON.stringify({ orderId: oId, merchantId: mId, token, paymentMode: { type: 'PAY_PAGE' } });
      const resp = await paymentService.startPhonePeTransaction(request, 'voodoohomeS2');
      let status = resp?.status;
      if (!status || status === 'PENDING' || status === 'INTERRUPTED') {
        let finalStatus: string | undefined = undefined;
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 15000));
          const s = await paymentService.checkPhonePeOrderStatus(oId);
          if (s === 'COMPLETED' || s === 'FAILED') {
            finalStatus = s;
            break;
          }
        }
        status = finalStatus || status;
      }
      if (status === 'SUCCESS' || status === 'COMPLETED') {
        await handlePaymentSuccess(oId);
      } else if (status === 'FAILED') {
        Toast.show({ type: 'error', text1: 'Payment Failed', position: 'bottom' });
      } else {
        Alert.alert('Pending', 'Payment is pending. Please check later.');
      }
    } catch (error) {
      try {
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
        if (!redirectUrl) throw new Error('PhonePe redirect URL not available');
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
      } catch (err2) {
        Toast.show({ type: 'error', text1: 'PhonePe Error', text2: (err2 as any)?.message || 'Unable to start PhonePe payment', position: 'bottom' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  
  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let keyId = await paymentService.getRazorpayKey();
      if (!keyId) {
        keyId = 'rzp_test_q6jv7paIUDvF6t';
      }

      const amountPaise = Math.round(totalAmount * 100);
      const { orderId } = await paymentService.createRazorpayOrder({
        amount: amountPaise,
        currency: 'INR'
      });
      if (!orderId) {
        Toast.show({
          type: 'error',
          text1: 'Payment Error',
          text2: 'Unable to create payment order. Please try again.',
          position: 'bottom'
        });
        setIsLoading(false);
        return;
      }

      const options = {
        description: 'VoodooTech Smart Home Products',
        image: 'https://your-app-logo-url.png',
        currency: 'INR',
        key: keyId,
        amount: amountPaise,
        name: 'VoodooTech Smart',
        order_id: orderId,
        prefill: {
          email,
          contact: phone,
          name,
        },
        theme: { color: COLORS.primaryDark },
      };

      RazorpayCheckout.open(options)
        .then((data) => {
          handlePaymentSuccess(data.razorpay_payment_id);
        })
        .catch((error) => {
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

      await cartService.clearCart();

      Toast.show({
        type: 'success',
        text1: 'Order Placed',
        text2: 'Your order has been placed successfully',
        position: 'bottom'
      });

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
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Checkout</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {selectedAddress ? (
            <View>
              <Text style={styles.summaryLabel}>{selectedAddress.name}</Text>
              <Text style={styles.summaryLabel}>{selectedAddress.phone}</Text>
              <Text style={styles.summaryLabel}>{selectedAddress.addressLine1}</Text>
              {selectedAddress.addressLine2 ? <Text style={styles.summaryLabel}>{selectedAddress.addressLine2}</Text> : null}
              <Text style={styles.summaryLabel}>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}</Text>
              <Text style={styles.summaryLabel}>{selectedAddress.country}</Text>
            </View>
          ) : (
            <Text style={styles.summaryLabel}>No default address set</Text>
          )}
          <TouchableOpacity style={[styles.payButton, { marginTop: SIZES.base * 1.5 }]} onPress={() => navigation.navigate('AddressList')}>
            <Text style={styles.payButtonText}>Change Address</Text>
          </TouchableOpacity>
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
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay with Razorpay</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payButton, styles.phonepeButton]}
          onPress={handlePhonePePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay with PhonePe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  header: {
    marginBottom: SIZES.margin,
  },
  title: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.margin,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    marginBottom: SIZES.margin,
    color: COLORS.textDark,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.base * 1.5,
    marginBottom: SIZES.base * 1.5,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingVertical: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: SIZES.body1,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: SIZES.body1,
    color: COLORS.textDark,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: SIZES.base,
    paddingTop: SIZES.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  totalValue: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  payButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    alignItems: 'center',
    marginTop: SIZES.margin,
  },
  phonepeButton: {
    backgroundColor: COLORS.primaryDark,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;
