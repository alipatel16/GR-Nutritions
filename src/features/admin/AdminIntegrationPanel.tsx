import { useState } from 'react';
import { View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/tokens';
import { adminRepository } from './admin-repository';

export function AdminIntegrationPanel() {
  const [status,setStatus]=useState<Awaited<ReturnType<typeof adminRepository.integrationStatus>>>();
  const [busy,setBusy]=useState(false);
  const [connections,setConnections]=useState<Awaited<ReturnType<typeof adminRepository.checkIntegrations>>>();
  const [error,setError]=useState('');
  return <View style={{backgroundColor:'#FFF',borderWidth:1,borderColor:colors.line,borderRadius:12,padding:24,gap:18}}>
    <ShieldCheck size={28} color={colors.violet}/>
    <AppText variant="title">PAYMENTS & DELIVERY</AppText>
    <AppText variant="caption" tone="muted">Delivery is free above ₹999, otherwise ₹50. Cash on delivery adds ₹200.</AppText>
    {status&&<View style={{gap:12}}>
      <AppText variant="label">{status.mode==='test'?'Test checkout is active':'Live checkout is active'}</AppText>
      <AppText variant="caption">Razorpay test credentials: {status.razorpay.testConfigured?'saved':'missing'}</AppText>
      <AppText variant="caption">Razorpay live credentials: {status.razorpay.liveConfigured?'saved':'missing'}</AppText>
      <AppText variant="caption">Shiprocket API credentials: {status.shiprocket.configured?'saved':'missing'}</AppText>
      <AppText variant="caption" tone="muted">Saved credentials still need a successful provider connection. A payment and delivery check confirms readiness.</AppText>
    </View>}
    <Button variant="ghost" loading={busy} onPress={async()=>{
      setBusy(true);setError('');
      try{setStatus(await adminRepository.integrationStatus());}
      catch{setError('Payment and delivery settings could not load. Please try again.');}
      finally{setBusy(false);}
    }}>Check saved settings</Button>
    <AppText variant="caption" tone="muted">Test the API connections and registered pickup location. This does not create a payment or shipment.</AppText>
    <Button variant="ghost" loading={busy} onPress={async()=>{
      setBusy(true);setError('');setConnections(undefined);
      try{setConnections(await adminRepository.checkIntegrations());}
      catch{setError('Provider connections could not be checked. Please try again.');}
      finally{setBusy(false);}
    }}>Test provider connections</Button>
    {connections&&<View style={{gap:12}}>
      <AppText variant="caption">Razorpay test connection: {connections.razorpay.testConnected?'working':'needs attention'}</AppText>
      <AppText variant="caption">Razorpay live connection: {connections.razorpay.liveConnected?'working':'needs attention'}</AppText>
      <AppText variant="caption">Shiprocket connection: {connections.shiprocket.connected?'working':'needs attention'}</AppText>
      <AppText variant="caption">Pickup location: {connections.shiprocket.pickupMatched?'matched':'needs attention'}</AppText>
    </View>}
    {error ? <AppText accessibilityRole="alert" tone="danger" variant="caption">{error}</AppText> : null}
  </View>;
}
