import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Field, IconButton, QtyStepper, Sheet, Toggle, cx } from '../ui/kit';
import { OptionSheet } from '../ui/OptionSheet';
import { useToast } from '../ui/toast';
import { dataService } from '../services/dataService';
import { CustomerHint, Product, Seller } from '../types';
import { formatToman, isValidIranPhone, normalizePhone, toPersianDigits } from '../utils/persianUtils';
import { itemText, maskAddress, shortTitle } from '../lib/format';
import { CartLine, addLine, hasOptions, lineKey, setLineQty, toOrderItem, unitPrice } from '../lib/items';

const SAVED_ADDRESS = 'آدرس ذخیره‌شده مشتری';

/** An order that came in through a DM: the seller types it in so it joins the same queue. */
export function ManualOrderSheet({
  open,
  seller,
  products,
  onClose,
  onCreated,
}: {
  open: boolean;
  seller: Seller;
  products: Product[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [hint, setHint] = useState<CustomerHint | null>(null);
  const [useSaved, setUseSaved] = useState(true);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [paidAlready, setPaidAlready] = useState(true);
  const [picking, setPicking] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhone('');
    setHint(null);
    setUseSaved(true);
    setName('');
    setCity('');
    setAddress('');
    setLines([]);
    setPaidAlready(true);
    setErrors({});
  }, [open]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cart = lines.map((l) => ({ line: l, p: byId.get(l.productId)! })).filter((x) => x.p);
  const qty = cart.reduce((n, x) => n + x.line.qty, 0);
  const subtotal = cart.reduce((n, x) => n + x.line.qty * unitPrice(x.p, x.line.options), 0);
  const freeFrom = seller.free_shipping_min_items || 0;
  const shipping = qty === 0 || (freeFrom > 0 && qty >= freeFrom) ? 0 : seller.shipping_default_cost || 0;
  const total = subtotal + shipping;
  const savedAddress = useSaved && hint?.has_address;

  const onPhone = async (v: string) => {
    setPhone(v);
    const n = normalizePhone(v);
    if (isValidIranPhone(n)) {
      const h = await dataService.getCustomerHint(seller.sellerId, n);
      setHint(h);
      setUseSaved(Boolean(h?.has_address));
      if (h?.saved_address?.recipient_name && !name) setName(h.saved_address.recipient_name);
    } else setHint(null);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!isValidIranPhone(normalizePhone(phone))) e.phone = 'شمارهٔ موبایل ۱۱ رقمی مشتری را بنویسید.';
    if (name.trim().length < 2) e.name = 'نام مشتری را بنویسید.';
    if (!savedAddress && (city.trim().length < 2 || address.trim().length < 8)) e.address = 'شهر و نشانی کامل را بنویسید.';
    if (qty === 0) e.items = 'دست‌کم یک محصول اضافه کنید.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const n = normalizePhone(phone);
    const lead = Math.max(1, ...cart.map((x) => x.p.min_lead_days || 1));
    try {
      const { order } = await dataService.createOrder({
        seller_id: seller.sellerId,
        customer_name: name.trim(),
        phone: n,
        items: cart.map((x) => toOrderItem(x.p, x.line)),
        subtotal,
        shipping_cost: shipping,
        discount: 0,
        total_amount: total,
        deposit_required: total,
        deposit_paid_claimed: paidAlready ? total : 0,
        ship_to: savedAddress
          ? { name: '', phone: n, city: '', address: SAVED_ADDRESS, postal_code: '', is_gift: false }
          : { name: name.trim(), phone: n, city: city.trim(), address: address.trim(), postal_code: '', is_gift: false },
        delivery_due_date: new Date(Date.now() + lead * 86400000).toISOString(),
        flags: {},
        status: 'submitted',
        files: [],
      });
      if (paidAlready) {
        await dataService.updateOrderStatus(order.orderId, 'confirmed', 'ثبت دستی از دایرکت، پول گرفته شده');
        await dataService.updateOrderStatus(order.orderId, 'in_production');
      }
      await onCreated();
      toast(paidAlready ? 'سفارش ثبت شد و رفت به در حال ساخت' : 'سفارش ثبت شد و منتظر واریز است');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'ثبت نشد', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="ثبت سفارش دایرکت"
        footer={
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">
                {toPersianDigits(qty)} قلم{shipping ? `، ارسال ${formatToman(shipping)}` : qty ? '، ارسال رایگان' : ''}
              </span>
              <span className="text-lg font-extrabold text-ink-900 tabular">{formatToman(total)}</span>
            </div>
            <Button block size="lg" disabled={busy} onClick={save}>
              ثبت سفارش
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-ink-600">سفارشی که در دایرکت گرفته‌اید را اینجا بنویسید تا با بقیه در صف ساخت و ارسال بیاید.</p>

          <Field
            label="شمارهٔ موبایل مشتری"
            type="tel"
            inputMode="numeric"
            ltr
            maxLength={11}
            placeholder="09xxxxxxxxx"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            error={errors.phone}
          />
          {hint && <p className="-mt-3 text-sm font-semibold text-leaf-700">مشتری قبلی است، آدرسش را دارید.</p>}

          <Field label="نام مشتری" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />

          {hint?.has_address && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white ring-1 ring-ink-900/10 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-800">ارسال به همان آدرس قبلی</span>
                <span className="block text-xs text-ink-500 truncate">{maskAddress(hint.saved_address?.city, hint.saved_address?.address)}</span>
              </span>
              <Toggle checked={useSaved} onChange={setUseSaved} label="همان آدرس قبلی" />
            </div>
          )}
          {!savedAddress && (
            <div className="space-y-4">
              <Field label="شهر" value={city} onChange={(e) => setCity(e.target.value)} />
              <Field label="نشانی" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} placeholder="خیابان، کوچه، پلاک، واحد" />
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink-900">چه سفارش داده؟</h3>
            {products
              .filter((p) => p.available)
              .map((p) => {
                const simple = lines.find((l) => l.key === lineKey(p.id, {}));
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white ring-1 ring-ink-900/[0.07] px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900 truncate">{shortTitle(p.title)}</span>
                      <span className="block text-xs text-ink-500 tabular">{formatToman(p.base_price)}</span>
                    </span>
                    {hasOptions(p) ? (
                      <Button size="sm" variant="ghost" lead={<Plus className="w-4 h-4" />} onClick={() => setPicking(p)}>
                        افزودن
                      </Button>
                    ) : (
                      <QtyStepper
                        value={simple?.qty || 0}
                        onChange={(v) => setLines((ls) => (simple ? setLineQty(ls, simple.key, v) : addLine(ls, p.id, {}, v)))}
                      />
                    )}
                  </div>
                );
              })}
            {cart.filter((x) => Object.keys(x.line.options).length).length > 0 && (
              <div className="space-y-2">
                {cart
                  .filter((x) => Object.keys(x.line.options).length)
                  .map(({ line, p }) => (
                    <div key={line.key} className="flex items-center gap-2 rounded-2xl bg-brand-50 pr-4 pl-1 py-1">
                      <span className="flex-1 text-sm text-ink-800 truncate">
                        <b className="tabular">{toPersianDigits(line.qty)}</b> {itemText({ title: p.title, options_selected: line.options })}
                      </span>
                      <IconButton label="حذف" onClick={() => setLines((ls) => setLineQty(ls, line.key, 0))}>
                        <X className="w-4 h-4" />
                      </IconButton>
                    </div>
                  ))}
              </div>
            )}
            {errors.items && <p className="text-xs text-rose-700">{errors.items}</p>}
          </section>

          <div className={cx('flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1', paidAlready ? 'bg-leaf-50 ring-leaf-600/15' : 'bg-white ring-ink-900/10')}>
            <span>
              <span className="block text-sm font-semibold text-ink-800">پولش را گرفته‌ام</span>
              <span className="block text-xs text-ink-500">{paidAlready ? 'سفارش مستقیم می‌رود به در حال ساخت.' : 'سفارش منتظر واریز می‌ماند.'}</span>
            </span>
            <Toggle checked={paidAlready} onChange={setPaidAlready} label="پولش را گرفته‌ام" />
          </div>
        </div>
      </Sheet>

      <OptionSheet
        product={picking}
        confirmLabel="افزودن به سفارش"
        onClose={() => setPicking(null)}
        onAdd={(opts, n) => picking && setLines((ls) => addLine(ls, picking.id, opts, n))}
      />
    </>
  );
}
