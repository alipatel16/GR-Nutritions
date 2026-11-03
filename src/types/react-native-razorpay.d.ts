declare module 'react-native-razorpay' {
  const checkout: {
    open(options: Record<string, unknown>): Promise<{
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }>;
  };
  export default checkout;
}
