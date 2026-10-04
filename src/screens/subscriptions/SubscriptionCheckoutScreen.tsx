import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, Alert, Linking, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import subscriptionService from '../../services/subscriptions/subscriptionService';
import paymentService, { Coupon } from '../../services/ecommerce/paymentService';
import authService from '../../services/auth/authService';
import Toast from 'react-native-toast-message';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as constantsV from '../../constants/constatantsV';

interface SubscriptionCheckoutProps {
  navigation: any;
  route: { params: { plan: { id: string; name: string; price: number; currency: string; interval: string } } };
}

const SubscriptionCheckoutScreen: React.FC<SubscriptionCheckoutProps> = ({ navigation, route }) => {
  const plan = route?.params?.plan;
  const [isProcessing, setIsProcessing] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const isPayingRef = useRef<boolean>(false);
  const lastPayClickAtRef = useRef<number>(0);
  const MIN_MS_BETWEEN_PAY_CLICKS = 3500;

  const summaryText = useMemo(() => {
    if (!plan) return '';
    return `${plan.name} • ${plan.price} ${plan.currency}/${plan.interval}`;
  }, [plan]);

  useEffect(() => {
    (async () => {
      try {
        const list = await paymentService.getCoupons();
        setCoupons(list || []);
      } catch {}
    })();
  }, []);

  const computeAmount = (price: number) => {
    if (!selectedCoupon) return price;
    if (selectedCoupon.discountType === 'percent') {
      const off = (price * selectedCoupon.value) / 100;
      return Math.max(0, price - off);
    }
    return Math.max(0, price - selectedCoupon.value);
  };

  const isLocked = (): boolean => !!isProcessing || !!isPayingRef.current;

  const tryAcquirePaymentLock = (): boolean => {
    const now = Date.now();
    if (isPayingRef.current) {
      Toast.show({ type: 'info', text1: 'Payment in progress', text2: 'Please wait…', position: 'bottom' });
      return false;
    }
    if (now - lastPayClickAtRef.current < MIN_MS_BETWEEN_PAY_CLICKS) {
      return false;
    }
    lastPayClickAtRef.current = now;
    isPayingRef.current = true;
    return true;
  };

  const releasePaymentLock = () => {
    isPayingRef.current = false;
  };

  const applyCoupon = (c: Coupon) => {
    if (isLocked()) return;
    if (!plan) return;
    if (Array.isArray(c.applicablePlanIds) && c.applicablePlanIds.length > 0) {
      const ok = c.applicablePlanIds.includes(plan.id);
      if (!ok) {
        Toast.show({ type: 'info', text1: 'Not Applicable', text2: 'Coupon not valid for this plan', position: 'bottom' });
        return;
      }
    }
    setSelectedCoupon(c);
    Toast.show({ type: 'success', text1: 'Coupon Applied', text2: c.code, position: 'bottom' });
  };

  const removeCoupon = () => {
    if (isLocked()) return;
    setSelectedCoupon(null);
    Toast.show({ type: 'info', text1: 'Coupon Removed', position: 'bottom' });
  };

  const handleRazorpaySubscribe = async () => {
    if (!plan || isLocked()) return;
    if (!tryAcquirePaymentLock()) return;
    setIsProcessing(true);
    try {
      const finalAmount = computeAmount(plan.price);
      const amountPaise = Math.max(200, Math.round(finalAmount * 100));
      const user = await authService.getCurrentUser();
      const { orderId } = await paymentService.createRazorpayOrder({
        amount: amountPaise,
        currency: plan.currency || 'INR',
        planId: plan.id
      });
      const data = await paymentService.openRazorpayPayment({
        description: `Subscription: ${plan.name}`,
        currency: plan.currency || 'INR',
        amount: amountPaise,
        orderId: orderId || undefined,
        name: 'VooDoo',
        theme: { color: COLORS.primary },
        prefill: {
          name: user?.name || undefined,
          email: user?.email || undefined,
          contact: user?.phone || undefined,
        },
      });
      if (!data?.razorpay_payment_id) {
        Toast.show({ type: 'error', text1: 'Payment Failed', text2: 'No payment ID returned', position: 'bottom' });
        return;
      }
      try {
        await subscriptionService.purchase(plan.id);
        Toast.show({ type: 'success', text1: 'Subscribed', text2: 'Subscription activated successfully', position: 'bottom' });
        navigation.navigate('SubscriptionList');
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to activate subscription', position: 'bottom' });
      }
    } catch (rawErr) {
      const norm = paymentService.normalizeRazorpayError(rawErr);
      Toast.show({
        type: 'error',
        text1: norm.message === 'Payment cancelled by user' ? 'Cancelled' : 'Payment Failed',
        text2: norm.message,
        position: 'bottom',
      });
    } finally {
      setIsProcessing(false);
      releasePaymentLock();
    }
  };

  const handlePhonePeSubscribe = async () => {
    if (!plan || isLocked()) return;
    if (!tryAcquirePaymentLock()) return;
    setIsProcessing(true);
    try {
      const callbackUrl = 'voodoohomeS2://payment/phonepe?status=success';
      const env = (constantsV as any).PHONEPE_ENV === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
      const flowId = 'flow_' + Date.now();
      const merchantIdConst = String((constantsV as any).PHONEPE_MERCHANT_ID || '').trim();
      await paymentService.initPhonePeSDK({ environment: env as any, merchantId: merchantIdConst || 'merchant', flowId, enableLogging: env !== 'PRODUCTION' });
      const finalAmount = computeAmount(plan.price);
      const order = await paymentService.createPhonePeOrder({ amount: finalAmount, currency: plan.currency || 'INR', callbackUrl });
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
        try {
          await subscriptionService.purchase(plan.id);
          Toast.show({ type: 'success', text1: 'Subscribed', text2: 'Subscription activated successfully', position: 'bottom' });
          navigation.navigate('SubscriptionList');
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to activate subscription', position: 'bottom' });
        }
      } else if (status === 'FAILED') {
        Toast.show({ type: 'error', text1: 'Payment Failed', position: 'bottom' });
      } else {
        Alert.alert('Pending', 'Payment is pending. Please check later.');
      }
    } catch (error: any) {
      try {
        const callbackUrl = 'voodoohomeS2://payment/phonepe?status=success';
        const finalAmount = computeAmount(plan.price);
        const { redirectUrl } = await paymentService.initiatePhonePePayment({
          amount: finalAmount,
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
      } catch (err2: any) {
        Toast.show({ type: 'error', text1: 'PhonePe Error', text2: err2?.message || 'Unable to start PhonePe payment', position: 'bottom' });
      }
    } finally {
      setIsProcessing(false);
      releasePaymentLock();
    }
  };

  const handleCancel = () => {
    if (isLocked()) return;
    navigation.goBack();
  };

  const anyLocked = isProcessing || !!isPayingRef.current;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {navigation.canGoBack() ? (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }} disabled={anyLocked}>
                <Icon name="arrow-back" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>Subscription Checkout</Text>
          </View>
        </View>

        {!plan ? (
          <View style={styles.center}><Text style={styles.meta}>No plan selected.</Text></View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.name}>{plan.name}</Text>
            <Text style={styles.meta}>{summaryText}</Text>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 12 }} />
            <Text style={styles.sectionTitle}>Apply Coupon</Text>
            {coupons.length > 0 ? (
              <FlatList
                data={coupons}
                keyExtractor={(item) => item.code}
                horizontal
                contentContainerStyle={{ paddingVertical: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.couponChip, selectedCoupon?.code === item.code ? styles.couponChipActive : undefined]}
                    onPress={() => applyCoupon(item)}
                    disabled={anyLocked}
                    hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
                  >
                    <Text style={styles.couponText}>{item.code}</Text>
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <Text style={styles.meta}>No coupons available</Text>
            )}
            {selectedCoupon && (
              <View style={styles.couponRow}>
                <Text style={styles.appliedTxt}>Applied: {selectedCoupon.code}</Text>
                <Pressable onPress={removeCoupon} disabled={anyLocked} hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}>
                  <Text style={styles.removeTxt}>Remove</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.amountRow}>
              <Text style={styles.sectionTitle}>Payable</Text>
              <Text style={styles.payableTxt}>
                {computeAmount(plan.price).toFixed(2)} {plan.currency || 'INR'}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.terms}>
              - Auto-renew enabled. You can cancel anytime.
              {'\n'}- Access to premium features for the selected interval.
              {'\n'}- Refunds are subject to our policy.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={handleCancel} disabled={anyLocked}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.payBtn,
                anyLocked ? { opacity: 0.6 } : pressed ? { opacity: 0.85 } : undefined,
              ]}
              onPress={handleRazorpaySubscribe}
              disabled={anyLocked}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              {anyLocked ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payTxt}>Subscribe with Razorpay</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.payBtn,
                styles.phonepeBtn,
                anyLocked ? { opacity: 0.6 } : pressed ? { opacity: 0.85 } : undefined,
              ]}
              onPress={handlePhonePeSubscribe}
              disabled={anyLocked}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              {anyLocked ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payTxt}>Subscribe with PhonePe</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SIZES.padding },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginHorizontal: SIZES.padding, ...SHADOWS.large },
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
  ,
  couponChip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: SIZES.radius, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, ...SHADOWS.small },
  couponChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  couponText: { ...FONTS.small, color: COLORS.textDark },
  couponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  appliedTxt: { ...FONTS.small, color: COLORS.textDark },
  removeTxt: { ...FONTS.small, color: COLORS.error },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  payableTxt: { ...FONTS.h4, color: COLORS.primary }
});

export default SubscriptionCheckoutScreen;
