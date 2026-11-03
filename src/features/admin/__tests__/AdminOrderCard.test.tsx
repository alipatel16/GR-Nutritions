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
  await user.press(screen.getByRole('button',{name:'Confirm shipment creation'}));
  expect(adminRepository.createShipment).toHaveBeenCalledWith(order.id);
});
it.each([{mode:'test',status:'paid'},{mode:'live',status:'payment_pending'}])('does not offer shipping for $mode/$status',async value=>{
  await render(<AdminOrderCard order={{...order,...value,mode:value.mode as 'test'|'live'}} onChanged={()=>{}} />);
  expect(screen.queryByRole('button',{name:'Create Shiprocket order'})).toBeNull();
});
