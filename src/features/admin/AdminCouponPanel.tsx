import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Switch, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { checkoutErrorMessage } from '@/features/checkout/checkout-service';
import { formatInr } from '@/lib/money';
import { colors } from '@/theme/tokens';
import {
  couponRepository,
  type AdminCoupon,
  type CouponInput,
} from './coupon-repository';

type Draft = {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  minimum: string;
  maximum: string;
  starts: string;
  expires: string;
  limit: string;
  enabled: boolean;
};
const empty = (): Draft => ({
  code: '',
  type: 'percentage',
  value: '',
  minimum: '0',
  maximum: '',
  starts: '',
  expires: '',
  limit: '',
  enabled: true,
});
function indiaDate(value: string | null) {
  return value
    ? new Date(Date.parse(value) + 330 * 60000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ')
    : '';
}
function parseIndia(value: string, optional = false): string | null {
  if (!value.trim() && optional) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (!match)
    throw new Error('Enter a valid date as YYYY-MM-DD HH:mm in India time.');
  const [, year, month, day, hour, minute] = match;
  const utc = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
  if (
    Number(year) < 2000 ||
    !Number.isFinite(utc.getTime()) ||
    utc.toISOString().slice(0, 16) !==
      `${year}-${month}-${day}T${hour}:${minute}`
  )
    throw new Error('Enter a valid date as YYYY-MM-DD HH:mm in India time.');
  return new Date(utc.getTime() - 330 * 60000).toISOString();
}
function money(value: string, label: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      `${label} must be a non-negative amount with at most two decimals.`,
    );
  const [whole, decimal = ''] = value.trim().split('.');
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100000000)
    throw new Error(`${label} is too large.`);
  return amount;
}
function input(draft: Draft): CouponInput {
  const code = draft.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code))
    throw new Error(
      'Use 3–32 letters, numbers, hyphens or underscores for the code.',
    );
  const value = money(draft.value, 'Discount value') / 100;
  if (value <= 0 || (draft.type === 'percentage' && value > 100))
    throw new Error(
      'Enter a positive discount; percentages cannot exceed 100.',
    );
  if (
    !/^\d+$/.test(draft.limit) ||
    Number(draft.limit) < 1 ||
    Number(draft.limit) > 1000000
  )
    throw new Error('Total customer limit must be between 1 and 1,000,000.');
  const startsAt = parseIndia(draft.starts, true),
    expiresAt = parseIndia(draft.expires)!;
  if (startsAt && Date.parse(startsAt) >= Date.parse(expiresAt))
    throw new Error('Expiry must be later than the start date.');
  const maxDiscountPaise =
    draft.type === 'percentage' && draft.maximum.trim()
      ? money(draft.maximum, 'Maximum discount')
      : null;
  if (maxDiscountPaise === 0)
    throw new Error(
      'Maximum discount must be greater than zero, or leave it blank.',
    );
  return {
    ...(draft.id ? { id: draft.id } : {}),
    code,
    type: draft.type,
    value,
    minSpendPaise: money(draft.minimum, 'Minimum spend'),
    maxDiscountPaise,
    startsAt,
    expiresAt,
    usageLimit: Number(draft.limit),
    enabled: draft.enabled,
  };
}
function edit(coupon: AdminCoupon): Draft {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    minimum: String(coupon.minSpendPaise / 100),
    maximum:
      coupon.maxDiscountPaise === null
        ? ''
        : String(coupon.maxDiscountPaise / 100),
    starts: indiaDate(coupon.startsAt),
    expires: indiaDate(coupon.expiresAt),
    limit: String(coupon.usageLimit),
    enabled: coupon.enabled,
  };
}
function status(coupon: AdminCoupon) {
  if (!coupon.enabled) return 'Disabled';
  if (Date.parse(coupon.expiresAt) <= Date.now()) return 'Expired';
  if (coupon.startsAt && Date.parse(coupon.startsAt) > Date.now())
    return 'Scheduled';
  if (coupon.remainingCount === 0) return 'Limit reached';
  return 'Active';
}
const fieldStyle = {
  backgroundColor: '#FFF',
  color: colors.ink,
  borderColor: colors.line,
  borderWidth: 1,
  borderRadius: 6,
  padding: 12,
  minHeight: 44,
};
export function AdminCouponPanel() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const generation = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current += 1;
    };
  }, []);
  async function load(query: string) {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const values = await couponRepository.list(query);
      if (alive.current && request === generation.current) setCoupons(values);
    } catch (failure) {
      if (alive.current && request === generation.current)
        setError(
          checkoutErrorMessage(
            failure,
            'Coupons could not load. Please try again.',
          ),
        );
    } finally {
      if (alive.current && request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load('');
  }, []);
  async function save() {
    if (!draft || busy) return;
    setError('');
    setMessage('');
    let payload: CouponInput;
    try {
      payload = input(draft);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    setBusy(true);
    try {
      await couponRepository.save(payload);
      if (!alive.current) return;
      setDraft(null);
      await load(search);
      setMessage('Coupon saved.');
    } catch (failure) {
      if (alive.current)
        setError(
          checkoutErrorMessage(
            failure,
            'Coupon could not be saved. Please try again.',
          ),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 12,
        padding: 24,
        gap: 18,
      }}
    >
      <AppText variant="title">COUPONS</AppText>
      <AppText tone="muted" variant="caption">
        Once per signed-in customer. The total limit includes completed uses and
        unpaid reservations. Discounts apply to merchandise, leave at least ₹1
        payable, and cannot be combined. Free delivery above ₹999 uses the
        discounted merchandise total.
      </AppText>
      {message ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ color: colors.success }}
        >
          {message}
        </AppText>
      ) : null}
      {error ? (
        <AppText accessibilityRole="alert" tone="danger">
          {error}
        </AppText>
      ) : null}
      {draft ? (
        <View style={{ gap: 14 }}>
          <AppText variant="label">
            {draft.id ? 'Edit coupon' : 'Create coupon'}
          </AppText>
          <AppText variant="caption">
            All dates are India Standard Time (UTC+05:30). Use YYYY-MM-DD HH:mm,
            for example 2026-12-31 23:59.
          </AppText>
          <View style={{ gap: 6 }}>
            <AppText variant="caption">Coupon code</AppText>
            <TextInput
              accessibilityLabel="Coupon code"
              autoCapitalize="characters"
              editable={!busy}
              style={fieldStyle}
              value={draft.code}
              onChangeText={(code) => setDraft({ ...draft, code })}
            />
          </View>
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() =>
              setDraft({
                ...draft,
                code: `GR-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
              })
            }
          >
            Generate code
          </Button>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(['percentage', 'fixed'] as const).map((type) => (
              <Button
                key={type}
                disabled={busy}
                variant={draft.type === type ? 'primary' : 'ghost'}
                onPress={() => setDraft({ ...draft, type })}
              >
                {type === 'percentage' ? 'Percentage (%)' : 'Fixed amount (₹)'}
              </Button>
            ))}
          </View>
          {(
            [
              ['value', 'Discount value'],
              ['minimum', 'Minimum spend (₹)'],
              ...(draft.type === 'percentage'
                ? [['maximum', 'Maximum discount (₹), optional']]
                : []),
              ['starts', 'Start (IST), optional'],
              ['expires', 'Expiry (IST)'],
              ['limit', 'Total customer limit'],
            ] as [keyof Draft, string][]
          ).map(([key, label]) => (
            <View key={key} style={{ gap: 6 }}>
              <AppText variant="caption">{label}</AppText>
              <TextInput
                accessibilityLabel={label}
                editable={!busy}
                style={fieldStyle}
                value={String(draft[key] ?? '')}
                keyboardType={
                  ['value', 'minimum', 'maximum'].includes(key)
                    ? 'decimal-pad'
                    : key === 'limit'
                      ? 'number-pad'
                      : 'default'
                }
                onChangeText={(value) => setDraft({ ...draft, [key]: value })}
              />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Switch
              accessibilityLabel="Coupon enabled"
              value={draft.enabled}
              disabled={busy}
              onValueChange={(enabled) => setDraft({ ...draft, enabled })}
            />
            <AppText>Enabled</AppText>
          </View>
          <Button loading={busy} onPress={save}>
            Save coupon
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setDraft(null);
              setError('');
            }}
          >
            Cancel
          </Button>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <TextInput
              accessibilityLabel="Search coupons"
              placeholder="Search by code"
              style={fieldStyle}
              value={search}
              maxLength={100}
              onChangeText={setSearch}
            />
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => load(search)}
            >
              Search coupons
            </Button>
            <Button
              onPress={() => {
                setDraft(empty());
                setError('');
                setMessage('');
              }}
            >
              Create coupon
            </Button>
          </View>
          {loading ? (
            <ActivityIndicator
              accessibilityLabel="Loading coupons"
              color={colors.violet}
            />
          ) : coupons.length === 0 ? (
            <AppText tone="muted">No coupons found.</AppText>
          ) : (
            coupons.map((coupon) => (
              <View
                key={coupon.id}
                style={{
                  gap: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                  paddingTop: 16,
                }}
              >
                <AppText variant="label" selectable>
                  {coupon.code} · {status(coupon)}
                </AppText>
                <AppText variant="caption">
                  {coupon.type === 'percentage'
                    ? `${coupon.value}%`
                    : formatInr(Math.round(coupon.value * 100))}{' '}
                  off · Minimum {formatInr(coupon.minSpendPaise)}
                  {coupon.maxDiscountPaise !== null
                    ? ` · Maximum ${formatInr(coupon.maxDiscountPaise)}`
                    : ''}
                </AppText>
                <AppText variant="caption">
                  {coupon.usedCount} used · {coupon.reservedCount} reserved ·{' '}
                  {coupon.remainingCount} remaining · {coupon.usageLimit} total
                </AppText>
                <AppText variant="caption" tone="muted">
                  Expires {indiaDate(coupon.expiresAt)} IST
                  {coupon.startsAt
                    ? ` · Starts ${indiaDate(coupon.startsAt)} IST`
                    : ''}
                </AppText>
                <Button
                  variant="ghost"
                  accessibilityLabel={`Edit ${coupon.code}`}
                  onPress={() => {
                    setDraft(edit(coupon));
                    setError('');
                    setMessage('');
                  }}
                >
                  Edit {coupon.code}
                </Button>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
