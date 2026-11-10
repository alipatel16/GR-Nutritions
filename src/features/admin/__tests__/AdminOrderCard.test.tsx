import { render, screen, userEvent } from '@testing-library/react-native';
import { AdminOrderCard } from '../AdminOrderCard';
import { adminRepository } from '../admin-repository';
jest.mock('../admin-repository',()=>({adminRepository:{createShipment:jest.fn(),syncShipment:jest.fn()}}));
const order={id:'order-test',status:'paid',totalPaise:150000,userId:'buyer',mode:'live' as const,paymentMethod:'razorpay' as const,items:[]};
it('requires a deliberate confirmation before sending a paid live order to Shiprocket',async()=>{
  jest.mocked(adminRepository.createShipment).mockResolvedValue({id:order.id,status:'processing',totalPaise:150000,mode:'live',paymentMethod:'razorpay'});
  const user=userEvent.setup();
  await render(<AdminOrderCard order={order} onChanged={()=>{}} />);
  await user.press(screen.getByRole('button',{name:'Create Shiprocket order'}));
  expect(adminRepository.createShipment).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm shipment creation'})).toBeDisabled();
  await user.type(screen.getByLabelText('Packed length (cm)'),'20');
  await user.type(screen.getByLabelText('Packed width (cm)'),'15');
  await user.type(screen.getByLabelText('Packed height (cm)'),'12');
  await user.press(screen.getByRole('button',{name:'Confirm shipment creation'}));
  expect(adminRepository.createShipment).toHaveBeenCalledWith(order.id,{lengthCm:20,widthCm:15,heightCm:12});
});
it.each([{mode:'test',status:'paid'},{mode:'live',status:'payment_pending'}])('does not offer shipping for $mode/$status',async value=>{
  await render(<AdminOrderCard order={{...order,...value,mode:value.mode as 'test'|'live'}} onChanged={()=>{}} />);
  expect(screen.queryByRole('button',{name:'Create Shiprocket order'})).toBeNull();
});
it('shows the stored coupon discount in the order details',async()=>{
 await render(<AdminOrderCard order={{...order,couponCode:'SAVE10',discountPaise:10000}} onChanged={()=>{}}/>);
 expect(screen.getByText('Coupon SAVE10 · Discount ₹100')).toBeOnTheScreen();
});
