import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import subscriptionService from '../../services/subscriptions/subscriptionService';
import RazorpayCheckout from 'react-native-razorpay';
import paymentService from '../../services/ecommerce/paymentService';
import Toast from 'react-native-toast-message';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';

interface SubscriptionCheckoutProps {
  navigation: any;
  route: { params: { plan: { id: string; name: string; price: number; currency: string; interval: string } } };
}

const SubscriptionCheckoutScreen: React.FC<SubscriptionCheckoutProps> = ({ navigation, route }) => {
  const plan = route?.params?.plan;
  const [isProcessing, setIsProcessing] = useState(false);

  const summaryText = useMemo(() => {
    if (!plan) return '';
    return `${plan.name} • ${plan.price} ${plan.currency}/${plan.interval}`;
  }, [plan]);

  /*
  const handleConfirm = async () => {
    if (!plan) return;
    setIsProcessing(true);
    try {
      await subscriptionService.purchase(plan.id);
      Alert.alert('Success', 'Subscription purchased successfully');
      navigation.navigate('SubscriptionList');
    } catch (err) {
      Alert.alert('Error', 'Failed to purchase subscription');
    } finally {
      setIsProcessing(false);
    }
  };
  */

  const handleRazorpaySubscribe = async () => {
    if (!plan) return;
    setIsProcessing(true);
    try {
      let keyId = await paymentService.getRazorpayKey();
      if (!keyId) {
        keyId = 'rzp_test_q6jv7paIUDvF6t';
      }

      const options = {
        description: 'Subscription purchase',
        image: 'https://your-app-logo-url.png',
        currency: plan.currency || 'INR',
        key: keyId,
        amount: Math.round(plan.price * 100),
        name: 'VoodooTech Smart',
        order_id: '',
        prefill: {},
        theme: { color: COLORS.primary },
      } as any;

      RazorpayCheckout.open(options)
        .then(async (_data: any) => {
          try {
            await subscriptionService.purchase(plan.id);
            Toast.show({ type: 'success', text1: 'Subscribed', text2: 'Subscription activated successfully', position: 'bottom' });
            navigation.navigate('SubscriptionList');
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to activate subscription', position: 'bottom' });
          } finally {
            setIsProcessing(false);
          }
        })
        .catch((error: any) => {
          setIsProcessing(false);
          Toast.show({ type: 'error', text1: 'Payment Failed', text2: error?.description || 'Something went wrong', position: 'bottom' });
        });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Could not start payment', position: 'bottom' });
      setIsProcessing(false);
    }
  };

  const handlePhonePeSubscribe = async () => {
    if (!plan) return;
    setIsProcessing(true);
    try {
      const callbackUrl = 'voodoohomeS2://payment/phonepe?status=success';
      const { redirectUrl } = await paymentService.initiatePhonePePayment({
        amount: plan.price,
        currency: plan.currency || 'INR',
        customerName: undefined,
        customerPhone: undefined,
        customerEmail: undefined,
        orderId: undefined,
        callbackUrl,
      });

      if (!redirectUrl) throw new Error('PhonePe redirect URL not available');
      await Linking.openURL(redirectUrl);

      Alert.alert(
        'Complete Payment',
        'After completing PhonePe payment, tap Confirm to activate your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await subscriptionService.purchase(plan.id);
                Toast.show({ type: 'success', text1: 'Subscribed', text2: 'Subscription activated successfully', position: 'bottom' });
                navigation.navigate('SubscriptionList');
              } catch (e) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to activate subscription', position: 'bottom' });
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'PhonePe Error', text2: error?.message || 'Unable to start PhonePe payment', position: 'bottom' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Checkout</Text>
      </View>

      {!plan ? (
        <View style={styles.center}><Text style={styles.meta}>No plan selected.</Text></View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.meta}>{summaryText}</Text>
          <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 12 }} />
          <Text style={styles.sectionTitle}>Terms</Text>
          <Text style={styles.terms}>
            - Auto-renew enabled. You can cancel anytime.
            {'\n'}- Access to premium features for the selected interval.
            {'\n'}- Refunds are subject to our policy.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={handleCancel} disabled={isProcessing}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.payBtn]} onPress={handleRazorpaySubscribe} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payTxt}>Subscribe with Razorpay</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.payBtn, styles.phonepeBtn]} onPress={handlePhonePeSubscribe} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payTxt}>Subscribe with PhonePe</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginHorizontal: SIZES.padding, ...SHADOWS.small },
  name: { ...FONTS.h3, color: COLORS.textDark },
  meta: { ...FONTS.caption, color: COLORS.textLight, marginTop: 4 },
  sectionTitle: { ...FONTS.body2, color: COLORS.textDark },
  terms: { ...FONTS.caption, color: COLORS.textLight, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  button: { borderRadius: SIZES.radius, paddingVertical: 10, paddingHorizontal: 14 },
  cancelBtn: { backgroundColor: COLORS.border, marginRight: 10 },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  phonepeBtn: { backgroundColor: '#6b1f9d' },
  cancelTxt: { ...FONTS.body3, color: COLORS.textDark },
  payTxt: { ...FONTS.body3, color: COLORS.white }
});

export default SubscriptionCheckoutScreen;
