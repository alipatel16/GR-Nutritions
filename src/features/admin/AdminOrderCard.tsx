import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PackageCheck, RefreshCw, Truck } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { checkoutErrorMessage, orderStatusLabel } from '@/features/checkout/checkout-service';
import { formatInr } from '@/lib/money';
import { colors } from '@/theme/tokens';
import { adminRepository, type AdminOrder } from './admin-repository';

export function AdminOrderCard({order,onChanged}:{order:AdminOrder;onChanged():void}) {
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [packed,setPacked]=useState({lengthCm:'',widthCm:'',heightCm:''});
  const dimensions={lengthCm:Number(packed.lengthCm),widthCm:Number(packed.widthCm),heightCm:Number(packed.heightCm)};
  const validDimensions=Object.values(dimensions).every(value=>Number.isFinite(value)&&value>=0.51&&value<=200);
  const canShip=order.mode==='live'&&['paid','cod_confirmed','processing'].includes(order.status)&&!order.tracking?.shipmentId;
  async function create() {
    if(!validDimensions||busy)return;
    setBusy(true);setMessage('');
    try {await adminRepository.createShipment(order.id,dimensions);setConfirm(false);onChanged();}
    catch(error){setMessage(checkoutErrorMessage(error,'Shipping could not be started. Please check the delivery setup and try again.'));}
    finally{setBusy(false);}
  }
  return <View style={styles.card}>
    <View style={styles.row}><PackageCheck size={22} color={colors.violet}/><AppText variant="label" selectable>Order {order.id}</AppText></View>
    <AppText>{orderStatusLabel(order.status)} · {formatInr(order.totalPaise)}</AppText>
    {order.createdAt && <AppText variant="caption" tone="muted">{new Date(order.createdAt).toLocaleString('en-IN')}</AppText>}
    {order.address && <View style={{gap:4}}>
      <AppText variant="label" selectable>{order.address.fullName} · {order.address.phone}</AppText>
      <AppText variant="caption" selectable>{[order.address.line1,order.address.line2,order.address.city,order.address.state,order.address.pincode].filter(Boolean).join(', ')}</AppText>
      {order.address.email && <AppText variant="caption" selectable>{order.address.email}</AppText>}
    </View>}
    {order.couponCode && (order.discountPaise??0)>0 ? <AppText variant="caption">Coupon {order.couponCode} · Discount {formatInr(order.discountPaise!)}</AppText> : null}
    {order.paymentMethod==='cod'&&<AppText variant="caption">Cash on delivery · payment collected on delivery</AppText>}
    {order.mode==='test'&&<AppText variant="caption" tone="accent">Test order · no live stock or shipping</AppText>}
    {order.items.map((item,index)=><AppText key={index} variant="caption" tone="muted">{item.productName} × {item.quantity}</AppText>)}
    {order.tracking&&<View style={{gap:8}}>
      <AppText variant="label">{order.tracking.status}</AppText>
      {order.tracking.courierName ? <AppText variant="caption">{order.tracking.courierName}</AppText> : null}
      {order.tracking.awb?<AppText variant="caption" selectable>AWB {order.tracking.awb}</AppText>:<AppText variant="caption" tone="muted">Courier assignment and booking are managed in Shiprocket.</AppText>}
      <Button variant="ghost" loading={busy} onPress={async()=>{
        setBusy(true);setMessage('');
        try{await adminRepository.syncShipment(order.id);onChanged();}
        catch(error){setMessage(checkoutErrorMessage(error,'Tracking could not be refreshed. Please try again.'));}
        finally{setBusy(false);}
      }}><RefreshCw size={15}/> Refresh tracking</Button>
    </View>}
    {canShip&&!confirm&&<Button variant="ghost" onPress={()=>setConfirm(true)}><Truck size={16}/> Create Shiprocket order</Button>}
    {confirm&&<View style={styles.confirm}>
      <AppText variant="caption">Send this order’s saved delivery details to Shiprocket? Courier booking is completed in your Shiprocket account.</AppText>
      {([['lengthCm','Packed length (cm)'],['widthCm','Packed width (cm)'],['heightCm','Packed height (cm)']] as const).map(([key,label])=>(
        <View key={key}>
          <AppText variant="caption">{label}</AppText>
          <TextInput accessibilityLabel={label} keyboardType="decimal-pad" editable={!busy}
            style={styles.dimension} value={packed[key]} onChangeText={value=>setPacked(current=>({...current,[key]:value}))}/>
        </View>
      ))}
      <Button disabled={!validDimensions} loading={busy} onPress={create}>Confirm shipment creation</Button>
      <Button variant="ghost" disabled={busy} onPress={()=>setConfirm(false)}>Go back</Button>
    </View>}
    {message ? <AppText accessibilityRole="alert" tone="danger" variant="caption">{message}</AppText> : null}
  </View>;
}
const styles=StyleSheet.create({dimension:{backgroundColor:'#FFF',color:'#121417',borderColor:colors.line,borderWidth:1,borderRadius:6,padding:8},card:{backgroundColor:'#FFF',borderRadius:12,borderColor:colors.line,borderWidth:1,padding:22,gap:12},
  row:{flexDirection:'row',gap:10,alignItems:'center',flexWrap:'wrap'},confirm:{gap:12,padding:16,backgroundColor:colors.obsidian,borderRadius:8}});
