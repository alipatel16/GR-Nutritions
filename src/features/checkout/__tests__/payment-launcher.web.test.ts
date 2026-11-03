import { launchPayment, PaymentCancelledError } from '../payment-launcher.web';
import type { PaymentSession } from '../checkout-service';
const session:PaymentSession={id:'session-fixture',status:'payment_pending',paymentMethod:'razorpay',mode:'test',keyId:'rzp_test_fixture',razorpayOrderId:'order_fixture',amountPaise:104900,currency:'INR'};
const customer={name:'Test Buyer',email:'buyer@example.com',phone:'9876543210'};
afterEach(()=>{delete window.Razorpay;});
it('passes only public checkout settings and returns a matching PSP callback',async()=>{
  let options:Record<string,unknown>={};
  window.Razorpay=class {
    constructor(input:Record<string,unknown>){options=input;}
    open(){(options.handler as (value:unknown)=>void)({razorpay_payment_id:'pay_fixture',razorpay_order_id:'order_fixture',razorpay_signature:'a'.repeat(64)});}
    on(){} close(){}
  };
  const result=await launchPayment(session,customer);
  expect(result.razorpay_order_id).toBe('order_fixture');
  expect(options).toMatchObject({key:'rzp_test_fixture',order_id:'order_fixture',amount:104900,currency:'INR'});
  expect(Object.keys(options)).not.toContain('secret');
});
it('rejects an order mismatch and maps dismissal to cancellation',async()=>{
  let options:Record<string,unknown>={};
  window.Razorpay=class {constructor(input:Record<string,unknown>){options=input;} on(){}close(){}
    open(){(options.handler as (value:unknown)=>void)({razorpay_order_id:'order_other'});}};
  await expect(launchPayment(session,customer)).rejects.toThrow('Payment session mismatch');
  window.Razorpay=class {constructor(input:Record<string,unknown>){options=input;}on(){}close(){}
    open(){(options.modal as {ondismiss():void}).ondismiss();}};
  await expect(launchPayment(session,customer)).rejects.toBeInstanceOf(PaymentCancelledError);
});
