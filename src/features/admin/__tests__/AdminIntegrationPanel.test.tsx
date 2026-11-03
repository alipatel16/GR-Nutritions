import { fireEvent, render, screen } from '@testing-library/react-native';
import { AdminIntegrationPanel } from '../AdminIntegrationPanel';
import { adminRepository } from '../admin-repository';
jest.mock('../admin-repository',()=>({adminRepository:{integrationStatus:jest.fn(),checkIntegrations:jest.fn()}}));
it('distinguishes saved settings from actual read-only provider checks',async()=>{
  jest.mocked(adminRepository.integrationStatus).mockResolvedValue({mode:'test',razorpay:{testConfigured:true,liveConfigured:true},shiprocket:{configured:true}});
  jest.mocked(adminRepository.checkIntegrations).mockResolvedValue({mode:'test',razorpay:{testConnected:true,liveConnected:false},shiprocket:{connected:true,pickupMatched:false}});
  await render(<AdminIntegrationPanel/>);
  await fireEvent.press(screen.getByRole('button',{name:'Check saved settings'}));
  expect(await screen.findByText('Razorpay test credentials: saved')).toBeOnTheScreen();
  expect(adminRepository.checkIntegrations).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button',{name:'Test provider connections'}));
  expect(await screen.findByText('Razorpay test connection: working')).toBeOnTheScreen();
  expect(screen.getByText('Razorpay live connection: needs attention')).toBeOnTheScreen();
  expect(screen.getByText('Pickup location: needs attention')).toBeOnTheScreen();
});
