import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Package, Boxes, ShoppingBag, Plus } from 'lucide-react-native';
import { adminRepository, type AdminOrder } from './admin-repository';
import { AdminOrderCard } from './AdminOrderCard';
import { compressProductImage } from './compress-image';
import { AdminIntegrationPanel } from './AdminIntegrationPanel';
import { useAuth } from '@/features/auth/AuthProvider';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PageShell } from '@/components/layout/PageShell';
import type { Product } from '@/features/catalog/types';
import { ProductEditor } from './ProductEditor';
import { colors } from '@/theme/tokens';

function newProduct(): Product {
  const id = randomUUID();
  return {
    id,
    slug: '',
    name: '',
    brand: '',
    category: 'protein',
    summary: '',
    description: '',
    status: 'draft',
    featuredRank: 100,
    createdAt: new Date().toISOString(),
    goals: [],
    dietaryTags: [],
    ingredients: [],
    media: [],
    variants: [
      {
        id: randomUUID(),
        sku: '',
        label: '',
        flavour: 'Unflavoured',
        size: '',
        weightGrams: 0,
        mrp: { amountPaise: 0, currency: 'INR' },
        price: { amountPaise: 0, currency: 'INR' },
        stockAvailable: 0,
        isDefault: true,
      },
    ],
    usage: '',
    warnings: ['Not for medicinal use.'],
    demoContent: false,
  };
}
export function AdminScreen() {
  const { ready, user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [edit, setEdit] = useState<Product | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [tab, setTab] = useState<'products' | 'orders' | 'settings'>('products');
  const scroll = useRef<ScrollViewInstance>(null);
  async function load() {
    setDataLoading(true);
    setLoadError('');
    try {
      const [p, o] = await Promise.all([
        adminRepository.products(),
        adminRepository.orders(),
      ]);
      setProducts(p);
      setOrders(o);
    } catch {
      setLoadError(
        'Admin data could not load. Please check your connection and try again.',
      );
    } finally {
      setDataLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (isAdmin) {
      void Promise.all([adminRepository.products(), adminRepository.orders()])
        .then(([p, o]) => { if (active) { setProducts(p); setOrders(o); setLoadError(''); } })
        .catch(() => { if (active) setLoadError('Admin data could not load. Please check your connection and try again.'); })
        .finally(() => { if (active) setDataLoading(false); });
    }
    return () => { active = false; };
  }, [isAdmin]);
  async function save(product: Product) {
    setBusy(true);
    setMessage('');
    setMessageSuccess(false);
    try {
      await adminRepository.save(product);
      setEdit(null);
      await load();
      setMessage('Product saved.');
      setMessageSuccess(true);
    } catch {
      setMessage('Product could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!edit || busy) return;
    setMessage('');
    setMessageSuccess(false);
    setBusy(true);
    try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) {
      setMessage('Choose an image smaller than 25 MB.');
      return;
    }
    const mime = asset.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      setMessage('Use a JPEG, PNG or WebP image.');
      return;
    }
      // Resize and convert before upload so storage holds small, sharp WebP files.
      const compressed = await compressProductImage(asset.uri);
      const uploaded = await adminRepository.upload(edit.id, compressed.uri, compressed.mime);
      setEdit((p) =>
        p
          ? {
              ...p,
              media: [
                ...p.media,
                {
                  id: randomUUID(),
                  alt: `${p.name || 'Supplement'} product pack`,
                  backgroundColor: colors.mintSoft,
                  uri: uploaded.uri,
                  storagePath: uploaded.path,
                  sortOrder: p.media.length,
                },
              ],
            }
          : p,
      );
    } catch {
      setMessage('Image could not be uploaded. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <ActivityIndicator />;
  if (!user || !isAdmin)
    return (
      <PageShell style={{ paddingTop: 60 }}>
        <View style={{ gap: 20 }}>
          <AppText accessibilityRole="header" variant="display">
            STORE ADMINISTRATION
          </AppText>
          <AppText>
            {!user
              ? 'Sign in with your store administrator account.'
              : 'Your account does not have store administrator access.'}
          </AppText>
          <Link href="/account">Go to sign in →</Link>
          <Link href="/">Back to the store →</Link>
        </View>
      </PageShell>
    );
  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <PageShell style={{ paddingTop: 30, paddingBottom: 70 }}>
        <View style={{ gap: 25 }}>
          <Link href="/">← GR Nutritions storefront</Link>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 18,
            }}
          >
            <View>
              <AppText tone="accent" variant="caption">
                GR OPERATIONS
              </AppText>
              <AppText accessibilityRole="header" variant="display">
                YOUR STORE, IN CONTROL.
              </AppText>
            </View>
            <Button
              onPress={() => {
                setEdit(newProduct());
                setMessage('');
              }}
            >
              <Plus size={16} /> Add product
            </Button>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[
              { Icon: Package, label: 'Products', value: products.length },
              {
                Icon: Boxes,
                label: 'Low-stock options',
                value: products
                  .flatMap((p) => p.variants)
                  .filter((v) => v.stockAvailable < 5).length,
              },
              { Icon: ShoppingBag, label: 'Orders', value: orders.length },
            ].map(({ Icon, label, value }) => (
              <View
                key={label}
                style={{
                  backgroundColor: '#FFF',
                  padding: 22,
                  borderRadius: 10,
                  gap: 8,
                  minWidth: 160,
                  flex: 1,
                }}
              >
                <Icon size={22} color={colors.violet} />
                <AppText tone="muted" variant="caption">
                  {label}
                </AppText>
                <AppText variant="heading">{value}</AppText>
              </View>
            ))}
          </View>
          {message ? (
            <AppText accessibilityRole={messageSuccess ? undefined : "alert"} accessibilityLiveRegion="polite" tone={messageSuccess ? "primary" : "danger"} style={messageSuccess ? { color: colors.success } : undefined}>
              {message}
            </AppText>
          ) : null}
          {busy && <ActivityIndicator color={colors.violet} />}
          {loadError ? <View style={{ gap: 10 }}><AppText accessibilityRole="alert" tone="danger">{loadError}</AppText><Button variant="ghost" onPress={load} disabled={dataLoading}>Try again</Button></View> : null}
          {dataLoading && <View style={{ gap: 10 }}><ActivityIndicator color={colors.violet} /><AppText tone="muted">Loading store data…</AppText></View>}
          {edit ? (
            <ProductEditor key={edit.id} product={edit} onChange={setEdit} onSave={save} onUpload={upload} onClose={() => setEdit(null)} onSectionChange={() => scroll.current?.scrollTo({y:0,animated:false})} busy={busy} />
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Button
                  variant={tab === 'products' ? 'primary' : 'ghost'}
                  onPress={() => setTab('products')}
                >
                  Catalog & inventory
                </Button>
                <Button
                  variant={tab === 'orders' ? 'primary' : 'ghost'}
                  onPress={() => setTab('orders')}
                >
                  Orders
                </Button>
                <Button variant={tab === 'settings' ? 'primary' : 'ghost'} onPress={() => setTab('settings')}>Payments & delivery</Button>
                <Button variant="ghost" onPress={load}>
                  Refresh
                </Button>
              </View>
              {tab === 'settings' ? <AdminIntegrationPanel /> : dataLoading || loadError ? null : tab === 'products' ? (
                products.length ? (
                  products.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setEdit(p);
                        setMessage('');
                      }}
                      style={{
                        backgroundColor: '#FFF',
                        padding: 20,
                        borderRadius: 9,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 15,
                        flexWrap: 'wrap',
                      }}
                    >
                      <View>
                        <AppText variant="label">{p.name}</AppText>
                        <AppText tone="muted" variant="caption">
                          {p.brand} · {p.category} · {p.status}
                        </AppText>
                      </View>
                      <AppText variant="caption">
                        {p.variants.length} options ·{' '}
                        {p.variants.reduce((s, v) => s + v.stockAvailable, 0)}{' '}
                        units · Edit →
                      </AppText>
                    </Pressable>
                  ))
                ) : (
                  <AppText tone="muted">
                    Your catalog is empty. Add your first real product above.
                  </AppText>
                )
              ) : orders.length ? (
                orders.map((o) => <AdminOrderCard key={o.id} order={o} onChanged={() => { void load(); }} />)
              ) : (
                <AppText tone="muted">
                  No orders yet. New orders will appear here when shoppers place them.
                </AppText>
              )}
            </>
          )}
        </View>
      </PageShell>
    </ScrollView>
  );
}
